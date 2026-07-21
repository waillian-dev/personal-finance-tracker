import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Dimensions,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import CustomAlert from '../../components/CustomAlert';
import { useThemeColors } from '../../hooks/useThemeColors';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  AltArrowRight,
  Card,
  DocumentText,
  Key,
  Eye,
  Global,
  QuestionCircle,
  ShieldKeyhole,
  CheckCircle,
  Logout,
  CloseCircle,
  Widget,
} from '@solar-icons/react-native/Bold';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', label: 'USD (US Dollar)' },
  { code: 'MMK', flag: '🇲🇲', label: 'MMK (Myanmar Kyat)' },
  { code: 'EUR', flag: '🇪🇺', label: 'EUR (Euro)' },
  { code: 'SGD', flag: '🇸🇬', label: 'SGD (Singapore Dollar)' },
  { code: 'GBP', flag: '🇬🇧', label: 'GBP (British Pound)' },
];

export default function ProfileScreen() {
  const { colors, isDark } = useThemeColors();
  const { user, logout, updateProfile } = useAuthStore();
  const router = useRouter();
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleUpdateCurrency = async (code: string) => {
    try {
      await updateProfile({ currency: code });
      setShowCurrencyModal(false);
    } catch (err) {
      console.error('Failed to update currency:', err);
    }
  };

  const handleToggleTheme = async (val: boolean) => {
    try {
      await updateProfile({ theme: val ? 'dark' : 'light' });
    } catch (err) {
      console.error('Failed to update theme:', err);
    }
  };

  const handleToggleNotification = async (val: boolean) => {
    try {
      await updateProfile({ notificationExpenseLimit: val });
    } catch (err) {
      console.error('Failed to update notification config:', err);
    }
  };

  const getCurrencyDisplay = () => {
    const currentCode = user?.currency || 'USD';
    const match = CURRENCIES.find(c => c.code === currentCode);
    return match ? `${match.flag} ${match.code}` : `🇺🇸 ${currentCode}`;
  };

  const renderIcon = (IconComponent: any, bgColor: string, iconColor: string) => {
    return (
      <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
        <IconComponent size={20} color={iconColor} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 10 }, Platform.OS === 'android' && { paddingBottom: 50 }]}>
      {/* Centered screen title */}
      <Text style={[styles.screenTitle, { color: colors.text }]}>Profile & Settings</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* ambient background gradient blobs */}
        <View style={styles.gradientContainer}>
          <View style={styles.blobPink} />
          <View style={styles.blobBlue} />
          <View style={[styles.gradientOverlay, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)' }]} />
        </View>

        {/* User Info & Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }}
              style={styles.avatarImage}
            />
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/account-settings')}
            >
              <FontAwesome name="camera" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'Livia Smith'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || 'liviasmith@gmail.com'}
          </Text>
        </View>

        {/* Group 1: General Account Features */}
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]} 
            onPress={() => router.push('/(tabs)/two')}
          >
            {renderIcon(Card, 'rgba(59, 130, 246, 0.1)', '#3B82F6')}
            <Text style={[styles.menuText, { color: colors.text }]}>Card confirmation</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]} 
            onPress={() => router.push('/account-settings')}
          >
            {renderIcon(Widget, 'rgba(16, 185, 129, 0.1)', '#10B981')}
            <Text style={[styles.menuText, { color: colors.text }]}>Account details</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]} 
            onPress={() => router.push('/transactions')}
          >
            {renderIcon(DocumentText, 'rgba(139, 92, 246, 0.1)', '#8B5CF6')}
            <Text style={[styles.menuText, { color: colors.text }]}>Transaction history</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/settings')}
          >
            {renderIcon(DocumentText, 'rgba(245, 158, 11, 0.1)', '#F59E0B')}
            <Text style={[styles.menuText, { color: colors.text }]}>Documents and statements</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Group 2: SYSTEM SETTINGS */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SYSTEM SETTINGS</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => setShowCurrencyModal(true)}
          >
            {renderIcon(Global, 'rgba(59, 130, 246, 0.1)', '#3B82F6')}
            <Text style={[styles.menuText, { color: colors.text }]}>Currency</Text>
            <View style={styles.currencyDisplayWrapper}>
              <Text style={[styles.currencyDisplayText, { color: colors.textSecondary }]}>
                {getCurrencyDisplay()}
              </Text>
              <AltArrowRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            {renderIcon(Eye, 'rgba(139, 92, 246, 0.1)', '#8B5CF6')}
            <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={handleToggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.menuItem}>
            {renderIcon(ShieldKeyhole, 'rgba(16, 185, 129, 0.1)', '#10B981')}
            <Text style={[styles.menuText, { color: colors.text }]}>Alert warnings</Text>
            <Switch
              value={user?.notificationExpenseLimit !== false}
              onValueChange={handleToggleNotification}
              trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Group 3: GENERAL & HELP CENTER */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>GENERAL</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/help-support')}
          >
            {renderIcon(QuestionCircle, 'rgba(139, 92, 246, 0.1)', '#8B5CF6')}
            <Text style={[styles.menuText, { color: colors.text }]}>Help Center & Support</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Group 4: ABOUT */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ABOUT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            {renderIcon(Widget, 'rgba(59, 130, 246, 0.1)', '#3B82F6')}
            <Text style={[styles.menuText, { color: colors.text }]}>App Version</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>v1.1.1</Text>
          </View>

          <View style={styles.menuItem}>
            {renderIcon(DocumentText, 'rgba(16, 185, 129, 0.1)', '#10B981')}
            <Text style={[styles.menuText, { color: colors.text }]}>About Zenith Finance</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Smart Finance Tracker</Text>
          </View>
        </View>

        {/* Group 4: LEGAL */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>LEGAL</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/privacy-policy')}
          >
            {renderIcon(ShieldKeyhole, 'rgba(16, 185, 129, 0.1)', '#10B981')}
            <Text style={[styles.menuText, { color: colors.text }]}>Privacy Policy</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/terms-conditions')}
          >
            {renderIcon(CheckCircle, 'rgba(245, 158, 11, 0.1)', '#F59E0B')}
            <Text style={[styles.menuText, { color: colors.text }]}>Terms and Conditions</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Group 5: Danger Actions */}
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleLogout}>
            {renderIcon(Logout, 'rgba(59, 130, 246, 0.1)', '#3B82F6')}
            <Text style={[styles.menuText, { color: colors.text }]}>Log Out</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            {renderIcon(CloseCircle, 'rgba(239, 68, 68, 0.1)', '#EF4444')}
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete account</Text>
            <AltArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Currency Selector Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={[styles.dropdownOptionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownHeading, { color: colors.textSecondary }]}>SELECT BASE CURRENCY</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleUpdateCurrency(item.code)}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }, user?.currency === item.code && { fontWeight: '700' }]}>
                    {item.flag} {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert
        visible={showLogoutConfirm}
        type="confirm"
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        severity="danger"
        confirmText="Log Out"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: 'hidden',
  },
  blobPink: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(236, 72, 153, 0.18)',
    top: -90,
    left: -40,
  },
  blobBlue: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    top: -70,
    right: -20,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  menuGroup: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  currencyDisplayWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyDisplayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 24,
  },
  dropdownOptionsCard: {
    width: '100%',
    maxHeight: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  dropdownHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
