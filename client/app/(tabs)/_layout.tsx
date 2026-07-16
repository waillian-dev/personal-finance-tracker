import { Tabs, Link } from 'expo-router';
import { Pressable, StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';

function TabItem({ label, isFocused, onPress, onLongPress, iconName }: any) {
  const { colors } = useThemeColors();
  const scaleValue = useRef(new Animated.Value(isFocused ? 1.12 : 1)).current;
  const opacityValue = useRef(new Animated.Value(isFocused ? 1 : 0.65)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isFocused ? 1.12 : 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
      Animated.timing(opacityValue, {
        toValue: isFocused ? 1 : 0.65,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabItemInner, { transform: [{ scale: scaleValue }], opacity: opacityValue }]}>
        <FontAwesome
          name={iconName}
          size={18}
          color={isFocused ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textSecondary, fontWeight: isFocused ? '700' : '500' }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useThemeColors();
  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.tabBar, borderColor: colors.tabBarBorder }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        // Skip rendering routes that don't belong in the tab bar if any
        if (['_sitemap', '+not-found'].includes(route.name)) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName =
          route.name === 'index'
            ? 'dashboard'
            : route.name === 'two'
            ? 'credit-card'
            : route.name === 'goals'
            ? 'bullseye'
            : route.name === 'friends'
            ? 'users'
            : 'user';

        return (
          <TabItem
            key={route.name}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            iconName={iconName}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Wallets',
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  headerButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
});
