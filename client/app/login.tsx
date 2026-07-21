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
  Image,
} from 'react-native';
import { Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { FontAwesome } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { getItem, setItem } from '../utils/storage';
import { Letter, LockPassword, Eye, EyeClosed, AltArrowRight } from '@solar-icons/react-native/Bold';

export default function LoginScreen() {
  const { colors, isDark } = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(true);

  React.useEffect(() => {
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
        promptMessage: 'Authenticate with Fingerprint / Face ID',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const savedEmail = await getItem('savedEmail');
        const savedPassword = await getItem('savedPassword');

        if (savedEmail && savedPassword) {
          await login(savedEmail, savedPassword);
        } else {
          Alert.alert(
            'Biometric Sign-In',
            'Biometric verification passed! Please log in once with email & password to save credentials for instant biometric sign-in.'
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
          await login(savedEmail, savedPassword);
        } else {
          setShowPasscodeModal(false);
          setPasscode('');
          Alert.alert('Passcode Login', 'Passcode verified! Please log in once with email & password to save credentials for passcode sign-in.');
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
      await login(email.trim(), password);
      await setItem('savedEmail', email.trim());
      await setItem('savedPassword', password);
    } catch (err) {
      // Error handled by authStore
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* LOGO & BRANDING HEADER */}
          <View style={styles.headerContainer}>
            <View style={[styles.logoWrapper, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
              <Image source={require('../assets/images/logo.jpg')} style={styles.logoImage} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Zenith Finance</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Log in to manage your wallets, goals & split ledgers
            </Text>
          </View>

          {/* FORM CONTAINER */}
          <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome Back</Text>

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

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Letter size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter email (e.g. user@example.com)"
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

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <LockPassword size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter password"
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
                  {showPassword ? (
                    <EyeClosed size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#10B981' }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonRow}>
                  <Text style={styles.buttonText}>Log In</Text>
                  <AltArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Biometric & Passcode Sign-In Options */}
            <View style={styles.quickAuthDivider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>QUICK BIOMETRIC & PASSCODE</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.quickAuthRow}>
              {/* Fingerprint / Face ID Button */}
              <TouchableOpacity
                style={[styles.quickAuthBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={handleBiometricLogin}
              >
                <FontAwesome name="hand-o-up" size={18} color="#10B981" />
                <Text style={[styles.quickAuthBtnText, { color: colors.text }]}>Fingerprint</Text>
              </TouchableOpacity>

              {/* Passcode PIN Button */}
              <TouchableOpacity
                style={[styles.quickAuthBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => {
                  setPasscode('');
                  setShowPasscodeModal(true);
                }}
              >
                <FontAwesome name="key" size={18} color="#6366F1" />
                <Text style={[styles.quickAuthBtnText, { color: colors.text }]}>Passcode PIN</Text>
              </TouchableOpacity>
            </View>

            {/* Signup Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.signupLink}>Create One</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Interactive 4-Digit Passcode Modal */}
      <Modal visible={showPasscodeModal} transparent animationType="fade" onRequestClose={() => setShowPasscodeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.passcodeModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.passcodeHeader}>
              <Text style={[styles.passcodeTitle, { color: colors.text }]}>Enter 4-Digit Passcode</Text>
              <TouchableOpacity onPress={() => setShowPasscodeModal(false)}>
                <FontAwesome name="times" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.passcodeSub, { color: colors.textSecondary }]}>
              Enter your passcode PIN to log in instantly
            </Text>

            {/* PIN Dots */}
            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    { borderColor: colors.border, backgroundColor: colors.inputBg },
                    passcode.length > idx && { backgroundColor: '#10B981', borderColor: '#10B981' },
                  ]}
                />
              ))}
            </View>

            {/* Keypad Grid */}
            <View style={styles.keypadGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.keypadKey, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={() => {
                    if (item === 'C') {
                      setPasscode('');
                    } else if (item === '⌫') {
                      setPasscode(prev => prev.slice(0, -1));
                    } else {
                      handlePasscodeKeyPress(item);
                    }
                  }}
                >
                  <Text style={[styles.keypadKeyText, { color: colors.text }]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  formContainer: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  quickAuthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickAuthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAuthBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickAuthBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  passcodeModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  passcodeHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passcodeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  passcodeSub: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
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
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
    justifyContent: 'center',
  },
  keypadKey: {
    width: 68,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
