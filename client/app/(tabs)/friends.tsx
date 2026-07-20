import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import CustomAlert from '../../components/CustomAlert';
import { useThemeColors } from '../../hooks/useThemeColors';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  AddCircle,
  AltArrowRight,
  User,
  Card,
  Letter,
  CheckCircle,
  CloseCircle,
} from '@solar-icons/react-native/Bold';

interface FriendItem {
  friendshipId: string;
  friend: {
    _id: string;
    name: string;
    email: string;
  };
  netBalance: number;
}

interface PendingItem {
  friendshipId: string;
  friend: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function FriendsScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<PendingItem[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add friend state
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Alert popups state
  const [alertDialog, setAlertDialog] = useState({
    visible: false,
    type: 'alert' as 'alert' | 'confirm',
    title: '',
    message: '',
    severity: 'info' as 'success' | 'warning' | 'danger' | 'info',
    onConfirm: () => {},
  });

  const triggerAlert = (title: string, message: string, severity: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    setAlertDialog({
      visible: true,
      type: 'alert',
      title,
      message,
      severity,
      onConfirm: () => {},
    });
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get('/friends');
      if (res.data.success) {
        setFriends(res.data.data.friends || []);
        setPendingIncoming(res.data.data.pendingIncoming || []);
        setPendingOutgoing(res.data.data.pendingOutgoing || []);
      }
    } catch (err) {
      console.error('Error fetching friends list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleSendRequest = async () => {
    if (!email.trim()) {
      triggerAlert('Validation Error', 'Please enter an email address', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/friends/request', { email: email.trim() });
      if (res.data.success) {
        triggerAlert('Success', 'Friend request sent successfully!', 'success');
        setEmail('');
        fetchFriends();
      }
    } catch (err: any) {
      triggerAlert('Error', err.response?.data?.error || 'Failed to send friend request', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondRequest = async (id: string, response: 'accepted' | 'rejected') => {
    try {
      const res = await api.put(`/friends/request/${id}`, { status: response });
      if (res.data.success) {
        fetchFriends();
        triggerAlert('Success', `Friend request ${response} successfully!`, 'success');
      }
    } catch (err) {
      triggerAlert('Error', 'Failed to respond to friend request', 'danger');
    }
  };

  // Mini credit card renderer for friends
  const renderFriendCard = (item: FriendItem) => {
    const owesMe = item.netBalance > 0;
    const iOwe = item.netBalance < 0;
    const absBalance = Math.abs(item.netBalance);
    
    // Choose theme colors matching wallet credit cards
    const cardBg = owesMe ? '#10B981' : iOwe ? '#EF4444' : '#64748B';
    const footerBg = 'rgba(0, 0, 0, 0.2)';

    return (
      <TouchableOpacity
        key={item.friendshipId}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: '/friend-ledger',
            params: { friendId: item.friend._id, friendName: item.friend.name },
          })
        }
        style={[styles.friendCard, { backgroundColor: cardBg }]}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardTotalLabel}>Net Standing Balance</Text>
            <Text style={styles.cardBalanceText}>
              {owesMe ? '+' : iOwe ? '-' : ''}{formatCurrency(absBalance, user?.currency || 'USD')}
            </Text>
          </View>
          <View style={styles.badgeWrapper}>
            <Text style={styles.badgeText}>
              {owesMe ? 'OWES YOU' : iOwe ? 'YOU OWE' : 'SETTLED'}
            </Text>
          </View>
        </View>

        <View style={styles.cardMiddle}>
          <Text style={styles.cardNumberText}>
            ••••  ••••  ••••  {item.friend.name.substring(0, 4).toUpperCase()}
          </Text>
        </View>

        <View style={[styles.cardFooterStrip, { backgroundColor: footerBg }]}>
          <View>
            <Text style={styles.footerLabel}>Friend Name</Text>
            <Text style={styles.footerName}>{item.friend.name}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerEmail} numberOfLines={1}>{item.friend.email}</Text>
            <FontAwesome name="chevron-right" size={12} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 10 }]}>
      {/* Centered screen title */}
      <Text style={[styles.screenTitle, { color: colors.text }]}>Friends & Ledgers</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* ADD FRIEND CARD */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formHeading, { color: colors.text }]}>Add Friend by Email</Text>
          <View style={styles.addFriendRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="friend@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: '#1E293B' }]}
              onPress={handleSendRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* PENDING INCOMING REQUESTS */}
        {pendingIncoming.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>INCOMING REQUESTS ({pendingIncoming.length})</Text>
            {pendingIncoming.map((item) => (
              <View key={item.friendshipId} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestName, { color: colors.text }]}>{item.friend.name}</Text>
                  <Text style={[styles.requestEmail, { color: colors.textSecondary }]}>{item.friend.email}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleRespondRequest(item.friendshipId, 'accepted')}
                  >
                    <FontAwesome name="check" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleRespondRequest(item.friendshipId, 'rejected')}
                  >
                    <FontAwesome name="times" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* OUTGOING SENT REQUESTS */}
        {pendingOutgoing.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SENT REQUESTS</Text>
            {pendingOutgoing.map((item) => (
              <View key={item.friendshipId} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.requestName, { color: colors.text }]}>{item.friend.name}</Text>
                  <Text style={[styles.requestEmail, { color: colors.textSecondary }]}>{item.friend.email}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ACTIVE FRIENDS (WALLET CARDS) LIST */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>MY FRIENDS LEDGER CARDS</Text>
        {friends.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="users" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't added any friends yet.</Text>
          </View>
        ) : (
          <View style={styles.friendsListGrid}>
            {friends.map((item) => renderFriendCard(item))}
          </View>
        )}

      </ScrollView>

      <CustomAlert
        visible={alertDialog.visible}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        severity={alertDialog.severity}
        onClose={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
        onConfirm={alertDialog.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 110,
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  addFriendRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendButton: {
    width: 80,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '700',
  },
  requestEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
  },
  friendsListGrid: {
    gap: 16,
  },
  friendCard: {
    height: 160,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  cardTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cardBalanceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  badgeWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardMiddle: {
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  cardNumberText: {
    fontSize: 14,
    letterSpacing: 1.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  cardFooterStrip: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    fontWeight: '600',
  },
  footerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
  },
  footerEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
});
