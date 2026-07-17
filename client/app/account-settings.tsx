import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { useThemeColors } from '../hooks/useThemeColors';
import CustomAlert from '../components/CustomAlert';

// Solar Icons
import {
  AltArrowLeft,
  User,
  Letter,
  Dollar,
  CheckCircle,
} from '@solar-icons/react-native/Bold';

export default function AccountSettingsScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [monthlySalary, setMonthlySalary] = useState(user?.monthlySalary?.toString() || '0');
  const [isSaving, setIsSaving] = useState(false);

  // Alert Modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'danger' | 'info'>('info');

  const triggerAlert = (title: string, message: string, severity: 'success' | 'danger' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      triggerAlert('Validation Error', 'Name is required', 'danger');
      return;
    }
    if (isNaN(Number(monthlySalary)) || Number(monthlySalary) < 0) {
      triggerAlert('Validation Error', 'Please enter a valid salary amount', 'danger');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        monthlySalary: parseFloat(monthlySalary) || 0,
      });
      triggerAlert('Success', 'Account settings saved successfully!', 'success');
    } catch (err: any) {
      triggerAlert('Error', err.message || 'Failed to update account information', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInfoRow = (IconComponent: any, label: string, value: string, iconColor: string) => {
    return (
      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
          <IconComponent size={20} color={iconColor} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Account Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Account read-only section */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderInfoRow(User, 'Display Name', user?.name || 'User', '#3B82F6')}
          {renderInfoRow(Letter, 'Email Address', user?.email || 'user@example.com', '#8B5CF6')}
          {renderInfoRow(Dollar, 'Monthly Baseline', formatCurrency(user?.monthlySalary || 0, user?.currency), '#10B981')}
          {renderInfoRow(CheckCircle, 'Account Verification', user?.isVerified ? 'Verified Account' : 'Active Account', '#F59E0B')}
        </View>

        {/* Account editable settings fields */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>EDIT INFORMATION</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Your display name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Salary Baseline ({user?.currency || '$'})</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={monthlySalary}
              onChangeText={setMonthlySalary}
              placeholder="e.g. 5000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#1E293B' }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Account Details</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        type="alert"
        title={alertTitle}
        message={alertMessage}
        severity={alertSeverity}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputGroup: {
    marginVertical: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
