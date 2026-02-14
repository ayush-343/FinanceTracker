import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { isSameDay, isToday } from '../utils';

interface CalendarDayProps {
    date: Date;
    currentMonth: Date;
    spending: number;
    onPress: (date: Date) => void;
    isSelected?: boolean;
    formatCurrency: (amount: number) => string;
}

const CalendarDayComponent: React.FC<CalendarDayProps> = ({
    date,
    currentMonth,
    spending,
    onPress,
    isSelected = false,
    formatCurrency,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
    const { light } = useHaptics();

    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const today = isToday(date);

    const handlePress = useCallback(() => {
        light();
        onPress(date);
    }, [light, onPress, date]);

    const getSpendingColor = () => {
        if (spending === 0) return 'transparent';
        if (spending < 50) return colors.success + '40';
        if (spending < 100) return colors.warning + '40';
        return colors.error + '40';
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: isSelected
                        ? colors.primary
                        : today
                            ? colors.primaryLight + '20'
                            : 'transparent',
                    borderRadius: borderRadius.md,
                    opacity: isCurrentMonth ? (Platform.OS === 'ios' && pressed ? 0.7 : 1) : 0.3,
                },
            ]}
            onPress={handlePress}
            disabled={!isCurrentMonth}
            android_ripple={{
                color: `${colors.primary}30`,
                borderless: false,
            }}
        >
            <Text
                style={[
                    textStyles.body,
                    {
                        color: isSelected
                            ? '#FFF'
                            : today
                                ? colors.primary
                                : colors.text,
                        fontWeight: today ? '600' : '400',
                    },
                ]}
            >
                {date.getDate()}
            </Text>
            {spending > 0 && isCurrentMonth && (
                <View
                    style={[
                        styles.spendingDot,
                        {
                            backgroundColor: isSelected ? '#FFF' : colors.primary,
                        },
                    ]}
                />
            )}
        </Pressable>
    );
};

export const CalendarDay = memo(CalendarDayComponent);

const styles = StyleSheet.create({
    container: {
        width: '14.28%', // 100% / 7 days
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    spendingDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 2,
    },
});
