import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  LayoutRectangle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Rect, Path, Mask } from 'react-native-svg';
import { useWalkthroughStore } from '../store/walkthroughStore';
import { useWalkthroughContext } from './WalkthroughContext';
import { WalkthroughTooltip } from './WalkthroughTooltip';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Step configuration ──────────────────────────────────────
interface WalkthroughStepConfig {
  id: string;
  targetTab: 'Home' | 'Analytics' | 'Calendar' | 'Settings';
  spotlightKey?: string; // null/undefined = full-screen step
  spotlightPadding?: number;
  spotlightBorderRadius?: number;
  tooltipPosition: 'top' | 'bottom' | 'center';
  title: string;
  description: string;
}

const WALKTHROUGH_STEPS: WalkthroughStepConfig[] = [
  // ─── HOME (Steps 0–3) ───
  {
    id: 'welcome',
    targetTab: 'Home',
    tooltipPosition: 'center',
    title: "Welcome! 👋",
    description: "Let me show you around your Finance Tracker! I'll walk you through every feature so you can master your money.",
  },
  {
    id: 'budget-card',
    targetTab: 'Home',
    spotlightKey: 'budget-card',
    spotlightPadding: 4,
    spotlightBorderRadius: 24,
    tooltipPosition: 'bottom',
    title: 'Budget Dashboard 📊',
    description: 'This is your budget overview. See total spending vs. budget, the progress bar, and how much is remaining — all at a glance!',
  },
  {
    id: 'category-grid',
    targetTab: 'Home',
    spotlightKey: 'category-grid',
    spotlightPadding: 4,
    spotlightBorderRadius: 24,
    tooltipPosition: 'bottom',
    title: 'Category Cards 📁',
    description: 'Your spending is organized into categories. Tap any card to see subcategories, items, and transactions inside it.',
  },
  {
    id: 'add-category',
    targetTab: 'Home',
    spotlightKey: 'add-category-card',
    spotlightPadding: 4,
    spotlightBorderRadius: 20,
    tooltipPosition: 'top',
    title: 'Add New Category ➕',
    description: "Need a new category? Tap 'Add New' to create one with a custom icon, color, and budget limit!",
  },
  {
    id: 'fab-button',
    targetTab: 'Home',
    spotlightKey: 'fab',
    spotlightPadding: 4,
    spotlightBorderRadius: 40,
    tooltipPosition: 'top',
    title: 'Add Transaction ✨',
    description: 'Tap the + button to add a new transaction. You can enter it manually or scan a receipt photo for auto-detection!',
  },

  // ─── ANALYTICS (Steps 4–6) ───
  {
    id: 'timeframe-picker',
    targetTab: 'Analytics',
    spotlightKey: 'timeframe-picker',
    spotlightPadding: 4,
    spotlightBorderRadius: 16,
    tooltipPosition: 'bottom',
    title: 'Timeframe Views ⏱️',
    description: 'Switch between Daily, Weekly, Monthly, and Annual views to see your spending from different angles.',
  },
  {
    id: 'donut-chart',
    targetTab: 'Analytics',
    spotlightKey: 'donut-chart',
    spotlightPadding: 8,
    tooltipPosition: 'bottom',
    title: 'Spending Breakdown 🍩',
    description: "The donut chart shows your spending by category. The center shows total spent and the change compared to last period.",
  },
  {
    id: 'savings-comparison',
    targetTab: 'Analytics',
    spotlightKey: 'savings-comparison',
    spotlightPadding: 4,
    spotlightBorderRadius: 24,
    tooltipPosition: 'top',
    title: 'Savings & Comparison 💰',
    description: 'See your net savings at a glance and compare spending with the previous period in the bar chart below.',
  },

  // ─── CALENDAR (Steps 7–8) ───
  {
    id: 'calendar-grid',
    targetTab: 'Calendar',
    spotlightKey: 'calendar-grid',
    spotlightPadding: 4,
    tooltipPosition: 'bottom',
    title: 'Calendar View 📅',
    description: 'The calendar shows daily spending with color-coded dots — green for low, amber for moderate, red for high. Tap any date!',
  },
  {
    id: 'daily-panel',
    targetTab: 'Calendar',
    spotlightKey: 'daily-panel',
    spotlightPadding: 4,
    tooltipPosition: 'top',
    title: 'Daily Summary 📋',
    description: 'Drag this panel up to see the full transaction list for the selected day. Tap any transaction to edit it.',
  },

  // ─── SETTINGS (Steps 9–10) ───
  {
    id: 'preferences',
    targetTab: 'Settings',
    spotlightKey: 'preferences-group',
    spotlightPadding: 4,
    spotlightBorderRadius: 24,
    tooltipPosition: 'bottom',
    title: 'Preferences ⚙️',
    description: 'Customize your experience — change currency, budget period (weekly/monthly), app theme, and set your total budget amount.',
  },
  {
    id: 'security-data',
    targetTab: 'Settings',
    spotlightKey: 'security-data',
    spotlightPadding: 4,
    spotlightBorderRadius: 24,
    tooltipPosition: 'top',
    title: 'Security & Export 🔒',
    description: 'Enable Face ID/Touch ID to secure your data, and export a beautiful PDF report of your monthly spending anytime!',
  },

  // ─── COMPLETION (Steps 11) ───
  {
    id: 'completion',
    targetTab: 'Home',
    tooltipPosition: 'center',
    title: "You're All Set! 🎉",
    description: 'Start tracking your finances and watch your savings grow! You can replay this tour anytime from Settings. 💰',
  },
];

