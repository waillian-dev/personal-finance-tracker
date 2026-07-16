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
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import CustomAlert from '../../components/CustomAlert';
import { useThemeColors } from '../../hooks/useThemeColors';

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Friends & Ledgers</Text>
      </View>

      <CustomAlert
        visible={alertDialog.visible}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        severity={alertDialog.severity}
        onClose={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
        onConfirm={alertDialog.onConfirm}
      />

      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* ADD FRIEND CARD */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Add Friend by Email</Text>
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
                style={styles.sendButton}
                onPress={handleSendRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* PENDING INCOMING REQUESTS */}
          {pendingIncoming.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Incoming Requests ({pendingIncoming.length})</Text>
              {pendingIncoming.map((item) => (
                <View key={item.friendshipId} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{item.friend.name}</Text>
                    <Text style={[styles.friendEmail, { color: colors.textSecondary }]}>{item.friend.email}</Text>
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
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Sent Requests</Text>
              {pendingOutgoing.map((item) => (
                <View key={item.friendshipId} style={[styles.friendRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View>
                    <Text style={[styles.friendName, { color: colors.text }]}>{item.friend.name}</Text>
                    <Text style={[styles.friendEmail, { color: colors.textSecondary }]}>{item.friend.email}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ACTIVE FRIENDS LIST */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>My Friends</Text>
            {friends.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FontAwesome name="users" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't added any friends yet.</Text>
              </View>
            ) : (
              friends.map((item) => {
                const owesMe = item.netBalance > 0;
                const iOwe = item.netBalance < 0;
                const absBalance = Math.abs(item.netBalance);

                return (
                  <TouchableOpacity
                    key={item.friendshipId}
                    style={[styles.friendCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() =>
                      router.push({
                        pathname: '/friend-ledger',
                        params: { friendId: item.friend._id, friendName: item.friend.name },
                      })
                    }
                  >
                    <View style={styles.friendCardLeft}>
                      <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#115E59' : '#D1FAE5' }]}>
                        <Text style={[styles.avatarText, { color: isDark ? '#2DD4BF' : '#059669' }]}>
                          {item.friend.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.friendCardName, { color: colors.text }]}>{item.friend.name}</Text>
                        <Text style={[styles.friendCardEmail, { color: colors.textSecondary }]}>{item.friend.email}</Text>
                      </View>
                    </View>
                    <View style={styles.friendCardRight}>
                      {owesMe ? (
                        <Text style={[styles.balanceText, styles.owesMe]}>
                          owes you {formatCurrency(absBalance, user?.currency || 'USD')}
                        </Text>
                      ) : iOwe ? (
                        <Text style={[styles.balanceText, styles.iOwe]}>
                          you owe {formatCurrency(absBalance, user?.currency || 'USD')}
                        </Text>
                      ) : (
                        <Text style={[styles.balanceText, styles.settled]}>
                          settled up
                        </Text>
                      )}
                      <FontAwesome name="chevron-right" size={12} color="#94A3B8" style={{ marginLeft: 8 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 110, // Extra padding for the floating navigation bar
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  addFriendRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  sendButton: {
    width: 70,
    height: 44,
    backgroundColor: '#059669',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontFamily: 'System',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 10,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
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
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  friendName: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  friendEmail: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontFamily: 'System',
    color: '#D97706',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  friendCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'System',
    color: '#059669',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendCardName: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  friendCardEmail: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  friendCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  owesMe: {
    color: '#10B981',
  },
  iOwe: {
    color: '#EF4444',
  },
  settled: {
    color: '#64748B',
  },
});
