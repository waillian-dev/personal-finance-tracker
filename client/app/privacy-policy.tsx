import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../hooks/useThemeColors';
import { AltArrowLeft } from '@solar-icons/react-native/Bold';

export default function PrivacyPolicyScreen() {
  const { colors } = useThemeColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AltArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: July 17, 2026</Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We collect information you provide directly to us when creating your account, including your display name, email address, password, baseline salary, and ledger transactions. This data is securely stored on our servers to calculate balances and track savings goals.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>2. How We Use Your Data</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Your financial data is used solely to render personal budget performance visualizations, transaction timelines, wallet balances, and countdown countdown clocks. We do not sell or monetize your transaction histories.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>3. Security & Face ID</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          When Face ID or biometrics are enabled, authentication is handled locally on your device hardware. Antigravity Tracker does not transmit or store biological markers.
        </Text>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Shared Ledgers</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Ledgers created under the "Friends" feature split calculations between participants. Balances within that ledger are mutually visible to both invited parties.
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
