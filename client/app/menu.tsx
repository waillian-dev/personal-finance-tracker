import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../hooks/useThemeColors';

// Solar Icons
import { AltArrowLeft } from '@solar-icons/react-native/Outline';
import {
  Magnifier,
  AddCircle,
  Folder,
  Wallet,
  ArrowDown,
  Settings,
  Notes,
} from '@solar-icons/react-native/Bold';
import { FontAwesome } from '@expo/vector-icons';

interface MenuItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onPress: () => void;
  colors: any;
}

function MenuItem({ icon, iconBg, label, onPress, colors }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <Text style={[styles.menuItemLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <FontAwesome name="angle-right" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function MenuScreen() {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const shortcuts = [
    {
      label: 'Add',
      icon: <AddCircle size={20} color="#FFFFFF" />,
      iconBg: '#3B82F6',
      onPress: () => router.push('/modal'),
    },
    {
      label: 'Categories',
      icon: <Folder size={20} color="#FFFFFF" />,
      iconBg: '#8B5CF6',
      onPress: () => router.push('/categories'),
    },
    {
      label: 'Wallet',
      icon: <Wallet size={20} color="#FFFFFF" />,
      iconBg: '#F59E0B',
      onPress: () => router.push('/two'),
    },
    {
      label: 'Goal',
      icon: <ArrowDown size={20} color="#FFFFFF" />,
      iconBg: '#10B981',
      onPress: () => router.push('/goals'),
    },
  ];

  const otherMenu = [
    {
      label: 'History Transactions',
      icon: <FontAwesome name="exchange" size={16} color="#FFFFFF" />, // Fallback icon
      iconBg: '#8B5CF6',
      onPress: () => router.push('/transactions'),
    },
    {
      label: 'Auto-Transactions',
      icon: <FontAwesome name="refresh" size={16} color="#FFFFFF" />,
      iconBg: '#10B981',
      onPress: () => router.push('/auto-transactions'),
    },
    {
      label: 'Friends',
      icon: <FontAwesome name="users" size={16} color="#FFFFFF" />,
      iconBg: '#EF4444',
      onPress: () => router.push('/(tabs)/friends'),
    },
    {
      label: 'Settings',
      icon: <Settings size={20} color="#FFFFFF" />,
      iconBg: '#06B6D4',
      onPress: () => router.push('/settings'),
    },
    {
      label: 'Help',
      icon: <Notes size={20} color="#FFFFFF" />,
      iconBg: '#F59E0B',
      onPress: () => {},
    },
  ];

  const filteredShortcuts = shortcuts.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOtherMenu = otherMenu.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, Platform.OS === 'android' && { paddingTop: 20 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AltArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Menu</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Magnifier size={20} color="#94A3B8" />
        </View>

        {/* Shortcuts Section */}
        {filteredShortcuts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Shortcuts</Text>
              <TouchableOpacity>
                <Text style={styles.customizeText}>Customize</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.menuList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {filteredShortcuts.map((item, idx) => (
                <MenuItem
                  key={idx}
                  icon={item.icon}
                  iconBg={item.iconBg}
                  label={item.label}
                  onPress={item.onPress}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {/* Other Menu Section */}
        {filteredOtherMenu.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.categoryHeaderContainer, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[styles.categoryHeaderTitle, { color: colors.textSecondary }]}>Other Menu</Text>
            </View>
            <View style={[styles.menuList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {filteredOtherMenu.map((item, idx) => (
                <MenuItem
                  key={idx}
                  icon={item.icon}
                  iconBg={item.iconBg}
                  label={item.label}
                  onPress={item.onPress}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginVertical: 20,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  customizeText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryHeaderContainer: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  categoryHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  menuList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
