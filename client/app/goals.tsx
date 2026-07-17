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
  Dimensions,
  Modal,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { Wallet } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import CustomAlert from '../components/CustomAlert';
import { useThemeColors } from '../hooks/useThemeColors';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  AddCircle,
  AltArrowRight,
  AltArrowLeft,
  Widget,
} from '@solar-icons/react-native/Bold';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const router = useRouter();
  const { user } = useAuthStore();

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom Sheet Drawer state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Add/Edit Goal Form State
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time ticker state to update clock in real-time
  const [tickerTime, setTickerTime] = useState(new Date());

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

  // Update countdown ticker every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Drawer Animation Controls
  const openBottomSheet = () => {
    setIsSheetOpen(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.4,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeBottomSheet = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSheetOpen(false);
      resetForm();
    });
  };

  const handleStartEditGoal = (goal: SavingGoal) => {
    setEditingGoalId(goal._id);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setSelectedColor(goal.color);
    openBottomSheet();
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
        closeBottomSheet();
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to submit goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setTargetDate('');
    setSelectedColor(COLORS[0]);
    setEditingGoalId(null);
    setFormError('');
  };

  const getCountdown = (targetDateStr?: string) => {
    if (!targetDateStr) return 'No target date';
    const target = new Date(targetDateStr).getTime();
    const now = tickerTime.getTime();
    const diff = target - now;

    if (diff <= 0) return 'Goal ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (num: number) => String(num).padStart(2, '0');

    return `${days} days ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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
        <IconComponent size={22} color={color} />
      </View>
    );
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
      {/* Header with back button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTextTitle, { color: colors.text }]}>Goals</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>All My Goals</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openBottomSheet}
          >
            <AddCircle size={18} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Goals List */}
        {goals.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SolarBold.MedalStar size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saving goals active yet.</Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal, index) => {
              const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
              const nameParts = goal.name.split(/[-:]/);
              const mainTitle = nameParts[0].trim();
              const subtext = nameParts.length > 1 ? nameParts[1].trim() : 'Saving goal target';
              
              // Dynamic status chip color bubble
              let badgeColor = '#EF4444';
              if (percent >= 80) badgeColor = '#3B82F6';
              else if (percent >= 50) badgeColor = '#10B981';
              else if (percent >= 30) badgeColor = '#F59E0B';

              return (
                <TouchableOpacity
                  key={goal._id}
                  activeOpacity={0.9}
                  style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/goal-detail', params: { id: goal._id } })}
                >
                  {/* Top segment */}
                  <View style={styles.cardTopRow}>
                    {getGoalIcon(goal.name, goal.color)}
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.goalName, { color: colors.text }]}>{mainTitle}</Text>
                      <Text style={[styles.goalSubtext, { color: colors.textSecondary }]}>{subtext}</Text>
                    </View>
                    <AltArrowRight size={20} color={colors.textSecondary} />
                  </View>

                  {/* Middle row */}
                  <View style={styles.cardMiddleRow}>
                    <View style={styles.clockRow}>
                      <FontAwesome name="clock-o" size={14} color={colors.textSecondary} />
                      <Text style={[styles.clockText, { color: colors.textSecondary }]}>
                        {getCountdown(goal.targetDate)}
                      </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: `${badgeColor}15` }]}>
                      <Text style={[styles.badgeText, { color: badgeColor }]}>{percent}%</Text>
                    </View>
                  </View>

                  {/* Slider Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    {/* Background dashed line */}
                    <View style={[styles.dashedTrack, { borderColor: isDark ? '#475569' : '#CBD5E1' }]} />
                    {/* Completed solid bar */}
                    <View style={[styles.solidFillTrack, { width: `${percent}%`, backgroundColor: goal.color }]} />
                    {/* Circle thumb */}
                    <View style={[styles.progressThumb, { left: `${percent}%`, backgroundColor: goal.color }]} />
                  </View>

                  {/* Bottom amounts row */}
                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.savedAmount, { color: colors.text }]}>
                      {formatCurrency(goal.currentAmount, user?.currency)}
                    </Text>
                    <Text style={[styles.targetAmount, { color: colors.text }]}>
                      {formatCurrency(goal.targetAmount, user?.currency)}
                    </Text>
                  </View>

                  {/* Optional Pace Alert Chip (e.g. Technology) */}
                  {percent >= 70 && (
                    <View style={[styles.paceAlert, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                      <Text style={[styles.paceAlertText, { color: colors.textSecondary }]}>
                        🚀 You're <Text style={{ fontWeight: '700', color: '#3B82F6' }}>ahead of pace</Text> and should reach your goal ahead of schedule.
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Rise-From-Bottom Drawer Modal (Add / Edit Goal) */}
      <Modal
        visible={isSheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          {/* Dismiss Backdrop */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeBottomSheet}
          >
            <Animated.View style={[styles.backdropBackground, { opacity: backdropOpacity }]} />
          </TouchableOpacity>

          {/* Form Bottom Drawer Container */}
          <Animated.View
            style={[
              styles.bottomDrawer,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {/* Header Drag Indicator bar */}
            <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />

            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>
                {editingGoalId ? 'Edit Goal' : 'Add New Goal'}
              </Text>
              <TouchableOpacity onPress={closeBottomSheet}>
                <Text style={styles.drawerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <ScrollView contentContainerStyle={styles.drawerForm} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Goal Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Vacation - Trip to Mexico"
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

              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 12 }]}>Theme Color</Text>
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
                  <Text style={styles.submitButtonText}>Save Goal</Text>
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
  headerTextTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
  },
  goalsList: {
    gap: 16,
  },
  goalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    position: 'relative',
    marginTop: 14,
    marginBottom: 12,
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
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savedAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  paceAlert: {
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  paceAlertText: {
    fontSize: 11,
    lineHeight: 16,
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
  backdropBackground: {
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
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 12,
    borderRadius: 10,
  },
  inputGroup: {
    marginBottom: 18,
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
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#3B82F6',
    transform: [{ scale: 1.1 }],
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
