import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { CalendarDay } from '../../src/components';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

    // Monthly totals for the daily summary
    const monthlyTotal = useMemo(() => {
        let total = 0;
        dailySpending.forEach(v => { total += v; });
        return total;
    }, [dailySpending]);

    const daysWithSpending = useMemo(() => {
        let count = 0;
        dailySpending.forEach(v => { if (v > 0) count++; });
        return count;
    }, [dailySpending]);

    const dailyAverage = daysWithSpending > 0 ? monthlyTotal / daysWithSpending : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                    <Feather name="chevron-left" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.monthTitle, { color: colors.text }]}>
                        {formatDate(currentMonth, 'MMMM yyyy')}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.accentGreen }]}>
                        Daily View
                    </Text>
                </View>
                <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                    <Feather name="chevron-right" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={[styles.weekdayRow, { paddingHorizontal: spacing.md, marginTop: spacing.md }]}>
                {weekdayLabels.map((label) => (
                    <Text
                        key={label}
                        style={[
                            styles.weekdayLabel,
                            { color: colors.textTertiary },
                        ]}
                    >
                        {label}
                    </Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={[styles.calendarGrid, { paddingHorizontal: spacing.sm, marginTop: spacing.xs }]}>
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

            {/* Sheet-style Daily Summary Panel */}
            <View
                style={[
                    styles.sheetPanel,
                    {
                        backgroundColor: colors.card,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    },
                ]}
            >
                {/* Handle */}
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {selectedDate ? (
                        <>
                            {/* Date header */}
                            <Text style={[styles.sheetDate, { color: colors.text }]}>
                                {formatDate(selectedDate, 'EEEE, MMMM d')}
                            </Text>

                            {/* Daily summary card */}
                            <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
                                <View style={[styles.summaryItem, { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md }]}>
                                    <Feather name="dollar-sign" size={16} color={colors.accentGreen} />
                                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                                        {formatCurrency(selectedDateSpending)}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                                </View>
                                <View style={[styles.summaryItem, { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md }]}>
                                    <Feather name="hash" size={16} color={colors.primary} />
                                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                                        {selectedTransactions.length}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
                                </View>
                            </View>

                            {/* Transaction list */}
                            {selectedTransactions.length > 0 ? (
                                <View style={{ marginTop: spacing.lg }}>
                                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                                        TRANSACTIONS
                                    </Text>
                                    {selectedTransactions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.transactionItem,
                                                {
                                                    backgroundColor: colors.background,
                                                    borderRadius: borderRadius.lg,
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
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.transactionLeft}>
                                                <View
                                                    style={[
                                                        styles.transactionIcon,
                                                        { backgroundColor: `${item.category_color}20` },
                                                    ]}
                                                >
                                                    <Feather
                                                        name={(item.category_icon as any) || 'tag'}
                                                        size={16}
                                                        color={item.category_color}
                                                    />
                                                </View>
                                                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                                                    <Text style={[styles.transactionName, { color: colors.text }]} numberOfLines={1}>
                                                        {item.category_name}
                                                    </Text>
                                                    {item.notes ? (
                                                        <Text style={[styles.transactionNotes, { color: colors.textTertiary }]} numberOfLines={1}>
                                                            {item.notes}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                            <Text style={[styles.transactionAmount, { color: colors.text }]}>
                                                {formatCurrency(item.amount)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={[styles.emptyTransactions, { marginTop: spacing.xl }]}>
                                    <Feather name="inbox" size={36} color={colors.textTertiary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 14 }}>
                                        No transactions on this day
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Monthly overview when no date selected */}
                            <Text style={[styles.sheetDate, { color: colors.text }]}>
                                Monthly Overview
                            </Text>
                            <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
                                <View style={[styles.summaryItem, { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md }]}>
                                    <Feather name="dollar-sign" size={16} color={colors.accentGreen} />
                                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                                        {formatCurrency(monthlyTotal)}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                                </View>
                                <View style={[styles.summaryItem, { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md }]}>
                                    <Feather name="trending-down" size={16} color={colors.primary} />
                                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                                        {formatCurrency(dailyAverage)}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Daily Average</Text>
                                </View>
                            </View>

                            {/* Insight card */}
                            <View style={[styles.insightCard, { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginTop: spacing.lg }]}>
                                <Feather name="info" size={18} color={colors.primary} />
                                <Text style={[styles.insightText, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                                    Tap on a day to view detailed transactions and spending breakdown.
                                </Text>
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
    },
    headerCenter: {
        alignItems: 'center',
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekdayRow: {
        flexDirection: 'row',
    },
    weekdayLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
    },
    // Sheet panel
    sheetPanel: {
        flex: 1,
        marginTop: 8,
        paddingHorizontal: 20,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetDate: {
        fontSize: 18,
        fontWeight: '600',
    },
    // Summary
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    summaryLabel: {
        fontSize: 11,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    // Transaction list
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionName: {
        fontSize: 15,
        fontWeight: '500',
    },
    transactionNotes: {
        fontSize: 12,
        marginTop: 1,
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyTransactions: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Insight
    insightCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    insightText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
});

export default CalendarScreen;
