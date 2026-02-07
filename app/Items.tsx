import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../src/theme';
import { SwipeableTransaction, EmptyState } from '../src/components';
import { useBudgetStore } from '../src/store';
import { useCurrency } from '../src/hooks';
import { TransactionWithDetails } from '../src/types';
import { getTransactions } from '../src/database';
import { format as formatDate, subDays } from 'date-fns';

export const ItemsScreen: React.FC = () => {
    const router = useRouter();
    const { categoryId, subcategoryId, title } = useLocalSearchParams<{
        categoryId?: string;
        subcategoryId?: string;
        title?: string;
    }>();

    const parsedCategoryId = categoryId ? Number(categoryId) : undefined;
    const parsedSubcategoryId = subcategoryId ? Number(subcategoryId) : undefined;
    const titleText = typeof title === 'string' ? title : '';
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { dateRange, removeTransaction } = useBudgetStore();

    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
    const [yesterdayTransactions, setYesterdayTransactions] = useState<TransactionWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        let allTransactions = await getTransactions(dateRange.start, dateRange.end);
        const yesterdayDateStr = formatDate(subDays(new Date(), 1), 'yyyy-MM-dd');
        let yesterday = await getTransactions(yesterdayDateStr, yesterdayDateStr);

        // Filter by category
        if (parsedCategoryId) {
            allTransactions = allTransactions.filter(t => t.category_id === parsedCategoryId);
            yesterday = yesterday.filter(t => t.category_id === parsedCategoryId);
        }

        // Filter by subcategory if provided
        if (parsedSubcategoryId === -1) {
            allTransactions = allTransactions.filter(t => t.subcategory_id === null);
            yesterday = yesterday.filter(t => t.subcategory_id === null);
        } else if (parsedSubcategoryId) {
            allTransactions = allTransactions.filter(t => t.subcategory_id === parsedSubcategoryId);
            yesterday = yesterday.filter(t => t.subcategory_id === parsedSubcategoryId);
        }

        setTransactions(allTransactions);
        setYesterdayTransactions(yesterday);
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [parsedCategoryId, parsedSubcategoryId, dateRange])
    );

    const handleEdit = (transactionId: number) => {
        router.push({ pathname: '/EditTransaction', params: { transactionId: String(transactionId) } });
    };

    const handleDelete = (transactionId: number) => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await removeTransaction(transactionId);
                        loadData();
                    },
                },
            ]
        );
    };

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const todayStr = formatDate(new Date(), 'yyyy-MM-dd');

    const handleRepeat = (transaction: TransactionWithDetails) => {
        const repeatName = transaction.item_name || transaction.subcategory_name || transaction.category_name;
        router.push({
            pathname: '/AddTransaction',
            params: {
                categoryId: String(transaction.category_id),
                subcategoryId: transaction.subcategory_id === null ? '-1' : String(transaction.subcategory_id),
                itemName: repeatName,
                amount: String(transaction.amount),
                notes: transaction.notes || '',
                date: todayStr,
            },
        });
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[textStyles.h2, { color: colors.text, flex: 1, marginLeft: spacing.md }]}>
                        {titleText}
                    </Text>
                </View>

                {/* Summary */}
                <View
                    style={[
                        styles.summary,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.md,
                            borderRadius: borderRadius.lg,
                            padding: spacing.lg,
                        },
                    ]}
                >
                    <Text style={[textStyles.label, { color: colors.textSecondary }]}>
                        Total ({transactions.length} transactions)
                    </Text>
                    <Text style={[textStyles.currency, { color: colors.text }]}>
                        {formatCurrency(totalSpent)}
                    </Text>
                </View>

                {/* Transactions List */}
                <FlashList
                    data={transactions}
                    keyExtractor={(item) => item.id.toString()}
                    estimatedItemSize={76}
                    drawDistance={300}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingTop: spacing.md,
                        paddingBottom: 100,
                    }}
                    ListHeaderComponent={
                        yesterdayTransactions.length > 0 ? (
                            <View style={{ marginBottom: spacing.lg }}>
                                <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Yesterday</Text>
                                {yesterdayTransactions.map((item) => (
                                    <TouchableOpacity
                                        key={`y-${item.id}`}
                                        style={[
                                            styles.transactionItem,
                                            {
                                                backgroundColor: colors.card,
                                                borderRadius: borderRadius.md,
                                                padding: spacing.md,
                                                marginBottom: spacing.sm,
                                                borderWidth: 1,
                                                borderStyle: 'dashed',
                                                borderColor: colors.textSecondary,
                                            },
                                        ]}
                                        onPress={() => handleRepeat(item)}
                                    >
                                        <View style={styles.transactionInfo}>
                                            <View
                                                style={[
                                                    styles.transactionIcon,
                                                    { backgroundColor: `${item.category_color}20` },
                                                ]}
                                            >
                                                <Feather name={item.category_icon as any} size={16} color={item.category_color} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                                <Text style={[textStyles.body, { color: colors.text }]}>
                                                    {item.item_name || item.subcategory_name || item.category_name}
                                                </Text>
                                                <Text style={[textStyles.caption, { color: colors.textSecondary, marginTop: 2 }]}>Tap to repeat today</Text>
                                            </View>
                                        </View>
                                        <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                            {formatCurrency(item.amount)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : undefined
                    }
                    ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                    renderItem={({ item }) => (
                        <SwipeableTransaction
                            transaction={item}
                            onEdit={() => handleEdit(item.id)}
                            onDelete={() => handleDelete(item.id)}
                        />
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            icon="inbox"
                            title="No Transactions"
                            description="Add transactions to track your spending"
                            actionLabel="Add Transaction"
                            onAction={() =>
                                router.push({
                                    pathname: '/AddTransaction',
                                    params: {
                                        categoryId: parsedCategoryId ? String(parsedCategoryId) : undefined,
                                        subcategoryId:
                                            parsedSubcategoryId === -1
                                                ? undefined
                                                : parsedSubcategoryId
                                                    ? String(parsedSubcategoryId)
                                                    : undefined,
                                    },
                                })
                            }
                            style={{ marginTop: spacing.xxl }}
                        />
                    }
                />

                {/* FAB */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() =>
                        router.push({
                            pathname: '/AddTransaction',
                            params: {
                                categoryId: parsedCategoryId ? String(parsedCategoryId) : undefined,
                                subcategoryId:
                                    parsedSubcategoryId === -1
                                        ? undefined
                                        : parsedSubcategoryId
                                            ? String(parsedSubcategoryId)
                                            : undefined,
                            },
                        })
                    }
                >
                    <Feather name="plus" size={28} color="#FFF" />
                </TouchableOpacity>
            </SafeAreaView>
        </GestureHandlerRootView>
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
    summary: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    transactionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
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

export default ItemsScreen;
