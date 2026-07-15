import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';
import { Wallet, Category } from '../types';

const CURRENCIES = ['USD', 'MMK', 'EUR', 'SGD', 'THB', 'JPY'];
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

interface RecurringSetup {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  walletId: Wallet;
  categoryId: Category;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string;
  isActive: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, clearError, error } = useAuthStore();

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [monthlySalary, setMonthlySalary] = useState(user?.monthlySalary?.toString() || '0');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [notificationSalary, setNotificationSalary] = useState(user?.notificationSalary ?? true);
  const [notificationExpenseLimit, setNotificationExpenseLimit] = useState(user?.notificationExpenseLimit ?? true);
  const [notificationMonthlyFee, setNotificationMonthlyFee] = useState(user?.notificationMonthlyFee ?? true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Recurring Setup list/form states
  const [recurringList, setRecurringList] = useState<RecurringSetup[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // New recurring transaction state
  const [recName, setRecName] = useState('');
  const [recType, setRecType] = useState<'income' | 'expense'>('expense');
  const [recAmount, setRecAmount] = useState('');
  const [recWalletId, setRecWalletId] = useState('');
  const [recCategoryId, setRecCategoryId] = useState('');
  const [recFrequency, setRecFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recNextDueDate, setRecNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreatingRec, setIsCreatingRec] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [walletsRes, catsRes, recRes] = await Promise.all([
          api.get('/wallets'),
          api.get('/categories'),
          api.get('/recurring'),
        ]);

        const walletsData = walletsRes.data.success ? walletsRes.data.data : [];
        const catsData = catsRes.data.success ? catsRes.data.data : [];
        
        setWallets(walletsData);
        setCategories(catsData);
        setRecurringList(recRes.data.success ? recRes.data.data : []);

        if (walletsData.length > 0) setRecWalletId(walletsData[0]._id);
        
        // Pre-select first category that matches type
        const matchCat = catsData.find((c: any) => c.type === 'expense');
        if (matchCat) setRecCategoryId(matchCat._id);

      } catch (err) {
        console.error('Error loading settings data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Update categories select list when type toggles
  useEffect(() => {
    const matchCat = categories.find((c) => c.type === recType);
    if (matchCat) {
      setRecCategoryId(matchCat._id);
    } else {
      setRecCategoryId('');
    }
  }, [recType, categories]);

  const handleSaveProfile = async () => {
    if (!name) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }
    if (isNaN(Number(monthlySalary)) || Number(monthlySalary) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid salary amount');
      return;
    }

    setIsSavingProfile(true);
    setProfileMsg('');
    clearError();

    try {
      await updateProfile({
        name,
        currency,
        monthlySalary: parseFloat(monthlySalary) || 0,
        notificationSalary,
        notificationExpenseLimit,
        notificationMonthlyFee,
      });
      setProfileMsg('Profile settings updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      Alert.alert('Error', error || 'Failed to update settings');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateRecurring = async () => {
    if (!recName.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!recAmount || isNaN(Number(recAmount)) || Number(recAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!recWalletId || !recCategoryId) {
      Alert.alert('Error', 'Please select both wallet and category');
      return;
    }

    const parsedDate = new Date(recNextDueDate);
    if (isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Please enter a valid start date in YYYY-MM-DD format');
      return;
    }

    setIsCreatingRec(true);
    try {
      const response = await api.post('/recurring', {
        name: recName.trim(),
        type: recType,
        amount: parseFloat(recAmount),
        walletId: recWalletId,
        categoryId: recCategoryId,
        frequency: recFrequency,
        nextDueDate: parsedDate.toISOString(),
      });

      if (response.data.success) {
        // Reload list
        const recRes = await api.get('/recurring');
        setRecurringList(recRes.data.success ? recRes.data.data : []);
        
        // Reset form
        setRecName('');
        setRecAmount('');
        setRecNextDueDate(new Date().toISOString().split('T')[0]);
        Alert.alert('Success', `Recurring ${recType} created successfully! Next run scheduled for ${parsedDate.toLocaleDateString()}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create recurring transaction');
    } finally {
      setIsCreatingRec(false);
    }
  };

  const handleToggleRecurringActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.put(`/recurring/${id}`, { isActive: !currentStatus });
      if (res.data.success) {
        setRecurringList(prev =>
          prev.map(item => item._id === id ? { ...item, isActive: !currentStatus } : item)
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle active state');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    Alert.alert(
      'Delete Setup',
      'Are you sure you want to delete this recurring setup? No future automatic transactions will be created.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/recurring/${id}`);
              if (res.data.success) {
                setRecurringList(prev => prev.filter(item => item._id !== id));
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete recurring setup');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* SECTION 1: PROFILE & CURRENCY */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Profile & Preferences</Text>
            
            {profileMsg ? <Text style={styles.successText}>{profileMsg}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monthly Salary (MMK / USD)</Text>
              <TextInput
                style={styles.input}
                value={monthlySalary}
                onChangeText={setMonthlySalary}
                keyboardType="numeric"
                placeholder="Salary Limit"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Base Currency</Text>
              <View style={styles.currencyGrid}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.currencySelector,
                      currency === c && styles.currencySelectorActive,
                    ]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text
                      style={[
                        styles.currencySelectorText,
                        currency === c && styles.currencySelectorTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* SECTION 2: NOTIFICATIONS TOGGLES */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Alert Warning Triggers</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Salary Credit Messages</Text>
              <Switch
                value={notificationSalary}
                onValueChange={setNotificationSalary}
                trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                thumbColor={notificationSalary ? '#059669' : '#CBD5E1'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Expense Limit Alerts (80% Salary)</Text>
              <Switch
                value={notificationExpenseLimit}
                onValueChange={setNotificationExpenseLimit}
                trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                thumbColor={notificationExpenseLimit ? '#059669' : '#CBD5E1'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Monthly Card Fee Warnings</Text>
              <Switch
                value={notificationMonthlyFee}
                onValueChange={setNotificationMonthlyFee}
                trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                thumbColor={notificationMonthlyFee ? '#059669' : '#CBD5E1'}
              />
            </View>

            <TouchableOpacity
              style={styles.saveProfileButton}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveProfileButtonText}>Save Configuration</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* SECTION 3: RECURRING AUTO-CREATE SETUP */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Auto-Create Transactions Setup</Text>
            <Text style={styles.subtext}>Pre-setup automatically created salaries, recurring incomes, or monthly fee expenses.</Text>

            {/* CREATE RECURRING FORM */}
            <View style={styles.recForm}>
              <Text style={styles.formSubtitle}>Create Auto-Trigger Setup</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title / Merchant (e.g. Salary, Dept Fee)</Text>
                <TextInput
                  style={styles.input}
                  value={recName}
                  onChangeText={setRecName}
                  placeholder="Enter title"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transaction Type</Text>
                <View style={styles.typeGrid}>
                  <TouchableOpacity
                    style={[styles.typeBtn, recType === 'expense' && styles.typeBtnActiveExpense]}
                    onPress={() => setRecType('expense')}
                  >
                    <Text style={[styles.typeBtnText, recType === 'expense' && styles.typeBtnTextActive]}>Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, recType === 'income' && styles.typeBtnActiveIncome]}
                    onPress={() => setRecType('income')}
                  >
                    <Text style={[styles.typeBtnText, recType === 'income' && styles.typeBtnTextActive]}>Income</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={recAmount}
                  onChangeText={setRecAmount}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Wallet</Text>
                <View style={styles.selectorGrid}>
                  {wallets.map((w) => (
                    <TouchableOpacity
                      key={w._id}
                      style={[
                        styles.selectorCard,
                        recWalletId === w._id && { borderColor: w.color, borderWidth: 2 },
                      ]}
                      onPress={() => setRecWalletId(w._id)}
                    >
                      <View style={[styles.colorDot, { backgroundColor: w.color }]} />
                      <Text style={styles.selectorCardText}>{w.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.selectorGrid}>
                  {categories.filter(c => c.type === recType).map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[
                        styles.selectorCard,
                        recCategoryId === c._id && { borderColor: c.color, borderWidth: 2 },
                      ]}
                      onPress={() => setRecCategoryId(c._id)}
                    >
                      <Text style={styles.emojiDot}>{c.emoji}</Text>
                      <Text style={styles.selectorCardText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencyGrid}>
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.frequencyBtn,
                        recFrequency === f && styles.frequencyBtnActive,
                      ]}
                      onPress={() => setRecFrequency(f as any)}
                    >
                      <Text style={[styles.frequencyBtnText, recFrequency === f && styles.frequencyBtnTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Next Run Date (Start Date)</Text>
                <TextInput
                  style={styles.input}
                  value={recNextDueDate}
                  onChangeText={setRecNextDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Enter start date in YYYY-MM-DD format (defaults to today).
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addRecButton}
                onPress={handleCreateRecurring}
                disabled={isCreatingRec}
              >
                {isCreatingRec ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.addRecButtonText}>Add Auto-Create Setup</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* LIST OF RECURRING */}
            <Text style={styles.listSubtitle}>Active Auto-Create Setups</Text>
            {recurringList.length === 0 ? (
              <Text style={styles.emptyListText}>No pre-setup auto transactions found.</Text>
            ) : (
              recurringList.map((item) => (
                <View key={item._id} style={styles.recItemCard}>
                  <View style={styles.recItemHeader}>
                    <View>
                      <Text style={styles.recItemTitle}>{item.name}</Text>
                      <Text style={styles.recItemSub}>
                        {item.frequency.toUpperCase()} • {formatCurrency(item.amount, user?.currency)}
                      </Text>
                    </View>
                    <View style={styles.recActionsRow}>
                      <Switch
                        value={item.isActive}
                        onValueChange={() => handleToggleRecurringActive(item._id, item.isActive)}
                        trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                        thumbColor={item.isActive ? '#059669' : '#CBD5E1'}
                      />
                      <TouchableOpacity onPress={() => handleDeleteRecurring(item._id)} style={styles.deleteBtn}>
                        <FontAwesome name="trash" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.recDetailsRow}>
                    <Text style={styles.recMetaText}>Wallet: {item.walletId?.name || 'Deleted'}</Text>
                    <Text style={styles.recMetaText}>
                      Next Run:{' '}
                      {new Date(item.nextDueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  subtext: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    fontFamily: 'System',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  currencySelector: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
  currencySelectorActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  currencySelectorText: {
    fontFamily: 'System',
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  currencySelectorTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchLabel: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  saveProfileButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveProfileButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  successText: {
    fontFamily: 'System',
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  recForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  formSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActiveExpense: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  typeBtnText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#0F172A',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emojiDot: {
    fontSize: 14,
  },
  selectorCardText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  frequencyBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  frequencyBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  frequencyBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  frequencyBtnTextActive: {
    color: '#FFFFFF',
  },
  addRecButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  addRecButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  emptyListText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  recItemCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  recItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recItemTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  recItemSub: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FFE4E6',
    borderRadius: 8,
  },
  recDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  recMetaText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#64748B',
  },
});
