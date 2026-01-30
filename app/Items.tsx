import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
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
    const { format } = useCurrency();
    const { dateRange, removeTransaction } = useBudgetStore();

    const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        let allTransactions = await getTransactions(dateRange.start, dateRange.end);

        // Filter by category
        if (parsedCategoryId) {
            allTransactions = allTransactions.filter(t => t.category_id === parsedCategoryId);
        }

        // Filter by subcategory if provided
        if (parsedSubcategoryId === -1) {
            allTransactions = allTransactions.filter(t => t.subcategory_id === null);
        } else if (parsedSubcategoryId) {
            allTransactions = allTransactions.filter(t => t.subcategory_id === parsedSubcategoryId);
        }

        setTransactions(allTransactions);
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
                        {format(totalSpent)}
                    </Text>
                </View>

                {/* Transactions List */}
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingTop: spacing.md,
                        paddingBottom: 100,
                    }}
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
