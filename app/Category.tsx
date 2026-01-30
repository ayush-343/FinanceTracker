import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { ProgressBar, EmptyState, Button, SwipeableSubcategory } from '../src/components';
import { useBudgetStore } from '../src/store';
import { useCurrency, useHaptics } from '../src/hooks';
import { Subcategory, CategoryWithSpending } from '../src/types';
import { getCategoriesWithSpending, getSubcategories, getTransactionsByCategory } from '../src/database';
import { format as formatDate, startOfMonth, endOfMonth } from '../src/utils';

interface SubcategoryWithSpending extends Subcategory {
    spent: number;
    percentage: number;
}

export const CategoryScreen: React.FC = () => {
    const router = useRouter();
    const { categoryId, categoryName } = useLocalSearchParams<{
        categoryId?: string;
        categoryName?: string;
    }>();

    const parsedCategoryId = categoryId ? Number(categoryId) : NaN;
    const categoryNameText = typeof categoryName === 'string' ? categoryName : '';
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format } = useCurrency();
    const { light } = useHaptics();
    const { dateRange, removeCategory, removeSubcategory } = useBudgetStore();

    const [category, setCategory] = useState<CategoryWithSpending | null>(null);
    const [subcategories, setSubcategories] = useState<SubcategoryWithSpending[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);

        // Get category with spending
        const categories = await getCategoriesWithSpending(dateRange.start, dateRange.end);
        const cat = categories.find(c => c.id === parsedCategoryId);
        if (cat) setCategory(cat);

        // Get subcategories
        const subs = await getSubcategories(parsedCategoryId);

        // Get transactions for this category and compute spending by subcategory
        const transactions = await getTransactionsByCategory(parsedCategoryId, dateRange.start, dateRange.end);
        const spendingBySub: Record<string, number> = {};

        transactions.forEach((t) => {
            const key = t.subcategory_id === null ? 'uncategorized' : String(t.subcategory_id);
            spendingBySub[key] = (spendingBySub[key] || 0) + t.amount;
        });

        const subsWithSpending: SubcategoryWithSpending[] = subs.map(sub => {
            const spent = spendingBySub[String(sub.id)] || 0;
            return {
                ...sub,
                spent,
                percentage: sub.budget_limit && sub.budget_limit > 0 ? (spent / sub.budget_limit) * 100 : 0,
            };
        });

        // Add a synthetic "Uncategorized" subcategory for category-level transactions
        const uncategorizedSpent = spendingBySub['uncategorized'] || 0;
        if (uncategorizedSpent > 0) {
            subsWithSpending.unshift({
                id: -1,
                category_id: parsedCategoryId,
                name: 'Uncategorized',
                budget_limit: 0,
                spent: uncategorizedSpent,
                percentage: 0,
            });
        }

        setSubcategories(subsWithSpending);
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [parsedCategoryId, dateRange])
    );

    const handleDelete = () => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${categoryNameText}"? This will also delete all subcategories and transactions.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await removeCategory(parsedCategoryId);
                        router.back();
                    },
                },
            ]
        );
    };

    const handleSubcategoryPress = (subcategoryId: number, subcategoryName: string) => {
        router.push({
            pathname: '/Items',
            params: {
                subcategoryId: String(subcategoryId),
                categoryId: String(parsedCategoryId),
                title: subcategoryName,
            },
        });
    };

    const handleEditSubcategory = (subcategoryId: number) => {
        router.push({
            pathname: '/EditSubcategory',
            params: { subcategoryId: String(subcategoryId), categoryId: String(parsedCategoryId) },
        });
    };

    const handleDeleteSubcategory = (subcategoryId: number, subcategoryName: string) => {
        Alert.alert(
            'Delete Subcategory',
            `Are you sure you want to delete "${subcategoryName}"? This will also remove items and transactions under it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await removeSubcategory(subcategoryId);
                        await loadData();
                    },
                },
            ]
        );
    };

    const handleViewAllTransactions = () => {
        router.push({
            pathname: '/Items',
            params: {
                categoryId: String(parsedCategoryId),
                title: categoryNameText,
            },
        });
    };

    if (!Number.isFinite(parsedCategoryId)) return null;
    if (!category) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h2, { color: colors.text, flex: 1, marginLeft: spacing.md }]}>
                        {categoryNameText}
                    </Text>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/EditCategory', params: { categoryId: String(parsedCategoryId) } })}>
                        <Feather name="edit-2" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
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
                            borderLeftWidth: 4,
                            borderLeftColor: category.color,
                        },
                    ]}
                >
                    <View style={styles.iconRow}>
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: `${category.color}20` },
                            ]}
                        >
                            <Feather name={category.icon_name as any} size={28} color={category.color} />
                        </View>
                    </View>

                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={[textStyles.label, { color: colors.textSecondary }]}>
                                Spent
                            </Text>
                            <Text style={[textStyles.currencyLarge, { color: colors.text }]}>
                                {format(category.spent)}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[textStyles.label, { color: colors.textSecondary }]}>
                                Budget
                            </Text>
                            <Text style={[textStyles.h3, { color: colors.textSecondary }]}>
                                {format(category.budget_limit)}
                            </Text>
                        </View>
                    </View>

                    <ProgressBar
                        progress={category.percentage}
                        height={12}
                        style={{ marginTop: spacing.lg }}
                    />

                    {category.budget_limit > 0 && (
                        <Text
                            style={[
                                textStyles.body,
                                {
                                    color: category.budget_limit - category.spent >= 0 ? colors.success : colors.error,
                                    marginTop: spacing.md,
                                },
                            ]}
                        >
                            {category.budget_limit - category.spent >= 0
                                ? `${format(category.budget_limit - category.spent)} remaining`
                                : `${format(Math.abs(category.budget_limit - category.spent))} over budget`}
                        </Text>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={[styles.actions, { paddingHorizontal: spacing.lg, marginTop: spacing.xl }]}>
                    <Button
                        title="Add Transaction"
                        onPress={() => router.push({ pathname: '/AddTransaction', params: { categoryId: String(parsedCategoryId) } })}
                        fullWidth
                    />
                    <Button
                        title="View All Transactions"
                        variant="outline"
                        onPress={handleViewAllTransactions}
                        fullWidth
                        style={{ marginTop: spacing.md }}
                    />
                </View>

                {/* Subcategories */}
                <View style={[styles.section, { paddingHorizontal: spacing.lg, marginTop: spacing.xl }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[textStyles.h3, { color: colors.text }]}>
                            Subcategories
                        </Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/AddSubcategory', params: { categoryId: String(parsedCategoryId) } })}>
                            <Feather name="plus" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {subcategories.length > 0 ? (
                        subcategories.map((sub) => (
                            <View key={sub.id} style={{ marginTop: spacing.md }}>
                                <SwipeableSubcategory
                                    subcategory={sub}
                                    onPress={() => handleSubcategoryPress(sub.id, sub.name)}
                                    onEdit={() => handleEditSubcategory(sub.id)}
                                    onDelete={() => handleDeleteSubcategory(sub.id, sub.name)}
                                    disableActions={sub.id === -1}
                                    rightLabel={
                                        sub.budget_limit !== undefined && sub.budget_limit > 0
                                            ? `Budget: ${format(sub.budget_limit)}`
                                            : undefined
                                    }
                                />
                            </View>
                        ))
                    ) : (
                        <EmptyState
                            icon="layers"
                            title="No Subcategories"
                            description="Add subcategories to organize spending within this category"
                            actionLabel="Add Subcategory"
                            onAction={() => router.push({ pathname: '/AddSubcategory', params: { categoryId: String(parsedCategoryId) } })}
                            style={{ marginTop: spacing.lg }}
                        />
                    )}
                </View>

                {/* Danger Zone */}
                <View style={[styles.section, { paddingHorizontal: spacing.lg, marginTop: spacing.xxl }]}>
                    <Button
                        title="Delete Category"
                        variant="danger"
                        onPress={handleDelete}
                        fullWidth
                    />
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
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 8,
    },
    summaryCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    iconRow: {
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    actions: {},
    section: {},
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subcategoryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subcategoryInfo: {},
});

export default CategoryScreen;
