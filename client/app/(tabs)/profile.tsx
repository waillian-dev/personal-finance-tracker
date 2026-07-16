import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import CustomAlert from '../../components/CustomAlert';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function ProfileScreen() {
  const { colors, isDark } = useThemeColors();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Profile Avatar Card */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#115E59' : '#D1FAE5' }]}>
            <Text style={[styles.avatarText, { color: isDark ? '#2DD4BF' : '#059669' }]}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || 'user@example.com'}</Text>
        </View>

        {/* PROFILE DETAILS DISPLAY */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <FontAwesome name="money" size={16} color="#10B981" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Base Currency</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{user?.currency || 'USD'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <FontAwesome name="dollar" size={16} color="#F59E0B" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Monthly Salary Baseline</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(user?.monthlySalary || 0, user?.currency)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, styles.lastDetailRow]}>
            <View style={[styles.detailIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <FontAwesome name="shield" size={16} color="#3B82F6" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Status</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {user?.isVerified ? 'Verified' : 'Active'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Notification Config</Text>
        <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 24 }]}>
          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <FontAwesome name="bell" size={15} color="#059669" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Salary Credit Reminders</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {user?.notificationSalary !== false ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <FontAwesome name="warning" size={15} color="#EF4444" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Monthly Expense Warning (80% Limit)</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {user?.notificationExpenseLimit !== false ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, styles.lastDetailRow]}>
            <View style={[styles.detailIconWrapper, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <FontAwesome name="info-circle" size={15} color="#3B82F6" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Monthly Card Fee Warnings</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {user?.notificationMonthlyFee !== false ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <FontAwesome name="cog" size={18} color="#FFFFFF" />
          <Text style={styles.settingsButtonText}>Configuration Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={16} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 110,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  avatarText: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
  },
  userName: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#64748B',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionHeader: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  settingsButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
