import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { ProgressBar, EmptyState, Button } from '../../components';
import { useBudgetStore } from '../../store';
import { useCurrency, useHaptics } from '../../hooks';
import { RootStackParamList, Subcategory, CategoryWithSpending } from '../../types';
import { getCategoriesWithSpending, getSubcategories, getTotalSpending } from '../../database';
import { format as formatDate, startOfMonth, endOfMonth } from '../../utils';

type Props = {
    route: RouteProp<RootStackParamList, 'Category'>;
    navigation: NativeStackNavigationProp<RootStackParamList, 'Category'>;
};

interface SubcategoryWithSpending extends Subcategory {
    spent: number;
    percentage: number;
}

export const CategoryScreen: React.FC<Props> = ({ route, navigation }) => {
    const { categoryId, categoryName } = route.params;
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format } = useCurrency();
    const { light } = useHaptics();
    const { dateRange, removeCategory } = useBudgetStore();

    const [category, setCategory] = useState<CategoryWithSpending | null>(null);
    const [subcategories, setSubcategories] = useState<SubcategoryWithSpending[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);

        // Get category with spending
        const categories = await getCategoriesWithSpending(dateRange.start, dateRange.end);
        const cat = categories.find(c => c.id === categoryId);
        if (cat) setCategory(cat);

        // Get subcategories
        const subs = await getSubcategories(categoryId);

        // Calculate spending per subcategory (simplified - you might want to add proper queries)
        const subsWithSpending: SubcategoryWithSpending[] = subs.map(sub => ({
            ...sub,
            spent: 0, // TODO: Add proper subcategory spending calculation
            percentage: 0,
        }));

        setSubcategories(subsWithSpending);
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [categoryId, dateRange])
    );

    const handleDelete = () => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${categoryName}"? This will also delete all subcategories and transactions.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await removeCategory(categoryId);
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const handleSubcategoryPress = (subcategoryId: number, subcategoryName: string) => {
        navigation.navigate('Items', {
            subcategoryId,
            categoryId,
            title: subcategoryName,
        });
    };

    const handleViewAllTransactions = () => {
        navigation.navigate('Items', {
            categoryId,
            title: categoryName,
        });
    };

    if (!category) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h2, { color: colors.text, flex: 1, marginLeft: spacing.md }]}>
                        {categoryName}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('EditCategory', { categoryId })}>
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
                </View>

                {/* Quick Actions */}
                <View style={[styles.actions, { paddingHorizontal: spacing.lg, marginTop: spacing.xl }]}>
                    <Button
                        title="Add Transaction"
                        onPress={() => navigation.navigate('AddTransaction', { categoryId })}
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
                        <TouchableOpacity onPress={() => navigation.navigate('AddSubcategory', { categoryId })}>
                            <Feather name="plus" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {subcategories.length > 0 ? (
                        subcategories.map((sub) => (
                            <TouchableOpacity
                                key={sub.id}
                                style={[
                                    styles.subcategoryCard,
                                    {
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.lg,
                                        padding: spacing.lg,
                                        marginTop: spacing.md,
                                    },
                                ]}
                                onPress={() => handleSubcategoryPress(sub.id, sub.name)}
                            >
                                <View style={styles.subcategoryInfo}>
                                    <Text style={[textStyles.body, { color: colors.text, fontWeight: '500' }]}>
                                        {sub.name}
                                    </Text>
                                    {sub.budget_limit !== undefined && sub.budget_limit > 0 && (
                                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                            Budget: {format(sub.budget_limit)}
                                        </Text>
                                    )}
                                </View>
                                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <EmptyState
                            icon="layers"
                            title="No Subcategories"
                            description="Add subcategories to organize spending within this category"
                            actionLabel="Add Subcategory"
                            onAction={() => navigation.navigate('AddSubcategory', { categoryId })}
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
