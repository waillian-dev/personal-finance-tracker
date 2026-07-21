import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import CustomAlert from '../components/CustomAlert';

// Solar Icons
import { AltArrowLeft } from '@solar-icons/react-native/Outline';
import {
  Magnifier,
  Notes,
  QuestionCircle,
  HeadphonesRound,
  InboxIn,
  CheckCircle,
  AltArrowDown,
} from '@solar-icons/react-native/Bold';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Wallets & Transactions',
    question: 'How are Assets and Debts calculated?',
    answer: 'Assets sum all liquid balances across your cash, bank accounts, and mobile wallets. Debts combine negative credit card balances and your total friend payables.',
  },
  {
    id: 'faq-2',
    category: 'Wallets & Transactions',
    question: 'How do Automated Recurring Transactions work?',
    answer: 'Automated transactions schedule upcoming bills, subscriptions, or salaries on daily, weekly, or monthly cycles with custom starting dates.',
  },
  {
    id: 'faq-3',
    category: 'Wallets & Transactions',
    question: 'What is Friend Ledger and Split Expense?',
    answer: 'Friend Ledger lets you record split bills or peer-to-peer debts with friends. You can track who owes you ("They Owe Me") and who you owe ("I Owe Them").',
  },
  {
    id: 'faq-4',
    category: 'Account & Preferences',
    question: 'How do I change my currency or theme?',
    answer: 'Go to Menu > System Settings. You can select your default display currency (USD, MMK, EUR, etc.) and toggle Light, Dark, or System mode.',
  },
  {
    id: 'faq-5',
    category: 'Account & Preferences',
    question: 'How do I filter transaction history by date range?',
    answer: 'In the Transactions tab, tap the filter chips (Today, This Week, This Month, or Custom Range) to filter entries using the interactive Calendar Date Picker.',
  },
  {
    id: 'faq-6',
    category: 'Security & Privacy',
    question: 'Is my financial data secure?',
    answer: 'Yes! All user sessions use encrypted JWT authentication and secure hashed passwords. Sensitive tokens are saved safely using Expo SecureStore.',
  },
];

export default function HelpSupportScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<'General' | 'Bug' | 'Feature'>('General');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Alert
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    severity: 'success' as 'success' | 'warning' | 'danger' | 'info',
  });

  const categories = ['All', 'Wallets & Transactions', 'Account & Preferences', 'Security & Privacy'];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitTicket = () => {
    if (!subject.trim() || !message.trim()) {
      setAlertState({
        visible: true,
        title: 'Missing Details',
        message: 'Please enter both a subject and message for your support ticket.',
        severity: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowFeedbackModal(false);
      setSubject('');
      setMessage('');
      setAlertState({
        visible: true,
        title: 'Ticket Submitted',
        message: 'Thank you! Your support inquiry has been sent. Our team will review it shortly.',
        severity: 'success',
      });
    }, 1200);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 0 }]}>
      {/* Custom Alert */}
      <CustomAlert
        visible={alertState.visible}
        type="alert"
        title={alertState.title}
        message={alertState.message}
        severity={alertState.severity}
        onClose={() => setAlertState((prev) => ({ ...prev, visible: false }))}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#1E1B4B' : '#6366F1' }]}>
          <HeadphonesRound size={42} color="#FFFFFF" />
          <Text style={styles.heroTitle}>How can we help you today?</Text>
          <Text style={styles.heroSub}>Find instant answers to common questions or reach out to our dedicated support team.</Text>
        </View>

        {/* Quick Action Contact Cards */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowFeedbackModal(true)}
          >
            <View style={[styles.contactIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <InboxIn size={22} color="#10B981" />
            </View>
            <Text style={[styles.contactCardTitle, { color: colors.text }]}>Contact Support</Text>
            <Text style={[styles.contactCardSub, { color: colors.textSecondary }]}>Submit a inquiry ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              setAlertState({
                visible: true,
                title: 'Support Email',
                message: 'Support Email: support@personalfinancetracker.com\nOperating Hours: 24/7 Mon-Sun',
                severity: 'info',
              });
            }}
          >
            <View style={[styles.contactIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <QuestionCircle size={22} color="#3B82F6" />
            </View>
            <Text style={[styles.contactCardTitle, { color: colors.text }]}>Direct Email</Text>
            <Text style={[styles.contactCardSub, { color: colors.textSecondary }]}>24/7 customer care</Text>
          </TouchableOpacity>
        </View>

        {/* Search FAQ Bar */}
        <View style={[styles.searchSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Magnifier size={18} color="#94A3B8" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search FAQs & guides..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* FAQ Category Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCategory === cat && { borderColor: '#6366F1', backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: colors.textSecondary },
                  selectedCategory === cat && { color: '#6366F1', fontWeight: 'bold' },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ Accordion List */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Frequently Asked Questions</Text>
        {filteredFaqs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Notes size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching questions found.</Text>
          </View>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <View
                key={faq.id}
                style={[
                  styles.faqCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isExpanded && { borderColor: '#6366F1' },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.faqHeader}
                  onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                >
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                  <FontAwesome
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.faqBody, { borderTopColor: colors.border }]}>
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Support Ticket Modal */}
      <Modal visible={showFeedbackModal} transparent animationType="slide" onRequestClose={() => setShowFeedbackModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.ticketModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.ticketModalHeader}>
              <Text style={[styles.ticketModalTitle, { color: colors.text }]}>Contact Support Team</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <FontAwesome name="times" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Topic</Text>
              <View style={styles.topicRow}>
                {(['General', 'Bug', 'Feature'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.topicChip,
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      ticketCategory === t && { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.15)' },
                    ]}
                    onPress={() => setTicketCategory(t)}
                  >
                    <Text style={[styles.topicChipText, { color: colors.text }, ticketCategory === t && { color: '#6366F1', fontWeight: 'bold' }]}>
                      {t === 'Bug' ? 'Bug Report' : t === 'Feature' ? 'Feature Request' : 'General Question'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Brief summary of your question"
                placeholderTextColor="#94A3B8"
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Message</Text>
              <TextInput
                style={[styles.modalTextArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Provide as much detail as possible..."
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.submitTicketBtn} onPress={handleSubmitTicket} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitTicketBtnText}>Submit Support Ticket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  contactIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  contactCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  faqCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  faqBody: {
    padding: 16,
    borderTopWidth: 1,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
  },
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ticketModalCard: {
    width: '100%',
    maxHeight: 520,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  ticketModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  topicRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  topicChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  topicChipText: {
    fontSize: 11,
  },
  modalInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  modalTextArea: {
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitTicketBtn: {
    backgroundColor: '#6366F1',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTicketBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
