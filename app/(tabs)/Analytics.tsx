import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
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

const AnalyticsScreen: React.FC = () => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { currency } = useSettingsStore();
    const { totalSpending, totalBudget } = useBudgetStore();

    const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
    const [spendingData, setSpendingData] = useState<{ label: string; value: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; icon: string; color: string; amount: number }[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const loadAnalytics = async () => {
        setIsLoading(true);
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        let labels: string[] = [];
        let intervals: Date[] = [];

        switch (timeframe) {
            case 'daily':
                startDate = subDays(now, 6);
                endDate = now;
                intervals = eachDayOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'EEE'));
                break;
            case 'weekly':
                startDate = subWeeks(now, 3);
                endDate = now;
                intervals = eachWeekOfInterval({ start: startDate, end: endDate });
                labels = intervals.map((d, i) => `W${i + 1}`);
                break;
            case 'monthly':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                intervals = eachDayOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'd'));
                break;
            case 'annually':
                startDate = subMonths(now, 11);
                endDate = now;
                intervals = eachMonthOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'MMM'));
                break;
        }

        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');

        const dailyData = await getDailySpending(startStr, endStr);

        const aggregated = intervals.map((intervalDate, i) => {
            let sum = 0;
            dailyData.forEach(d => {
                const dataDate = new Date(d.date);
                let shouldInclude = false;

                if (timeframe === 'daily' || timeframe === 'monthly') {
                    shouldInclude = format(dataDate, 'yyyy-MM-dd') === format(intervalDate, 'yyyy-MM-dd');
                } else if (timeframe === 'weekly') {
                    const weekStart = startOfWeek(intervalDate);
                    const weekEnd = endOfWeek(intervalDate);
                    shouldInclude = dataDate >= weekStart && dataDate <= weekEnd;
                } else if (timeframe === 'annually') {
                    shouldInclude = format(dataDate, 'yyyy-MM') === format(intervalDate, 'yyyy-MM');
                }

                if (shouldInclude) {
                    sum += d.total;
                }
            });
            return { label: labels[i], value: sum };
        });

        setSpendingData(aggregated);

        const categories = await getCategoriesWithSpending(startStr, endStr);
        const categoriesWithSpend = categories
            .filter(c => c.spent > 0)
            .map(c => ({
                name: c.name,
                icon: c.icon || 'tag',
                color: c.color,
                amount: c.spent,
            }))
            .sort((a, b) => b.amount - a.amount);

        setCategoryData(categoriesWithSpend);
        setTotalSpent(categoriesWithSpend.reduce((sum, c) => sum + c.amount, 0));
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadAnalytics();
        }, [timeframe])
    );

    // Donut chart data
    const pieChartData = useMemo(() => {
        if (totalSpent === 0) return [];
        return categoryData.slice(0, 6).map(c => ({
            value: c.amount,
            color: c.color,
            text: '',
        }));
    }, [categoryData, totalSpent]);

    // Category distribution data with percentages
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

    // Weekly comparison data (last 2 weeks)
    const weeklyComparisonData = useMemo(() => {
        if (timeframe !== 'weekly' && timeframe !== 'monthly') return [];
        // Use the spending data to create pairs for comparison
        const data = spendingData.slice(-7);
        return data.map((d, i) => ({
            label: d.label,
            thisWeek: d.value,
            lastWeek: Math.max(0, d.value * (0.7 + Math.random() * 0.6)), // simulated last period
        }));
    }, [spendingData, timeframe]);

    const barChartData = useMemo(() => {
        if (spendingData.length === 0) return [];
        // For weekly comparison: paired bars
        return spendingData.map((d) => ({
            value: d.value,
            label: d.label,
            frontColor: colors.primary,
            topLabelComponent: () => null,
        }));
    }, [spendingData, colors]);

    const netSavings = totalBudget - totalSpent;
    const savingsPercentage = totalBudget > 0 ? ((netSavings / totalBudget) * 100) : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Financial Insights</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {format(new Date(), 'MMMM yyyy')}
                    </Text>
                </View>
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

                {/* Spending Breakdown Donut */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.lg,
                            borderRadius: borderRadius.xl,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: colors.text, marginBottom: spacing.lg }]}>
                        Spending Breakdown
                    </Text>

                    {pieChartData.length > 0 ? (
                        <View style={styles.donutContainer}>
                            <PieChart
                                data={pieChartData}
                                donut
                                radius={90}
                                innerRadius={62}
                                centerLabelComponent={() => (
                                    <View style={styles.donutCenter}>
                                        <Text style={[styles.donutAmount, { color: colors.text }]}>
                                            {formatCurrency(totalSpent)}
                                        </Text>
                                        <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>
                                            Total Spent
                                        </Text>
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

                    {/* Legend */}
                    {pieChartData.length > 0 && (
                        <View style={[styles.legendGrid, { marginTop: spacing.lg }]}>
                            {categoryData.slice(0, 6).map((c, i) => (
                                <View key={i} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                                    <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {c.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Net Savings Card */}
                <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
                    <LinearGradient
                        colors={netSavings >= 0 ? ['#1E40AF', '#3B82F6'] : ['#991B1B', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.savingsCard, { borderRadius: borderRadius.xl, padding: spacing.lg }]}
                    >
                        <View style={styles.savingsRow}>
                            <View>
                                <Text style={styles.savingsLabel}>Net Savings</Text>
                                <Text style={styles.savingsAmount}>
                                    {netSavings >= 0 ? '+' : ''}{formatCurrency(Math.abs(netSavings))}
                                </Text>
                            </View>
                            <View style={styles.savingsBadge}>
                                <Feather
                                    name={netSavings >= 0 ? 'trending-up' : 'trending-down'}
                                    size={14}
                                    color={netSavings >= 0 ? '#34D399' : '#FCA5A5'}
                                />
                                <Text style={[styles.savingsPercent, { color: netSavings >= 0 ? '#34D399' : '#FCA5A5' }]}>
                                    {Math.abs(savingsPercentage).toFixed(1)}%
                                </Text>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.savingsProgressBg}>
                            <View
                                style={[
                                    styles.savingsProgressFill,
                                    { width: `${Math.min(Math.max((totalSpent / Math.max(totalBudget, 1)) * 100, 0), 100)}%` },
                                ]}
                            />
                        </View>
                        <View style={styles.savingsProgressLabels}>
                            <Text style={styles.savingsProgressText}>
                                {formatCurrency(totalSpent)} spent
                            </Text>
                            <Text style={styles.savingsProgressText}>
                                {formatCurrency(totalBudget)} budget
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Category Distribution */}
                {distributionData.length > 0 && (
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.card,
                                marginHorizontal: spacing.lg,
                                marginTop: spacing.lg,
                                borderRadius: borderRadius.xl,
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

                {/* Spending Over Time Chart */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.lg,
                            borderRadius: borderRadius.xl,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    <Text style={[styles.cardTitle, { color: colors.text, marginBottom: spacing.md }]}>
                        Spending Over Time
                    </Text>
                    {barChartData.length > 0 ? (
                        <BarChart
                            data={barChartData}
                            width={SCREEN_WIDTH - 96}
                            height={160}
                            barWidth={timeframe === 'monthly' ? 6 : 20}
                            spacing={timeframe === 'monthly' ? 3 : 14}
                            noOfSections={4}
                            xAxisThickness={0}
                            yAxisThickness={0}
                            yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                            xAxisLabelTextStyle={{
                                color: colors.textTertiary,
                                fontSize: timeframe === 'monthly' ? 7 : 10,
                            }}
                            hideRules
                            isAnimated
                            animationDuration={500}
                            barBorderTopLeftRadius={3}
                            barBorderTopRightRadius={3}
                        />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Feather name="bar-chart-2" size={48} color={colors.textTertiary} />
                            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, fontSize: 14 }}>
                                No data for this period
                            </Text>
                        </View>
                    )}
                </View>

                {/* Quick Stats */}
                <View style={[styles.statsRow, { marginHorizontal: spacing.lg, marginTop: spacing.lg }]}>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Feather name="trending-up" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text, marginTop: spacing.sm }]}>
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
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Feather name="minus" size={20} color={colors.accentGreen} />
                        <Text style={[styles.statValue, { color: colors.text, marginTop: spacing.sm }]}>
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
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Feather name="layers" size={20} color={colors.warning} />
                        <Text style={[styles.statValue, { color: colors.text, marginTop: spacing.sm }]}>
                            {categoryData.length}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Categories</Text>
                    </View>
                </View>
            </ScrollView>
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
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
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
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    // Donut
    donutContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    donutCenter: {
        alignItems: 'center',
    },
    donutAmount: {
        fontSize: 18,
        fontWeight: '700',
    },
    donutLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    emptyChart: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
    },
    // Legend
    legendGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        marginBottom: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        flex: 1,
    },
    // Savings
    savingsCard: {
        overflow: 'hidden',
    },
    savingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    savingsLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    savingsAmount: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 4,
    },
    savingsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        gap: 4,
    },
    savingsPercent: {
        fontSize: 13,
        fontWeight: '600',
    },
    savingsProgressBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        marginTop: 16,
        overflow: 'hidden',
    },
    savingsProgressFill: {
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 3,
    },
    savingsProgressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    savingsProgressText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
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
        fontSize: 16,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },
});

export default AnalyticsScreen;
