import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { TimeframePicker, CategoryDistribution } from '../../src/components';
import { useBudgetStore, useSettingsStore } from '../../src/store';
import { useCurrency } from '../../src/hooks';
import { Timeframe } from '../../src/types';
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    format,
    subDays,
    subWeeks,
    subMonths,
} from 'date-fns';
import { getDailySpending, getCategoriesWithSpending } from '../../src/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Comparison Bar Component ────────────────────────────────
const ComparisonBar: React.FC<{
    label: string;
    current: number;
    previous: number;
    maxValue: number;
    barColor: string;
    prevColor: string;
    labelColor: string;
}> = ({ label, current, previous, maxValue, barColor, prevColor, labelColor }) => {
    const currentH = maxValue > 0 ? Math.max(4, (current / maxValue) * 100) : 4;
    const previousH = maxValue > 0 ? Math.max(4, (previous / maxValue) * 100) : 4;

    return (
        <View style={compStyles.barGroup}>
            <View style={compStyles.barsRow}>
                <View
                    style={[
                        compStyles.thinBar,
                        {
                            height: `${previousH}%`,
                            backgroundColor: prevColor,
                        },
                    ]}
                />
                <View
                    style={[
                        compStyles.thinBar,
                        {
                            height: `${currentH}%`,
                            backgroundColor: barColor,
                        },
                    ]}
                />
            </View>
            <Text style={[compStyles.barLabel, { color: labelColor }]}>{label}</Text>
        </View>
    );
};

const compStyles = StyleSheet.create({
    barGroup: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    barsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: '80%',
        gap: 3,
        width: '100%',
    },
    thinBar: {
        width: 5,
        borderRadius: 3,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
});

