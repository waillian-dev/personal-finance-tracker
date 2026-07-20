import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../hooks/useThemeColors';
import { AltArrowLeft } from '@solar-icons/react-native/Outline';

export default function TermsConditionsScreen() {
  const { colors } = useThemeColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms & Conditions</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: July 17, 2026</Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          By registering, authenticating, or logging transactions with Antigravity Tracker, you agree to comply with and be bound by these service terms.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>2. Financial Disclaimer</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          This app operates as a tracking ledger utility. It is not an officially chartered bank, investment firm, or wealth advisory desk. Information provided is for informational budgeting calculations only.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>3. User Accounts</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You are solely responsible for maintaining credentials security. We reserve the right to suspend accounts displaying abusive network triggers or fraudulent records.
        </Text>
      </ScrollView>
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
  lastUpdated: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 12,
  },
});
