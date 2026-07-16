import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { Transaction, Wallet, Category } from '../types';
import { useThemeColors } from '../hooks/useThemeColors';

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

  const fetchFiltersAndData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // Build transactions query string
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return { icon: 'arrow-down', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' };
      case 'expense':
        return { icon: 'arrow-up', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)' };
      default:
        return { icon: 'exchange', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg }]}>
          <FontAwesome name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search description, merchant..."
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

      {/* FILTER TABS: Types */}
      <View style={[styles.filterSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeTabs}>
          {(['all', 'income', 'expense', 'transfer'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeTab, { backgroundColor: colors.inputBg }, selectedType === t && styles.typeTabActive]}
              onPress={() => setSelectedType(t)}
            >
              <Text style={[styles.typeTabText, { color: colors.textSecondary }, selectedType === t && styles.typeTabTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FILTER SLIDER: Wallets */}
        <Text style={[styles.filterSubtitle, { color: colors.textSecondary }]}>Filter by Wallet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterCard, { backgroundColor: colors.inputBg, borderColor: colors.border }, selectedWalletId === 'all' && styles.filterCardActive]}
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
                { backgroundColor: colors.inputBg, borderColor: colors.border },
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
            style={[styles.filterCard, { backgroundColor: colors.inputBg, borderColor: colors.border }, selectedCategoryId === 'all' && styles.filterCardActive]}
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
                { backgroundColor: colors.inputBg, borderColor: colors.border },
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

      {/* Transaction List */}
      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FontAwesome name="list-alt" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching transactions found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        >
          {filteredTransactions.map((t) => {
            const iconInfo = getTransactionIcon(t.type);
            const isExpense = t.type === 'expense';
            const isTransfer = t.type === 'transfer';
            return (
              <TouchableOpacity
                key={t._id}
                style={[styles.transactionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/modal?editId=${t._id}`)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: iconInfo.bg }]}>
                  <FontAwesome name={iconInfo.icon as any} size={16} color={iconInfo.color} />
                </View>
                <View style={styles.detailsContainer}>
                  <Text style={[styles.txDescription, { color: colors.text }]}>{t.description || t.categoryId?.name}</Text>
                  <Text style={[styles.txCategory, { color: colors.textSecondary }]}>
                    {t.categoryId?.emoji} {t.categoryId?.name} • {t.walletId?.name}
                    {isTransfer && t.destinationWalletId ? ` ➔ ${t.destinationWalletId.name}` : ''}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text
                    style={[
                      styles.txAmount,
                      isExpense ? styles.txAmountExpense : t.type === 'income' ? styles.txAmountIncome : styles.txAmountTransfer,
                    ]}
                  >
                    {isExpense ? '-' : t.type === 'income' ? '+' : ''}
                    {formatCurrency(t.amount, user?.currency)}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                    {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
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
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  typeTabs: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: '#F8FAFC',
    borderBottomWidth: 1,
  },
  typeTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    marginRight: 8,
  },
  typeTabActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typeTabText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },
  filterSubtitle: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  filterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    gap: 6,
    height: 32,
  },
  filterCardActive: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },
  filterCardText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  filterCardTextActive: {
    color: '#FFFFFF',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emojiSpan: {
    fontSize: 13,
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
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailsContainer: {
    flex: 1,
  },
  txDescription: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  txCategory: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#64748B',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
  },
  txAmountExpense: {
    color: '#EF4444',
  },
  txAmountIncome: {
    color: '#10B981',
  },
  txAmountTransfer: {
    color: '#3B82F6',
  },
  txDate: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 16,
  },
});
