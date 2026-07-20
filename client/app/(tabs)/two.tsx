import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import api from '../../services/api';
import { Wallet, Transaction } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import CustomAlert from '../../components/CustomAlert';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

// Solar Icons imports
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  Dollar,
  Home2,
  Bag,
  Widget,
  AddCircle,
  ArrowLeftDown,
  ArrowRightUp,
} from '@solar-icons/react-native/Bold';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
const TYPES = [
  { label: 'Cash', value: 'cash', icon: 'money' },
  { label: 'Bank Account', value: 'bank', icon: 'bank' },
  { label: 'Mobile Wallet', value: 'mobile_wallet', icon: 'mobile' },
  { label: 'Credit Card', value: 'credit_card', icon: 'credit-card' },
  { label: 'Other', value: 'other', icon: 'question-circle' },
];

interface WalletCardItemProps {
  wallet: Wallet;
  isActive: boolean;
  onSelect: () => void;
  handleStartEditWallet: (w: Wallet) => void;
  handleDeleteWallet: (w: Wallet) => void;
  colors: any;
  isDark: boolean;
}

function WalletCardItem({
  wallet,
  isActive,
  onSelect,
  handleStartEditWallet,
  handleDeleteWallet,
  colors,
  isDark,
}: WalletCardItemProps) {
  const cardScale = useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect();
  };

  const idStr = wallet._id || '1234567890123456';
  const lastFour = idStr.substring(idStr.length - 4);
  const cardNumber = `1234  ••••  ••••  ${lastFour}`;

  const isCreditCard = wallet.type === 'credit_card';
  const limit = wallet.creditLimit || 0;
  const remainingCredit = limit + Number(wallet.balance);

  const cardBg = wallet.color || '#8B5CF6';
  const footerBg = 'rgba(0, 0, 0, 0.2)'; // Translucent black strip for premium look

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={animatePress}
        style={[
          styles.walletCard,
          {
            backgroundColor: cardBg,
            borderColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
            borderWidth: isActive ? 3 : 1,
          },
        ]}
      >
        {/* Card Top */}
        <View style={styles.cardTop}>
          <View>
            <Text style={[styles.cardTotalLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>
              {isCreditCard ? 'Available Credit' : 'Total Balance'}
            </Text>
            <Text style={[styles.cardBalanceText, { color: '#FFFFFF' }]}>
              {isCreditCard 
                ? formatCurrency(remainingCredit, wallet.currency) 
                : formatCurrency(wallet.balance, wallet.currency)}
            </Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={[styles.logoText, { color: 'rgba(255, 255, 255, 0.8)' }]}>LOGO</Text>
          </View>
        </View>

        {/* Card Middle */}
        <View style={styles.cardMiddle}>
          <Text style={[styles.cardNumberText, { color: 'rgba(255, 255, 255, 0.95)' }]}>
            {cardNumber}
          </Text>
        </View>

        {/* Card Bottom Strip */}
        <View style={[styles.cardFooterStrip, { backgroundColor: footerBg }]}>
          <View>
            <Text style={[styles.footerLabel, { color: 'rgba(255, 255, 255, 0.65)' }]}>Name</Text>
            <Text style={styles.footerName}>{wallet.name}</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.footerActionBtn} onPress={() => handleStartEditWallet(wallet)}>
              <FontAwesome name="pencil" size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerActionBtn} onPress={() => handleDeleteWallet(wallet)}>
              <FontAwesome name="trash" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WalletsScreen() {
  const { colors, isDark } = useThemeColors();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  // Add/Edit Wallet Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedType, setSelectedType] = useState('bank');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bottom Sheet Slide Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Custom Alert Popups State
  const [alertDialog, setAlertDialog] = useState({
    visible: false,
    type: 'alert' as 'alert' | 'confirm',
    title: '',
    message: '',
    severity: 'info' as 'success' | 'warning' | 'danger' | 'info',
    onConfirm: () => {},
  });

  const triggerAlert = (title: string, message: string, severity: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setAlertDialog({
      visible: true,
      type: 'alert',
      title,
      message,
      severity,
      onConfirm: () => {},
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertDialog({
      visible: true,
      type: 'confirm',
      title,
      message,
      severity: 'danger',
      onConfirm,
    });
  };

  const fetchWallets = async () => {
    try {
      const res = await api.get('/wallets');
      if (res.data.success) {
        const walletsData = res.data.data;
        setWallets(walletsData);
        if (walletsData.length > 0 && !selectedWalletId) {
          setSelectedWalletId(walletsData[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching wallets:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWalletTransactions = async (walletId: string) => {
    setLoadingTransactions(true);
    try {
      const res = await api.get(`/transactions?walletId=${walletId}&limit=50`);
      if (res.data.success) {
        setWalletTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  useEffect(() => {
    if (selectedWalletId) {
      fetchWalletTransactions(selectedWalletId);
    } else {
      setWalletTransactions([]);
    }
  }, [selectedWalletId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallets();
    if (selectedWalletId) {
      fetchWalletTransactions(selectedWalletId);
    }
  };

  const openBottomSheet = () => {
    setIsAdding(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      resetForm();
    });
  };

  const handleAddWallet = async () => {
    if (!name) {
      setFormError('Wallet name is required');
      return;
    }
    if (selectedType === 'credit_card' && (!creditLimit || isNaN(Number(creditLimit)) || Number(creditLimit) <= 0)) {
      setFormError('Please enter a valid credit limit');
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        balance: selectedType === 'credit_card' ? -(parseFloat(balance) || 0) : (parseFloat(balance) || 0),
        currency: user?.currency || 'USD',
        color: selectedColor,
        type: selectedType,
        creditLimit: selectedType === 'credit_card' ? parseFloat(creditLimit) : undefined,
        icon: selectedType === 'bank' ? 'account-balance' : selectedType === 'mobile_wallet' ? 'phone-android' : 'account-balance-wallet',
      };

      let response;
      if (editingWalletId) {
        response = await api.put(`/wallets/${editingWalletId}`, payload);
      } else {
        response = await api.post('/wallets', payload);
      }

      if (response.data.success) {
        closeBottomSheet();
        fetchWallets();
        triggerAlert(
          'Success',
          editingWalletId ? 'Wallet updated successfully!' : 'New Wallet created successfully!',
          'success'
        );
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditWallet = (wallet: Wallet) => {
    setEditingWalletId(wallet._id);
    setName(wallet.name);
    setBalance(Math.abs(wallet.balance).toString());
    setCreditLimit(wallet.creditLimit?.toString() || '');
    setSelectedColor(wallet.color);
    setSelectedType(wallet.type);
    openBottomSheet();
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    triggerConfirm(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"? Active transactions mapped to this wallet will remain, but the wallet mapping itself will be removed.`,
      async () => {
        try {
          const res = await api.delete(`/wallets/${wallet._id}`);
          if (res.data.success) {
            if (selectedWalletId === wallet._id) {
              setSelectedWalletId(null);
            }
            fetchWallets();
          }
        } catch (err) {
          triggerAlert('Error', 'Failed to delete wallet', 'danger');
        }
      }
    );
  };

  const resetForm = () => {
    setName('');
    setBalance('');
    setCreditLimit('');
    setSelectedColor(COLORS[0]);
    setSelectedType('bank');
    setEditingWalletId(null);
    setIsAdding(false);
  };

  const getCategoryIcon = (category: any) => {
    if (category?.emoji) {
      const IconComponent = (SolarBold as any)[category.emoji];
      if (IconComponent) {
        return <IconComponent size={18} color={category.color || '#8B5CF6'} />;
      }
    }
    const name = (category?.name || '').toLowerCase();
    if (name.includes('salary') || name.includes('income') || name.includes('paycheck') || name.includes('freelance')) {
      return <Dollar size={18} color="#10B981" />;
    }
    if (name.includes('rent') || name.includes('home') || name.includes('house') || name.includes('utility') || name.includes('bill')) {
      return <Home2 size={18} color="#3B82F6" />;
    }
    if (name.includes('shop') || name.includes('grocery') || name.includes('food') || name.includes('dining')) {
      return <Bag size={18} color="#EC4899" />;
    }
    return <Widget size={18} color="#8B5CF6" />;
  };

  const getWalletMonthlyStatus = () => {
    let income = 0;
    let expense = 0;
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    walletTransactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate >= currentMonthStart) {
        if (t.type === 'income') {
          income += Number(t.amount);
        } else if (t.type === 'expense') {
          expense += Number(t.amount);
        }
      }
    });

    return { income, expense };
  };

  const monthlyStatus = getWalletMonthlyStatus();
  const currentWallet = wallets.find(w => w._id === selectedWalletId);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Header */}
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wallet</Text>

        {/* Wallets Horizontal card scroll section */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletsHorizontalScroll}
        >
          {/* Add Wallet dashed button */}
          <TouchableOpacity
            style={[styles.addDashedButton, { borderColor: colors.border }]}
            onPress={openBottomSheet}
          >
            <AddCircle size={28} color={isDark ? '#94A3B8' : '#475569'} />
          </TouchableOpacity>

          {wallets.map((wallet) => (
            <WalletCardItem
              key={wallet._id}
              wallet={wallet}
              isActive={selectedWalletId === wallet._id}
              onSelect={() => setSelectedWalletId(wallet._id)}
              handleStartEditWallet={handleStartEditWallet}
              handleDeleteWallet={handleDeleteWallet}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </ScrollView>

        {/* KPI Monthly Status Section (Income vs Expense) */}
        {selectedWalletId && (
          <View style={styles.statusSectionContainer}>
            <Text style={[styles.statusSectionTitle, { color: colors.text }]}>Monthly Status</Text>
            <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Income Block */}
              <View style={styles.statusColumn}>
                <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <ArrowLeftDown size={18} color="#10B981" />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Income</Text>
                  <Text style={[styles.statusValue, { color: '#10B981' }]}>
                    {formatCurrency(monthlyStatus.income, currentWallet?.currency)}
                  </Text>
                </View>
              </View>

              {/* Middle vertical divider */}
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />

              {/* Expense Block */}
              <View style={styles.statusColumn}>
                <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <ArrowRightUp size={18} color="#EF4444" />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Expense</Text>
                  <Text style={[styles.statusValue, { color: '#EF4444' }]}>
                    {formatCurrency(monthlyStatus.expense, currentWallet?.currency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Selected Wallet Transactions Header */}
        <View style={styles.transactionsHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
          <TouchableOpacity
            style={[styles.slidersBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/transactions')}
          >
            <FontAwesome name="sliders" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        {loadingTransactions ? (
          <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 20 }} />
        ) : walletTransactions.length === 0 ? (
          <View style={[styles.emptyTxContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Widget size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTxText, { color: colors.textSecondary }]}>
              No transactions recorded for this wallet.
            </Text>
          </View>
        ) : (
          <View style={styles.txListContainer}>
            {walletTransactions.map((t) => {
              const isIncome = t.type === 'income';
              const isTransfer = t.type === 'transfer';
              const symbol = isIncome ? '+' : isTransfer ? '' : '-';
              const amountColor = isIncome ? '#10B981' : isTransfer ? '#3B82F6' : '#0F172A';
              const typeLabel = isIncome ? 'Income' : isTransfer ? 'Transfer' : 'Outcome';

              return (
                <TouchableOpacity
                  key={t._id}
                  style={[styles.transactionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/modal?editId=${t._id}`)}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: colors.border }]}>
                    {getCategoryIcon(t.categoryId)}
                  </View>
                  <View style={styles.detailsContainer}>
                    <Text style={[styles.txDescription, { color: colors.text }]}>{t.description || t.categoryId?.name}</Text>
                    <Text style={[styles.txCategory, { color: colors.textSecondary }]}>
                      {new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })} · {new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </Text>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={[styles.txAmount, { color: isDark && !isIncome && !isTransfer ? '#FFFFFF' : amountColor }]}>
                      {symbol}{formatCurrency(t.amount, user?.currency)}
                    </Text>
                    <Text style={[styles.txTypeLabel, { color: colors.textSecondary }]}>
                      {typeLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Rise-from-bottom Sheet modal for adding/editing wallets */}
      <Modal
        visible={isAdding}
        transparent
        animationType="fade"
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={closeBottomSheet}
          />
          <Animated.View
            style={[
              styles.sheetContent,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Grabber indicator */}
            <View style={[styles.sheetGrabber, { backgroundColor: colors.border }]} />

            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingWalletId ? 'Edit Wallet Details' : 'New Wallet Details'}
            </Text>
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Wallet Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Chase Bank, Pocket Cash"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {selectedType === 'credit_card' ? 'Current Debt (Spent)' : 'Initial Balance'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={balance}
                  onChangeText={setBalance}
                />
              </View>

              {/* Credit Limit Input for Credit Card */}
              {selectedType === 'credit_card' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Credit Limit</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. 5000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                  />
                </View>
              )}

              {/* Type Grid Selector */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Wallet Type</Text>
              <View style={styles.typeGrid}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeSelector,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      selectedType === t.value && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                    ]}
                    onPress={() => setSelectedType(t.value)}
                  >
                    <FontAwesome
                      name={t.icon as any}
                      size={14}
                      color={selectedType === t.value ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeSelectorText,
                        { color: colors.textSecondary },
                        selectedType === t.value && { color: '#FFFFFF', fontWeight: 'bold' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Grid Selector */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Card Theme Color</Text>
              <View style={styles.colorGrid}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddWallet}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingWalletId ? 'Update Wallet' : 'Create Wallet'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertDialog.visible}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        severity={alertDialog.severity}
        onClose={() => setAlertDialog((prev) => ({ ...prev, visible: false }))}
        onConfirm={alertDialog.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    textAlign: 'center',
  },
  walletsHorizontalScroll: {
    paddingLeft: 24,
    paddingRight: 12,
    paddingBottom: 16,
    gap: 12,
  },
  addDashedButton: {
    width: 64,
    height: 160,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCard: {
    width: 270,
    height: 160,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  cardTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBalanceText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  logoContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardMiddle: {
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  cardNumberText: {
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: '500',
  },
  cardFooterStrip: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
  },
  footerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  footerActionBtn: {
    padding: 6,
  },
  statusSectionContainer: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  statusSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  statusColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
  },
  statusIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: '70%',
  },
  transactionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  slidersBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyTxText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  txListContainer: {
    paddingHorizontal: 24,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailsContainer: {
    flex: 1,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  txCategory: {
    fontSize: 11,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txTypeLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  sheetGrabber: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  typeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    margin: 4,
  },
  typeSelectorText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  colorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
