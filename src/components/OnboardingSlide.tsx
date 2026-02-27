import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
    SharedValue,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface OnboardingSlideData {
    id: string;
    title: string;
    description: string;
    lottieSource: any;
    backgroundColor?: string;
}

interface OnboardingSlideProps {
    data: OnboardingSlideData;
    index: number;
    scrollX: SharedValue<number>;
    isActive: boolean;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
    data,
    index,
    scrollX,
    isActive,
}) => {
    const { colors, spacing, textStyles } = useTheme();
    const lottieRef = useRef<LottieView>(null);

    // Animation values for content entrance
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(30);
    const descriptionOpacity = useSharedValue(0);
    const descriptionTranslateY = useSharedValue(30);
    const lottieScale = useSharedValue(0.8);
    const lottieOpacity = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            // Staggered entrance animations when slide becomes active
            lottieOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
            lottieScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));

            titleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
            titleTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 100 }));

            descriptionOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
            descriptionTranslateY.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 100 }));

            // Play Lottie animation
            lottieRef.current?.play();
        } else {
            // Reset animations when slide is not active
            lottieOpacity.value = withTiming(0.3, { duration: 200 });
            lottieScale.value = withTiming(0.8, { duration: 200 });
            titleOpacity.value = withTiming(0, { duration: 200 });
            titleTranslateY.value = withTiming(30, { duration: 200 });
            descriptionOpacity.value = withTiming(0, { duration: 200 });
            descriptionTranslateY.value = withTiming(30, { duration: 200 });
        }
    }, [isActive]);

    // Parallax effect for Lottie based on scroll
    const lottieAnimatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const translateX = interpolate(
            scrollX.value,
            inputRange,
            [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
            Extrapolation.CLAMP
        );

        return {
            opacity: lottieOpacity.value,
            transform: [
                { translateX },
                { scale: lottieScale.value },
            ],
        };
    });

    const titleAnimatedStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const descriptionAnimatedStyle = useAnimatedStyle(() => ({
        opacity: descriptionOpacity.value,
        transform: [{ translateY: descriptionTranslateY.value }],
    }));

    return (
        <View style={[styles.container, { width: SCREEN_WIDTH }]}>
            <Animated.View style={[styles.lottieContainer, lottieAnimatedStyle]}>
                <LottieView
                    ref={lottieRef}
                    source={data.lottieSource}
                    style={styles.lottie}
                    autoPlay={false}
                    loop={true}
                />
            </Animated.View>

            <View style={styles.textContainer}>
                <Animated.Text
                    style={[
                        textStyles.displayLarge,
                        styles.title,
                        { color: colors.text },
                        titleAnimatedStyle,
                    ]}
                >
                    {data.title}
                </Animated.Text>

                <Animated.Text
                    style={[
                        textStyles.bodyLarge,
                        styles.description,
                        { color: colors.textSecondary, paddingHorizontal: spacing.xl },
                        descriptionAnimatedStyle,
                    ]}
                >
                    {data.description}
                </Animated.Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottieContainer: {
        flex: 0.55,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    lottie: {
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
    },
    textContainer: {
        flex: 0.35,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        textAlign: 'center',
        lineHeight: 24,
    },
});
