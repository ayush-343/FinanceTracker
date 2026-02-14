import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { isToday } from '../utils';

interface CalendarDayProps {
    date: Date;
    currentMonth: Date;
    spending: number;
    maxSpending: number;
    dailyAverage: number;
    onPress: (date: Date) => void;
    isSelected?: boolean;
}

type SpendingLevel = 'none' | 'low' | 'medium' | 'high';

const SPENDING_COLORS = {
    green: '#34d399',
    amber: '#fbbf24',
    red: '#ef4444',
};

const CalendarDayComponent: React.FC<CalendarDayProps> = ({
    date,
    currentMonth,
    spending,
    maxSpending,
    dailyAverage,
    onPress,
    isSelected = false,
}) => {
    const { colors, isDark } = useTheme();
    const { light } = useHaptics();

    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const today = isToday(date);

    const handlePress = useCallback(() => {
        light();
        onPress(date);
    }, [light, onPress, date]);

    const spendingLevel: SpendingLevel = useMemo(() => {
        if (spending === 0) return 'none';
        if (dailyAverage <= 0) return 'low';
        const ratio = spending / (dailyAverage * 2);
        if (ratio <= 0.5) return 'low';
        if (ratio <= 0.85) return 'medium';
        return 'high';
    }, [spending, dailyAverage]);

    const levelColor = useMemo(() => {
        switch (spendingLevel) {
            case 'low': return SPENDING_COLORS.green;
            case 'medium': return SPENDING_COLORS.amber;
            case 'high': return SPENDING_COLORS.red;
            default: return 'transparent';
        }
    }, [spendingLevel]);

    const barScale = useMemo(() => {
        if (spending === 0 || maxSpending === 0) return 0;
        return Math.max(0.1, Math.min(1, spending / maxSpending));
    }, [spending, maxSpending]);

    // Non-current-month days: render empty
    if (!isCurrentMonth) {
        return <View style={[styles.container, styles.cellLayout]} />;
    }

    // Days with no spending and not selected
    if (spendingLevel === 'none' && !isSelected) {
        return (
            <Pressable
                style={({ pressed }) => [
                    styles.container,
                    styles.cellLayout,
                    today && styles.todayContainer,
                    today && { borderColor: SPENDING_COLORS.green },
                    {
                        opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
                    },
                ]}
                onPress={handlePress}
                android_ripple={{
                    color: `${colors.primary}30`,
                    borderless: false,
                }}
            >
                <Text style={[styles.dateText, {
                    color: today
                        ? SPENDING_COLORS.green
                        : isDark ? '#64748b' : '#94a3b8',
                    fontWeight: today ? '700' : '600',
                }]}>
                    {date.getDate()}
                </Text>
                {today ? (
                    <View style={[styles.todayDot, { backgroundColor: SPENDING_COLORS.green }]} />
                ) : (
                    <View style={styles.barSpacer} />
                )}
            </Pressable>
        );
    }

    // Selected day
    if (isSelected) {
        return (
            <Pressable
                style={({ pressed }) => [
                    styles.container,
                    styles.selectedContainer,
                    {
                        backgroundColor: SPENDING_COLORS.green,
                        borderColor: SPENDING_COLORS.green,
                        opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
                    },
                ]}
                onPress={handlePress}
                android_ripple={{
                    color: `${SPENDING_COLORS.green}50`,
                    borderless: false,
                }}
            >
                <Text style={[styles.dateText, styles.selectedText]}>
                    {date.getDate()}
                </Text>
                {spending > 0 && (
                    <View style={styles.barContainer}>
                        <View
                            style={[
                                styles.bar,
                                {
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    width: `${barScale * 100}%`,
                                },
                            ]}
                        />
                    </View>
                )}
            </Pressable>
        );
    }

    // Days with spending (not selected)
    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                styles.spendingContainer,
                {
                    backgroundColor: `${levelColor}18`,
                    borderColor: today ? SPENDING_COLORS.green : `${levelColor}33`,
                    borderWidth: today ? 2 : 1,
                    opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
                },
            ]}
            onPress={handlePress}
            android_ripple={{
                color: `${levelColor}30`,
                borderless: false,
            }}
        >
            <Text style={[styles.dateText, {
                color: today
                    ? SPENDING_COLORS.green
                    : isDark ? '#94a3b8' : '#475569',
                fontWeight: today ? '700' : '600',
            }]}>
                {date.getDate()}
            </Text>
            <View style={styles.barContainer}>
                <View
                    style={[
                        styles.bar,
                        {
                            backgroundColor: `${levelColor}80`,
                            width: `${barScale * 100}%`,
                        },
                    ]}
                />
            </View>
        </Pressable>
    );
};

export const CalendarDay = memo(CalendarDayComponent);

const styles = StyleSheet.create({
    container: {
        width: '14.28%',
        aspectRatio: 1 / 1.2,
        padding: 3,
    },
    cellLayout: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spendingContainer: {
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedContainer: {
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    todayContainer: {
        borderRadius: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed' as any,
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 3,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    selectedText: {
        fontWeight: '700',
        color: '#0D0D0D',
    },
    barContainer: {
        width: '100%',
        height: 3,
        marginBottom: 3,
        justifyContent: 'center',
    },
    barSpacer: {
        width: '100%',
        height: 3,
        marginBottom: 3,
    },
    bar: {
        height: 3,
        borderRadius: 1.5,
    },
});
