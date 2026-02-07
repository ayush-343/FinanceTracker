import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedPageIndicatorProps {
    totalPages: number;
    scrollX: SharedValue<number>;
}

interface DotProps {
    index: number;
    scrollX: SharedValue<number>;
}

const Dot: React.FC<DotProps> = ({ index, scrollX }) => {
    const { colors } = useTheme();

    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const width = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
        );

        const scale = interpolate(
            scrollX.value,
            inputRange,
            [0.8, 1, 0.8],
            Extrapolation.CLAMP
        );

        return {
            width,
            opacity,
            transform: [{ scale }],
            backgroundColor: colors.primary,
        };
    });

    return (
        <Animated.View
            style={[
                styles.dot,
                animatedStyle,
            ]}
        />
    );
};

export const AnimatedPageIndicator: React.FC<AnimatedPageIndicatorProps> = ({
    totalPages,
    scrollX,
}) => {
    return (
        <View style={styles.container}>
            {Array.from({ length: totalPages }).map((_, index) => (
                <Dot key={index} index={index} scrollX={scrollX} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});

export default AnimatedPageIndicator;
