import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

import { useCurrency } from '../hooks';
import { useSettingsStore } from '../store';

interface BudgetSummaryCardProps {
    totalSpending: number;
    totalBudget: number;
    periodLabel: string;
}

export const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
    totalSpending,
    totalBudget,
    periodLabel,
}) => {
    const { colors } = useTheme();
    const { format } = useCurrency();
    const { budgetPeriod } = useSettingsStore.getState();

    const percentage = totalBudget > 0 ? Math.min((totalSpending / totalBudget) * 100, 100) : 0;
    const remaining = totalBudget - totalSpending;

    const progressWidth = useSharedValue(0);

    React.useEffect(() => {
        progressWidth.value = withSpring(percentage, { damping: 15, stiffness: 80 });
    }, [percentage]);

    const animatedBarStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    return (
        <View style={styles.wrapper}>
            <LinearGradient
                colors={['rgba(59,130,246,0.20)', 'rgba(16,185,129,0.10)', 'rgba(13,13,13,0.0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={[styles.border, { borderColor: 'rgba(255,255,255,0.05)' }]}>
                    {/* Glow blobs */}
                    <View style={styles.glowRight} />
                    <View style={styles.glowLeft} />

                    <View style={styles.content}>
                        <Text style={styles.label}>
                            TOTAL {budgetPeriod === 'weekly' ? 'WEEKLY' : 'MONTHLY'} BUDGET
                        </Text>
                        <View style={styles.amountRow}>
                            <Text style={styles.amount}>{format(totalSpending)}</Text>
                            <Text style={styles.totalBudget}> / {format(totalBudget)}</Text>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.barTrack}>
                            <Animated.View style={[styles.barFill, animatedBarStyle]}>
                                <LinearGradient
                                    colors={['#3B82F6', '#10B981']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>
                        </View>

                        <View style={styles.statsRow}>
                            <Text style={styles.statText}>
                                {Math.round(percentage)}% Used
                            </Text>
                            <Text style={[styles.statText, { color: '#10B981' }]}>
                                {format(Math.max(remaining, 0))} Remaining
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradient: {
        borderRadius: 16,
    },
    border: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    glowRight: {
        position: 'absolute',
        right: -40,
        top: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(59,130,246,0.15)',
    },
    glowLeft: {
        position: 'absolute',
        left: -40,
        bottom: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(16,185,129,0.15)',
    },
    content: {
        alignItems: 'center',
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D1D5DB',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    amount: {
        fontSize: 30,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    totalBudget: {
        fontSize: 18,
        fontWeight: '500',
        color: '#6B7280',
    },
    barTrack: {
        width: '100%',
        height: 8,
        backgroundColor: '#262626',
        borderRadius: 4,
        marginTop: 20,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
        overflow: 'hidden',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 12,
    },
    statText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#9CA3AF',
    },
});
