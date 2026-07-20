import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Track Assets & Debts',
    description: 'Aggregate your cash, bank accounts, mobile wallets, and credit card debts in one unified dashboard.',
    icon: 'credit-card',
    color: '#059669', // Emerald
    bg: 'rgba(5, 150, 105, 0.08)',
  },
  {
    title: 'Set Monthly Salary',
    description: 'Configure your monthly baseline salary budget, track transactions in Myanmar Kyat (MMK) or USD.',
    icon: 'bar-chart',
    color: '#2563EB', // Blue
    bg: 'rgba(37, 99, 235, 0.08)',
  },
  {
    title: 'Smart Financial Control',
    description: 'Monitor cash flow, track credit remaining limits, and manage debts seamlessly with clean aesthetics.',
    icon: 'rocket',
    color: '#7C3AED', // Purple
    bg: 'rgba(124, 58, 237, 0.08)',
  },
];

export default function OnboardingScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const { completeOnboarding } = useAuthStore();
  const router = useRouter();

  const handleNext = async () => {
    if (activeSlide < SLIDES.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      await completeOnboarding();
      router.replace('/login');
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/login');
  };

  const slide = SLIDES[activeSlide];

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: 0 }]}>
      {/* Header Skip Button */}
      <View style={styles.header}>
        {activeSlide < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {/* Slide Content */}
      <View style={styles.slideContainer}>
        <View style={[styles.iconContainer, { backgroundColor: slide.bg }]}>
          <FontAwesome name={slide.icon as any} size={72} color={slide.color} />
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeSlide === index ? styles.activeDot : null,
                activeSlide === index ? { backgroundColor: slide.color } : null,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: slide.color }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {activeSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <FontAwesome name="arrow-right" size={16} color="#FFFFFF" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    height: 48,
  },
  skipText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
