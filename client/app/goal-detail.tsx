import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import api from '../services/api';
import { Wallet, Transaction } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { useThemeColors } from '../hooks/useThemeColors';
import CustomAlert from '../components/CustomAlert';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  AltArrowLeft,
  AltArrowDown,
  Dollar,
  Widget,
} from '@solar-icons/react-native/Bold';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SavingGoal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
  isCompleted: boolean;
}

export default function GoalDetailScreen() {
  const { colors, isDark } = useThemeColors();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [goal, setGoal] = useState<SavingGoal | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contribution/Withdrawal states
  const [actionType, setActionType] = useState<'deposit' | 'withdraw' | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [actionError, setActionError] = useState('');

  // Ticker for real-time countdown
  const [tickerTime, setTickerTime] = useState(new Date());

  // Alerts
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
      const [goalRes, walletsRes, txRes] = await Promise.all([
        api.get(`/saving-goals/${id}`),
        api.get('/wallets'),
        api.get('/transactions'),
      ]);

      if (goalRes.data.success) {
        setGoal(goalRes.data.data);
      }
      if (walletsRes.data.success) {
        const loadedWallets = walletsRes.data.data;
        setWallets(loadedWallets);
        if (loadedWallets.length > 0) {
          setSelectedWalletId(loadedWallets[0]._id);
        }
      }
      if (txRes.data.success && goalRes.data.success) {
        const goalName = goalRes.data.data.name;
        // Split title to get base name in case it contains delimiter
        const baseName = goalName.split(/[-:]/)[0].trim().toLowerCase();
        
        const filteredTx = txRes.data.data.filter((t: Transaction) => {
          const desc = t.description?.toLowerCase() || '';
          return desc.includes(baseName) || desc.includes('savings');
        });
        setHistory(filteredTx);
      }
    } catch (err) {
      console.error('Failed to load goal detail data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Ticker timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (targetDateStr?: string) => {
    if (!targetDateStr) return 'No target date set';
    const target = new Date(targetDateStr).getTime();
    const now = tickerTime.getTime();
    const diff = target - now;

    if (diff <= 0) return 'Goal ended / Target date reached';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (num: number) => String(num).padStart(2, '0');

    return `${days} days ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleAction = async () => {
    if (!goal || !actionType) return;
    const amountNum = parseFloat(actionAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Please enter a valid amount');
      return;
    }
    if (!selectedWalletId) {
      setActionError('Please select a wallet');
      return;
    }

    setActionError('');
    setIsSubmitting(true);

    try {
      let res;
      if (actionType === 'deposit') {
        res = await api.post(`/saving-goals/${goal._id}/add-savings`, {
          amount: amountNum,
          walletId: selectedWalletId,
        });
      } else {
        res = await api.post(`/saving-goals/${goal._id}/withdraw-savings`, {
          amount: amountNum,
          walletId: selectedWalletId,
        });
      }

      if (res.data.success) {
        triggerAlert('Success', `${actionType === 'deposit' ? 'Savings added' : 'Savings withdrawn'} successfully!`, 'success');
        setActionAmount('');
        setActionType(null);
        loadData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to complete savings action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = () => {
    if (!goal) return;
    triggerConfirm(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await api.delete(`/saving-goals/${goal._id}`);
          if (res.data.success) {
            router.back();
          }
        } catch (err) {
          triggerAlert('Error', 'Failed to delete goal', 'danger');
        }
      },
      'danger'
    );
  };

  const getGoalIcon = (name: string, color: string) => {
    const lowerName = name.toLowerCase();
    let IconComponent = SolarBold.MedalStar;
    if (lowerName.includes('vacation') || lowerName.includes('trip') || lowerName.includes('mexico') || lowerName.includes('vietnam') || lowerName.includes('travel')) {
      IconComponent = (SolarBold as any)['Plain'] || SolarBold.Widget;
    } else if (lowerName.includes('tech') || lowerName.includes('iphone') || lowerName.includes('phone') || lowerName.includes('computer')) {
      IconComponent = (SolarBold as any)['Smartphone'] || SolarBold.Widget;
    } else if (lowerName.includes('car') || lowerName.includes('bike') || lowerName.includes('vehicle')) {
      IconComponent = (SolarBold as any)['Traffic'] || SolarBold.Widget;
    } else if (lowerName.includes('home') || lowerName.includes('house') || lowerName.includes('rent') || lowerName.includes('apartment')) {
      IconComponent = (SolarBold as any)['Home2'] || SolarBold.Widget;
    } else if (lowerName.includes('study') || lowerName.includes('school') || lowerName.includes('education') || lowerName.includes('college')) {
      IconComponent = (SolarBold as any)['Notebook'] || SolarBold.Widget;
    }

    return (
      <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
        <IconComponent size={24} color={color} />
      </View>
    );
  };

  if (isLoading || !goal) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const nameParts = goal.name.split(/[-:]/);
  const mainTitle = nameParts[0].trim();
  const subtext = nameParts.length > 1 ? nameParts[1].trim() : 'Saving goal details';
  const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  const selectedWallet = wallets.find(w => w._id === selectedWalletId);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Goal Overview</Text>
        <TouchableOpacity onPress={handleDeleteGoal} style={styles.deleteButton}>
          <FontAwesome name="trash" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Goal Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTopRow}>
            {getGoalIcon(goal.name, goal.color)}
            <View style={styles.heroTextContainer}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{mainTitle}</Text>
              <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>{subtext}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${goal.color}15` }]}>
              <Text style={[styles.badgeText, { color: goal.color }]}>{percent}%</Text>
            </View>
          </View>

          {/* Countdown Clock */}
          {goal.targetDate && (
            <View style={[styles.clockRow, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <FontAwesome name="clock-o" size={14} color={colors.textSecondary} />
              <Text style={[styles.clockText, { color: colors.textSecondary }]}>
                {getCountdown(goal.targetDate)}
              </Text>
            </View>
          )}

          {/* Custom Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={[styles.dashedTrack, { borderColor: isDark ? '#475569' : '#CBD5E1' }]} />
            <View style={[styles.solidFillTrack, { width: `${percent}%`, backgroundColor: goal.color }]} />
            <View style={[styles.progressThumb, { left: `${percent}%`, backgroundColor: goal.color }]} />
          </View>

          {/* Saved / Target Amounts */}
          <View style={styles.amountRow}>
            <View>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>SAVED</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>
                {formatCurrency(goal.currentAmount, user?.currency)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>TARGET</Text>
              <Text style={[styles.amountValue, { color: goal.color }]}>
                {formatCurrency(goal.targetAmount, user?.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining Needed</Text>
            <Text style={[styles.statValueBig, { color: colors.text }]}>
              {formatCurrency(remainingAmount, user?.currency)}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goal Status</Text>
            <Text style={[styles.statValueBig, { color: goal.isCompleted ? '#10B981' : '#F59E0B' }]}>
              {goal.isCompleted ? 'Finished' : 'In Progress'}
            </Text>
          </View>
        </View>

        {/* Dynamic Action Area Trigger buttons */}
        {actionType === null ? (
          <View style={styles.triggerButtonRow}>
            <TouchableOpacity
              style={[styles.actionTriggerBtn, { backgroundColor: goal.color }]}
              onPress={() => setActionType('deposit')}
            >
              <FontAwesome name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.actionTriggerText}> Contribute</Text>
            </TouchableOpacity>

            {goal.currentAmount > 0 && (
              <TouchableOpacity
                style={[styles.actionTriggerBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => setActionType('withdraw')}
              >
                <FontAwesome name="minus" size={14} color="#FFFFFF" />
                <Text style={styles.actionTriggerText}> Withdraw</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Expandable Contribution / Withdrawal Form Box */
          <View style={[styles.actionFormCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {actionType === 'deposit' ? 'Contribute to Savings' : 'Withdraw Savings'}
            </Text>

            {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

            {/* Wallet Selector Dropdown */}
            <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>
              {actionType === 'deposit' ? 'PAY FROM WALLET' : 'REFUND TO WALLET'}
            </Text>
            <TouchableOpacity
              style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowWalletDropdown(true)}
            >
              <View style={styles.dropdownSelectLeft}>
                {selectedWallet && (
                  <View style={[styles.walletColorIndicator, { backgroundColor: selectedWallet.color || '#94A3B8' }]} />
                )}
                <Text style={[styles.dropdownSelectText, { color: colors.text }]}>
                  {selectedWallet ? `${selectedWallet.name} (${formatCurrency(selectedWallet.balance, selectedWallet.currency)})` : 'Select Wallet'}
                </Text>
              </View>
              <AltArrowDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Amount Input */}
            <Text style={[styles.selectLabel, { color: colors.textSecondary, marginTop: 16 }]}>AMOUNT</Text>
            <TextInput
              style={[styles.amountInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={actionAmount}
              onChangeText={setActionAmount}
            />

            {/* Form Buttons */}
            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setActionType(null);
                  setActionAmount('');
                  setActionError('');
                }}
              >
                <Text style={[styles.formCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formSubmitBtn, { backgroundColor: actionType === 'deposit' ? goal.color : '#EF4444' }]}
                onPress={handleAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Goal Savings Ledger Logs / Timeline */}
        <Text style={[styles.timelineHeading, { color: colors.text }]}>Savings Timeline</Text>
        {history.length === 0 ? (
          <View style={[styles.emptyHistory, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>
              No savings transactions logged yet
            </Text>
          </View>
        ) : (
          history.map((t) => {
            const isDeposit = t.description?.toLowerCase().includes('contribution') || t.type === 'expense';
            return (
              <View key={t._id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIndicator, { backgroundColor: isDeposit ? '#10B981' : '#EF4444' }]} />
                  <View>
                    <Text style={[styles.historyDesc, { color: colors.text }]} numberOfLines={1}>
                      {t.description || (isDeposit ? 'Savings Contribution' : 'Savings Withdrawal')}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.historyAmount, { color: isDeposit ? '#10B981' : '#EF4444' }]}>
                  {isDeposit ? '+' : '-'}{formatCurrency(t.amount, user?.currency)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Wallet Options Modal Selector */}
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
  deleteButton: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroSubtext: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  clockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarWrapper: {
    height: 6,
    position: 'relative',
    marginTop: 20,
    marginBottom: 16,
  },
  dashedTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  solidFillTrack: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: -4,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValueBig: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  triggerButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionTriggerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTriggerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionFormCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 10,
    borderRadius: 8,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
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
  amountInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  formButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  formCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  formSubmitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  timelineHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  emptyHistory: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIndicator: {
    width: 6,
    height: 24,
    borderRadius: 3,
  },
  historyDesc: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
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
