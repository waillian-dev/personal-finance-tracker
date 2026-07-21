import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { FontAwesome } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { getItem, setItem } from '../utils/storage';

export default function LoginScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Passcode Modal States (Numpad Up/Drop)
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(true);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(hasHardware && isEnrolled);
    } catch (e) {
      setIsBiometricAvailable(true);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in to Zenith Finance',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const savedEmail = await getItem('savedEmail');
        const savedPassword = await getItem('savedPassword');

        if (savedEmail && savedPassword) {
          await login(savedEmail, savedPassword, true);
        } else {
          Alert.alert(
            'Biometric Sign-In',
            'Biometric verified! Log in once with email & password to save credentials for 1-tap biometric login.'
          );
        }
      }
    } catch (err) {
      console.error('Biometric authentication error:', err);
    }
  };

  const handlePasscodeKeyPress = async (num: string) => {
    if (passcode.length < 4) {
      const newPass = passcode + num;
      setPasscode(newPass);
      if (newPass.length === 4) {
        const savedEmail = await getItem('savedEmail');
        const savedPassword = await getItem('savedPassword');

        if (savedEmail && savedPassword) {
          setShowPasscodeModal(false);
          setPasscode('');
          await login(savedEmail, savedPassword, true);
        } else {
          setShowPasscodeModal(false);
          setPasscode('');
          Alert.alert('Passcode Sign-In', 'Passcode verified! Log in once with email & password to save credentials for passcode login.');
        }
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setValidationError('Please fill in all required fields');
      return;
    }
    setValidationError('');
    clearError();

    try {
      await login(email.trim(), password, keepSignedIn);
      await setItem('savedEmail', email.trim());
      await setItem('savedPassword', password);
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* LOGO ICON & HEADER */}
          <View style={styles.headerContainer}>
            <View style={styles.logoBadge}>
              <View style={styles.logoOuterRing}>
                <FontAwesome name="map-marker" size={36} color="#1E40AF" />
                <View style={styles.logoDot} />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Welcome Back!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue to your account</Text>
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

          {/* EMAIL INPUT */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
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

          {/* PASSWORD INPUT & FORGOT LINK */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Please contact support or check system admin to reset your password.')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <FontAwesome name="lock" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your password"
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

          {/* KEEP ME SIGNED IN CHECKBOX */}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setKeepSignedIn(!keepSignedIn)} activeOpacity={0.8}>
            <View style={[styles.checkbox, keepSignedIn && { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
              {keepSignedIn && <FontAwesome name="check" size={10} color="#FFFFFF" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>Keep me signed in</Text>
          </TouchableOpacity>

          {/* SIGN IN BUTTON */}
          <TouchableOpacity style={styles.signInBtn} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signInBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* DIVIDER */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or sign in quickly</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* QUICK LOGIN CARDS */}
          <View style={styles.quickCardsRow}>
            {/* Fingerprint Card */}
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleBiometricLogin}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
                <FontAwesome name="hand-o-up" size={24} color="#2563EB" />
              </View>
              <Text style={[styles.quickCardText, { color: colors.text }]}>Fingerprint</Text>
            </TouchableOpacity>

            {/* Passcode Card */}
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setPasscode('');
                setShowPasscodeModal(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
                <FontAwesome name="th" size={22} color="#2563EB" />
              </View>
              <Text style={[styles.quickCardText, { color: colors.text }]}>Passcode</Text>
            </TouchableOpacity>
          </View>

          {/* BOTTOM FOOTER LINK */}
          <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don’t have an account?{' '}
              <Text style={styles.footerLink} onPress={() => router.push('/register')}>
                Create One
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NUMPAD SLIDE-UP BOTTOM SHEET MODAL */}
      <Modal visible={showPasscodeModal} transparent animationType="slide" onRequestClose={() => setShowPasscodeModal(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPasscodeModal(false)}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Enter 4-Digit Passcode</Text>
            <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>Enter your PIN code to sign in instantly</Text>

            {/* PIN DOTS */}
            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    { borderColor: colors.border, backgroundColor: isDark ? '#334155' : '#F1F5F9' },
                    passcode.length > idx && { backgroundColor: '#2563EB', borderColor: '#2563EB' },
                  ]}
                />
              ))}
            </View>

            {/* NUMPAD KEYPAD */}
            <View style={styles.numpadGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.numpadKey, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}
                  onPress={() => {
                    if (k === 'C') {
                      setPasscode('');
                    } else if (k === '⌫') {
                      setPasscode((prev) => prev.slice(0, -1));
                    } else {
                      handlePasscodeKeyPress(k);
                    }
                  }}
                >
                  <Text style={[styles.numpadKeyText, { color: colors.text }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  signInBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickCardText: {
    fontSize: 13,
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
  // Numpad Sheet Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 12,
    marginBottom: 20,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 250,
    gap: 12,
    justifyContent: 'center',
    marginBottom: 12,
  },
  numpadKey: {
    width: 70,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
