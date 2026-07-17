import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { Wallet, Transaction } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import { useThemeColors } from '../../hooks/useThemeColors';

// Solar Icons imports from Bold style
import {
  Moon,
  Sun,
  Bell,
  ArrowLeftDown,
  ArrowRightUp,
  AddCircle,
  Folder,
  Wallet as SolarWallet,
  MenuDots,
  Dollar,
  Home2,
  Bag,
  Widget,
} from '@solar-icons/react-native/Bold';

export default function DashboardScreen() {
  const { colors, isDark } = useThemeColors();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, updateProfile } = useAuthStore();
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const salaryBarWidth = useRef(new Animated.Value(0)).current;

  const salaryProgressWidth = salaryBarWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  // Action Button Spring Scales
  const actionScaleAdd = useRef(new Animated.Value(1)).current;
  const actionScaleWallets = useRef(new Animated.Value(1)).current;
  const actionScaleCats = useRef(new Animated.Value(1)).current;
  const actionScaleFriends = useRef(new Animated.Value(1)).current;

  const animatePress = (scaleValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.93,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();

      Animated.timing(salaryBarWidth, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      salaryBarWidth.setValue(0);
    }
  }, [isLoading]);

  const toggleTheme = async () => {
    const nextTheme = isDark ? 'light' : 'dark';
    try {
      await updateProfile({ theme: nextTheme });
    } catch (err) {
      console.error('Failed to toggle theme:', err);
    }
  };

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
  const netWorth = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  // Separate assets and debts for dashboard display
  const totalAssets = wallets
    .filter(w => w.type !== 'credit_card')
    .reduce((sum, w) => sum + Math.max(0, Number(w.balance)), 0);

  const totalDebts = wallets
    .filter(w => w.type === 'credit_card')
    .reduce((sum, w) => sum + Math.abs(Math.min(0, Number(w.balance))), 0);

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
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

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    const isTransfer = item.type === 'transfer';
    const symbol = isIncome ? '+' : isTransfer ? '' : '-';
    const amountColor = isIncome ? '#10B981' : isTransfer ? '#3B82F6' : '#EF4444';
    const typeLabel = isIncome ? 'Income' : isTransfer ? 'Transfer' : 'Outcome';

    return (
      <TouchableOpacity
        style={[styles.transactionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/modal', params: { editId: item._id } })}
      >
        <View style={[styles.transactionIconContainer, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
          {getCategoryIcon(item.categoryId?.name || '')}
        </View>
        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionTitle, { color: colors.text }]}>{item.description || item.categoryId?.name}</Text>
          <Text style={[styles.transactionMeta, { color: colors.textSecondary }]}>
            {new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })} · {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: amountColor }]}>
            {symbol}{formatCurrency(item.amount, user?.currency)}
          </Text>
          <Text style={[styles.transactionTypeLabel, { color: colors.textSecondary }]}>
            {typeLabel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Themed colors for welcome header container
  const headerBg = isDark ? '#1E1B4B' : '#C5D2FF';
  const headerText = isDark ? '#FFFFFF' : '#1E1B4B';
  const headerTextSecondary = isDark ? '#94A3B8' : '#475569';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Welcome Redesigned Purple Section */}
        <View style={[styles.purpleHeaderContainer, { backgroundColor: headerBg }]}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarContainer}>
                <Image source={require('../../assets/images/avatar.jpg')} style={styles.avatar} />
                <View style={styles.statusDot} />
              </View>
              <View style={styles.welcomeContainer}>
                <Text style={[styles.welcomeSubtitle, { color: headerTextSecondary }]}>Hello!</Text>
                <Text style={[styles.welcomeTitle, { color: headerText }]}>{user?.name || 'User'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Mode Switcher Button */}
              <TouchableOpacity 
                style={[styles.headerCircleBtn, { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(30, 27, 75, 0.15)' }]} 
                onPress={toggleTheme}
              >
                {isDark ? (
                  <Sun size={20} color={headerText} />
                ) : (
                  <Moon size={20} color={headerText} />
                )}
              </TouchableOpacity>

              {/* Bell Notification Button */}
              <TouchableOpacity 
                style={[styles.headerCircleBtn, { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(30, 27, 75, 0.15)' }]} 
                onPress={() => router.push('/notifications')}
              >
                <Bell size={20} color={headerText} />
                <View style={styles.bellBadge} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Balance section */}
          <View style={styles.balanceSection}>
            <Text style={[styles.activeBalanceLabel, { color: headerTextSecondary }]}>Active Total Balance</Text>
            <Text style={[styles.activeBalanceValue, { color: headerText }]}>{formatCurrency(netWorth, user?.currency)}</Text>
            
            {/* Assets & Debts Stats sub-row */}
            <View style={[styles.headerSubStatsRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(30, 27, 75, 0.12)' }]}>
              <View style={styles.headerSubStatBlock}>
                <Text style={[styles.headerSubStatLabel, { color: headerTextSecondary }]}>Assets</Text>
                <Text style={[styles.headerSubStatValue, { color: isDark ? '#34D399' : '#059669' }]}>
                  {formatCurrency(totalAssets, user?.currency)}
                </Text>
              </View>
              
              <View style={[styles.headerSubStatDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(30, 27, 75, 0.15)' }]} />
              
              <View style={styles.headerSubStatBlock}>
                <Text style={[styles.headerSubStatLabel, { color: headerTextSecondary }]}>Debts</Text>
                <Text style={[styles.headerSubStatValue, { color: '#EF4444' }]}>
                  {formatCurrency(totalDebts, user?.currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Receivable / Payable Overlapping Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.overlapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.overlapColumn}>
              <View style={[styles.arrowContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <ArrowLeftDown size={20} color="#10B981" />
              </View>
              <View style={styles.overlapInfo}>
                <Text style={[styles.overlapLabel, { color: colors.textSecondary }]}>Receivable</Text>
                <Text style={[styles.overlapValue, { color: colors.text }]}>{formatCurrency(totalReceivables, user?.currency)}</Text>
              </View>
            </View>

            <View style={[styles.overlapDivider, { backgroundColor: colors.border }]} />

            <View style={styles.overlapColumn}>
              <View style={[styles.arrowContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <ArrowRightUp size={20} color="#EF4444" />
              </View>
              <View style={styles.overlapInfo}>
                <Text style={[styles.overlapLabel, { color: colors.textSecondary }]}>Payable</Text>
                <Text style={[styles.overlapValue, { color: colors.text }]}>{formatCurrency(totalPayables, user?.currency)}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quick Action Circles */}
        <View style={styles.actionCirclesRow}>
          <View style={styles.actionCircleItem}>
            <Animated.View style={{ transform: [{ scale: actionScaleAdd }] }}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: '#3B82F6' }]}
                onPress={() => {
                  animatePress(actionScaleAdd);
                  router.push('/modal');
                }}
              >
                <AddCircle size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.actionCircleLabel, { color: colors.textSecondary }]}>Add</Text>
          </View>

          <View style={styles.actionCircleItem}>
            <Animated.View style={{ transform: [{ scale: actionScaleCats }] }}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: '#8B5CF6' }]}
                onPress={() => {
                  animatePress(actionScaleCats);
                  router.push('/categories');
                }}
              >
                <Folder size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.actionCircleLabel, { color: colors.textSecondary }]}>Categories</Text>
          </View>

          <View style={styles.actionCircleItem}>
            <Animated.View style={{ transform: [{ scale: actionScaleWallets }] }}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: '#F59E0B' }]}
                onPress={() => {
                  animatePress(actionScaleWallets);
                  router.push('/two');
                }}
              >
                <SolarWallet size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.actionCircleLabel, { color: colors.textSecondary }]}>Wallet</Text>
          </View>

          <View style={styles.actionCircleItem}>
            <Animated.View style={{ transform: [{ scale: actionScaleFriends }] }}>
              <TouchableOpacity
                style={[styles.actionCircle, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  animatePress(actionScaleFriends);
                  router.push('/profile');
                }}
              >
                <MenuDots size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.actionCircleLabel, { color: colors.textSecondary }]}>More</Text>
          </View>
        </View>

        {/* My Cards */}
        {wallets.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>My Cards</Text>
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
                        <SolarWallet size={14} color="#FFFFFF" />
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

        {/* Monthly Wallet Performance */}
        {wallets.length > 0 ? (
          <View style={styles.walletSectionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Monthly Wallet Performance</Text>
            {wallets.map((wallet) => {
              const stats = getWalletMonthlyStats(wallet._id);
              return (
                <View key={wallet._id} style={[styles.walletPerformanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.walletPerfLeft}>
                    <View style={styles.walletTitleRow}>
                      <View style={[styles.colorDot, { backgroundColor: wallet.color }]} />
                      <Text style={[styles.walletPerfName, { color: colors.text }]}>{wallet.name}</Text>
                    </View>
                    <Text style={[styles.walletPerfBalance, { color: colors.textSecondary }]}>
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
          <View style={[styles.salaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.salaryHeader}>
              <Text style={[styles.salaryTitle, { color: colors.textSecondary }]}>Monthly Salary Baseline</Text>
              <Text style={[styles.salaryAmount, { color: colors.text }]}>
                {formatCurrency(user.monthlySalary, user.currency)}
              </Text>
            </View>
            <View style={[styles.salaryProgressContainer, { backgroundColor: colors.inputBg }]}>
              <Animated.View style={[styles.salaryProgressBar, { width: salaryProgressWidth }]} />
            </View>
            <Text style={styles.salaryFooter}>Set in Profile Settings</Text>
          </View>
        ) : null}

        {/* Recent Transactions */}
        <View style={styles.recentHeaderContainer}>
          <Text style={[styles.sectionHeader, { color: colors.text }]}>RECENT TRANSACTIONS</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#059669' }}>See all</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Folder size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions recorded yet.</Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={() => router.push('/modal')}>
              <Text style={styles.emptyAddButtonText}>Add First Transaction</Text>
            </TouchableOpacity>
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
  },
  scrollContainer: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purpleHeaderContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  welcomeContainer: {
    justifyContent: 'center',
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    borderWidth: 1.5,
    borderColor: '#C5D2FF',
  },
  balanceSection: {
    marginTop: 8,
  },
  activeBalanceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeBalanceValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 6,
  },
  headerSubStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  headerSubStatBlock: {
    flex: 1,
  },
  headerSubStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubStatDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 16,
  },
  overlapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginTop: -28,
    marginBottom: 28,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  overlapColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlapInfo: {
    flex: 1,
  },
  overlapLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  overlapValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },
  overlapDivider: {
    width: 1,
    height: '70%',
  },
  actionCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  actionCircleItem: {
    alignItems: 'center',
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionCircleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  walletsHorizontalScroll: {
    paddingLeft: 24,
    paddingRight: 12,
    paddingBottom: 8,
  },
  dashboardWalletCard: {
    width: 200,
    height: 120,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  cardBalance: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.95,
    marginTop: 2,
  },
  creditSubLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    opacity: 0.7,
    fontWeight: '600',
  },
  walletSectionContainer: {
    marginBottom: 20,
  },
  walletPerformanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 24,
    marginBottom: 10,
    borderWidth: 1,
  },
  walletPerfLeft: {
    flex: 1.2,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  walletPerfName: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletPerfBalance: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
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
    minWidth: 90,
  },
  perfStatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  salaryCard: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 28,
    borderWidth: 1,
  },
  salaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  salaryTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  salaryAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  salaryProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  salaryProgressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  salaryFooter: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 6,
    textAlign: 'right',
  },
  recentHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 24,
    marginBottom: 16,
  },
  transactionsList: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  transactionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  transactionTypeLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 12,
    marginBottom: 18,
  },
  emptyAddButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