// ─── Main overlay component ──────────────────────────────────
export const WalkthroughOverlay: React.FC = () => {
  const {
    isWalkthroughActive,
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    skipWalkthrough,
  } = useWalkthroughStore();

  const { navigateToTab, measureRef } = useWalkthroughContext();

  // Animation values
  const overlayOpacity = useSharedValue(0);
  const [isVisible, setIsVisible] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<LayoutRectangle | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Current step config
  const stepConfig = WALKTHROUGH_STEPS[activeStepIndex];

  // Show/hide overlay
  useEffect(() => {
    if (isWalkthroughActive) {
      setIsVisible(true);
      setActiveStepIndex(0);

      // Ensure we navigate to the starting tab (e.g. when replaying from Settings)
      const startTab = WALKTHROUGH_STEPS[0].targetTab;
      navigateToTab(startTab);

      // Measure first step after a brief delay for views to render (longer delay to allow tab switch)
      setTimeout(() => {
        measureForStep(0);
        overlayOpacity.value = withTiming(1, { duration: 300 });
      }, 600);
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setIsVisible)(false);
      });
    }
  }, [isWalkthroughActive]);

  // Handle step changes
  useEffect(() => {
    if (!isWalkthroughActive || isTransitioning) return;
    if (currentStep === activeStepIndex) return;

    setIsTransitioning(true);

    // Fade out
    overlayOpacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(handleStepTransition)(currentStep);
    });
  }, [currentStep, isWalkthroughActive]);

  // Measure the target for a given step
  const measureForStep = useCallback(async (stepIndex: number) => {
    const step = WALKTHROUGH_STEPS[stepIndex];
    if (!step || !step.spotlightKey) {
      setSpotlightRect(null);
      return;
    }

    // Try measuring up to 3 times with increasing delays
    for (let attempt = 0; attempt < 3; attempt++) {
      const measurement = await measureRef(step.spotlightKey);
      if (measurement && measurement.width > 0 && measurement.height > 0) {
        setSpotlightRect(measurement);
        return;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }

    // Fallback: no spotlight for this step
    setSpotlightRect(null);
  }, [measureRef]);

  const handleStepTransition = useCallback(async (stepIndex: number) => {
    const step = WALKTHROUGH_STEPS[stepIndex];
    if (!step) {
      setIsTransitioning(false);
      return;
    }

    // Navigate to target tab if needed
    const prevStep = WALKTHROUGH_STEPS[activeStepIndex];
    const needsTabSwitch = !prevStep || prevStep.targetTab !== step.targetTab;

    if (needsTabSwitch) {
      navigateToTab(step.targetTab);
      // Wait for tab to render
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Measure the target
    await measureForStep(stepIndex);

    setActiveStepIndex(stepIndex);

    // Fade in
    overlayOpacity.value = withTiming(1, { duration: 200 });
    setIsTransitioning(false);
  }, [activeStepIndex, navigateToTab, measureForStep]);

  // Overlay animated style
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Compute tooltip position
  const tooltipPosition = useMemo(() => {
    if (!stepConfig) return { top: SCREEN_HEIGHT * 0.4 };

    if (stepConfig.tooltipPosition === 'center' || !spotlightRect) {
      return { top: SCREEN_HEIGHT * 0.35 };
    }

    if (stepConfig.tooltipPosition === 'bottom') {
      const bottomOfSpotlight = spotlightRect.y + spotlightRect.height + (stepConfig.spotlightPadding || 8);
      return { top: Math.min(bottomOfSpotlight + 16, SCREEN_HEIGHT * 0.65) };
    }

    // 'top'
    const topOfSpotlight = spotlightRect.y - (stepConfig.spotlightPadding || 8);
    return { top: Math.max(topOfSpotlight - 260, 60) };
  }, [stepConfig, spotlightRect]);

  const handleNext = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleBack = useCallback(() => {
    previousStep();
  }, [previousStep]);

  const handleSkip = useCallback(() => {
    skipWalkthrough();
  }, [skipWalkthrough]);

  if (!isVisible || !stepConfig) return null;

  // Compute spotlight cutout dimensions
  const padding = stepConfig.spotlightPadding !== undefined ? stepConfig.spotlightPadding : 8;
  const radius = stepConfig.spotlightBorderRadius !== undefined ? stepConfig.spotlightBorderRadius : 16;
  
  const cutout = spotlightRect
    ? {
        x: spotlightRect.x - padding,
        y: spotlightRect.y - padding,
        width: spotlightRect.width + padding * 2,
        height: spotlightRect.height + padding * 2,
        rx: Math.min(radius, (spotlightRect.width + padding * 2) / 2, (spotlightRect.height + padding * 2) / 2),
      }
    : null;

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        {/* SVG spotlight mask */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            {cutout ? (
              <Path
                d={`
                  M0,0 h${SCREEN_WIDTH} v${SCREEN_HEIGHT} h-${SCREEN_WIDTH} Z
                  M${cutout.x + cutout.rx},${cutout.y}
                  h${cutout.width - 2 * cutout.rx}
                  a${cutout.rx},${cutout.rx} 0 0 1 ${cutout.rx},${cutout.rx}
                  v${cutout.height - 2 * cutout.rx}
                  a${cutout.rx},${cutout.rx} 0 0 1 -${cutout.rx},${cutout.rx}
                  h-${cutout.width - 2 * cutout.rx}
                  a${cutout.rx},${cutout.rx} 0 0 1 -${cutout.rx},-${cutout.rx}
                  v-${cutout.height - 2 * cutout.rx}
                  a${cutout.rx},${cutout.rx} 0 0 1 ${cutout.rx},-${cutout.rx}
                  Z
                `}
                fill="rgba(0,0,0,0.75)"
                fillRule="evenodd"
              />
            ) : (
              /* Full screen overlay for non-spotlight steps */
              <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="rgba(0,0,0,0.75)" />
            )}
          </Svg>
        </View>

        {/* Spotlight glow ring */}
        {cutout && (
          <View
            style={[
              styles.spotlightGlow,
              {
                top: cutout.y - 2,
                left: cutout.x - 2,
                width: cutout.width + 4,
                height: cutout.height + 4,
                borderRadius: cutout.rx + 2,
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Touch handler to prevent interaction outside spotlight */}
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Tooltip */}
        <View
          style={[
            styles.tooltipContainer,
            { top: tooltipPosition.top },
          ]}
        >
          <WalkthroughTooltip
            title={stepConfig.title}
            description={stepConfig.description}
            currentStep={activeStepIndex}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            isFirstStep={activeStepIndex === 0}
            isLastStep={activeStepIndex === totalSteps - 1}
          />
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  spotlightGlow: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  tooltipContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 101,
  },
});
