import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { CalendarDay, EmptyState } from '../../src/components';
import { useCurrency } from '../../src/hooks';
import { TransactionWithDetails } from '../../src/types';
import {
    getCalendarGrid,
    getWeekdayLabels,
    formatDate,
    addMonths,
    startOfMonth,
    endOfMonth,
    format,
    isSameDay,
} from '../../src/utils';
import { getTransactionsByDate, getDailySpending } from '../../src/database';

const CalendarScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [dailySpending, setDailySpending] = useState<Map<string, number>>(new Map());
    const [selectedTransactions, setSelectedTransactions] = useState<TransactionWithDetails[]>([]);

    const loadMonthData = async () => {
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        const spending = await getDailySpending(start, end);
        const spendingMap = new Map<string, number>();
        spending.forEach(s => spendingMap.set(s.date, s.total));
        setDailySpending(spendingMap);
    };

    const loadSelectedDateTransactions = async (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const transactions = await getTransactionsByDate(dateStr);
        setSelectedTransactions(transactions);
    };

    useFocusEffect(
        useCallback(() => {
            loadMonthData();
        }, [currentMonth])
    );

    const handlePrevMonth = () => {
        setCurrentMonth(addMonths(currentMonth, -1));
        setSelectedDate(null);
        setSelectedTransactions([]);
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
        setSelectedDate(null);
        setSelectedTransactions([]);
    };

    const handleDayPress = (date: Date) => {
        setSelectedDate(date);
        loadSelectedDateTransactions(date);
    };

    const calendarGrid = getCalendarGrid(currentMonth);
    const weekdayLabels = getWeekdayLabels();

    const selectedDateSpending = selectedDate
        ? dailySpending.get(format(selectedDate, 'yyyy-MM-dd')) || 0
        : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <Text style={[textStyles.h2, { color: colors.text }]}>Calendar</Text>
            </View>

            {/* Month Navigation */}
            <View style={[styles.monthNav, { paddingHorizontal: spacing.lg, marginTop: spacing.md }]}>
                <TouchableOpacity onPress={handlePrevMonth}>
                    <Feather name="chevron-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[textStyles.h3, { color: colors.text }]}>
                    {formatDate(currentMonth, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity onPress={handleNextMonth}>
                    <Feather name="chevron-right" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={[styles.weekdayRow, { paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>
                {weekdayLabels.map((label) => (
                    <Text
                        key={label}
                        style={[
                            textStyles.labelSmall,
                            { color: colors.textSecondary, flex: 1, textAlign: 'center' },
                        ]}
                    >
                        {label}
                    </Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={[styles.calendarGrid, { paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
                {calendarGrid.map((date, index) => (
                    <CalendarDay
                        key={index}
                        date={date || new Date()}
                        currentMonth={currentMonth}
                        spending={date ? dailySpending.get(format(date, 'yyyy-MM-dd')) || 0 : 0}
                        onPress={handleDayPress}
                        isSelected={selectedDate ? isSameDay(date || new Date(), selectedDate) : false}
                        formatCurrency={formatCurrency}
                    />
                ))}
            </View>

            {/* Selected Date Details */}
            {selectedDate && (
                <View style={[styles.detailsSection, { paddingHorizontal: spacing.lg }]}>
                    <View
                        style={[
                            styles.dateSummary,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                            {formatDate(selectedDate, 'EEEE, MMMM d')}
                        </Text>
                        <Text style={[textStyles.currency, { color: colors.text, marginTop: spacing.xs }]}>
                            {formatCurrency(selectedDateSpending)}
                        </Text>
                    </View>

                    {/* Transaction List */}
                    <FlashList
                        data={selectedTransactions}
                        keyExtractor={(item) => item.id.toString()}
                        estimatedItemSize={60}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.transactionItem,
                                    {
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.md,
                                        padding: spacing.md,
                                        marginBottom: spacing.sm,
                                    },
                                ]}
                                onPress={() =>
                                    router.push({
                                        pathname: '/EditTransaction',
                                        params: { transactionId: String(item.id) },
                                    })
                                }
                            >
                                <View style={styles.transactionInfo}>
                                    <View
                                        style={[
                                            styles.transactionIcon,
                                            { backgroundColor: `${item.category_color}20` },
                                        ]}
                                    >
                                        <Feather
                                            name={item.category_icon as any}
                                            size={16}
                                            color={item.category_color}
                                        />
                                    </View>
                                    <Text style={[textStyles.body, { color: colors.text, marginLeft: spacing.sm }]}>
                                        {item.category_name}
                                    </Text>
                                </View>
                                <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                    {formatCurrency(item.amount)}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                                No transactions on this day
                            </Text>
                        }
                        contentContainerStyle={{ paddingTop: spacing.md }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 16,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    weekdayRow: {
        flexDirection: 'row',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
    },
    detailsSection: {
        flex: 1,
        marginTop: 20,
    },
    dateSummary: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionIcon: {
        width: 28,
        height: 28,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CalendarScreen;
