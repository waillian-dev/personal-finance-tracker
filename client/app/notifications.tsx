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
import { AltArrowLeft } from '@solar-icons/react-native/Outline';
import { getItem, setItem } from '../utils/storage';

export interface AppNotification {
  id: string;
  type: 'salary' | 'expense_limit' | 'fee' | 'general';
  title: string;
  message: string;
  date: Date;
  read?: boolean;
}

export default function NotificationsScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const storedReadIdsStr = await getItem('readNotificationIds');
        const initialReadIds: string[] = storedReadIdsStr ? JSON.parse(storedReadIdsStr) : [];
        setReadIds(initialReadIds);

        const [walletsRes, transRes] = await Promise.all([
          api.get('/wallets'),
          api.get('/transactions?limit=20'),
        ]);

        const transactions: Transaction[] = transRes.data.success ? transRes.data.data : [];
        const list: AppNotification[] = [];

        // 1. General welcome notice
        list.push({
          id: 'welcome',
          type: 'general',
          title: 'Welcome to Zenith Finance',
          message: 'Your personal budget and wallet tracker is active. Get started by adding your wallets and expenses.',
          date: user?.createdAt ? new Date(user.createdAt) : new Date(),
        });

        // 2. Salary Credit Notice
        if (user?.notificationSalary !== false && user?.monthlySalary) {
          const salaryTrans = transactions.find(t => t.type === 'income' && t.amount >= user.monthlySalary * 0.5);
          if (salaryTrans) {
            list.push({
              id: `salary-${salaryTrans._id}`,
              type: 'salary',
              title: 'Salary Credited',
              message: `Your monthly salary baseline of ${formatCurrency(user.monthlySalary, user.currency)} was detected and recorded.`,
              date: new Date(salaryTrans.date),
            });
          }
        }

        // 3. High Expense Warning
        if (user?.notificationExpenseLimit !== false && user?.monthlySalary) {
          const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          if (totalExpenses >= user.monthlySalary * 0.8) {
            list.push({
              id: 'expense-limit-warning',
              type: 'expense_limit',
              title: 'Expense Warning',
              message: `Your total monthly expenses (${formatCurrency(totalExpenses, user.currency)}) have exceeded 80% of your salary baseline (${formatCurrency(user.monthlySalary, user.currency)}).`,
              date: new Date(),
            });
          }
        }

        // 4. Monthly Card Fee Warning
        if (user?.notificationMonthlyFee !== false) {
          const feeTrans = transactions.find(t => 
            t.type === 'expense' && 
            (t.description?.toLowerCase().includes('fee') || t.categoryId?.name?.toLowerCase().includes('fee'))
          );
          if (feeTrans) {
            list.push({
              id: `fee-${feeTrans._id}`,
              type: 'fee',
              title: 'Card Fee Alert',
              message: `An expense of ${formatCurrency(feeTrans.amount, user?.currency)} labeled "${feeTrans.description}" was recorded as a card fee charge.`,
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

    loadNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    if (readIds.includes(id)) return;
    const updated = [...readIds, id];
    setReadIds(updated);
    await setItem('readNotificationIds', JSON.stringify(updated));
  };

  const markAllAsRead = async () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    await setItem('readNotificationIds', JSON.stringify(allIds));
  };

  const getNotificationIconInfo = (type: string) => {
    switch (type) {
      case 'salary':
        return { icon: 'money', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' };
      case 'expense_limit':
        return { icon: 'warning', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.1)' };
      case 'fee':
        return { icon: 'credit-card', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' };
      default:
        return { icon: 'bell', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)' };
    }
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      {/* Custom Header Section */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FontAwesome name="bell-slash-o" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No notifications at the moment.</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>System alerts will appear here when triggered.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {notifications.map((n) => {
            const isRead = readIds.includes(n.id);
            const iconInfo = getNotificationIconInfo(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.85}
                onPress={() => markAsRead(n.id)}
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.card, borderColor: isRead ? colors.border : '#10B981' },
                  !isRead && styles.unreadCardGlow,
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: iconInfo.bg }]}>
                  <FontAwesome name={iconInfo.icon as any} size={18} color={iconInfo.color} />
                </View>
                <View style={styles.contentWrapper}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardTitle, { color: colors.text, fontWeight: isRead ? '600' : '800' }]}>
                        {n.title}
                      </Text>
                      {!isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {n.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.cardMessage, { color: colors.textSecondary }]}>{n.message}</Text>
                </View>
              </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  unreadCardGlow: {
    borderWidth: 1.5,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardMessage: {
    fontSize: 13,
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
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
});
