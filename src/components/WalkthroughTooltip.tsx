import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface WalkthroughTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export const WalkthroughTooltip: React.FC<WalkthroughTooltipProps> = ({
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify().damping(18)}
      exiting={FadeOutDown.duration(200)}
      style={styles.container}
    >
      {/* Glassmorphism bubble */}
      <View style={[styles.bubble, { backgroundColor: 'rgba(24, 24, 27, 0.95)' }]}>
        {/* Glow border effect */}
        <View style={styles.glowBorder} />

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Step dots */}
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentStep ? '#3B82F6' : 'rgba(255,255,255,0.2)',
                  width: i === currentStep ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Navigation row */}
        <View style={styles.navRow}>
          {/* Back button */}
          {!isFirstStep ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          {/* Step counter */}
          <Text style={styles.stepCounter}>
            {currentStep + 1} of {totalSteps}
          </Text>

          {/* Next / Got it! button */}
          <TouchableOpacity
            style={[
              styles.nextButton,
              isLastStep && { backgroundColor: '#10B981' },
            ]}
            onPress={onNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {isLastStep ? "Got it!" : 'Next'}
            </Text>
            {!isLastStep && (
              <Feather name="chevron-right" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Skip link */}
        {!isLastStep && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip tour</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    width: '100%',
  },
  bubble: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  glowBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    height: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#3B82F6',
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 2,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 4,
  },
  nextText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'underline',
  },
});
