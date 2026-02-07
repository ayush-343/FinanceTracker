import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, FlatList, TouchableOpacity, Text, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    withTiming,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components';
import { OnboardingSlide, OnboardingSlideData } from '../../src/components/OnboardingSlide';
import { AnimatedPageIndicator } from '../../src/components/AnimatedPageIndicator';
import { useHaptics } from '../../src/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Lottie animations from LottieFiles
const ONBOARDING_SLIDES: OnboardingSlideData[] = [
    {
        id: '1',
        title: 'Track Every Expense',
        description: 'Effortlessly log your transactions with smart receipt scanning and automatic categorization.',
        lottieSource: require('../../assets/onboarding/Finance-guru.json'),
    },
    {
        id: '2',
        title: 'Set Smart Budgets',
        description: 'Create category budgets and watch your savings grow with intelligent spending insights.',
        lottieSource: require('../../assets/onboarding/Saving-Money.json'),
    },
    {
        id: '3',
        title: 'Visualize Your Money',
        description: 'Beautiful charts and analytics help you understand where your money goes.',
        lottieSource: require('../../assets/onboarding/analytics-chart.json'),
    },
    {
        id: '4',
        title: 'Safe & Private',
        description: 'Your financial data is protected with biometric authentication and local storage.',
        lottieSource: require('../../assets/onboarding/Mobile-Security.json'),
    },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlideData>);

export const AnimatedOnboarding: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles } = useTheme();
    const haptics = useHaptics();

    const flatListRef = useRef<FlatList<OnboardingSlideData>>(null);
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Skip button visibility animation
    const skipOpacity = useSharedValue(0);
    const skipTranslateY = useSharedValue(-20);

    // Handle scroll to track position
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    // Viewability config for detecting current slide
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index !== null) {
                const newIndex = viewableItems[0].index;
                if (newIndex !== currentIndex) {
                    setCurrentIndex(newIndex);
                    haptics.light();

                    // Show skip button after first slide
                    if (newIndex >= 1) {
                        skipOpacity.value = withTiming(1, { duration: 300 });
                        skipTranslateY.value = withSpring(0, { damping: 15 });
                    }
                }
            }
        },
        [currentIndex, haptics]
    );

    const viewabilityConfigCallbackPairs = useRef([
        { viewabilityConfig, onViewableItemsChanged },
    ]).current;

    // Navigate to next screen
    const handleGetStarted = useCallback(() => {
        haptics.medium();
        router.push('/(onboarding)/CurrencySetup');
    }, [router, haptics]);

    // Skip to currency setup
    const handleSkip = useCallback(() => {
        haptics.light();
        router.push('/(onboarding)/CurrencySetup');
    }, [router, haptics]);

    // Go to next slide
    const handleNext = useCallback(() => {
        if (currentIndex < ONBOARDING_SLIDES.length - 1) {
            haptics.light();
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        }
    }, [currentIndex, haptics]);

    // Skip button animated style
    const skipAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skipOpacity.value,
        transform: [{ translateY: skipTranslateY.value }],
    }));

    const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

    const renderItem = useCallback(
        ({ item, index }: { item: OnboardingSlideData; index: number }) => (
            <OnboardingSlide
                data={item}
                index={index}
                scrollX={scrollX}
                isActive={index === currentIndex}
            />
        ),
        [scrollX, currentIndex]
    );

    const keyExtractor = useCallback((item: OnboardingSlideData) => item.id, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Background gradient */}
            <LinearGradient
                colors={[colors.primary + '10', colors.background, colors.background]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.5 }}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Skip button - only visible after first slide */}
                <Animated.View style={[styles.skipContainer, skipAnimatedStyle]}>
                    <TouchableOpacity
                        onPress={handleSkip}
                        style={[styles.skipButton, { backgroundColor: colors.card }]}
                        activeOpacity={0.7}
                    >
                        <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                            Skip
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Slides */}
                <AnimatedFlatList
                    ref={flatListRef}
                    data={ONBOARDING_SLIDES}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                />

                {/* Bottom section */}
                <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
                    {/* Page indicator */}
                    <View style={styles.indicatorContainer}>
                        <AnimatedPageIndicator
                            totalPages={ONBOARDING_SLIDES.length}
                            scrollX={scrollX}
                        />
                    </View>

                    {/* Action buttons */}
                    <View style={[styles.buttonContainer, { paddingHorizontal: spacing.xl }]}>
                        {isLastSlide ? (
                            <Button
                                title="Get Started"
                                onPress={handleGetStarted}
                                fullWidth
                            />
                        ) : (
                            <Button
                                title="Next"
                                onPress={handleNext}
                                fullWidth
                            />
                        )}
                    </View>
                </SafeAreaView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    skipContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
    },
    skipButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    bottomContainer: {
        paddingBottom: 20,
    },
    indicatorContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    buttonContainer: {
        alignItems: 'center',
    },
});

export default AnimatedOnboarding;
