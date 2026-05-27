import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { CalendarDay } from '../../src/components';
import { useWalkthroughContext } from '../../src/components/WalkthroughContext';
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

const SPENDING_COLORS = {
    green: '#34d399',
    amber: '#fbbf24',
    red: '#ef4444',
};

const CalendarScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius, isDark } = useTheme();
    const { format: formatCurrency } = useCurrency();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [dailySpending, setDailySpending] = useState<Map<string, number>>(new Map());
    const [selectedTransactions, setSelectedTransactions] = useState<TransactionWithDetails[]>([]);

    // Draggable panel state
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const COLLAPSED_TOP = SCREEN_HEIGHT * 0.55;
    const EXPANDED_TOP = SCREEN_HEIGHT * 0.12;
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.55)).current;
    const lastOffset = useRef(SCREEN_HEIGHT * 0.55);
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);

    // Walkthrough measurement refs
    const { registerRef } = useWalkthroughContext();
    const calendarGridRef = useRef<View>(null);
    const dailyPanelRef = useRef<View>(null);

    useEffect(() => {
        registerRef('calendar-grid', calendarGridRef);
        registerRef('daily-panel', dailyPanelRef);
    }, [registerRef]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                panY.stopAnimation((value) => {
                    lastOffset.current = value;
                });
            },
            onPanResponderMove: (_, gestureState) => {
                const newY = lastOffset.current + gestureState.dy;
                const clampedY = Math.max(SCREEN_HEIGHT * 0.12, Math.min(SCREEN_HEIGHT * 0.55, newY));
                panY.setValue(clampedY);
            },
            onPanResponderRelease: (_, gestureState) => {
                const currentY = lastOffset.current + gestureState.dy;
                const midPoint = (SCREEN_HEIGHT * 0.55 + SCREEN_HEIGHT * 0.12) / 2;
                const snapTo = (gestureState.vy < -0.5 || currentY < midPoint)
                    ? SCREEN_HEIGHT * 0.12
                    : SCREEN_HEIGHT * 0.55;

                setIsPanelExpanded(snapTo === SCREEN_HEIGHT * 0.12);
                lastOffset.current = snapTo;

                Animated.spring(panY, {
                    toValue: snapTo,
                    useNativeDriver: false,
                    damping: 20,
                    stiffness: 200,
                }).start();
            },
        })
    ).current;

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
            if (selectedDate) {
                loadSelectedDateTransactions(selectedDate);
            }
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

    // Compute max spending for bar proportionality
    const maxSpending = useMemo(() => {
        let max = 0;
        dailySpending.forEach(val => {
            if (val > max) max = val;
        });
        return max;
    }, [dailySpending]);

    // Compute daily average from days with actual spending
    const dailyAverage = useMemo(() => {
        if (dailySpending.size === 0) return 0;
        let total = 0;
        dailySpending.forEach(val => (total += val));
        return total / dailySpending.size;
    }, [dailySpending]);

    const selectedDateSpending = selectedDate
        ? dailySpending.get(format(selectedDate, 'yyyy-MM-dd')) || 0
        : 0;

    // Determine spending status badge
    const spendingStatus = useMemo(() => {
        if (!selectedDate || selectedDateSpending === 0) return { label: 'No Spending', color: colors.textSecondary, bgColor: `${colors.textSecondary}15` };
        if (dailyAverage <= 0) return { label: 'On Track', color: SPENDING_COLORS.green, bgColor: `${SPENDING_COLORS.green}18` };
        const ratio = selectedDateSpending / (dailyAverage * 2);
        if (ratio <= 0.5) return { label: 'On Track', color: SPENDING_COLORS.green, bgColor: `${SPENDING_COLORS.green}18` };
        if (ratio <= 0.85) return { label: 'Moderate', color: SPENDING_COLORS.amber, bgColor: `${SPENDING_COLORS.amber}18` };
        return { label: 'Over Budget', color: SPENDING_COLORS.red, bgColor: `${SPENDING_COLORS.red}18` };
    }, [selectedDate, selectedDateSpending, dailyAverage, colors.textSecondary]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <TouchableOpacity
                    style={[styles.navButton, { borderRadius: 20 }]}
                    onPress={handlePrevMonth}
                    activeOpacity={0.7}
                >
                    <Feather name="chevron-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[textStyles.h3, { color: colors.text, fontWeight: '700', letterSpacing: -0.3 }]}>
                        {formatDate(currentMonth, 'MMMM yyyy')}
                    </Text>
                    <Text style={[styles.subtitleText, { color: SPENDING_COLORS.green }]}>
                        DAILY VIEW
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.navButton, { borderRadius: 20 }]}
                    onPress={handleNextMonth}
                    activeOpacity={0.7}
                >
                    <Feather name="chevron-right" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={[styles.weekdayRow, { paddingHorizontal: spacing.lg, marginTop: spacing.md }]}>
                {weekdayLabels.map((label, index) => (
                    <Text
                        key={index}
                        style={[styles.weekdayLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}
                    >
                        {label}
                    </Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View
                ref={calendarGridRef}
                collapsable={false}
                style={[styles.calendarGrid, { paddingHorizontal: spacing.md, marginTop: spacing.xs }]}
            >
                {calendarGrid.map((date, index) => (
                    <CalendarDay
                        key={date ? date.getTime() : `empty-${index}`}
                        date={date || new Date(0)}
                        currentMonth={currentMonth}
                        spending={date ? dailySpending.get(format(date, 'yyyy-MM-dd')) || 0 : 0}
                        maxSpending={maxSpending}
                        dailyAverage={dailyAverage}
                        onPress={handleDayPress}
                        isSelected={selectedDate ? isSameDay(date || new Date(0), selectedDate) : false}
                    />
                ))}
            </View>

            {/* Draggable Daily Summary Bottom Sheet */}
            <Animated.View
                ref={dailyPanelRef}
                collapsable={false}
                style={[
                    styles.summarySection,
                    {
                        backgroundColor: isDark ? '#161616' : '#FFFFFF',
                        borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        top: panY,
                    },
                ]}
            >
                {/* Drag Handle */}
                <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? '#444' : '#CBD5E1' }]} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    scrollEnabled
                    contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
                >
                    {selectedDate ? (
                        <>
                            {/* Section Header */}
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                                    DAILY SUMMARY ({formatDate(selectedDate, 'MMM d')})
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: spendingStatus.bgColor }]}>
                                    <Text style={[styles.statusText, { color: spendingStatus.color }]}>
                                        {spendingStatus.label}
                                    </Text>
                                </View>
                            </View>

                            {/* Summary Card */}
                            <View
                                style={[
                                    styles.summaryCard,
                                    {
                                        backgroundColor: isDark ? '#1c1c1c' : '#f8fafc',
                                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    },
                                ]}
                            >
                                <View style={styles.summaryCardContent}>
                                    <Text style={[styles.summaryLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                                        TOTAL SPENT TODAY
                                    </Text>
                                    <Text style={[styles.summaryAmount, { color: colors.text }]}>
                                        {formatCurrency(selectedDateSpending)}
                                    </Text>
                                    <Text style={[styles.averageText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                                        Daily Average: {formatCurrency(dailyAverage)}
                                    </Text>
                                </View>

                                {/* Transactions */}
                                <View style={styles.transactionsList}>
                                    {selectedTransactions.length > 0 ? (
                                        selectedTransactions.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.transactionItem,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF',
                                                        borderRadius: borderRadius.xl,
                                                    },
                                                ]}
                                                activeOpacity={0.7}
                                                onPress={() =>
                                                    router.push({
                                                        pathname: '/EditTransaction',
                                                        params: { transactionId: String(item.id) },
                                                    })
                                                }
                                            >
                                                <View style={styles.transactionLeft}>
                                                    <View
                                                        style={[
                                                            styles.transactionIcon,
                                                            {
                                                                backgroundColor: `${item.category_color}18`,
                                                            },
                                                        ]}
                                                    >
                                                        <Feather
                                                            name={item.category_icon as any}
                                                            size={18}
                                                            color={item.category_color}
                                                        />
                                                    </View>
                                                    <View style={styles.transactionInfo}>
                                                        <Text
                                                            style={[
                                                                styles.transactionName,
                                                                { color: colors.text },
                                                            ]}
                                                            numberOfLines={1}
                                                        >
                                                            {item.item_name || item.subcategory_name || item.category_name}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.transactionCategory,
                                                                { color: isDark ? '#64748b' : '#94a3b8' },
                                                            ]}
                                                        >
                                                            {item.category_name}
                                                            {item.subcategory_name ? ` • ${item.subcategory_name}` : ''}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.transactionAmount,
                                                        { color: isDark ? '#e2e8f0' : '#1e293b' },
                                                    ]}
                                                >
                                                    -{formatCurrency(item.amount)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Feather
                                                name="calendar"
                                                size={28}
                                                color={isDark ? '#334155' : '#cbd5e1'}
                                            />
                                            <Text style={[styles.emptyText, { color: isDark ? '#475569' : '#94a3b8' }]}>
                                                No transactions on this day
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Feather name="calendar" size={32} color={isDark ? '#334155' : '#cbd5e1'} />
                            <Text style={[styles.emptyText, { color: isDark ? '#475569' : '#94a3b8', marginTop: spacing.md }]}>
                                Select a date to view spending
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </Animated.View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 4,
    },
    navButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    subtitleText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 2,
    },
    weekdayRow: {
        flexDirection: 'row',
    },
    weekdayLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
    },
    summarySection: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    dragHandleArea: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    summaryCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    summaryCardContent: {
        alignItems: 'center',
        marginBottom: 24,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: -1,
    },
    averageText: {
        fontSize: 12,
        marginTop: 8,
    },
    transactionsList: {
        gap: 12,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionName: {
        fontSize: 14,
        fontWeight: '600',
    },
    transactionCategory: {
        fontSize: 10,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 13,
        marginTop: 10,
    },
});

export default CalendarScreen;
