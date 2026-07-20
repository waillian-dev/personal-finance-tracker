import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import CustomAlert from '../components/CustomAlert';
import { useThemeColors } from '../hooks/useThemeColors';

// Solar Icons
import { AltArrowLeft } from '@solar-icons/react-native/Outline';
import {
  Widget,
  AddCircle,
  ArrowLeftDown,
  ArrowRightUp,
} from '@solar-icons/react-native/Bold';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LedgerItem {
  _id: string;
  description: string;
  amount: number;
  paidBy: {
    _id: string;
    name: string;
  };
  owedBy: {
    _id: string;
    name: string;
  };
  settled: boolean;
  createdAt: string;
}

export default function FriendLedgerScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { friendId, friendName: friendNameParam } = useLocalSearchParams();
  const friendName = Array.isArray(friendNameParam) ? friendNameParam[0] : friendNameParam || '';
  const { user } = useAuthStore();

  const [transactions, setTransactions] = useState<LedgerItem[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Form Bottom Drawer states
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const expenseSheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const expenseBackdropOpacity = useRef(new Animated.Value(0)).current;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMe, setPaidByMe] = useState(true);
  const [split50, setSplit50] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settle Up Bottom Drawer states
  const [isSettleSheetOpen, setIsSettleSheetOpen] = useState(false);
  const settleSheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const settleBackdropOpacity = useRef(new Animated.Value(0)).current;

  const [wallets, setWallets] = useState<any[]>([]);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleWalletId, setSettleWalletId] = useState('');
  const [syncWithWallet, setSyncWithWallet] = useState(false);
  const [isSettleSubmitting, setIsSettleSubmitting] = useState(false);

  // Custom alert state
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

  const loadLedgerData = async () => {
    try {
      const [transRes, friendsRes, walletsRes] = await Promise.all([
        api.get(`/ledger/${friendId}`),
        api.get('/friends'),
        api.get('/wallets'),
      ]);

      if (transRes.data.success) {
        setTransactions(transRes.data.data);
      }

      if (friendsRes.data.success) {
        const friendObj = friendsRes.data.data.friends.find(
          (f: any) => f.friend._id === friendId
        );
        if (friendObj) {
          setNetBalance(friendObj.netBalance);
        } else {
          setNetBalance(0);
        }
      }

      if (walletsRes.data.success) {
        const walletsData = walletsRes.data.data || [];
        setWallets(walletsData);
        if (walletsData.length > 0) {
          setSettleWalletId(walletsData[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching ledger details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (friendId) {
      loadLedgerData();
    }
  }, [friendId]);

  // Drawer Animation Controls - Shared Expense Sheet
  const openExpenseSheet = () => {
    setIsExpenseSheetOpen(true);
    Animated.parallel([
      Animated.timing(expenseBackdropOpacity, {
        toValue: 0.4,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(expenseSheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeExpenseSheet = () => {
    Animated.parallel([
      Animated.timing(expenseBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(expenseSheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsExpenseSheetOpen(false);
      setDescription('');
      setAmount('');
    });
  };

  // Drawer Animation Controls - Settle Up Sheet
  const openSettleSheet = () => {
    if (netBalance === 0) {
      triggerAlert('Settle Up', 'All balances are already settled!', 'info');
      return;
    }
    setSettleAmount(absBalance.toString());
    setIsSettleSheetOpen(true);
    Animated.parallel([
      Animated.timing(settleBackdropOpacity, {
        toValue: 0.4,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(settleSheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSettleSheet = () => {
    Animated.parallel([
      Animated.timing(settleBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(settleSheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSettleSheetOpen(false);
      setSettleAmount('');
      setSyncWithWallet(false);
    });
  };

  const handleAddLedgerItem = async () => {
    if (!description.trim()) {
      triggerAlert('Validation Error', 'Description is required', 'warning');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      triggerAlert('Validation Error', 'Please enter a valid amount', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/ledger', {
        description: description.trim(),
        amount: parseFloat(amount),
        friendId,
        paidByMe,
        split50,
      });

      if (res.data.success) {
        closeExpenseSheet();
        loadLedgerData();
        triggerAlert('Success', 'Expense logged successfully!', 'success');
      }
    } catch (err: any) {
      triggerAlert('Error', err.response?.data?.error || 'Failed to log shared expense', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSettlementPayment = async () => {
    if (!settleAmount || isNaN(Number(settleAmount)) || Number(settleAmount) <= 0) {
      triggerAlert('Validation Error', 'Please enter a valid payment amount', 'warning');
      return;
    }

    setIsSettleSubmitting(true);
    try {
      const payload = {
        friendId,
        amount: parseFloat(settleAmount),
        walletId: syncWithWallet ? settleWalletId : undefined,
      };

      const res = await api.post('/ledger/pay', payload);
      if (res.data.success) {
        closeSettleSheet();
        loadLedgerData();
        triggerAlert('Success', 'Settlement payment recorded successfully!', 'success');
      }
    } catch (err: any) {
      triggerAlert('Error', err.response?.data?.error || 'Failed to record settlement', 'danger');
    } finally {
      setIsSettleSubmitting(false);
    }
  };

  const owesMe = netBalance > 0;
  const iOwe = netBalance < 0;
  const absBalance = Math.abs(netBalance);

  // Receivable & Payable calculations
  let receivable = 0;
  let payable = 0;
  transactions.forEach((t) => {
    if (!t.settled) {
      const paidByMe = t.paidBy._id === user?._id;
      // Split 50/50 means 50% is owed, else 100%
      const splitFactor = 0.5; // Since backend splits 50% on half
      // Let's check splits: if paidByMe is true, then friend owes us (Receivable). Otherwise we owe friend (Payable).
      // Since netBalance matches, we can sum them up locally for representation
      const share = t.amount * splitFactor; 
      if (paidByMe) {
        receivable += share;
      } else {
        payable += share;
      }
    }
  });

  // Re-scale net standings
  if (owesMe) {
    receivable = absBalance;
    payable = 0;
  } else if (iOwe) {
    payable = absBalance;
    receivable = 0;
  } else {
    payable = 0;
    receivable = 0;
  }

  // Card themes
  const cardColor = owesMe ? '#10B981' : iOwe ? '#EF4444' : '#64748B';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{friendName || 'Ledger'}</Text>
        <TouchableOpacity style={styles.settleHeaderBtn} onPress={openSettleSheet}>
          <Text style={styles.settleHeaderBtnText}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* 1. FRIEND PROFILE CREDIT CARD */}
          <View style={[styles.profileCard, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>SHARED FRIEND LEDGER</Text>
              <View style={styles.chipWrapper}>
                <Text style={styles.chipText}>
                  {owesMe ? 'OWES YOU' : iOwe ? 'YOU OWE' : 'SETTLED'}
                </Text>
              </View>
            </View>
            
            <View style={styles.cardBalanceRow}>
              <Text style={styles.cardBalanceLabel}>Net Standing Balance</Text>
              <Text style={styles.cardBalanceValue}>
                {owesMe ? '+' : iOwe ? '-' : ''}{formatCurrency(absBalance, user?.currency)}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.footerLabel}>LEDGER HOLDER</Text>
                <Text style={styles.footerValue}>{friendName}</Text>
              </View>
              <Text style={styles.cardSerial}>••••  ••••  ••••  {friendName?.substring(0, 4).toUpperCase()}</Text>
            </View>
          </View>

          {/* 2. RECEIVABLE | PAYABLE KPI STATUS ROW */}
          <View style={styles.statusSectionContainer}>
            <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Receivable (Owes Me) Column */}
              <View style={styles.statusColumn}>
                <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <ArrowLeftDown size={18} color="#10B981" />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Receivable</Text>
                  <Text style={[styles.statusValue, { color: '#10B981' }]}>
                    {formatCurrency(receivable, user?.currency)}
                  </Text>
                </View>
              </View>

              {/* Center Divider */}
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />

              {/* Payable (I Owe) Column */}
              <View style={styles.statusColumn}>
                <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <ArrowRightUp size={18} color="#EF4444" />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Payable</Text>
                  <Text style={[styles.statusValue, { color: '#EF4444' }]}>
                    {formatCurrency(payable, user?.currency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Row - Add Expense trigger */}
          <View style={styles.actionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ledger History Log</Text>
            <TouchableOpacity style={styles.addExpenseBtn} onPress={openExpenseSheet}>
              <AddCircle size={18} color="#3B82F6" />
              <Text style={styles.addExpenseBtnText}>Shared Expense</Text>
            </TouchableOpacity>
          </View>

          {/* 3. LEDGER HISTORY LIST */}
          {transactions.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Widget size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No ledger history recorded yet.</Text>
            </View>
          ) : (
            <View style={styles.ledgerListContainer}>
              {transactions.map((t) => {
                const paidByMe = t.paidBy._id === user?._id;
                const isSettled = t.settled;

                return (
                  <View 
                    key={t._id} 
                    style={[
                      styles.ledgerRow, 
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSettled && styles.settledRow
                    ]}
                  >
                    <View style={styles.ledgerRowLeft}>
                      <View style={[styles.avatarTextCircle, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <Text style={[styles.avatarTextLabel, { color: colors.textSecondary }]}>
                          {t.description.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.ledgerRowDesc, { color: colors.text }, isSettled && styles.settledText]} numberOfLines={1}>
                          {t.description}
                        </Text>
                        <Text style={[styles.ledgerRowMeta, { color: colors.textSecondary }]}>
                          {paidByMe ? 'You paid' : `${t.paidBy.name} paid`} • {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ledgerRowRight}>
                      <Text style={[
                        styles.ledgerRowAmount, 
                        isSettled ? styles.settledText : paidByMe ? styles.amountGreen : styles.amountRed
                      ]}>
                        {isSettled ? '' : paidByMe ? '+' : '-'}{formatCurrency(t.amount, user?.currency)}
                      </Text>
                      {isSettled && (
                        <Text style={styles.settledBadgeLabel}>settled</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* A. BOTTOM DRAWER SHEET - ADD SHARED EXPENSE */}
      <Modal
        visible={isExpenseSheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeExpenseSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeExpenseSheet}>
            <Animated.View style={[styles.backdropBg, { opacity: expenseBackdropOpacity }]} />
          </TouchableOpacity>

          <Animated.View style={[styles.bottomDrawer, { backgroundColor: colors.card, transform: [{ translateY: expenseSheetTranslateY }] }]}>
            <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
            
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Add Shared Expense</Text>
              <TouchableOpacity onPress={closeExpenseSheet}>
                <Text style={styles.drawerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.drawerForm} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Dinner bill, Grocery run"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Total Amount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Who Paid Toggles */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Who Paid?</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: colors.inputBg }, paidByMe && styles.toggleBtnActive]}
                  onPress={() => setPaidByMe(true)}
                >
                  <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, paidByMe && styles.toggleBtnTextActive]}>You Paid</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: colors.inputBg }, !paidByMe && styles.toggleBtnActive]}
                  onPress={() => setPaidByMe(false)}
                >
                  <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, !paidByMe && styles.toggleBtnTextActive]}>{friendName} Paid</Text>
                </TouchableOpacity>
              </View>

              {/* Split options */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>Split Distribution</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: colors.inputBg }, split50 && styles.toggleBtnActive]}
                  onPress={() => setSplit50(true)}
                >
                  <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, split50 && styles.toggleBtnTextActive]}>Split 50/50 (Half)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: colors.inputBg }, !split50 && styles.toggleBtnActive]}
                  onPress={() => setSplit50(false)}
                >
                  <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, !split50 && styles.toggleBtnTextActive]}>100% Owed (Full)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#1E293B' }]}
                onPress={handleAddLedgerItem}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Log Shared Expense</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* B. BOTTOM DRAWER SHEET - SETTLE UP */}
      <Modal
        visible={isSettleSheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeSettleSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeSettleSheet}>
            <Animated.View style={[styles.backdropBg, { opacity: settleBackdropOpacity }]} />
          </TouchableOpacity>

          <Animated.View style={[styles.bottomDrawer, { backgroundColor: colors.card, transform: [{ translateY: settleSheetTranslateY }] }]}>
            <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
            
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Record Settlement Payment</Text>
              <TouchableOpacity onPress={closeSettleSheet}>
                <Text style={styles.drawerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.drawerForm} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Amount ({user?.currency})</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={settleAmount}
                  onChangeText={setSettleAmount}
                />
                <TouchableOpacity
                  style={styles.subActionBtn}
                  onPress={() => setSettleAmount(absBalance.toString())}
                >
                  <Text style={styles.subActionBtnText}>Settle Full Standing Amount ({formatCurrency(absBalance, user?.currency)})</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setSyncWithWallet(!syncWithWallet)}
              >
                <FontAwesome
                  name={syncWithWallet ? 'check-square' : 'square-o'}
                  size={20}
                  color={syncWithWallet ? '#10B981' : '#64748B'}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Sync and deduct/credit from my wallet</Text>
              </TouchableOpacity>

              {syncWithWallet && wallets.length > 0 && (
                <View style={[styles.inputGroup, { marginTop: 14 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Select Wallet to Sync</Text>
                  <View style={styles.walletGrid}>
                    {wallets.map((w) => (
                      <TouchableOpacity
                        key={w._id}
                        style={[
                          styles.walletSelectBtn,
                          { backgroundColor: colors.inputBg, borderColor: colors.border },
                          settleWalletId === w._id && { borderColor: w.color, borderWidth: 2 }
                        ]}
                        onPress={() => setSettleWalletId(w._id)}
                      >
                        <View style={[styles.dotColor, { backgroundColor: w.color }]} />
                        <Text style={[styles.walletSelectText, { color: colors.text }]}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#10B981', marginTop: 20 }]}
                onPress={submitSettlementPayment}
                disabled={isSettleSubmitting}
              >
                {isSettleSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirm Settlement</Text>
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
        onClose={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
        onConfirm={alertDialog.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  settleHeaderBtn: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  settleHeaderBtnText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  profileCard: {
    height: 165,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  chipWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBalanceRow: {
    marginVertical: 4,
  },
  cardBalanceLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  cardBalanceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardSerial: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  statusSectionContainer: {
    marginBottom: 24,
  },
  statusCard: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
  },
  statusColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addExpenseBtnText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
  },
  ledgerListContainer: {
    gap: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  settledRow: {
    opacity: 0.6,
  },
  ledgerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarTextCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  ledgerRowDesc: {
    fontSize: 14,
    fontWeight: '700',
  },
  ledgerRowMeta: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  ledgerRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ledgerRowAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  settledBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settledText: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  amountGreen: {
    color: '#10B981',
  },
  amountRed: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropBg: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bottomDrawer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  dragIndicator: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  drawerCancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  drawerForm: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#3B82F6',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subActionBtn: {
    marginTop: 6,
  },
  subActionBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  walletSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dotColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  walletSelectText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
