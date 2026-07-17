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
  User,
} from '@solar-icons/react-native/Bold';

function TabItem({ label, isFocused, onPress, onLongPress, routeName, colors }: any) {
  const scaleValue = useRef(new Animated.Value(isFocused ? 1.08 : 1)).current;
  const opacityValue = useRef(new Animated.Value(isFocused ? 1 : 0.65)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isFocused ? 1.08 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 6,
      }),
      Animated.timing(opacityValue, {
        toValue: isFocused ? 1 : 0.65,
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
        <View style={[styles.floatingCenterButton, { backgroundColor: colors.primary }]}>
          <FontAwesome name="plus" size={20} color="#FFFFFF" />
        </View>
        <Text style={[styles.centerTabLabel, { color: colors.textSecondary }]}>
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
      case 'friends':
        return <FontAwesome name="users" size={20} color={color} />;
      case 'profile':
        return <User size={22} color={color} />;
      default:
        return <User size={22} color={color} />;
    }
  };

  const activeColor = colors.primary;
  const inactiveColor = colors.textSecondary;

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
        <Text style={[styles.tabLabel, { color: isFocused ? activeColor : inactiveColor, fontWeight: isFocused ? '700' : '500' }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function FloatingTabBar({ state, descriptors, navigation, colors }: any) {
  const router = useRouter();
  
  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        if (['_sitemap', '+not-found', 'goals', 'friends-placeholder', 'notifications-placeholder'].includes(route.name)) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          if (route.name === 'add-placeholder') {
            router.push('/modal');
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
            colors={colors}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useThemeColors();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} colors={colors} />}
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
    left: 16,
    right: 16,
    borderRadius: 24,
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -10 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  centerTabLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -4,
    letterSpacing: 0.2,
  },
});
