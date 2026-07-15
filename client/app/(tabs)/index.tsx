import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import api from '../../services/api';
import { Wallet, Transaction } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';

export default function DashboardScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const fetchData = async () => {
    try {
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [walletsRes, transRes, monthTransRes, friendsRes] = await Promise.all([
        api.get('/wallets'),
        api.get('/transactions?limit=10'),
        api.get(`/transactions?startDate=${currentMonthStart}&limit=1000`),
        api.get('/friends'),
      ]);

      if (walletsRes.data.success) {
        setWallets(walletsRes.data.data);
      }
      if (transRes.data.success) {
        setTransactions(transRes.data.data);
      }
      if (monthTransRes.data.success) {
        setMonthTransactions(monthTransRes.data.data);
      }
      if (friendsRes.data.success) {
        const friendsList = friendsRes.data.data.friends || [];
        const rec = friendsList
          .filter((f: any) => f.netBalance > 0)
          .reduce((sum: number, f: any) => sum + f.netBalance, 0);
        const pay = friendsList
          .filter((f: any) => f.netBalance < 0)
          .reduce((sum: number, f: any) => sum + Math.abs(f.netBalance), 0);
        setTotalReceivables(rec);
        setTotalPayables(pay);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getWalletMonthlyStats = (walletId: string) => {
    const walletTrans = monthTransactions.filter(
      (t) => {
        const id = t.walletId?._id || t.walletId;
        return id === walletId;
      }
    );

    const income = walletTrans
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = walletTrans
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { income, expense };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Net worth calculates Assets - Debts
  // Normal wallets have positive balances; Credit Cards have negative balances when spent.
  // Summing w.balance gives the correct Net Worth.
  const netWorth = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  // Separate assets and debts for dashboard display
  const totalAssets = wallets
    .filter(w => w.type !== 'credit_card')
    .reduce((sum, w) => sum + Math.max(0, Number(w.balance)), 0);

  const totalDebts = wallets
    .filter(w => w.type === 'credit_card')
    .reduce((sum, w) => sum + Math.abs(Math.min(0, Number(w.balance))), 0);

  const getTransactionItemStyle = (type: string) => {
    switch (type) {
      case 'income':
        return styles.incomeAmount;
      case 'expense':
        return styles.expenseAmount;
      default:
        return styles.transferAmount;
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const isExpense = item.type === 'expense';
    const symbol = isIncome ? '+' : isExpense ? '-' : '';

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => router.push(`/modal?editId=${item._id}`)}
      >
        <View style={styles.transactionIconContainer}>
          <Text style={styles.transactionEmoji}>
            {item.categoryId?.emoji || '📁'}
          </Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{item.description || item.categoryId?.name}</Text>
          <Text style={styles.transactionMeta}>
            {item.walletId?.name} {item.type === 'transfer' ? `→ ${item.destinationWalletId?.name}` : ''}
          </Text>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, getTransactionItemStyle(item.type)]}>
            {symbol}{formatCurrency(item.amount, user?.currency)}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeSubtitle}>Good day,</Text>
            <Text style={styles.welcomeTitle}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')}>
            <FontAwesome name="bell-o" size={20} color="#0F172A" />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Total Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatCurrency(netWorth, user?.currency)}</Text>
          
          <View style={styles.subStatsRow}>
            <View style={styles.subStatBlock}>
              <Text style={styles.subStatLabel}>Assets</Text>
              <Text style={[styles.subStatValue, { color: '#10B981' }]}>
                {formatCurrency(totalAssets, user?.currency)}
              </Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStatBlock}>
              <Text style={styles.subStatLabel}>Debts</Text>
              <Text style={[styles.subStatValue, { color: '#EF4444' }]}>
                {formatCurrency(totalDebts, user?.currency)}
              </Text>
            </View>
          </View>

          {/* Friends Split Receivables / Payables */}
          <View style={[styles.subStatsRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }]}>
            <View style={styles.subStatBlock}>
              <Text style={styles.subStatLabel}>Receivable (Friends)</Text>
              <Text style={[styles.subStatValue, { color: '#059669', fontSize: 13 }]}>
                {formatCurrency(totalReceivables, user?.currency)}
              </Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStatBlock}>
              <Text style={styles.subStatLabel}>Payable (Friends)</Text>
              <Text style={[styles.subStatValue, { color: '#DC2626', fontSize: 13 }]}>
                {formatCurrency(totalPayables, user?.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* My Cards (Wallets rendered as horizontal cards) */}
        {wallets.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionHeader}>My Cards</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.walletsHorizontalScroll}
            >
              {wallets.map((wallet) => {
                const isCreditCard = wallet.type === 'credit_card';
                const limit = wallet.creditLimit || 0;
                const remainingCredit = limit + Number(wallet.balance);
                return (
                  <View
                    key={wallet._id}
                    style={[styles.dashboardWalletCard, { backgroundColor: wallet.color }]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconWrapper}>
                        <FontAwesome
                          name={
                            wallet.type === 'bank'
                              ? 'bank'
                              : wallet.type === 'mobile_wallet'
                              ? 'mobile'
                              : wallet.type === 'credit_card'
                              ? 'credit-card'
                              : 'money'
                          }
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                      <Text style={styles.cardTypeLabel}>
                        {wallet.type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    
                    <View>
                      {isCreditCard ? (
                        <View>
                          <Text style={styles.creditSubLabel}>Available Credit</Text>
                          <Text style={styles.cardBalance}>
                            {formatCurrency(remainingCredit, wallet.currency)}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.cardBalance}>
                          {formatCurrency(wallet.balance, wallet.currency)}
                        </Text>
                      )}
                      <Text style={styles.cardName}>{wallet.name}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Monthly Wallet Performance Section (Wallet, Income | Expense - default this month) */}
        {wallets.length > 0 ? (
          <View style={styles.walletSectionContainer}>
            <Text style={styles.sectionHeader}>Monthly Wallet Performance</Text>
            {wallets.map((wallet) => {
              const stats = getWalletMonthlyStats(wallet._id);
              return (
                <View key={wallet._id} style={styles.walletPerformanceCard}>
                  <View style={styles.walletPerfLeft}>
                    <View style={styles.walletTitleRow}>
                      <View style={[styles.colorDot, { backgroundColor: wallet.color }]} />
                      <Text style={styles.walletPerfName}>{wallet.name}</Text>
                    </View>
                    <Text style={styles.walletPerfBalance}>
                      {formatCurrency(wallet.balance, wallet.currency)}
                    </Text>
                  </View>
                  <View style={styles.walletPerfRight}>
                    <View style={[styles.perfStatPill, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                      <Text style={[styles.perfStatText, { color: '#059669' }]}>
                        +{formatCurrency(stats.income, wallet.currency)}
                      </Text>
                    </View>
                    <View style={[styles.perfStatPill, { backgroundColor: 'rgba(239, 68, 68, 0.08)', marginTop: 6 }]}>
                      <Text style={[styles.perfStatText, { color: '#DC2626' }]}>
                        -{formatCurrency(stats.expense, wallet.currency)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Financial Summary & Monthly Salary Bar */}
        {user?.monthlySalary ? (
          <View style={styles.salaryCard}>
            <View style={styles.salaryHeader}>
              <Text style={styles.salaryTitle}>Monthly Salary Baseline</Text>
              <Text style={styles.salaryAmount}>
                {formatCurrency(user.monthlySalary, user.currency)}
              </Text>
            </View>
            <View style={styles.salaryProgressContainer}>
              <View style={styles.salaryProgressBar} />
            </View>
            <Text style={styles.salaryFooter}>Set in Profile Settings</Text>
          </View>
        ) : null}

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Link href="/modal" asChild>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <FontAwesome name="plus" size={16} color="#10B981" />
              </View>
              <Text style={styles.actionText}>Add Tx</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/two')}>
            <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <FontAwesome name="credit-card" size={16} color="#3B82F6" />
            </View>
            <Text style={styles.actionText}>Wallets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/categories')}>
            <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <FontAwesome name="tags" size={16} color="#8B5CF6" />
            </View>
            <Text style={styles.actionText}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/friends')}>
            <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <FontAwesome name="users" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.actionText}>Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions Header */}
        <View style={[styles.recentHeaderContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={{ fontFamily: 'System', fontSize: 13, fontWeight: 'bold', color: '#059669' }}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="folder-open-o" size={48} color="#475569" />
            <Text style={styles.emptyText}>No transactions recorded yet.</Text>
            <Link href="/modal" asChild>
              <TouchableOpacity style={styles.emptyAddButton}>
                <Text style={styles.emptyAddButtonText}>Add First Transaction</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.transactionsList}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    marginBottom: 20,
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  netWorthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  netWorthLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
  },
  netWorthValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
  },
  subStatBlock: {
    flex: 1,
  },
  subStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  subStatValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  subStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  salaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  salaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  salaryTitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  salaryAmount: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  salaryProgressContainer: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  salaryProgressBar: {
    height: '100%',
    width: '100%',
    backgroundColor: '#059669',
  },
  salaryFooter: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  recentHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionsList: {
    marginTop: 4,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionEmoji: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#059669',
  },
  expenseAmount: {
    color: '#DC2626',
  },
  transferAmount: {
    color: '#64748B',
  },
  transactionDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 18,
  },
  emptyAddButton: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  walletsHorizontalScroll: {
    paddingRight: 20,
    paddingBottom: 8,
  },
  dashboardWalletCard: {
    width: 220,
    height: 130,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  cardBalance: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
    marginTop: 2,
  },
  creditSubLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    opacity: 0.7,
    fontWeight: '600',
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  walletSectionContainer: {
    marginBottom: 20,
  },
  walletPerformanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  walletPerfLeft: {
    flex: 1.2,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  walletPerfName: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  walletPerfBalance: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
  },
  walletPerfRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  perfStatPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  perfStatText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '700',
  },
});
