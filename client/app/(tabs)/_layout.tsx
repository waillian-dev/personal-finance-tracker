import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';

// Solar Icons
import * as SolarBold from '@solar-icons/react-native/Bold';
import {
  Home2,
  Wallet,
  BellBing,
  User,
} from '@solar-icons/react-native/Bold';

function TabItem({ label, isFocused, onPress, onLongPress, routeName, isDark }: any) {
  const scaleValue = useRef(new Animated.Value(isFocused ? 1.08 : 1)).current;
  const opacityValue = useRef(new Animated.Value(isFocused ? 1 : 0.55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isFocused ? 1.08 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 6,
      }),
      Animated.timing(opacityValue, {
        toValue: isFocused ? 1 : 0.55,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  if (routeName === 'add-placeholder') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        style={styles.centerTabContainer}
      >
        <View style={styles.floatingCenterButton}>
          <FontAwesome name="plus" size={20} color="#1E293B" />
        </View>
        <Text style={[styles.centerTabLabel, { color: 'rgba(255, 255, 255, 0.75)' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  const renderIcon = (color: string) => {
    switch (routeName) {
      case 'index':
        return <Home2 size={22} color={color} />;
      case 'two':
        return <Wallet size={22} color={color} />;
      case 'notifications-placeholder':
        return <BellBing size={22} color={color} />;
      case 'profile':
        return <User size={22} color={color} />;
      default:
        return <User size={22} color={color} />;
    }
  };

  const activeColor = '#FFFFFF';
  const inactiveColor = 'rgba(255, 255, 255, 0.55)';
  const activeTextColor = '#C5D2FF';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabItemInner, { transform: [{ scale: scaleValue }], opacity: opacityValue }]}>
        {renderIcon(isFocused ? activeColor : inactiveColor)}
        <Text style={[styles.tabLabel, { color: isFocused ? activeTextColor : inactiveColor, fontWeight: isFocused ? '700' : '500' }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function FloatingTabBar({ state, descriptors, navigation, isDark }: any) {
  const router = useRouter();
  
  return (
    <View style={[styles.tabContainer, { backgroundColor: isDark ? '#0F172A' : '#1E293B' }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        if (['_sitemap', '+not-found', 'goals', 'friends'].includes(route.name)) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          if (route.name === 'add-placeholder') {
            router.push('/modal');
            return;
          }
          if (route.name === 'notifications-placeholder') {
            router.push('/notifications');
            return;
          }

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

        return (
          <TabItem
            key={route.name}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            routeName={route.name}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isDark } = useThemeColors();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} isDark={isDark} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Wallet',
        }}
      />
      <Tabs.Screen
        name="add-placeholder"
        options={{
          title: 'Add',
        }}
      />
      <Tabs.Screen
        name="notifications-placeholder"
        options={{
          title: 'Notification',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          href: null,
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
    left: 16,
    right: 16,
    borderRadius: 24,
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    paddingHorizontal: 8,
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
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  centerTabContainer: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  floatingCenterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#C5D2FF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -10 }],
    shadowColor: '#C5D2FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  centerTabLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -4,
    letterSpacing: 0.2,
  },
});
