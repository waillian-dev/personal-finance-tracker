import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import CustomAlert from '../components/CustomAlert';
import { useThemeColors } from '../hooks/useThemeColors';
import { AltArrowLeft } from '@solar-icons/react-native/Bold';

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
  const { friendId, friendName } = useLocalSearchParams();
  const { user } = useAuthStore();

  const [transactions, setTransactions] = useState<LedgerItem[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMe, setPaidByMe] = useState(true);
  const [split50, setSplit50] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settlement States
  const [wallets, setWallets] = useState<any[]>([]);
  const [showSettleForm, setShowSettleForm] = useState(false);
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

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertDialog({
      visible: true,
      type: 'confirm',
      title,
      message,
      severity: 'warning',
      onConfirm,
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

      // Read updated net balance from friends list mapping
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
        setDescription('');
        setAmount('');
        loadLedgerData();
        triggerAlert('Success', 'Ledger expense logged successfully!', 'success');
      }
    } catch (err: any) {
      triggerAlert('Error', err.response?.data?.error || 'Failed to log shared expense', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleUp = () => {
    if (netBalance === 0) {
      triggerAlert('Settle Up', 'All balances are already settled!', 'info');
      return;
    }
    setSettleAmount(absBalance.toString());
    setShowSettleForm(true);
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
        setShowSettleForm(false);
        setSyncWithWallet(false);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{friendName || 'Ledger'}</Text>
        <TouchableOpacity style={styles.settleHeaderBtn} onPress={handleSettleUp}>
          <Text style={styles.settleHeaderBtnText}>Settle</Text>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertDialog.visible}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        severity={alertDialog.severity}
        onClose={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
        onConfirm={alertDialog.onConfirm}
      />

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* NET BALANCE DISPLAY */}
          <View style={[
            styles.balanceBanner,
            owesMe ? styles.bannerOwesMe : iOwe ? styles.bannerIOwe : [styles.bannerSettled, { backgroundColor: colors.card, borderColor: colors.border }]
          ]}>
            <View style={styles.bannerInfo}>
              <FontAwesome
                name={owesMe ? 'arrow-circle-down' : iOwe ? 'arrow-circle-up' : 'check-circle'}
                size={22}
                color={owesMe ? '#10B981' : iOwe ? '#EF4444' : colors.textSecondary}
              />
              <Text style={[
                styles.bannerText,
                { color: owesMe ? '#047857' : iOwe ? '#B91C1C' : colors.text }
              ]}>
                {owesMe
                  ? `${friendName} owes you ${formatCurrency(absBalance, user?.currency || 'USD')}`
                  : iOwe
                  ? `You owe ${friendName} ${formatCurrency(absBalance, user?.currency || 'USD')}`
                  : 'All settled up'}
              </Text>
            </View>
          </View>

          {/* SETTLE UP FORM CARD */}
          {showSettleForm && (
            <View style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Record Settle Up Payment</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Amount ({user?.currency})</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={settleAmount}
                  onChangeText={setSettleAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.subActionBtn}
                    onPress={() => setSettleAmount(absBalance.toString())}
                  >
                    <Text style={styles.subActionBtnText}>
                      Settle Full ({formatCurrency(absBalance, user?.currency)})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.splitCheckboxRow, { marginBottom: 16 }]}
                onPress={() => setSyncWithWallet(!syncWithWallet)}
              >
                <FontAwesome
                  name={syncWithWallet ? 'check-square' : 'square-o'}
                  size={18}
                  color={syncWithWallet ? '#059669' : '#64748B'}
                />
                <Text style={[styles.splitCheckboxLabel, { color: colors.text }]}>Record transaction in my wallet</Text>
              </TouchableOpacity>

              {syncWithWallet && wallets.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Select Wallet to Sync</Text>
                  <View style={styles.splitToggleGrid}>
                    {wallets.map((w) => (
                      <TouchableOpacity
                        key={w._id}
                        style={[
                          styles.toggleBtn,
                          { backgroundColor: colors.inputBg, borderColor: colors.border },
                          settleWalletId === w._id && styles.toggleBtnActive,
                        ]}
                        onPress={() => setSettleWalletId(w._id)}
                      >
                        <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, settleWalletId === w._id && styles.toggleBtnTextActive]}>
                          {w.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSettleForm(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1.5, marginTop: 0 }]}
                  onPress={submitSettlementPayment}
                  disabled={isSettleSubmitting}
                >
                  {isSettleSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ADD SPLIT EXPENSE CARD */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Add Shared Expense</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Dinner split, Uber ride"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Total Amount Paid</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Who Paid?</Text>
                <View style={styles.splitToggleGrid}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, paidByMe && styles.toggleBtnActive]}
                    onPress={() => setPaidByMe(true)}
                  >
                    <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, paidByMe && styles.toggleBtnTextActive]}>You</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, !paidByMe && styles.toggleBtnActive]}
                    onPress={() => setPaidByMe(false)}
                  >
                    <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, !paidByMe && styles.toggleBtnTextActive]}>{friendName}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Split Type</Text>
              <View style={styles.splitToggleGrid}>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, split50 && styles.toggleBtnActive]}
                  onPress={() => setSplit50(true)}
                >
                  <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, split50 && styles.toggleBtnTextActive]}>Split 50/50 (half owed)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, !split50 && styles.toggleBtnActive]}
                  onPress={() => setSplit50(false)}
                >
                  <Text style={[styles.toggleBtnText, { color: colors.textSecondary }, !split50 && styles.toggleBtnTextActive]}>Full Amount (100% owed)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddLedgerItem}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Log Shared Expense</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* LEDGER TRANSACTION LIST */}
          <Text style={[styles.sectionHeader, { color: colors.text }]}>Ledger History</Text>
          {transactions.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FontAwesome name="list-alt" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transaction history with {friendName}.</Text>
            </View>
          ) : (
            transactions.map((t) => {
              const paidByMe = t.paidBy._id === user?._id;
              const isSettled = t.settled;

              return (
                <View key={t._id} style={[styles.ledgerRow, { backgroundColor: colors.card, borderColor: colors.border }, isSettled && styles.settledRow]}>
                  <View style={styles.ledgerInfo}>
                    <Text style={[styles.ledgerDesc, { color: colors.text }, isSettled && styles.settledText]}>
                      {t.description}
                    </Text>
                    <Text style={[styles.ledgerMeta, { color: colors.textSecondary }]}>
                      {paidByMe ? 'You paid' : `${t.paidBy.name} paid`} • {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.ledgerRight}>
                    <Text style={[
                      styles.ledgerAmount,
                      isSettled ? styles.settledText : paidByMe ? styles.amountGreen : styles.amountRed
                    ]}>
                      {isSettled ? '' : paidByMe ? '+' : '-'}
                      {formatCurrency(t.amount, user?.currency || 'USD')}
                    </Text>
                    {isSettled && (
                      <Text style={styles.settledBadge}>settled</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}

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
  settleHeaderBtn: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  settleHeaderBtnText: {
    fontFamily: 'System',
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
    padding: 20,
    paddingBottom: 40,
  },
  balanceBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  bannerOwesMe: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  bannerIOwe: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  bannerSettled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  splitToggleGrid: {
    flexDirection: 'row',
    gap: 6,
    height: 44,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  toggleBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionHeader: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  settledRow: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  ledgerInfo: {
    flex: 1,
  },
  ledgerDesc: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  ledgerMeta: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
  },
  amountGreen: {
    color: '#10B981',
  },
  amountRed: {
    color: '#EF4444',
  },
  settledText: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  settledBadge: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  subActionBtn: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  subActionBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
  },
  splitCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitCheckboxLabel: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontFamily: 'System',
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
