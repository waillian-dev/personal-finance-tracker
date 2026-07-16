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
  SafeAreaView,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import api from '../../services/api';
import { Wallet } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import CustomAlert from '../../components/CustomAlert';
import { useThemeColors } from '../../hooks/useThemeColors';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

interface SavingGoal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
  isCompleted: boolean;
}

export default function GoalsScreen() {
  const { colors, isDark } = useThemeColors();
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  // Add/Edit Goal Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded interaction for savings contribution/withdrawals
  const [activeGoalIdForDeposit, setActiveGoalIdForDeposit] = useState<string | null>(null);
  const [activeGoalIdForWithdraw, setActiveGoalIdForWithdraw] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

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

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, severity: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setAlertDialog({
      visible: true,
      type: 'confirm',
      title,
      message,
      severity,
      onConfirm,
    });
  };

  const fetchData = async () => {
    try {
      const [goalsRes, walletsRes] = await Promise.all([
        api.get('/saving-goals'),
        api.get('/wallets'),
      ]);

      if (goalsRes.data.success) {
        setGoals(goalsRes.data.data);
      }
      if (walletsRes.data.success) {
        setWallets(walletsRes.data.data);
        if (walletsRes.data.data.length > 0) {
          setSelectedWalletId(walletsRes.data.data[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load goals data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStartEditGoal = (goal: SavingGoal) => {
    setEditingGoalId(goal._id);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setSelectedColor(goal.color);
    setIsAdding(true);
  };

  const handleDeleteGoal = (goal: SavingGoal) => {
    triggerConfirm(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"? Historical savings transactions logged in your ledger will not be deleted.`,
      async () => {
        try {
          const res = await api.delete(`/saving-goals/${goal._id}`);
          if (res.data.success) {
            setGoals(goals.filter((g) => g._id !== goal._id));
            triggerAlert('Success', 'Goal deleted successfully', 'success');
          }
        } catch (err) {
          triggerAlert('Error', 'Failed to delete goal', 'danger');
        }
      },
      'danger'
    );
  };

  const handleCreateOrUpdateGoal = async () => {
    if (!name.trim() || !targetAmount) {
      setFormError('Please add a goal name and target amount');
      return;
    }

    const numericTarget = parseFloat(targetAmount);
    if (isNaN(numericTarget) || numericTarget <= 0) {
      setFormError('Target amount must be greater than zero');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        targetAmount: numericTarget,
        targetDate: targetDate || undefined,
        color: selectedColor,
      };

      let res;
      if (editingGoalId) {
        res = await api.put(`/saving-goals/${editingGoalId}`, payload);
      } else {
        res = await api.post('/saving-goals', payload);
      }

      if (res.data.success) {
        triggerAlert(
          'Success',
          editingGoalId ? 'Goal updated successfully' : 'Goal created successfully',
          'success'
        );
        resetForm();
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to submit goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSavings = async (goalId: string) => {
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Please enter a valid amount greater than zero');
      return;
    }
    if (!selectedWalletId) {
      setActionError('Please select a source wallet');
      return;
    }

    setActionError('');
    setIsActionSubmitting(true);

    try {
      const res = await api.post(`/saving-goals/${goalId}/add-savings`, {
        amount: amountNum,
        walletId: selectedWalletId,
      });

      if (res.data.success) {
        triggerAlert('Success', 'Savings contribution logged successfully!', 'success');
        setActiveGoalIdForDeposit(null);
        setActionAmount('');
        fetchData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to process contribution');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleWithdrawSavings = async (goalId: string) => {
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Please enter a valid amount greater than zero');
      return;
    }
    if (!selectedWalletId) {
      setActionError('Please select a destination wallet');
      return;
    }

    setActionError('');
    setIsActionSubmitting(true);

    try {
      const res = await api.post(`/saving-goals/${goalId}/withdraw-savings`, {
        amount: amountNum,
        walletId: selectedWalletId,
      });

      if (res.data.success) {
        triggerAlert('Success', 'Savings withdrawn successfully!', 'success');
        setActiveGoalIdForWithdraw(null);
        setActionAmount('');
        fetchData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to process withdrawal');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setTargetDate('');
    setSelectedColor(COLORS[0]);
    setEditingGoalId(null);
    setIsAdding(false);
    setFormError('');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Saving Goals</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
          >
            <FontAwesome name={isAdding ? 'close' : 'plus'} size={14} color="#FFFFFF" />
            <Text style={styles.addButtonText}> {isAdding ? 'Cancel' : 'Add Goal'}</Text>
          </TouchableOpacity>
        </View>

        {/* Add / Edit Form Card */}
        {isAdding ? (
          <AnimatedFormCard colors={colors}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingGoalId ? 'Modify Saving Goal' : 'New Goal Details'}
            </Text>
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Goal Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Vacation Trip, Emergency Fund"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Target Amount ({user?.currency || '$'})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Target Date (YYYY-MM-DD - Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 2026-12-31"
                placeholderTextColor="#94A3B8"
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Goal Theme Color</Text>
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
              onPress={handleCreateOrUpdateGoal}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingGoalId ? 'Update Saving Goal' : 'Create Saving Goal'}
                </Text>
              )}
            </TouchableOpacity>
          </AnimatedFormCard>
        ) : null}

        {/* Goals List */}
        {goals.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="bullseye" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saving goals active yet.</Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal, index) => (
              <GoalCardItem
                key={goal._id}
                goal={goal}
                index={index}
                wallets={wallets}
                user={user}
                colors={colors}
                activeGoalIdForDeposit={activeGoalIdForDeposit}
                setActiveGoalIdForDeposit={setActiveGoalIdForDeposit}
                activeGoalIdForWithdraw={activeGoalIdForWithdraw}
                setActiveGoalIdForWithdraw={setActiveGoalIdForWithdraw}
                selectedWalletId={selectedWalletId}
                setSelectedWalletId={setSelectedWalletId}
                actionAmount={actionAmount}
                setActionAmount={setActionAmount}
                actionError={actionError}
                setActionError={setActionError}
                isActionSubmitting={isActionSubmitting}
                handleAddSavings={handleAddSavings}
                handleWithdrawSavings={handleWithdrawSavings}
                handleStartEditGoal={handleStartEditGoal}
                handleDeleteGoal={handleDeleteGoal}
              />
            ))}
          </View>
        )}
      </ScrollView>

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

function AnimatedFormCard({ children, colors }: any) {
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }] }}>
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </Animated.View>
  );
}

