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
const TYPES = [
  { label: 'Cash', value: 'cash', icon: 'money' },
  { label: 'Bank Account', value: 'bank', icon: 'bank' },
  { label: 'Mobile Wallet', value: 'mobile_wallet', icon: 'mobile' },
  { label: 'Credit Card (Debt)', value: 'credit_card', icon: 'credit-card' },
  { label: 'Other', value: 'other', icon: 'question-circle' },
];

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

function WalletCardItem({ wallet, index, handleStartEditWallet, handleDeleteWallet, colors, user }: any) {
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
        toValue: 0.95,
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

  const isCreditCard = wallet.type === 'credit_card';
  const limit = wallet.creditLimit || 0;
  const remainingCredit = limit + Number(wallet.balance);
  const currentDebt = -Number(wallet.balance);

  return (
    <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }, { scale: cardScale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={animatePress}
        style={[styles.walletCard, { backgroundColor: wallet.color }]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => handleStartEditWallet(wallet)}>
              <FontAwesome name="pencil" size={14} color="#FFFFFF" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteWallet(wallet)}>
              <FontAwesome name="trash" size={14} color="#FFFFFF" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </View>
        </View>

        {isCreditCard ? (
          <View style={styles.creditCardData}>
            <View>
              <Text style={styles.creditSubLabel}>Available Credit</Text>
              <Text style={styles.cardBalance}>
                {formatCurrency(remainingCredit, wallet.currency)}
              </Text>
            </View>
            <View style={styles.creditDetailsRow}>
              <View>
                <Text style={styles.creditSubLabelSmall}>Total Limit</Text>
                <Text style={styles.creditDetailVal}>
                  {formatCurrency(limit, wallet.currency)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.creditSubLabelSmall}>Current Debt</Text>
                <Text style={[styles.creditDetailVal, { color: '#FEE2E2' }]}>
                  {formatCurrency(currentDebt, wallet.currency)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.cardBalance}>
            {formatCurrency(wallet.balance, wallet.currency)}
          </Text>
        )}

        <Text style={styles.cardName}>{wallet.name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WalletsScreen() {
  const { colors, isDark } = useThemeColors();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  // Add/Edit Wallet Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedType, setSelectedType] = useState('bank');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertDialog({
      visible: true,
      type: 'confirm',
      title,
      message,
      severity: 'danger',
      onConfirm,
    });
  };

  const fetchWallets = async () => {
    try {
      const res = await api.get('/wallets');
      if (res.data.success) {
        setWallets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching wallets:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallets();
  };

  const handleAddWallet = async () => {
    if (!name) {
      setFormError('Wallet name is required');
      return;
    }
    if (selectedType === 'credit_card' && (!creditLimit || isNaN(Number(creditLimit)) || Number(creditLimit) <= 0)) {
      setFormError('Please enter a valid credit limit');
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        balance: selectedType === 'credit_card' ? -(parseFloat(balance) || 0) : (parseFloat(balance) || 0),
        currency: user?.currency || 'USD',
        color: selectedColor,
        type: selectedType,
        creditLimit: selectedType === 'credit_card' ? parseFloat(creditLimit) : undefined,
        icon: selectedType === 'bank' ? 'account-balance' : selectedType === 'mobile_wallet' ? 'phone-android' : 'account-balance-wallet',
      };

      let response;
      if (editingWalletId) {
        response = await api.put(`/wallets/${editingWalletId}`, payload);
      } else {
        response = await api.post('/wallets', payload);
      }

      if (response.data.success) {
        resetForm();
        fetchWallets();
        triggerAlert('Success', editingWalletId ? 'Wallet updated successfully!' : 'New Wallet created successfully!', 'success');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditWallet = (wallet: Wallet) => {
    setEditingWalletId(wallet._id);
    setName(wallet.name);
    setBalance(Math.abs(wallet.balance).toString());
    setCreditLimit(wallet.creditLimit?.toString() || '');
    setSelectedColor(wallet.color);
    setSelectedType(wallet.type);
    setIsAdding(true);
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    triggerConfirm(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"? Active transactions mapped to this wallet will remain, but the wallet mapping itself will be removed.`,
      async () => {
        try {
          const res = await api.delete(`/wallets/${wallet._id}`);
          if (res.data.success) {
            fetchWallets();
          }
        } catch (err) {
          triggerAlert('Error', 'Failed to delete wallet', 'danger');
        }
      }
    );
  };

  const resetForm = () => {
    setName('');
    setBalance('');
    setCreditLimit('');
    setSelectedColor(COLORS[0]);
    setSelectedType('bank');
    setEditingWalletId(null);
    setIsAdding(false);
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
          <Text style={[styles.title, { color: colors.text }]}>My Wallets</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setIsAdding(!isAdding);
              setFormError('');
            }}
          >
            <FontAwesome name={isAdding ? 'close' : 'plus'} size={14} color="#FFFFFF" />
            <Text style={styles.addButtonText}> {isAdding ? 'Cancel' : 'Add New'}</Text>
          </TouchableOpacity>
        </View>

        {/* Add Wallet Form */}
        {isAdding ? (
          <AnimatedFormCard colors={colors}>
            <Text style={[styles.formTitle, { color: colors.text }]}>New Wallet Details</Text>
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Wallet Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Chase Bank, Pocket Cash"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {selectedType === 'credit_card' ? 'Current Debt (Starting spent amount)' : 'Initial Balance'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={balance}
                onChangeText={setBalance}
              />
            </View>

            {/* Credit Limit Input for Credit Card type */}
            {selectedType === 'credit_card' ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Credit Limit</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                />
              </View>
            ) : null}

            {/* Type Selector */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Wallet Type</Text>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeSelector,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    selectedType === t.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedType(t.value)}
                >
                  <FontAwesome
                    name={t.icon as any}
                    size={16}
                    color={selectedType === t.value ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeSelectorText,
                      { color: colors.textSecondary },
                      selectedType === t.value && { color: '#FFFFFF', fontWeight: 'bold' },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Selector */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Card Theme Color</Text>
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
              onPress={handleAddWallet}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingWalletId ? 'Update Wallet' : 'Create Wallet'}
                </Text>
              )}
            </TouchableOpacity>
          </AnimatedFormCard>
        ) : null}

        {/* Wallets Cards List */}
        {wallets.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="credit-card" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No wallets created yet.</Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {wallets.map((wallet, index) => (
              <WalletCardItem
                key={wallet._id}
                wallet={wallet}
                index={index}
                handleStartEditWallet={handleStartEditWallet}
                handleDeleteWallet={handleDeleteWallet}
                colors={colors}
                user={user}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    margin: 4,
  },
  typeSelectorActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typeSelectorText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  typeSelectorTextActive: {
    color: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cardsList: {
    gap: 16,
  },
  walletCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  cardBalance: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
    marginTop: 8,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
  },
  creditCardData: {
    marginVertical: 8,
  },
  creditSubLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    opacity: 0.7,
    fontWeight: '600',
  },
  creditSubLabelSmall: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.7,
    fontWeight: '500',
  },
  creditDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 8,
  },
  creditDetailVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