// ─── Main Screen ─────────────────────────────────────────────
const AnalyticsScreen: React.FC = () => {
    const { colors, spacing, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { totalSpending, totalBudget } = useBudgetStore();

    const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
    const [spendingData, setSpendingData] = useState<{ label: string; value: number }[]>([]);
    const [prevSpendingData, setPrevSpendingData] = useState<{ label: string; value: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; icon: string; color: string; amount: number }[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);
    const [prevTotalSpent, setPrevTotalSpent] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const loadAnalytics = async () => {
        setIsLoading(true);
        const now = new Date();
        let startDate: Date;    // chart range start
        let endDate: Date;      // chart range end
        let prevStartDate: Date;
        let prevEndDate: Date;
        let currentStart: Date; // current period for donut/categories
        let currentEnd: Date;
        let labels: string[] = [];
        let intervals: Date[] = [];

        switch (timeframe) {
            case 'daily':
                startDate = subDays(now, 6);
                endDate = now;
                prevStartDate = subDays(now, 13);
                prevEndDate = subDays(now, 7);
                currentStart = now;
                currentEnd = now;
                intervals = eachDayOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'EEE'));
                break;
            case 'weekly':
                startDate = subWeeks(now, 3);
                endDate = now;
                prevStartDate = subWeeks(now, 7);
                prevEndDate = subWeeks(now, 4);
                currentStart = startOfWeek(now);
                currentEnd = endOfWeek(now);
                intervals = eachWeekOfInterval({ start: startDate, end: endDate });
                labels = intervals.map((d, i) => `W${i + 1}`);
                break;
            case 'monthly':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                prevStartDate = startOfMonth(subMonths(now, 1));
                prevEndDate = endOfMonth(subMonths(now, 1));
                currentStart = startOfMonth(now);
                currentEnd = endOfMonth(now);
                intervals = eachDayOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'd'));
                break;
            case 'annually':
                startDate = subMonths(now, 11);
                endDate = now;
                prevStartDate = subMonths(now, 23);
                prevEndDate = subMonths(now, 12);
                currentStart = subMonths(now, 11);
                currentEnd = now;
                intervals = eachMonthOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'MMM'));
                break;
        }

        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const prevStartStr = format(prevStartDate, 'yyyy-MM-dd');
        const prevEndStr = format(prevEndDate, 'yyyy-MM-dd');
        const currentStartStr = format(currentStart, 'yyyy-MM-dd');
        const currentEndStr = format(currentEnd, 'yyyy-MM-dd');

        console.log(`[Insights] timeframe=${timeframe} | chart=${startStr}→${endStr} | categories=${currentStartStr}→${currentEndStr}`);

        // Current period (for bar chart)
        const dailyData = await getDailySpending(startStr, endStr);
        const aggregated = intervals.map((intervalDate, i) => {
            let sum = 0;
            dailyData.forEach(d => {
                const dataDate = new Date(d.date);
                let shouldInclude = false;
                if (timeframe === 'daily' || timeframe === 'monthly') {
                    shouldInclude = format(dataDate, 'yyyy-MM-dd') === format(intervalDate, 'yyyy-MM-dd');
                } else if (timeframe === 'weekly') {
                    const ws = startOfWeek(intervalDate);
                    const we = endOfWeek(intervalDate);
                    shouldInclude = dataDate >= ws && dataDate <= we;
                } else if (timeframe === 'annually') {
                    shouldInclude = format(dataDate, 'yyyy-MM') === format(intervalDate, 'yyyy-MM');
                }
                if (shouldInclude) sum += d.total;
            });
            return { label: labels[i], value: sum };
        });
        setSpendingData(aggregated);

        // Previous period
        const prevDailyData = await getDailySpending(prevStartStr, prevEndStr);
        let prevIntervals: Date[] = [];
        switch (timeframe) {
            case 'daily':
                prevIntervals = eachDayOfInterval({ start: prevStartDate, end: prevEndDate });
                break;
            case 'weekly':
                prevIntervals = eachWeekOfInterval({ start: prevStartDate, end: prevEndDate });
                break;
            case 'monthly':
                prevIntervals = eachDayOfInterval({ start: prevStartDate, end: prevEndDate });
                break;
            case 'annually':
                prevIntervals = eachMonthOfInterval({ start: prevStartDate, end: prevEndDate });
                break;
        }
        const prevAggregated = prevIntervals.map((intervalDate, i) => {
            let sum = 0;
            prevDailyData.forEach(d => {
                const dataDate = new Date(d.date);
                let shouldInclude = false;
                if (timeframe === 'daily' || timeframe === 'monthly') {
                    shouldInclude = format(dataDate, 'yyyy-MM-dd') === format(intervalDate, 'yyyy-MM-dd');
                } else if (timeframe === 'weekly') {
                    const ws = startOfWeek(intervalDate);
                    const we = endOfWeek(intervalDate);
                    shouldInclude = dataDate >= ws && dataDate <= we;
                } else if (timeframe === 'annually') {
                    shouldInclude = format(dataDate, 'yyyy-MM') === format(intervalDate, 'yyyy-MM');
                }
                if (shouldInclude) sum += d.total;
            });
            return { label: labels[i] || '', value: sum };
        });
        setPrevSpendingData(prevAggregated);
        setPrevTotalSpent(prevAggregated.reduce((s, d) => s + d.value, 0));

        // Categories — use CURRENT PERIOD only (not the full chart range)
        const categories = await getCategoriesWithSpending(currentStartStr, currentEndStr);
        const withSpend = categories
            .filter(c => c.spent > 0)
            .map(c => ({
                name: c.name,
                icon: c.icon_name || 'tag',
                color: c.color,
                amount: c.spent,
            }))
            .sort((a, b) => b.amount - a.amount);
        setCategoryData(withSpend);
        setTotalSpent(withSpend.reduce((s, c) => s + c.amount, 0));
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadAnalytics();
        }, [timeframe])
    );

    // ─── Donut chart data ───
    const pieChartData = useMemo(() => {
        if (totalSpent === 0) return [];
        const top = categoryData.slice(0, 6);
        const remaining = totalSpent - top.reduce((s, c) => s + c.amount, 0);
        const items = top.map(c => ({ value: c.amount, color: c.color, text: '' }));
        if (remaining > 0) {
            items.push({ value: remaining, color: '#27272a', text: '' });
        }
        return items;
    }, [categoryData, totalSpent]);

    // ─── Category distribution data ───
    const distributionData = useMemo(() => {
        if (totalSpent === 0) return [];
        return categoryData.map(c => ({
            name: c.name,
            icon: c.icon,
            color: c.color,
            amount: c.amount,
            percentage: (c.amount / totalSpent) * 100,
        }));
    }, [categoryData, totalSpent]);

    // ─── Comparison data ───
    const comparisonData = useMemo(() => {
        // Use the shorter of the two arrays
        const len = Math.min(spendingData.length, prevSpendingData.length, 7);
        const current = spendingData.slice(-len);
        const prev = prevSpendingData.slice(-len);
        return current.map((d, i) => ({
            label: d.label,
            current: d.value,
            previous: prev[i]?.value ?? 0,
        }));
    }, [spendingData, prevSpendingData]);

    const comparisonMax = useMemo(() => {
        if (comparisonData.length === 0) return 1;
        return Math.max(...comparisonData.map(d => Math.max(d.current, d.previous)), 1);
    }, [comparisonData]);

    // ─── Spending change % ───
    const spendingChange = useMemo(() => {
        if (prevTotalSpent === 0) return 0;
        return ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100;
    }, [totalSpent, prevTotalSpent]);

    // Top 3 categories for the breakdown display
    const topCategories = useMemo(() => {
        return categoryData.slice(0, 3).map(c => ({
            ...c,
            percentage: totalSpent > 0 ? (c.amount / totalSpent) * 100 : 0,
        }));
    }, [categoryData, totalSpent]);

    const netSavings = totalBudget - totalSpent;
    const savingsPercentage = totalBudget > 0 ? ((netSavings / totalBudget) * 100) : 0;

    // ─── Comparison period label ───
    const comparisonLabel = useMemo(() => {
        switch (timeframe) {
            case 'daily': return 'Daily Comparison';
            case 'weekly': return 'Weekly Comparison';
            case 'monthly': return 'Monthly Comparison';
            case 'annually': return 'Yearly Comparison';
        }
    }, [timeframe]);

    const currentPeriodLabel = useMemo(() => {
        switch (timeframe) {
            case 'daily': return 'Today';
            case 'weekly': return 'This\nWeek';
            case 'monthly': return 'This\nMonth';
            case 'annually': return 'This\nYear';
        }
    }, [timeframe]);

    const prevPeriodLabel = useMemo(() => {
        switch (timeframe) {
            case 'daily': return 'Prev\nDay';
            case 'weekly': return 'Last\nWeek';
            case 'monthly': return 'Last\nMonth';
            case 'annually': return 'Last\nYear';
        }
    }, [timeframe]);

    const getCategorySubtitle = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('hous') || lower.includes('rent')) return 'Rent & Utilities';
        if (lower.includes('food') || lower.includes('grocer') || lower.includes('din')) return 'Groceries & Dining';
        if (lower.includes('transport') || lower.includes('gas') || lower.includes('fuel')) return 'Gas & Public';
        if (lower.includes('shop')) return 'Shopping & More';
        if (lower.includes('entertain')) return 'Entertainment & Fun';
        if (lower.includes('health') || lower.includes('med')) return 'Health & Wellness';
        if (lower.includes('edu')) return 'Learning & Courses';
        return 'Spending';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Financial Insights</Text>
                <View style={[styles.profileButton, { backgroundColor: colors.card }]}>
                    <Feather name="user" size={20} color={colors.textSecondary} />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Timeframe Picker */}
                <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                    <TimeframePicker selected={timeframe} onSelect={setTimeframe} />
                </View>

                {/* ═══ Spending Breakdown ═══ */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.lg,
                            borderRadius: 24,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Breakdown</Text>
                        <View style={[styles.moreBtn, { backgroundColor: colors.background }]}>
                            <Feather name="more-horizontal" size={16} color={colors.textTertiary} />
                        </View>
                    </View>

                    {pieChartData.length > 0 ? (
                        <View style={styles.donutContainer}>
                            <PieChart
                                data={pieChartData}
                                donut
                                radius={100}
                                innerRadius={82}
                                innerCircleColor={colors.card}
                                backgroundColor={colors.card}
                                centerLabelComponent={() => (
                                    <View style={styles.donutCenter}>
                                        <Text style={[styles.donutLabelSmall, { color: colors.textTertiary }]}>
                                            TOTAL SPENT
                                        </Text>
                                        <Text style={[styles.donutAmount, { color: colors.text }]}>
                                            {formatCurrency(totalSpent)}
                                        </Text>
                                        {prevTotalSpent > 0 && (
                                            <View style={styles.changeRow}>
                                                <Feather
                                                    name={spendingChange >= 0 ? 'trending-up' : 'trending-down'}
                                                    size={12}
                                                    color={spendingChange >= 0 ? '#ef4444' : '#34D399'}
                                                />
                                                <Text
                                                    style={[
                                                        styles.changeText,
                                                        { color: spendingChange >= 0 ? '#ef4444' : '#34D399' },
                                                    ]}
                                                >
                                                    {spendingChange >= 0 ? '+' : ''}
                                                    {spendingChange.toFixed(1)}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            />
                        </View>
                    ) : (
                        <View style={styles.emptyChart}>
                            <Feather name="pie-chart" size={48} color={colors.textTertiary} />
                            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 14 }}>
                                No spending data yet
                            </Text>
                        </View>
                    )}

                    {/* Category rows — top 3 */}
                    {topCategories.length > 0 && (
                        <View style={{ marginTop: spacing.lg }}>
                            {topCategories.map((cat, idx) => (
                                <View key={idx}>
                                    {idx > 0 && (
                                        <View style={{ height: 1, backgroundColor: colors.border || colors.background, marginHorizontal: 4 }} />
                                    )}
                                    <View style={styles.categoryRow}>
                                        <View style={styles.categoryLeft}>
                                            <View
                                                style={[
                                                    styles.categoryIconBg,
                                                    { backgroundColor: `${cat.color}20` },
                                                ]}
                                            >
                                                <Feather
                                                    name={cat.icon as any}
                                                    size={22}
                                                    color={cat.color}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[styles.categoryName, { color: colors.text }]}
                                                    numberOfLines={1}
                                                >
                                                    {cat.name}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.categorySubtitle,
                                                        { color: colors.textTertiary },
                                                    ]}
                                                >
                                                    {getCategorySubtitle(cat.name)}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.categoryRight}>
                                            <Text style={[styles.categoryPercent, { color: colors.text }]}>
                                                {cat.percentage.toFixed(0)}%
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.categoryAmount,
                                                    { color: colors.textTertiary },
                                                ]}
                                            >
                                                {formatCurrency(cat.amount)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ═══ Net Savings Card ═══ */}
                <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
                    <LinearGradient
                        colors={netSavings >= 0 ? ['#2563EB', '#3B82F6'] : ['#991B1B', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.savingsCard, { borderRadius: 20, padding: spacing.lg }]}
                    >
                        {/* Decorative icon */}
                        <View style={styles.savingsIcon}>
                            <Feather name="dollar-sign" size={40} color="rgba(255,255,255,0.15)" />
                        </View>

                        <Text style={styles.savingsLabel}>Net Savings</Text>
                        <Text style={styles.savingsAmount}>
                            {netSavings >= 0 ? '' : '-'}{formatCurrency(Math.abs(netSavings))}
                        </Text>
                        <View style={styles.savingsBadge}>
                            <Feather
                                name={netSavings >= 0 ? 'trending-up' : 'trending-down'}
                                size={12}
                                color="#FFFFFF"
                            />
                            <Text style={styles.savingsBadgeText}>
                                {savingsPercentage >= 0 ? '+' : ''}{savingsPercentage.toFixed(0)}%
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* ═══ Category Distribution ═══ */}
                {distributionData.length > 0 && (
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.card,
                                marginHorizontal: spacing.lg,
                                marginTop: spacing.lg,
                                borderRadius: 24,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <CategoryDistribution
                            categories={distributionData}
                            formatCurrency={formatCurrency}
                            initialCount={5}
                        />
                    </View>
                )}

                {/* ═══ Comparison Chart ═══ */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.lg,
                            borderRadius: 24,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    {/* Header with legend */}
                    <View style={styles.comparisonHeader}>
                        <Text style={[styles.comparisonTitle, { color: colors.text }]}>
                            {comparisonLabel}
                        </Text>
                        <View style={styles.legendContainer}>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                                <Text style={[styles.legendLabel, { color: colors.textTertiary }]}>
                                    {currentPeriodLabel}
                                </Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendDot, { backgroundColor: colors.textTertiary + '60' }]} />
                                <Text style={[styles.legendLabel, { color: colors.textTertiary }]}>
                                    {prevPeriodLabel}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Bar chart area */}
                    <View style={styles.comparisonChart}>
                        {comparisonData.length > 0 ? (
                            comparisonData.map((d, i) => (
                                <ComparisonBar
                                    key={i}
                                    label={d.label}
                                    current={d.current}
                                    previous={d.previous}
                                    maxValue={comparisonMax}
                                    barColor="#34D399"
                                    prevColor={colors.textTertiary + '50'}
                                    labelColor={colors.textTertiary}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyChart}>
                                <Feather name="bar-chart-2" size={32} color={colors.textTertiary} />
                                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
                                    No comparison data
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ═══ Quick Stats Row ═══ */}
                <View style={[styles.statsRow, { marginHorizontal: spacing.lg, marginTop: spacing.lg }]}>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: 20,
                                padding: spacing.md,
                            },
                        ]}
                    >
                        <Feather name="trending-up" size={18} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text, marginTop: 6 }]}>
                            {formatCurrency(
                                spendingData.length > 0
                                    ? Math.max(...spendingData.map(d => d.value))
                                    : 0
                            )}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Highest</Text>
                    </View>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: 20,
                                padding: spacing.md,
                            },
                        ]}
                    >
                        <Feather name="minus" size={18} color="#34D399" />
                        <Text style={[styles.statValue, { color: colors.text, marginTop: 6 }]}>
                            {formatCurrency(
                                spendingData.length > 0
                                    ? spendingData.reduce((s, d) => s + d.value, 0) / spendingData.length
                                    : 0
                            )}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average</Text>
                    </View>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: 20,
                                padding: spacing.md,
                            },
                        ]}
                    >
                        <Feather name="layers" size={18} color="#fbbf24" />
                        <Text style={[styles.statValue, { color: colors.text, marginTop: 6 }]}>
                            {categoryData.length}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Categories</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 4,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    moreBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Donut
    donutContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    donutCenter: {
        alignItems: 'center',
    },
    donutLabelSmall: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    donutAmount: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    changeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyChart: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
    },
    // Category rows
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    categoryIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '700',
    },
    categorySubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    categoryRight: {
        alignItems: 'flex-end',
    },
    categoryPercent: {
        fontSize: 16,
        fontWeight: '700',
    },
    categoryAmount: {
        fontSize: 13,
        marginTop: 2,
    },
    // Savings
    savingsCard: {
        overflow: 'hidden',
    },
    savingsIcon: {
        position: 'absolute',
        top: 12,
        right: 16,
        transform: [{ rotate: '15deg' }],
    },
    savingsLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    savingsAmount: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 4,
        letterSpacing: -0.5,
    },
    savingsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginTop: 10,
        gap: 4,
    },
    savingsBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Comparison
    comparisonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    comparisonTitle: {
        fontSize: 18,
        fontWeight: '700',
        maxWidth: 120,
        lineHeight: 22,
    },
    legendContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: 11,
    },
    comparisonChart: {
        height: 160,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },
});

export default AnalyticsScreen;