function GoalCardItem({
  goal,
  index,
  wallets,
  user,
  colors,
  activeGoalIdForDeposit,
  setActiveGoalIdForDeposit,
  activeGoalIdForWithdraw,
  setActiveGoalIdForWithdraw,
  selectedWalletId,
  setSelectedWalletId,
  actionAmount,
  setActionAmount,
  actionError,
  setActionError,
  isActionSubmitting,
  handleAddSavings,
  handleWithdrawSavings,
  handleStartEditGoal,
  handleDeleteGoal,
}: any) {
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(25)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  const isDepositExpanded = activeGoalIdForDeposit === goal._id;
  const isWithdrawExpanded = activeGoalIdForWithdraw === goal._id;

  return (
    <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }, { scale: cardScale }] }}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={animatePress}
        style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Card Header Color Bar */}
        <View style={[styles.goalColorBar, { backgroundColor: goal.color }]} />

        <View style={styles.goalCardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
              {goal.targetDate ? (
                <Text style={[styles.goalDate, { color: colors.textSecondary }]}>
                  Target: {new Date(goal.targetDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 14 }}>
              <TouchableOpacity onPress={() => handleStartEditGoal(goal)}>
                <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteGoal(goal)}>
                <FontAwesome name="trash" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={[styles.progressValues, { color: colors.text }]}>
                {formatCurrency(goal.currentAmount, user?.currency)} / {formatCurrency(goal.targetAmount, user?.currency)}
              </Text>
              <Text style={[styles.progressPercent, { color: goal.color }]}>{percent}%</Text>
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: colors.inputBg }]}>
              <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: goal.color }]} />
            </View>
          </View>

          {/* Completed Badge */}
          {goal.isCompleted ? (
            <View style={styles.completedBadge}>
              <FontAwesome name="check-circle" size={12} color="#10B981" />
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          ) : null}

          {/* Quick Actions Row */}
          <View style={[styles.goalActionsRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.goalActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}
              onPress={() => {
                setActionError('');
                setActionAmount('');
                setActiveGoalIdForWithdraw(null);
                setActiveGoalIdForDeposit(isDepositExpanded ? null : goal._id);
              }}
            >
              <FontAwesome name="plus" size={10} color="#10B981" />
              <Text style={[styles.goalActionBtnText, { color: '#10B981' }]}> Contribute</Text>
            </TouchableOpacity>

            {goal.currentAmount > 0 ? (
              <TouchableOpacity
                style={[styles.goalActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                onPress={() => {
                  setActionError('');
                  setActionAmount('');
                  setActiveGoalIdForDeposit(null);
                  setActiveGoalIdForWithdraw(isWithdrawExpanded ? null : goal._id);
                }}
              >
                <FontAwesome name="minus" size={10} color="#EF4444" />
                <Text style={[styles.goalActionBtnText, { color: '#EF4444' }]}> Withdraw</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* In-Card Deposit Action Form */}
          {isDepositExpanded ? (
            <View style={[styles.inlineActionArea, { borderTopColor: colors.border }]}>
              <Text style={[styles.inlineActionTitle, { color: colors.text }]}>Contribute Savings</Text>
              {actionError ? <Text style={styles.inlineErrorText}>{actionError}</Text> : null}

              <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>Select Wallet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletHorizontalScroll}>
                {wallets.map((w: any) => (
                  <TouchableOpacity
                    key={w._id}
                    style={[
                      styles.inlineWalletBubble,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      selectedWalletId === w._id && { backgroundColor: '#10B981', borderColor: '#10B981' },
                    ]}
                    onPress={() => setSelectedWalletId(w._id)}
                  >
                    <Text style={[styles.inlineWalletBubbleText, { color: colors.text }, selectedWalletId === w._id && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                      {w.name} ({formatCurrency(w.balance, w.currency)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>Amount</Text>
              <TextInput
                style={[styles.inlineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={actionAmount}
                onChangeText={setActionAmount}
              />

              <View style={styles.inlineActionsBtnRow}>
                <TouchableOpacity
                  style={[styles.inlineCancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setActiveGoalIdForDeposit(null);
                    setActionAmount('');
                  }}
                >
                  <Text style={[styles.inlineCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inlineSubmitBtn}
                  onPress={() => handleAddSavings(goal._id)}
                  disabled={isActionSubmitting}
                >
                  {isActionSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.inlineSubmitText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* In-Card Withdraw Action Form */}
          {isWithdrawExpanded ? (
            <View style={[styles.inlineActionArea, { borderTopColor: colors.border }]}>
              <Text style={[styles.inlineActionTitle, { color: colors.text }]}>Withdraw Savings</Text>
              {actionError ? <Text style={styles.inlineErrorText}>{actionError}</Text> : null}

              <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>Refund to Wallet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletHorizontalScroll}>
                {wallets.map((w: any) => (
                  <TouchableOpacity
                    key={w._id}
                    style={[
                      styles.inlineWalletBubble,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      selectedWalletId === w._id && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                    ]}
                    onPress={() => setSelectedWalletId(w._id)}
                  >
                    <Text style={[styles.inlineWalletBubbleText, { color: colors.text }, selectedWalletId === w._id && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                      {w.name} ({formatCurrency(w.balance, w.currency)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>Amount</Text>
              <TextInput
                style={[styles.inlineInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={actionAmount}
                onChangeText={setActionAmount}
              />

              <View style={styles.inlineActionsBtnRow}>
                <TouchableOpacity
                  style={[styles.inlineCancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setActiveGoalIdForWithdraw(null);
                    setActionAmount('');
                  }}
                >
                  <Text style={[styles.inlineCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inlineSubmitBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleWithdrawSavings(goal._id)}
                  disabled={isActionSubmitting}
                >
                  {isActionSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.inlineSubmitText}>Withdraw</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 10,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  goalsList: {
    gap: 16,
  },
  goalCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  goalColorBar: {
    height: 6,
    width: '100%',
  },
  goalCardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700',
  },
  goalDate: {
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    marginVertical: 14,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressValues: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  completedBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: 'bold',
  },
  goalActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  goalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  goalActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineActionArea: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  inlineActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  inlineErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    padding: 8,
    borderRadius: 6,
  },
  inlineLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  walletHorizontalScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  inlineWalletBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inlineWalletBubbleText: {
    fontSize: 12,
  },
  inlineInput: {
    borderWidth: 1,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 12,
  },
  inlineActionsBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  inlineCancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  inlineCancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inlineSubmitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  inlineSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
