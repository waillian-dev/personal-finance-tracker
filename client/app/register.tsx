import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { FontAwesome } from '@expo/vector-icons';

const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { code: 'MMK', label: 'MMK - Myanmar Kyat', symbol: 'K' },
  { code: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { code: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
  { code: 'THB', label: 'THB - Thai Baht', symbol: '฿' },
  { code: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
];

const THEME_OPTIONS = [
  { key: 'blue', label: 'Blue', color: '#2563EB' },
  { key: 'green', label: 'Green', color: '#10B981' },
  { key: 'purple', label: 'Purple', color: '#8B5CF6' },
  { key: 'dark', label: 'Dark', color: '#334155' },
] as const;

export default function RegisterScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedTheme, setSelectedTheme] = useState<'blue' | 'green' | 'purple' | 'dark'>('blue');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [validationError, setValidationError] = useState('');

  const activeCurrencyObj = CURRENCY_OPTIONS.find((c) => c.code === selectedCurrency) || CURRENCY_OPTIONS[0];

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setValidationError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return;
    }
    setValidationError('');
    clearError();

    try {
      const themeValue = selectedTheme === 'dark' ? 'dark' : 'light';
      await register(name.trim(), email.trim(), password, selectedCurrency, themeValue);
    } catch (err) {
      // Error handled by authStore
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF' }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* MAIN CARD CONTAINER */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            {/* LOGO ICON & HEADER */}
            <View style={styles.headerContainer}>
              <View style={styles.logoBadge}>
                <View style={styles.logoOuterRing}>
                  <FontAwesome name="map-marker" size={36} color="#1E40AF" />
                  <View style={styles.logoDot} />
                </View>
              </View>

              <Text style={[styles.title, { color: colors.text }]}>Create Your Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join us and get started in just a few seconds</Text>
            </View>

            {/* ALERTS */}
            {error ? (
              <View style={styles.errorBox}>
                <FontAwesome name="exclamation-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {validationError ? (
              <View style={styles.errorBox}>
                <FontAwesome name="exclamation-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : null}

            {/* FULLNAME INPUT */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Fullname</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1E293B' : '#FAFAFA', borderColor: colors.border }]}>
                <FontAwesome name="user-o" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (error) clearError();
                  }}
                />
              </View>
            </View>

            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1E293B' : '#FAFAFA', borderColor: colors.border }]}>
                <FontAwesome name="envelope-o" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) clearError();
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* PASSWORD INPUT */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1E293B' : '#FAFAFA', borderColor: colors.border }]}>
                <FontAwesome name="lock" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Create a strong password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) clearError();
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* CURRENCY SELECTOR DROPDOWN */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Currency</Text>
              <TouchableOpacity
                style={[styles.dropdownWrapper, { backgroundColor: isDark ? '#1E293B' : '#FAFAFA', borderColor: colors.border }]}
                onPress={() => setShowCurrencyModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.currencyIconBg}>
                  <Text style={styles.currencySymbol}>{activeCurrencyObj.symbol}</Text>
                </View>
                <Text style={[styles.dropdownText, { color: colors.text }]}>{activeCurrencyObj.label}</Text>
                <FontAwesome name="chevron-down" size={12} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* THEMES SELECTOR GRID */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Themes</Text>
              <View style={styles.themeGrid}>
                {THEME_OPTIONS.map((t) => {
                  const isSelected = selectedTheme === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.themeCard,
                        { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isSelected ? '#2563EB' : colors.border },
                        isSelected && styles.themeCardSelected,
                      ]}
                      onPress={() => setSelectedTheme(t.key)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <FontAwesome name="check" size={8} color="#FFFFFF" />
                        </View>
                      )}
                      <View style={[styles.colorCircle, { backgroundColor: t.color }]} />
                      <Text style={[styles.themeLabel, { color: colors.text }, isSelected && { fontWeight: '700' }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* CREATE ACCOUNT BUTTON */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* BOTTOM FOOTER LINK */}
            <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
                <Text style={styles.footerLink} onPress={() => router.push('/login')}>
                  Login
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CURRENCY SELECTOR MODAL */}
      <Modal visible={showCurrencyModal} transparent animationType="fade" onRequestClose={() => setShowCurrencyModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <FontAwesome name="times" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {CURRENCY_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyOptionRow,
                  { borderBottomColor: colors.border },
                  selectedCurrency === c.code && { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)' },
                ]}
                onPress={() => {
                  setSelectedCurrency(c.code);
                  setShowCurrencyModal(false);
                }}
              >
                <View style={styles.currencyIconBg}>
                  <Text style={styles.currencySymbol}>{c.symbol}</Text>
                </View>
                <Text style={[styles.currencyOptionText, { color: colors.text }, selectedCurrency === c.code && { fontWeight: '700', color: '#2563EB' }]}>
                  {c.label}
                </Text>
                {selectedCurrency === c.code && <FontAwesome name="check" size={14} color="#2563EB" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoOuterRing: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoDot: {
    position: 'absolute',
    top: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: 14,
  },
  currencyIconBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  currencySymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  themeCardSelected: {
    borderWidth: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerContainer: {
    borderTopWidth: 1,
    paddingTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  currencyOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 12,
  },
  currencyOptionText: {
    flex: 1,
    fontSize: 14,
  },
});
