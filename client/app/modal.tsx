import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import api from '../services/api';
import { Wallet, Category } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { useThemeColors } from '../hooks/useThemeColors';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  AltArrowLeft,
  AltArrowRight,
  AltArrowDown,
  Notes,
} from '@solar-icons/react-native/Bold';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AddTransactionModal() {
  const { colors, isDark } = useThemeColors();
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
  
  // Date Picker States
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Dropdown Picker States
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

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
            if (tx.date) {
              setTransactionDate(new Date(tx.date));
              setCalendarMonth(new Date(tx.date));
            }
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

  useEffect(() => {
    if (!editId && categories.length > 0) {
      const match = categories.find((c) => c.type === (type === 'transfer' ? 'expense' : type));
      if (match) {
        setSelectedCategoryId(match._id);
      }
    }
  }, [type, categories, editId]);

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
        date: transactionDate.toISOString(),
      };

      if (editId) {
        response = await api.put(`/transactions/${editId}`, payload);
      } else {
        response = await api.post('/transactions', payload);
      }

      if (response.data.success) {
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

  const renderCategoryIcon = (iconName: string, iconColor: string, size = 22) => {
    const IconComponent = (SolarBold as any)[iconName];
    if (IconComponent) {
      return <IconComponent size={size} color={iconColor} />;
    }
    return <SolarBold.Widget size={size} color={iconColor} />;
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Pad initial week days empty space
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(calendarMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCalendarMonth(newMonth);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const currencySymbol = user?.currency === 'MMK' ? 'Ks' : '$';
  const displayCategories = categories.filter((c) => c.type === (type === 'transfer' ? 'expense' : type));
  const currentWallet = wallets.find(w => w._id === selectedWalletId);
  const destWallet = wallets.find(w => w._id === selectedDestWalletId);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {editId ? 'Edit Transaction' : 'New Transaction'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        {/* Expense / Income Pill Switcher */}
        <View style={[styles.pillContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <TouchableOpacity
            style={[styles.pillButton, type === 'expense' && styles.pillButtonActive]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.pillText, type === 'expense' && styles.pillTextActive]}>
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillButton, type === 'income' && styles.pillButtonActive]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.pillText, type === 'income' && styles.pillTextActive]}>
              Income
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillButton, type === 'transfer' && styles.pillButtonActive]}
            onPress={() => setType('transfer')}
          >
            <Text style={[styles.pillText, type === 'transfer' && styles.pillTextActive]}>
              Transfer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Large Amount Input Area */}
        <View style={styles.amountInputBlock}>
          <View style={styles.amountRow}>
            <Text style={[styles.currencyLabel, { color: isDark ? '#94A3B8' : '#1E3A8A' }]}>
              {currencySymbol}
            </Text>
            <TextInput
              style={[styles.hugeAmountInput, { color: isDark ? '#F8FAFC' : '#1E3A8A' }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              keyboardType="decimal-pad"
              autoFocus={!editId}
            />
          </View>
          
          <TextInput
            style={[styles.descDottedInput, { color: colors.text, borderBottomColor: isDark ? '#475569' : '#3B82F6' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add description..."
            placeholderTextColor="#94A3B8"
            textAlign="center"
          />
        </View>

        {/* Date Selector Row -> Opens Custom Calendar Modal */}
        <View style={[styles.dateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.dateLeft}>
            <Notes size={20} color={colors.textSecondary} />
            <Text style={[styles.dateLabel, { color: colors.text }]}>Date</Text>
          </View>
          <TouchableOpacity
            style={styles.dateRight}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateValue, { color: colors.textSecondary }]}>
              {transactionDate.toDateString() === new Date().toDateString() ? 'Today' : transactionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Source Wallet Dropdown */}
        <View style={[styles.dropdownSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>
            {type === 'transfer' ? 'FROM WALLET' : 'SELECT WALLET'}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowSourceDropdown(true)}
          >
            <View style={styles.dropdownSelectLeft}>
              {currentWallet && (
                <View style={[styles.walletColorIndicator, { backgroundColor: currentWallet.color || '#94A3B8' }]} />
              )}
              <Text style={[styles.dropdownSelectText, { color: colors.text }]}>
                {currentWallet ? `${currentWallet.name} (${formatCurrency(currentWallet.balance, currentWallet.currency)})` : 'Select Wallet'}
              </Text>
            </View>
            <AltArrowDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Destination Wallet Dropdown (Only for Transfers) */}
        {type === 'transfer' && (
          <View style={[styles.dropdownSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>TO WALLET</Text>
            <TouchableOpacity
              style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowDestDropdown(true)}
            >
              <View style={styles.dropdownSelectLeft}>
                {destWallet && (
                  <View style={[styles.walletColorIndicator, { backgroundColor: destWallet.color || '#94A3B8' }]} />
                )}
                <Text style={[styles.dropdownSelectText, { color: colors.text }]}>
                  {destWallet ? `${destWallet.name} (${formatCurrency(destWallet.balance, destWallet.currency)})` : 'Select Destination Wallet'}
                </Text>
              </View>
              <AltArrowDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Category Grid Section (Not shown for transfers) */}
        {type !== 'transfer' && (
          <View style={styles.categorySection}>
            <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {displayCategories.slice(0, 7).map((c) => {
                const isActive = selectedCategoryId === c._id;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isActive && styles.categoryCardActive,
                    ]}
                    onPress={() => setSelectedCategoryId(c._id)}
                  >
                    <View style={[styles.categoryIconWrapper, { backgroundColor: c.color ? `${c.color}15` : (isDark ? '#334155' : '#F1F5F9') }]}>
                      {renderCategoryIcon(c.emoji || 'Widget', c.color || '#8B5CF6')}
                    </View>
                    <Text style={[styles.categoryCardLabel, { color: colors.text }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              <TouchableOpacity
                style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/categories')}
              >
                <View style={[styles.categoryIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <SolarBold.Folder size={22} color={colors.textSecondary} />
                </View>
                <Text style={[styles.categoryCardLabel, { color: colors.text }]}>
                  More
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Friend Split Section */}
        {!editId && type !== 'transfer' && friends.length > 0 && (
          <View style={[styles.splitSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.splitToggleRow}
              onPress={() => setIsSplitWithFriend(!isSplitWithFriend)}
            >
              <FontAwesome
                name={isSplitWithFriend ? 'check-square' : 'square-o'}
                size={18}
                color={isSplitWithFriend ? '#059669' : '#64748B'}
              />
              <Text style={[styles.splitToggleText, { color: colors.text }]}>Relate / Split with Friend</Text>
            </TouchableOpacity>

            {isSplitWithFriend && (
              <View style={styles.splitExpandable}>
                <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Select Friend</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendScroll}>
                  {friends.map((item) => (
                    <TouchableOpacity
                      key={item.friendshipId}
                      style={[
                        styles.friendChip,
                        { backgroundColor: colors.inputBg, borderColor: colors.border },
                        selectedFriendId === item.friend._id && styles.friendChipActive,
                      ]}
                      onPress={() => setSelectedFriendId(item.friend._id)}
                    >
                      <Text style={[styles.friendChipText, selectedFriendId === item.friend._id && styles.friendChipTextActive]}>
                        {item.friend.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Split Direction</Text>
                <View style={styles.splitTypeRow}>
                  <TouchableOpacity
                    style={[styles.splitTypeButton, { backgroundColor: colors.inputBg, borderColor: colors.border }, splitType === 'receivable' && styles.splitTypeButtonActive]}
                    onPress={() => setSplitType('receivable')}
                  >
                    <Text style={[styles.splitTypeButtonText, splitType === 'receivable' && styles.splitTypeButtonTextActive]}>
                      They Owe Me
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.splitTypeButton, { backgroundColor: colors.inputBg, borderColor: colors.border }, splitType === 'payable' && styles.splitTypeButtonActive]}
                    onPress={() => setSplitType('payable')}
                  >
                    <Text style={[styles.splitTypeButtonText, splitType === 'payable' && styles.splitTypeButtonTextActive]}>
                      I Owe Them
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>Owed Amount</Text>
                <TextInput
                  style={[styles.splitAmountInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={splitAmount}
                  onChangeText={setSplitAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}
          </View>
        )}

        {/* Save Transaction Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 1. Custom Calendar Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => handleMonthChange('prev')}>
                <AltArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.calendarMonthName, { color: colors.text }]}>
                {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => handleMonthChange('next')}>
                <AltArrowRight size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Week headers */}
            <View style={styles.weekHeadersRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, index) => (
                <Text key={index} style={[styles.weekLabel, { color: colors.textSecondary }]}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
              {getDaysInMonth(calendarMonth).map((d, index) => {
                if (!d) {
                  return <View key={index} style={styles.dayCellEmpty} />;
                }
                const isSelected = d.toDateString() === transactionDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCellButton,
                      isSelected && styles.dayCellActive,
                      isToday && !isSelected && { borderColor: '#3B82F6', borderWidth: 1 }
                    ]}
                    onPress={() => {
                      setTransactionDate(d);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: colors.text },
                        isSelected && { color: '#FFFFFF', fontWeight: 'bold' }
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel Calendar Button */}
            <TouchableOpacity
              style={[styles.calendarCancelBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Source Wallet Dropdown Modal */}
      <Modal
        visible={showSourceDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSourceDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSourceDropdown(false)}
        >
          <View style={[styles.dropdownOptionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownHeading, { color: colors.textSecondary }]}>SELECT SOURCE WALLET</Text>
            <FlatList
              data={wallets}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedWalletId(item._id);
                    setShowSourceDropdown(false);
                  }}
                >
                  <View style={[styles.walletColorIndicator, { backgroundColor: item.color || '#94A3B8' }]} />
                  <Text style={[styles.dropdownItemText, { color: colors.text }, selectedWalletId === item._id && { fontWeight: '700' }]}>
                    {item.name} ({formatCurrency(item.balance, item.currency)})
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 3. Destination Wallet Dropdown Modal */}
      <Modal
        visible={showDestDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDestDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDestDropdown(false)}
        >
          <View style={[styles.dropdownOptionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownHeading, { color: colors.textSecondary }]}>SELECT DESTINATION WALLET</Text>
            <FlatList
              data={wallets}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedDestWalletId(item._id);
                    setShowDestDropdown(false);
                  }}
                >
                  <View style={[styles.walletColorIndicator, { backgroundColor: item.color || '#94A3B8' }]} />
                  <Text style={[styles.dropdownItemText, { color: colors.text }, selectedDestWalletId === item._id && { fontWeight: '700' }]}>
                    {item.name} ({formatCurrency(item.balance, item.currency)})
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  cancelText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
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
  pillContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 30,
    width: '100%',
  },
  pillButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  pillButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  amountInputBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 2,
  },
  hugeAmountInput: {
    fontSize: 54,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
  },
  descDottedInput: {
    fontSize: 15,
    paddingVertical: 4,
    width: '80%',
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  dropdownSelectBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  dropdownSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdownSelectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 48 - 24) / 4,
    height: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryCardActive: {
    borderColor: '#3B82F6',
    shadowOpacity: 0.05,
  },
  categoryIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  splitSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  splitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  splitExpandable: {
    marginTop: 16,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
  friendScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  friendChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  friendChipActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#059669',
  },
  friendChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  friendChipTextActive: {
    color: '#059669',
  },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitTypeButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTypeButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  splitTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  splitTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  splitAmountInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 24,
  },
  calendarCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthName: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCellEmpty: {
    width: 32,
    height: 32,
    marginVertical: 4,
  },
  dayCellButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dayCellActive: {
    backgroundColor: '#3B82F6',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarCancelBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dropdownOptionsCard: {
    width: '100%',
    maxHeight: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  dropdownHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
