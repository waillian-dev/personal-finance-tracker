import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { Transaction, Wallet } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';
import { AltArrowLeft } from '@solar-icons/react-native/outline';

interface AppNotification {
  id: string;
  type: 'salary' | 'expense_limit' | 'fee' | 'general';
  title: string;
  message: string;
  date: Date;
}

export default function NotificationsScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateNotifications = async () => {
      try {
        const [walletsRes, transRes] = await Promise.all([
          api.get('/wallets'),
          api.get('/transactions?limit=20'),
        ]);

        const wallets: Wallet[] = walletsRes.data.success ? walletsRes.data.data : [];
        const transactions: Transaction[] = transRes.data.success ? transRes.data.data : [];

        const list: AppNotification[] = [];

        // 1. General welcome notice
        list.push({
          id: 'welcome',
          type: 'general',
          title: 'Welcome to Antigravity Finance',
          message: 'Your personal budget and wallet tracker is active. Get started by adding your wallets and expenses.',
          date: user?.createdAt ? new Date(user.createdAt) : new Date(),
        });

        // 2. Salary Credit Notice (Triggered if enabled in Settings & has income transactions)
        if (user?.notificationSalary !== false && user?.monthlySalary) {
          const salaryTrans = transactions.find(t => t.type === 'income' && t.amount >= user.monthlySalary * 0.5);
          if (salaryTrans) {
            list.push({
              id: `salary-${salaryTrans._id}`,
              type: 'salary',
              title: 'Salary Credited',
              message: `Your monthly salary baseline of ${formatCurrency(user.monthlySalary, user.currency)} was detected and recorded to ${salaryTrans.walletId?.name || 'wallet'}.`,
              date: new Date(salaryTrans.date),
            });
          }
        }

        // 3. High Expense Warning (Triggered if enabled & monthly expenses exceed 80% of salary)
        if (user?.notificationExpenseLimit !== false && user?.monthlySalary) {
          const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          if (totalExpenses >= user.monthlySalary * 0.8) {
            list.push({
              id: 'expense-limit-warning',
              type: 'expense_limit',
              title: 'Expense Warning',
              message: `Your total monthly expenses (${formatCurrency(totalExpenses, user.currency)}) have exceeded 80% of your monthly salary baseline (${formatCurrency(user.monthlySalary, user.currency)}). Consider keeping an eye on your budget.`,
              date: new Date(),
            });
          }
        }

        // 4. Monthly/Annual Card Fee Alert (Triggered if enabled & has transactions containing "fee")
        if (user?.notificationMonthlyFee !== false) {
          const feeTrans = transactions.find(t => 
            t.type === 'expense' && 
            (t.description?.toLowerCase().includes('fee') || t.categoryId?.name?.toLowerCase().includes('fee'))
          );
          if (feeTrans) {
            list.push({
              id: `fee-${feeTrans._id}`,
              type: 'fee',
              title: 'Card Fee Warning',
              message: `An expense of ${formatCurrency(feeTrans.amount, user?.currency)} labeled "${feeTrans.description}" was recorded as a monthly/annual card fee charge.`,
              date: new Date(feeTrans.date),
            });
          }
        }

        // Sort notifications by date descending
        list.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(list);
      } catch (err) {
        console.error('Error generating notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    generateNotifications();
  }, [user]);

  const getNotificationIconInfo = (type: string) => {
    switch (type) {
      case 'salary':
        return { icon: 'money', color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' };
      case 'expense_limit':
        return { icon: 'warning', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' };
      case 'fee':
        return { icon: 'info-circle', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' };
      default:
        return { icon: 'bell', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 20 }]}>
      {/* Custom Header Section */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FontAwesome name="bell-slash-o" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No notifications at the moment.</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Enabled settings can be preconfigured in settings.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {notifications.map((n) => {
            const iconInfo = getNotificationIconInfo(n.type);
            return (
              <View key={n.id} style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: iconInfo.bg }]}>
                  <FontAwesome name={iconInfo.icon as any} size={18} color={iconInfo.color} />
                </View>
                <View style={styles.contentWrapper}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{n.title}</Text>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {n.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.cardMessage, { color: colors.textSecondary }]}>{n.message}</Text>
                </View>
              </View>
            );
          })}
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
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentWrapper: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
