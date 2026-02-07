import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { isSameDay, isToday } from '../utils';

interface CalendarDayProps {
    date: Date;
    currentMonth: Date;
    spending: number;
    budget?: number;
    onPress: (date: Date) => void;
    isSelected?: boolean;
    formatCurrency: (amount: number) => string;
}

const CalendarDayComponent: React.FC<CalendarDayProps> = ({
    date,
    currentMonth,
    spending,
    budget = 100,
    onPress,
    isSelected = false,
    formatCurrency,
}) => {
    const { colors, spacing, borderRadius } = useTheme();
    const { light } = useHaptics();

    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const today = isToday(date);

    const handlePress = useCallback(() => {
        light();
        onPress(date);
    }, [light, onPress, date]);

    // Spending level colors
    const getSpendingBg = () => {
        if (!isCurrentMonth || spending === 0) return 'transparent';
        const ratio = spending / Math.max(budget, 1);
        if (ratio < 0.5) return colors.success + '15'; // green tint
        if (ratio < 0.8) return colors.warning + '15'; // amber tint
        return colors.error + '15'; // red tint
    };

    const getSpendingBarColor = () => {
        if (spending === 0) return 'transparent';
        const ratio = spending / Math.max(budget, 1);
        if (ratio < 0.5) return colors.success;
        if (ratio < 0.8) return colors.warning;
        return colors.error;
    };

    const spendingRatio = Math.min(spending / Math.max(budget, 1), 1);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: isSelected
                        ? colors.accentGreen
                        : getSpendingBg(),
                    borderRadius: borderRadius.md + 2,
                    opacity: isCurrentMonth ? (Platform.OS === 'ios' && pressed ? 0.7 : 1) : 0.25,
                    borderWidth: isSelected ? 0 : today ? 1.5 : 0,
                    borderColor: today ? colors.accentGreen + '60' : 'transparent',
                },
            ]}
            onPress={handlePress}
            disabled={!isCurrentMonth}
            android_ripple={{
                color: `${colors.accentGreen}30`,
                borderless: false,
            }}
        >
            <Text
                style={[
                    styles.dayText,
                    {
                        color: isSelected
                            ? '#FFFFFF'
                            : today
                                ? colors.accentGreen
                                : colors.text,
                        fontWeight: today || isSelected ? '700' : '400',
                    },
                ]}
            >
                {date.getDate()}
            </Text>

            {/* Mini progress bar at bottom */}
            {spending > 0 && isCurrentMonth && !isSelected && (
                <View style={styles.miniBarContainer}>
                    <View
                        style={[
                            styles.miniBarFill,
                            {
                                width: `${spendingRatio * 100}%`,
                                backgroundColor: getSpendingBarColor(),
                            },
                        ]}
                    />
                </View>
            )}

            {/* Selected indicator dot */}
            {isSelected && spending > 0 && (
                <View style={[styles.selectedDot, { backgroundColor: '#FFFFFF' }]} />
            )}
        </Pressable>
    );
};

export const CalendarDay = memo(CalendarDayComponent);

const styles = StyleSheet.create({
    container: {
        width: '14.28%',
        aspectRatio: 0.85,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    dayText: {
        fontSize: 14,
    },
    miniBarContainer: {
        position: 'absolute',
        bottom: 5,
        left: '20%',
        right: '20%',
        height: 2.5,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    miniBarFill: {
        height: '100%',
        borderRadius: 1.5,
    },
    selectedDot: {
        position: 'absolute',
        bottom: 5,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
});
