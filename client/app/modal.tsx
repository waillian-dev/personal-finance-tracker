import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import api from '../services/api';
import { Wallet, Category } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';

export default function AddTransactionModal() {
  const { editId } = useLocalSearchParams();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [description, setDescription] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedDestWalletId, setSelectedDestWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Friend Split States
  const [isSplitWithFriend, setIsSplitWithFriend] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [splitType, setSplitType] = useState<'receivable' | 'payable'>('receivable');
  const [splitAmount, setSplitAmount] = useState('');

  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [walletsRes, catsRes, friendsRes] = await Promise.all([
          api.get('/wallets'),
          api.get('/categories'),
          api.get('/friends'),
        ]);

        let loadedWallets = [];
        if (walletsRes.data.success && walletsRes.data.data.length > 0) {
          loadedWallets = walletsRes.data.data;
          setWallets(loadedWallets);
          setSelectedWalletId(loadedWallets[0]._id);
          if (loadedWallets.length > 1) {
            setSelectedDestWalletId(loadedWallets[1]._id);
          }
        }

        let loadedCategories = [];
        if (catsRes.data.success && catsRes.data.data.length > 0) {
          loadedCategories = catsRes.data.data;
          setCategories(loadedCategories);
          // Set first matching category default
          const initialCat = loadedCategories.find((c: Category) => c.type === 'expense');
          if (initialCat) {
            setSelectedCategoryId(initialCat._id);
          } else {
            setSelectedCategoryId(loadedCategories[0]._id);
          }
        }

        if (friendsRes.data.success) {
          const activeFriends = friendsRes.data.data.friends || [];
          setFriends(activeFriends);
          if (activeFriends.length > 0) {
            setSelectedFriendId(activeFriends[0].friend._id);
          }
        }

        if (editId) {
          const txRes = await api.get(`/transactions/${editId}`);
          if (txRes.data.success) {
            const tx = txRes.data.data;
            setAmount(tx.amount.toString());
            setType(tx.type);
            setDescription(tx.description || '');
            setSelectedWalletId(tx.walletId?._id || tx.walletId || '');
            setSelectedCategoryId(tx.categoryId?._id || tx.categoryId || '');
            if (tx.type === 'transfer') {
              setSelectedDestWalletId(tx.destinationWalletId?._id || tx.destinationWalletId || '');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching form dependency data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormData();
  }, [editId]);

  // Update default category selected if type changes
  useEffect(() => {
    if (!editId && categories.length > 0) {
      const match = categories.find((c) => c.type === (type === 'transfer' ? 'expense' : type));
      if (match) {
        setSelectedCategoryId(match._id);
      }
    }
  }, [type, categories, editId]);

  // Sync splitAmount automatically as half of main amount
  useEffect(() => {
    if (amount && !isNaN(Number(amount))) {
      const half = (parseFloat(amount) / 2).toString();
      setSplitAmount(half);
    } else {
      setSplitAmount('');
    }
  }, [amount]);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }
    if (!selectedWalletId) {
      setFormError('Please select a source wallet');
      return;
    }
    if (type === 'transfer' && !selectedDestWalletId) {
      setFormError('Please select a destination wallet');
      return;
    }
    if (type === 'transfer' && selectedWalletId === selectedDestWalletId) {
      setFormError('Source and destination wallets must be different');
      return;
    }
    if (type !== 'transfer' && !selectedCategoryId) {
      setFormError('Please select a category');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    // For transfers, we'll find a default category
    let categoryId = selectedCategoryId;
    if (type === 'transfer') {
      const transferCat = categories.find(c => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('travel') || c.type === 'expense');
      if (transferCat) {
        categoryId = transferCat._id;
      }
    }

    try {
      let response;
      const payload = {
        walletId: selectedWalletId,
        categoryId,
        type,
        amount: parseFloat(amount),
        description: description || undefined,
        destinationWalletId: type === 'transfer' ? selectedDestWalletId : null,
      };

      if (editId) {
        response = await api.put(`/transactions/${editId}`, payload);
      } else {
        response = await api.post('/transactions', payload);
      }

      if (response.data.success) {
        // Log split ledger transaction with friend if enabled
        if (!editId && isSplitWithFriend && selectedFriendId && splitAmount && !isNaN(Number(splitAmount))) {
          try {
            const cat = categories.find((c) => c._id === categoryId);
            const ledgerDesc = (description || cat?.name || 'Shared Expense') + ' (Split)';
            await api.post('/ledger', {
              description: ledgerDesc,
              amount: parseFloat(splitAmount),
              friendId: selectedFriendId,
              paidByMe: splitType === 'receivable',
              split50: false,
            });
          } catch (ledgerErr) {
            console.error('Failed to automatically log split ledger transaction:', ledgerErr);
          }
        }
        router.back();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to submit transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const currencySymbol = user?.currency === 'MMK' ? 'Ks' : '$';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

      {/* Transaction Type Buttons */}
      <View style={styles.typeRow}>
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeButton, type === t && styles.activeTypeButton]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeButtonText, type === t && styles.activeTypeButtonText]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount Input */}
      <View style={styles.amountContainer}>
        {user?.currency !== 'MMK' ? <Text style={styles.currencySymbol}>{currencySymbol}</Text> : null}
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#475569"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
        {user?.currency === 'MMK' ? <Text style={styles.currencySymbol}> {currencySymbol}</Text> : null}
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        {/* Source Wallet Selection */}
        <Text style={styles.label}>{type === 'transfer' ? 'From Wallet' : 'Wallet'}</Text>
        <View style={styles.pickerContainer}>
          {wallets.map((w) => (
            <TouchableOpacity
              key={w._id}
              style={[
                styles.pickerItem,
                selectedWalletId === w._id && styles.pickerItemActive,
                { borderLeftColor: w.color, borderLeftWidth: 4 }
              ]}
              onPress={() => setSelectedWalletId(w._id)}
            >
              <Text style={[styles.pickerItemText, selectedWalletId === w._id && styles.pickerItemTextActive]}>
                {w.name} ({formatCurrency(w.balance, w.currency)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Destination Wallet Selection (Only for Transfers) */}
        {type === 'transfer' ? (
          <>
            <Text style={styles.label}>To Wallet</Text>
            <View style={styles.pickerContainer}>
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w._id}
                  style={[
                    styles.pickerItem,
                    selectedDestWalletId === w._id && styles.pickerItemActive,
                    { borderLeftColor: w.color, borderLeftWidth: 4 }
                  ]}
                  onPress={() => setSelectedDestWalletId(w._id)}
                >
                  <Text style={[styles.pickerItemText, selectedDestWalletId === w._id && styles.pickerItemTextActive]}>
                    {w.name} ({formatCurrency(w.balance, w.currency)})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* Category Selection (Not shown for Transfers) */}
        {type !== 'transfer' ? (
          <>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoriesGrid}>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      styles.categoryBubble,
                      selectedCategoryId === c._id && styles.categoryBubbleActive,
                      { borderColor: c.color }
                    ]}
                    onPress={() => setSelectedCategoryId(c._id)}
                  >
                    <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                    <Text style={styles.categoryLabel}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </>
        ) : null}

        {/* Description Input */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Starbucks coffee, utility bill"
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
        />

        {/* Split with Friend Section */}
        {!editId && type !== 'transfer' && friends.length > 0 ? (
          <View style={styles.splitSection}>
            <TouchableOpacity
              style={styles.splitCheckboxRow}
              onPress={() => setIsSplitWithFriend(!isSplitWithFriend)}
            >
              <FontAwesome
                name={isSplitWithFriend ? 'check-square' : 'square-o'}
                size={18}
                color={isSplitWithFriend ? '#059669' : '#64748B'}
              />
              <Text style={styles.splitCheckboxLabel}>Relate / Split with Friend</Text>
            </TouchableOpacity>

            {isSplitWithFriend ? (
              <View style={styles.splitControls}>
                <Text style={styles.subLabel}>Select Friend</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendScroll}>
                  {friends.map((item) => (
                    <TouchableOpacity
                      key={item.friendshipId}
                      style={[
                        styles.friendBubble,
                        selectedFriendId === item.friend._id && styles.friendBubbleActive,
                      ]}
                      onPress={() => setSelectedFriendId(item.friend._id)}
                    >
                      <Text style={[styles.friendBubbleText, selectedFriendId === item.friend._id && styles.friendBubbleTextActive]}>
                        {item.friend.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.subLabel}>Split Option</Text>
                <View style={styles.splitTypeRow}>
                  <TouchableOpacity
                    style={[styles.splitTypeBtn, splitType === 'receivable' && styles.splitTypeBtnActive]}
                    onPress={() => setSplitType('receivable')}
                  >
                    <Text style={[styles.splitTypeBtnText, splitType === 'receivable' && styles.splitTypeBtnTextActive]}>
                      They Owe Me
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.splitTypeBtn, splitType === 'payable' && styles.splitTypeBtnActive]}
                    onPress={() => setSplitType('payable')}
                  >
                    <Text style={[styles.splitTypeBtnText, splitType === 'payable' && styles.splitTypeBtnTextActive]}>
                      I Owe Them
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.subLabel}>Owed Amount</Text>
                <TextInput
                  style={styles.textInput}
                  value={splitAmount}
                  onChangeText={setSplitAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Transaction</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 10,
  },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTypeButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typeButtonText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeTypeButtonText: {
    color: '#059669',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  currencySymbol: {
    fontSize: 48,
    color: '#059669',
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    color: '#0F172A',
    fontWeight: 'bold',
    width: '60%',
    textAlign: 'left',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
    marginTop: 8,
  },
  pickerContainer: {
    marginBottom: 16,
    gap: 8,
  },
  pickerItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerItemActive: {
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
  },
  pickerItemText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBubble: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderColor: '#E2E8F0',
  },
  categoryBubbleActive: {
    backgroundColor: '#F1F5F9',
  },
  categoryEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
  categoryLabel: {
    color: '#0F172A',
    fontSize: 13,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 15,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  splitSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginBottom: 20,
  },
  splitCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  splitCheckboxLabel: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  splitControls: {
    marginTop: 8,
  },
  subLabel: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    marginTop: 8,
  },
  friendScroll: {
    paddingBottom: 6,
    gap: 8,
  },
  friendBubble: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  friendBubbleActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#059669',
  },
  friendBubbleText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
  },
  friendBubbleTextActive: {
    color: '#059669',
    fontWeight: 'bold',
  },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  splitTypeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTypeBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  splitTypeBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  splitTypeBtnTextActive: {
    color: '#FFFFFF',
  },
});
