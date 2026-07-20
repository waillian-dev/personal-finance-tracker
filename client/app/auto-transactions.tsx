import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import api from '../services/api';
import { Wallet, Category } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { useThemeColors } from '../hooks/useThemeColors';
import CustomAlert from '../components/CustomAlert';

// Solar Icons
import { AltArrowLeft } from '@solar-icons/react-native/Outline';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  AltArrowDown,
  Refresh,
} from '@solar-icons/react-native/Bold';

interface RecurringSetup {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string;
  isActive: boolean;
  walletId?: Wallet;
  categoryId?: Category;
}

export default function AutoTransactionsScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { user } = useAuthStore();

  const [recurringList, setRecurringList] = useState<RecurringSetup[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown States
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFreqDropdown, setShowFreqDropdown] = useState(false);

  // Alert
  const [alertState, setAlertState] = useState({
    visible: false,
    type: 'alert' as 'alert' | 'confirm',
    title: '',
    message: '',
    severity: 'info' as 'success' | 'warning' | 'danger' | 'info',
    onConfirm: () => {},
  });

  const triggerAlert = (title: string, message: string, severity: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setAlertState({
      visible: true,
      type: 'alert',
      title,
      message,
      severity,
      onConfirm: () => {},
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, severity: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setAlertState({
      visible: true,
      type: 'confirm',
      title,
      message,
      severity,
      onConfirm,
    });
  };

  const loadData = async () => {
    try {
      const [walletsRes, catsRes, recRes] = await Promise.all([
        api.get('/wallets'),
        api.get('/categories'),
        api.get('/recurring'),
      ]);

      const loadedWallets = walletsRes.data.success ? walletsRes.data.data : [];
      const loadedCats = catsRes.data.success ? catsRes.data.data : [];

      setWallets(loadedWallets);
      setCategories(loadedCats);
      setRecurringList(recRes.data.success ? recRes.data.data : []);

      if (loadedWallets.length > 0) {
        setSelectedWalletId(loadedWallets[0]._id);
      }
      
      const firstCat = loadedCats.find((c: Category) => c.type === 'expense');
      if (firstCat) {
        setSelectedCategoryId(firstCat._id);
      }
    } catch (err) {
      console.error('Failed to load auto transactions dependencies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync category selection on type switch
  useEffect(() => {
    const match = categories.find((c) => c.type === type);
    if (match) {
      setSelectedCategoryId(match._id);
    }
  }, [type, categories]);

  const handleCreate = async () => {
    if (!name.trim()) {
      triggerAlert('Validation Error', 'Please enter a title description', 'danger');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      triggerAlert('Validation Error', 'Please enter a valid amount', 'danger');
      return;
    }
    if (!selectedWalletId || !selectedCategoryId) {
      triggerAlert('Validation Error', 'Please select a wallet and category', 'danger');
      return;
    }

    const dateVal = new Date(startDate);
    if (isNaN(dateVal.getTime())) {
      triggerAlert('Validation Error', 'Please enter a valid date (YYYY-MM-DD)', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/recurring', {
        name: name.trim(),
        type,
        amount: parseFloat(amount),
        walletId: selectedWalletId,
        categoryId: selectedCategoryId,
        frequency,
        nextDueDate: dateVal.toISOString(),
      });

      if (res.data.success) {
        triggerAlert('Success', `Recurring ${type} scheduled successfully!`, 'success');
        setName('');
        setAmount('');
        setStartDate(new Date().toISOString().split('T')[0]);
        loadData();
      }
    } catch (err: any) {
      triggerAlert('Error', err.response?.data?.error || 'Failed to schedule transaction', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.put(`/recurring/${id}`, { isActive: !currentStatus });
      if (res.data.success) {
        setRecurringList(prev =>
          prev.map(item => item._id === id ? { ...item, isActive: !currentStatus } : item)
        );
      }
    } catch (err) {
      triggerAlert('Error', 'Failed to toggle recurring schedule state', 'danger');
    }
  };

  const handleDelete = async (id: string) => {
    triggerConfirm(
      'Delete Schedule',
      'Are you sure you want to delete this auto-create schedule? No future transactions will be generated.',
      async () => {
        try {
          const res = await api.delete(`/recurring/${id}`);
          if (res.data.success) {
            setRecurringList(prev => prev.filter(item => item._id !== id));
            triggerAlert('Success', 'Recurring setup deleted successfully', 'success');
          }
        } catch (err) {
          triggerAlert('Error', 'Failed to delete setup', 'danger');
        }
      },
      'danger'
    );
  };

  const currentWallet = wallets.find(w => w._id === selectedWalletId);
  const currentCategory = categories.find(c => c._id === selectedCategoryId);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Auto-Transactions</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Form Container Card */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeading, { color: colors.text }]}>Add Auto-Create Setup</Text>

          {/* Title description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Title / Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Monthly Salary Baseline, Gym Membership"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Income vs Expense Toggle buttons */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: '#EF4444' }]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.toggleBtnText, type === 'expense' && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                Expense Setup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: '#10B981' }]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.toggleBtnText, type === 'income' && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                Income Setup
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          {/* Wallet Dropdown select */}
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Select Wallet</Text>
          <TouchableOpacity
            style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowWalletDropdown(true)}
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

          {/* Category Dropdown select */}
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>Select Category</Text>
          <TouchableOpacity
            style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <View style={styles.dropdownSelectLeft}>
              <Text style={[styles.dropdownSelectText, { color: colors.text }]}>
                {currentCategory ? `${currentCategory.emoji || '📦'} ${currentCategory.name}` : 'Select Category'}
              </Text>
            </View>
            <AltArrowDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Frequency Dropdown select */}
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>Frequency Interval</Text>
          <TouchableOpacity
            style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowFreqDropdown(true)}
          >
            <View style={styles.dropdownSelectLeft}>
              <Refresh size={18} color={colors.textSecondary} />
              <Text style={[styles.dropdownSelectText, { color: colors.text, textTransform: 'capitalize' }]}>
                {frequency}
              </Text>
            </View>
            <AltArrowDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Start Date input */}
          <View style={[styles.inputGroup, { marginTop: 14 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Starting Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="e.g. 2026-07-20"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: type === 'income' ? '#10B981' : '#EF4444' }]}
            onPress={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Schedule Transaction</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Schedules list section */}
        <Text style={[styles.timelineHeading, { color: colors.text }]}>Scheduled Setup Logs</Text>
        {recurringList.length === 0 ? (
          <View style={[styles.emptyList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
              No automated transaction setups scheduled.
            </Text>
          </View>
        ) : (
          recurringList.map((item) => (
            <View key={item._id} style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scheduleLeft}>
                <View style={[styles.frequencyBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <Text style={[styles.frequencyBadgeText, { color: colors.textSecondary }]}>
                    {item.frequency.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={[styles.scheduleName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.scheduleSub, { color: colors.textSecondary }]}>
                    Next: {new Date(item.nextDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>

              <View style={styles.scheduleRight}>
                <Text style={[styles.scheduleAmount, { color: item.type === 'income' ? '#10B981' : '#EF4444' }]}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount, user?.currency)}
                </Text>
                
                <View style={styles.controlsRow}>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleActive(item._id, item.isActive)}
                    trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                    thumbColor="#FFFFFF"
                  />
                  <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.trashBtn}>
                    <FontAwesome name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Wallet Selector Dropdown Modal */}
      <Modal
        visible={showWalletDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWalletDropdown(false)}
        >
          <View style={[styles.dropdownOptionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownHeading, { color: colors.textSecondary }]}>SELECT WALLET</Text>
            <FlatList
              data={wallets}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedWalletId(item._id);
                    setShowWalletDropdown(false);
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

      {/* Category Selector Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={[styles.dropdownOptionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownHeading, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
            <FlatList
              data={categories.filter(c => c.type === type)}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedCategoryId(item._id);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }, selectedCategoryId === item._id && { fontWeight: '700' }]}>
                    {item.emoji || '📦'} {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Frequency Selector Dropdown Modal */}
      <Modal
        visible={showFreqDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFreqDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFreqDropdown(false)}
        >
          <View style={[styles.dropdownOptionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownHeading, { color: colors.textSecondary }]}>SELECT FREQUENCY</Text>
            {['daily', 'weekly', 'monthly', 'yearly'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setFrequency(item as any);
                  setShowFreqDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: colors.text, textTransform: 'capitalize' }, frequency === item && { fontWeight: '700' }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        severity={alertState.severity}
        onClose={() => setAlertState(prev => ({ ...prev, visible: false }))}
        onConfirm={alertState.onConfirm}
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginVertical: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  toggleBtnText: {
    fontSize: 12,
    color: '#64748B',
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
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  timelineHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  emptyList: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  frequencyBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  scheduleRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  scheduleAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trashBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 24,
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
