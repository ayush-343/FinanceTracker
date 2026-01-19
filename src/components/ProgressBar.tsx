import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { getProgressColor } from '../constants';

interface ProgressBarProps {
    progress: number; // 0-100+
    height?: number;
    showOverflow?: boolean;
    animated?: boolean;
    style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    height = 8,
    showOverflow = true,
    animated = true,
    style,
}) => {
    const { colors, borderRadius } = useTheme();

    // Clamp display progress but allow color to show overflow
    const displayProgress = Math.min(progress, 100);
    const progressColor = getProgressColor(progress);

    // Use shared values for proper animation
    const progressValue = useSharedValue(0);

    useEffect(() => {
        if (animated) {
            progressValue.value = withSpring(displayProgress, { damping: 15, stiffness: 100 });
        } else {
            progressValue.value = displayProgress;
        }
    }, [displayProgress, animated]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${progressValue.value}%`,
        };
    });

    return (
        <View
            style={[
                styles.container,
                {
                    height,
                    backgroundColor: colors.backgroundTertiary,
                    borderRadius: borderRadius.full,
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    styles.progress,
                    { borderRadius: borderRadius.full, backgroundColor: progressColor },
                    animatedStyle,
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
    },
    progress: {
        height: '100%',
    },
});
