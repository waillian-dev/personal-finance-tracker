import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useThemeColors } from '../hooks/useThemeColors';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';
import { AltArrowLeft } from '@solar-icons/react-native/Bold';

const CURRENCIES = ['USD', 'MMK', 'EUR', 'SGD', 'THB', 'JPY'];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, clearError, error } = useAuthStore();
  const { colors } = useThemeColors();

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [monthlySalary, setMonthlySalary] = useState(user?.monthlySalary?.toString() || '0');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(user?.theme || 'system');
  const [notificationSalary, setNotificationSalary] = useState(user?.notificationSalary ?? true);
  const [notificationExpenseLimit, setNotificationExpenseLimit] = useState(user?.notificationExpenseLimit ?? true);
  const [notificationMonthlyFee, setNotificationMonthlyFee] = useState(user?.notificationMonthlyFee ?? true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const handleSaveProfile = async () => {
    if (!name) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }
    if (isNaN(Number(monthlySalary)) || Number(monthlySalary) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid salary amount');
      return;
    }

    setIsSavingProfile(true);
    setProfileMsg('');
    clearError();

    try {
      await updateProfile({
        name,
        currency,
        theme,
        monthlySalary: parseFloat(monthlySalary) || 0,
        notificationSalary,
        notificationExpenseLimit,
        notificationMonthlyFee,
      });
      setProfileMsg('Profile settings updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      Alert.alert('Error', error || 'Failed to update settings');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>System Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* SECTION 1: PROFILE & CURRENCY */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile & Preferences</Text>
            
            {profileMsg ? <Text style={styles.successText}>{profileMsg}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Display Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Salary (MMK / USD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={monthlySalary}
                onChangeText={setMonthlySalary}
                keyboardType="numeric"
                placeholder="Salary Limit"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Base Currency</Text>
              <View style={styles.currencyGrid}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.currencySelector,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      currency === c && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text
                      style={[
                        styles.currencySelectorText,
                        { color: colors.textSecondary },
                        currency === c && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Application Theme</Text>
              <View style={styles.currencyGrid}>
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.currencySelector,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      theme === t && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setTheme(t)}
                  >
                    <Text
                      style={[
                        styles.currencySelectorText,
                        { color: colors.textSecondary },
                        theme === t && { color: colors.primary, fontWeight: '700' },
                        { textTransform: 'capitalize' }
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* SECTION 2: NOTIFICATIONS TOGGLES */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alert Warning Triggers</Text>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Salary Credit Messages</Text>
              <Switch
                value={notificationSalary}
                onValueChange={setNotificationSalary}
                trackColor={{ false: colors.border, true: '#A7F3D0' }}
                thumbColor={notificationSalary ? '#059669' : colors.textSecondary}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Expense Limit Alerts (80% Salary)</Text>
              <Switch
                value={notificationExpenseLimit}
                onValueChange={setNotificationExpenseLimit}
                trackColor={{ false: colors.border, true: '#A7F3D0' }}
                thumbColor={notificationExpenseLimit ? '#059669' : colors.textSecondary}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Monthly Card Fee Warnings</Text>
              <Switch
                value={notificationMonthlyFee}
                onValueChange={setNotificationMonthlyFee}
                trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                thumbColor={notificationMonthlyFee ? '#059669' : '#CBD5E1'}
              />
            </View>

            <TouchableOpacity
              style={styles.saveProfileButton}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveProfileButtonText}>Save Configuration</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  subtext: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    fontFamily: 'System',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  currencySelector: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
  },
  currencySelectorActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  currencySelectorText: {
    fontFamily: 'System',
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  currencySelectorTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchLabel: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  saveProfileButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveProfileButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  successText: {
    fontFamily: 'System',
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  recForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  formSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActiveExpense: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  typeBtnText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#0F172A',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emojiDot: {
    fontSize: 14,
  },
  selectorCardText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  frequencyBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  frequencyBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  frequencyBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  frequencyBtnTextActive: {
    color: '#FFFFFF',
  },
  addRecButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  addRecButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  emptyListText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  recItemCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  recItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recItemTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  recItemSub: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FFE4E6',
    borderRadius: 8,
  },
  recDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  recMetaText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#64748B',
  },
});
