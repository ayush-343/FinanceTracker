import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme';
import { CategoryCard, ProgressBar, EmptyState } from '../../components';
import { useBudgetStore, useSettingsStore } from '../../store';
import { useCurrency } from '../../hooks';
import { RootStackParamList } from '../../types';
import { getMonthRangeString, getWeekRangeString } from '../../utils';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format, formatCompact } = useCurrency();
    const { budgetPeriod } = useSettingsStore();
    const {
        categoriesWithSpending,
        totalSpending,
        totalBudget,
        dailySpending,
        currentDate,
        isLoading,
        loadSpendingData,
        refreshData,
    } = useBudgetStore();

    useFocusEffect(
        useCallback(() => {
            loadSpendingData();
        }, [])
    );

    const overallPercentage = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;
    const remaining = totalBudget - totalSpending;

    const periodLabel = budgetPeriod === 'weekly'
        ? getWeekRangeString(currentDate)
        : getMonthRangeString(currentDate);

    // Prepare chart data
    const chartData = dailySpending.slice(-7).map((day, index) => ({
        value: day.total,
        label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
        frontColor: colors.primary,
    }));

    const handleCategoryPress = (categoryId: number, categoryName: string) => {
        navigation.navigate('Category', { categoryId, categoryName });
    };

    const handleAddTransaction = () => {
        navigation.navigate('AddTransaction', {});
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={refreshData}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <View>
                        <Text style={[textStyles.label, { color: colors.textSecondary }]}>
                            {periodLabel}
                        </Text>
                        <Text style={[textStyles.h2, { color: colors.text, marginTop: spacing.xs }]}>
                            Budget Overview
                        </Text>
                    </View>
                </View>

                {/* Summary Card */}
                <View
                    style={[
                        styles.summaryCard,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.lg,
                            borderRadius: borderRadius.xl,
                            padding: spacing.xl,
                        },
                    ]}
                >
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={[textStyles.label, { color: colors.textSecondary }]}>
                                Total Spent
                            </Text>
                            <Text style={[textStyles.currencyLarge, { color: colors.text }]}>
                                {formatCompact(totalSpending)}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[textStyles.label, { color: colors.textSecondary }]}>
                                Budget
                            </Text>
                            <Text style={[textStyles.h3, { color: colors.textSecondary }]}>
                                {formatCompact(totalBudget)}
                            </Text>
                        </View>
                    </View>

                    <ProgressBar
                        progress={overallPercentage}
                        height={12}
                        style={{ marginTop: spacing.lg }}
                    />

                    <Text
                        style={[
                            textStyles.body,
                            {
                                color: remaining >= 0 ? colors.success : colors.error,
                                marginTop: spacing.md,
                            },
                        ]}
                    >
                        {remaining >= 0
                            ? `${format(remaining)} remaining`
                            : `${format(Math.abs(remaining))} over budget`}
                    </Text>
                </View>

                {/* Spending Chart */}
                {chartData.length > 0 && (
                    <View
                        style={[
                            styles.chartCard,
                            {
                                backgroundColor: colors.card,
                                marginHorizontal: spacing.lg,
                                marginTop: spacing.lg,
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.h3, { color: colors.text, marginBottom: spacing.md }]}>
                            Last 7 Days
                        </Text>
                        <BarChart
                            data={chartData}
                            barWidth={28}
                            spacing={20}
                            roundedTop
                            roundedBottom
                            hideRules
                            xAxisThickness={0}
                            yAxisThickness={0}
                            yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
                            noOfSections={4}
                            maxValue={Math.max(...chartData.map(d => d.value), 100)}
                            isAnimated
                            animationDuration={500}
                        />
                    </View>
                )}

                {/* Categories */}
                <View style={[styles.section, { paddingHorizontal: spacing.lg, marginTop: spacing.xl }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            Categories
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AddCategory')}>
                            <Feather name="plus" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {categoriesWithSpending.length > 0 ? (
                        categoriesWithSpending.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                onPress={() => handleCategoryPress(category.id, category.name)}
                                style={{ marginTop: spacing.md }}
                            />
                        ))
                    ) : (
                        <EmptyState
                            icon="folder"
                            title="No Categories"
                            description="Add categories to start tracking your spending"
                            actionLabel="Add Category"
                            onAction={() => navigation.navigate('AddCategory')}
                            style={{ marginTop: spacing.xl }}
                        />
                    )}
                </View>
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={[
                    styles.fab,
                    { backgroundColor: colors.primary },
                ]}
                onPress={handleAddTransaction}
            >
                <Feather name="plus" size={28} color="#FFF" />
            </TouchableOpacity>
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
    summaryCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    chartCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    section: {
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
