import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { Transaction, Wallet, Category } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';

// Solar Icons
import { AltArrowLeft } from '@solar-icons/react-native/Outline';
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  Magnifier,
  Dollar,
  Home2,
  Bag,
  Widget,
} from '@solar-icons/react-native/Bold';

export default function TransactionsScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { user } = useAuthStore();

  // Transactions list states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchFiltersAndData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      let url = '/transactions?limit=100';
      if (selectedType !== 'all') {
        url += `&type=${selectedType}`;
      }
      if (selectedWalletId !== 'all') {
        url += `&walletId=${selectedWalletId}`;
      }
      if (selectedCategoryId !== 'all') {
        url += `&categoryId=${selectedCategoryId}`;
      }

      const [transRes, walletsRes, catsRes] = await Promise.all([
        api.get(url),
        api.get('/wallets'),
        api.get('/categories'),
      ]);

      if (transRes.data.success) {
        setTransactions(transRes.data.data);
      }
      if (walletsRes.data.success) {
        setWallets(walletsRes.data.data);
      }
      if (catsRes.data.success) {
        setCategories(catsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching transactions screen data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndData(true);
  }, [selectedType, selectedWalletId, selectedCategoryId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFiltersAndData(false);
  };

  // Local client side filtering for search query text matching
  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.categoryId?.name?.toLowerCase().includes(q) ||
      t.merchant?.toLowerCase().includes(q)
    );
  });

  const getCategoryIcon = (category: any) => {
    if (category?.emoji) {
      const IconComponent = (SolarBold as any)[category.emoji];
      if (IconComponent) {
        return <IconComponent size={18} color={category.color || '#8B5CF6'} />;
      }
    }
    const name = (category?.name || '').toLowerCase();
    if (name.includes('salary') || name.includes('income') || name.includes('paycheck') || name.includes('freelance')) {
      return <SolarBold.Dollar size={18} color="#10B981" />;
    }
    if (name.includes('rent') || name.includes('home') || name.includes('house') || name.includes('utility') || name.includes('bill')) {
      return <SolarBold.Home2 size={18} color="#3B82F6" />;
    }
    if (name.includes('shop') || name.includes('grocery') || name.includes('food') || name.includes('dining')) {
      return <SolarBold.Bag size={18} color="#EC4899" />;
    }
    return <SolarBold.Widget size={18} color="#8B5CF6" />;
  };

  // Group transactions by date
  const groupTransactionsByDate = (txs: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};
    txs.forEach((t) => {
      const dateObj = new Date(t.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateKey = '';
      if (dateObj.toDateString() === today.toDateString()) {
        dateKey = 'TODAY';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        dateKey = 'YESTERDAY';
      } else {
        const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
        const monthDay = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
        dateKey = `${dayName}, ${monthDay}`;
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    return groups;
  };

  const groupedTxs = groupTransactionsByDate(filteredTransactions);
  const dateKeys = Object.keys(groupedTxs);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 20 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction History</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Magnifier size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* FILTER TABS row */}
      <View style={styles.filterSection}>
        <View style={styles.tabsContainerRow}>
          {/* Sliders toggle circle button */}
          <TouchableOpacity
            style={[
              styles.slidersBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              showAdvancedFilters && { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.05)' }
            ]}
            onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FontAwesome name="sliders" size={16} color={showAdvancedFilters ? '#8B5CF6' : colors.text} />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeTabsScroll}>
            {[
              { key: 'all', label: 'All' },
              { key: 'income', label: 'Income' },
              { key: 'expense', label: 'Outcome' },
              { key: 'transfer', label: 'Transfer' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.typeTab,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedType === tab.key && [styles.typeTabActive, { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)' }]
                ]}
                onPress={() => setSelectedType(tab.key as any)}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    { color: colors.text },
                    selectedType === tab.key && { color: '#3B82F6', fontWeight: 'bold' }
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Collapsible Wallet & Category Filters */}
        {showAdvancedFilters && (
          <View style={[styles.advancedFiltersContainer, { borderTopColor: colors.border }]}>
            {/* FILTER SLIDER: Wallets */}
            <Text style={[styles.filterSubtitle, { color: colors.textSecondary }]}>Filter by Wallet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }, selectedWalletId === 'all' && styles.filterCardActive]}
                onPress={() => setSelectedWalletId('all')}
              >
                <Text style={[styles.filterCardText, { color: colors.textSecondary }, selectedWalletId === 'all' && styles.filterCardTextActive]}>
                  All Wallets
                </Text>
              </TouchableOpacity>
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w._id}
                  style={[
                    styles.filterCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedWalletId === w._id && { borderColor: w.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedWalletId(w._id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: w.color }]} />
                  <Text style={[styles.filterCardText, { color: colors.text }]}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* FILTER SLIDER: Categories */}
            <Text style={[styles.filterSubtitle, { color: colors.textSecondary }]}>Filter by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }, selectedCategoryId === 'all' && styles.filterCardActive]}
                onPress={() => setSelectedCategoryId('all')}
              >
                <Text style={[styles.filterCardText, { color: colors.textSecondary }, selectedCategoryId === 'all' && styles.filterCardTextActive]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={[
                    styles.filterCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedCategoryId === c._id && { borderColor: c.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedCategoryId(c._id)}
                >
                  <Text style={styles.emojiSpan}>{c.emoji}</Text>
                  <Text style={[styles.filterCardText, { color: colors.text }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Transaction List grouped by dates */}
      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : dateKeys.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Widget size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching transactions found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          {dateKeys.map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: isDark ? '#94A3B8' : '#475569' }]}>{dateKey}</Text>
              
              {groupedTxs[dateKey].map((t) => {
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
          ))}
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
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterSection: {
    paddingBottom: 12,
  },
  tabsContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  slidersBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTabsScroll: {
    gap: 8,
  },
  typeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  typeTabActive: {
    borderWidth: 1.5,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedFiltersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  filterSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 24,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  filterScroll: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    gap: 8,
  },
  filterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    height: 32,
  },
  filterCardActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterCardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterCardTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emojiSpan: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
});
