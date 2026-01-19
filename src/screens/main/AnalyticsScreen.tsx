import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme';
import { TimeframePicker, EmptyState } from '../../components';
import { useBudgetStore, useSettingsStore } from '../../store';
import { useCurrency } from '../../hooks';
import { RootStackParamList, Timeframe } from '../../types';
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
import { getDailySpending, getCategoriesWithSpending } from '../../database';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

export const AnalyticsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { currency } = useSettingsStore();
    const { totalSpending, categoriesWithSpending } = useBudgetStore();

    const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
    const [spendingData, setSpendingData] = useState<{ label: string; value: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; color: string; amount: number }[]>([]);
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
                // Last 7 days
                startDate = subDays(now, 6);
                endDate = now;
                intervals = eachDayOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'EEE'));
                break;
            case 'weekly':
                // Last 4 weeks
                startDate = subWeeks(now, 3);
                endDate = now;
                intervals = eachWeekOfInterval({ start: startDate, end: endDate });
                labels = intervals.map((d, i) => `W${i + 1}`);
                break;
            case 'monthly':
                // This month by day
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                intervals = eachDayOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'd'));
                break;
            case 'annually':
                // Last 12 months
                startDate = subMonths(now, 11);
                endDate = now;
                intervals = eachMonthOfInterval({ start: startDate, end: endDate });
                labels = intervals.map(d => format(d, 'MMM'));
                break;
        }

        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');

        // Get daily spending data
        const dailyData = await getDailySpending(startStr, endStr);

        // Aggregate based on timeframe
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

        // Get category breakdown
        const categories = await getCategoriesWithSpending(startStr, endStr);
        const categoriesWithSpend = categories
            .filter(c => c.spent > 0)
            .map(c => ({
                name: c.name,
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

    const barChartData = useMemo(() => {
        return spendingData.map((d, i) => ({
            value: d.value,
            label: d.label,
            frontColor: colors.primary,
            topLabelComponent: () => (
                d.value > 0 ? (
                    <Text style={{ fontSize: 8, color: colors.textSecondary }}>
                        {Math.round(d.value)}
                    </Text>
                ) : null
            ),
        }));
    }, [spendingData, colors]);

    const pieChartData = useMemo(() => {
        const total = categoryData.reduce((sum, c) => sum + c.amount, 0);
        if (total === 0) return [];
        return categoryData.slice(0, 6).map(c => ({
            value: c.amount,
            color: c.color,
            text: `${Math.round((c.amount / total) * 100)}%`,
            shiftTextX: -5,
        }));
    }, [categoryData]);

    const maxSpending = Math.max(...spendingData.map(d => d.value), 1);
    const avgSpending = spendingData.length > 0
        ? spendingData.reduce((sum, d) => sum + d.value, 0) / spendingData.length
        : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <Text style={[textStyles.h2, { color: colors.text }]}>Analytics</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Timeframe Picker */}
                <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                    <TimeframePicker
                        selected={timeframe}
                        onSelect={setTimeframe}
                    />
                </View>

                {/* Stats Summary */}
                <View
                    style={[
                        styles.statsGrid,
                        { marginHorizontal: spacing.lg, marginTop: spacing.lg },
                    ]}
                >
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                            Total Spent
                        </Text>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            {formatCurrency(totalSpent)}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                            Average
                        </Text>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            {formatCurrency(avgSpending)}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                            Highest
                        </Text>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            {formatCurrency(maxSpending)}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.lg,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                            Categories
                        </Text>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            {categoryData.length}
                        </Text>
                    </View>
                </View>

                {/* Spending Chart */}
                <View
                    style={[
                        styles.chartCard,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.xl,
                            borderRadius: borderRadius.xl,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    <Text style={[textStyles.h4, { color: colors.text, marginBottom: spacing.md }]}>
                        Spending Over Time
                    </Text>
                    {spendingData.length > 0 && (
                        <BarChart
                            data={barChartData}
                            width={CHART_WIDTH - 40}
                            height={180}
                            barWidth={timeframe === 'monthly' ? 8 : 24}
                            spacing={timeframe === 'monthly' ? 4 : 16}
                            noOfSections={4}
                            xAxisThickness={0}
                            yAxisThickness={0}
                            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                            xAxisLabelTextStyle={{
                                color: colors.textSecondary,
                                fontSize: timeframe === 'monthly' ? 8 : 10,
                            }}
                            hideRules
                            isAnimated
                            animationDuration={500}
                        />
                    )}
                </View>

                {/* Category Breakdown */}
                {categoryData.length > 0 && (
                    <View
                        style={[
                            styles.chartCard,
                            {
                                backgroundColor: colors.card,
                                marginHorizontal: spacing.lg,
                                marginTop: spacing.xl,
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.h4, { color: colors.text, marginBottom: spacing.lg }]}>
                            Category Breakdown
                        </Text>
                        <View style={styles.pieContainer}>
                            <PieChart
                                data={pieChartData}
                                donut
                                radius={80}
                                innerRadius={50}
                                centerLabelComponent={() => (
                                    <View style={styles.pieCenter}>
                                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                            Total
                                        </Text>
                                        <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                            {formatCurrency(totalSpent)}
                                        </Text>
                                    </View>
                                )}
                            />
                            <View style={styles.pieLegend}>
                                {categoryData.slice(0, 6).map((c, i) => (
                                    <View key={i} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                                        <Text
                                            style={[textStyles.labelSmall, { color: colors.text, flex: 1 }]}
                                            numberOfLines={1}
                                        >
                                            {c.name}
                                        </Text>
                                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                            {formatCurrency(c.amount)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Top Categories */}
                <View
                    style={[
                        styles.chartCard,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.xl,
                            borderRadius: borderRadius.xl,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    <Text style={[textStyles.h4, { color: colors.text, marginBottom: spacing.lg }]}>
                        Top Spending Categories
                    </Text>
                    {categoryData.slice(0, 5).map((c, i) => {
                        const percentage = (c.amount / totalSpent) * 100;
                        return (
                            <View key={i} style={{ marginBottom: spacing.md }}>
                                <View style={styles.categoryRow}>
                                    <Text style={[textStyles.body, { color: colors.text }]}>
                                        {i + 1}. {c.name}
                                    </Text>
                                    <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                                        {formatCurrency(c.amount)} ({percentage.toFixed(1)}%)
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.progressBg,
                                        { backgroundColor: colors.border, borderRadius: borderRadius.sm },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${percentage}%`,
                                                backgroundColor: c.color,
                                                borderRadius: borderRadius.sm,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        );
                    })}
                    {categoryData.length === 0 && (
                        <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                            No spending data yet
                        </Text>
                    )}
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
        paddingTop: 16,
    },
    scrollView: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: (SCREEN_WIDTH - 64 - 12) / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    chartCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    pieContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pieCenter: {
        alignItems: 'center',
    },
    pieLegend: {
        flex: 1,
        marginLeft: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressBg: {
        height: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
});
