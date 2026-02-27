import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView, Swipeable, RectButton } from 'react-native-gesture-handler';
import { Animated as RNAnimated } from 'react-native';
import { useTheme } from '../../src/theme';
import { EmptyState } from '../../src/components';
import { useSubscriptionStore } from '../../src/store';
import { useCurrency, useHaptics } from '../../src/hooks';
import { Subscription } from '../../src/types';
import { getCategoryById } from '../../src/database';

interface SubscriptionWithCategory extends Subscription {
    category_name: string;
    category_color: string;
    category_icon: string;
}

// Extracted to module scope to avoid re-creation on each render
const SubscriptionSwipeActions = ({
    dragX,
    sub,
    editColor,
    deleteColor,
    onEdit,
    onDelete,
}: {
    dragX: RNAnimated.AnimatedInterpolation<number>;
    sub: SubscriptionWithCategory;
    editColor: string;
    deleteColor: string;
    onEdit: () => void;
    onDelete: () => void;
}) => {
    const scale = dragX.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0.5],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.rightActions}>
            <RectButton
                style={[styles.actionButton, { backgroundColor: editColor }]}
                onPress={onEdit}
            >
                <RNAnimated.View style={{ transform: [{ scale }] }}>
                    <Feather name="edit-2" size={20} color="#FFF" />
                </RNAnimated.View>
            </RectButton>
            <RectButton
                style={[styles.actionButton, { backgroundColor: deleteColor }]}
                onPress={onDelete}
            >
                <RNAnimated.View style={{ transform: [{ scale }] }}>
                    <Feather name="trash-2" size={20} color="#FFF" />
                </RNAnimated.View>
            </RectButton>
        </View>
    );
};
const SubscriptionsScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format } = useCurrency();
    const { light, error } = useHaptics();
    const { subscriptions, loadSubscriptions, removeSubscription } = useSubscriptionStore();

    const [subsWithCategory, setSubsWithCategory] = useState<SubscriptionWithCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        await loadSubscriptions();

        // Enrich with category info
        const enriched: SubscriptionWithCategory[] = [];
        for (const sub of subscriptions) {
            const category = await getCategoryById(sub.category_id);
            enriched.push({
                ...sub,
                category_name: category?.name || 'Unknown',
                category_color: category?.color || '#999',
                category_icon: category?.icon_name || 'help-circle',
            });
        }
        setSubsWithCategory(enriched);
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [subscriptions.length])
    );

    const handleDelete = (id: number, name: string) => {
        Alert.alert(
            'Delete Subscription',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await removeSubscription(id);
                        loadData();
                    },
                },
            ]
        );
    };

    const getFrequencyLabel = (frequency: string) => {
        switch (frequency) {
            case 'daily': return 'Daily';
            case 'weekly': return 'Weekly';
            case 'monthly': return 'Monthly';
            default: return frequency;
        }
    };

    const monthlyTotal = subsWithCategory.reduce((sum, sub) => {
        switch (sub.frequency) {
            case 'daily': return sum + (sub.amount * 30);
            case 'weekly': return sum + (sub.amount * 4);
            case 'monthly': return sum + sub.amount;
            default: return sum;
        }
    }, 0);

    const renderRightActions = useCallback((sub: SubscriptionWithCategory) => (
        _progress: RNAnimated.AnimatedInterpolation<number>,
        dragX: RNAnimated.AnimatedInterpolation<number>
    ) => (
        <SubscriptionSwipeActions
            dragX={dragX}
            sub={sub}
            editColor={colors.primary}
            deleteColor={colors.error}
            onEdit={() => {
                light();
                router.push({
                    pathname: '/EditSubscription',
                    params: { subscriptionId: String(sub.id) },
                });
            }}
            onDelete={() => {
                error();
                handleDelete(sub.id, sub.name);
            }}
        />
    ), [colors.primary, colors.error, light, error, router, handleDelete]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                    <Text style={[textStyles.h2, { color: colors.text }]}>Subscriptions</Text>
                </View>

                {/* Summary */}
                <View
                    style={[
                        styles.summary,
                        {
                            backgroundColor: colors.card,
                            marginHorizontal: spacing.lg,
                            marginTop: spacing.md,
                            borderRadius: borderRadius.xl,
                            padding: spacing.xl,
                        },
                    ]}
                >
                    <Text style={[textStyles.label, { color: colors.textSecondary }]}>Monthly Recurring Total</Text>
                    <Text style={[textStyles.currencyLarge, { color: colors.text }]}>
                        {format(monthlyTotal)}
                    </Text>
                    <Text style={[textStyles.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                        {subsWithCategory.length} active subscription{subsWithCategory.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Subscription List */}
                <FlashList
                    data={subsWithCategory}
                    keyExtractor={(item) => item.id.toString()}
                    estimatedItemSize={90}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingTop: spacing.lg,
                        paddingBottom: 100,
                    }}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                    drawDistance={200}
                    renderItem={({ item }) => (
                        <Swipeable
                            renderRightActions={renderRightActions(item)}
                            overshootRight={false}
                            friction={2}
                            rightThreshold={40}
                            onSwipeableWillOpen={() => light()}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.subscriptionCard,
                                    {
                                        backgroundColor: colors.card,
                                        borderRadius: borderRadius.lg,
                                        padding: spacing.lg,
                                        borderLeftWidth: 4,
                                        borderLeftColor: item.category_color,
                                    },
                                ]}
                                onPress={() =>
                                    router.push({
                                        pathname: '/EditSubscription',
                                        params: { subscriptionId: String(item.id) },
                                    })
                                }
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardInfo}>
                                        <View
                                            style={[
                                                styles.iconContainer,
                                                { backgroundColor: `${item.category_color}20` },
                                            ]}
                                        >
                                            <Feather
                                                name={item.category_icon as any}
                                                size={20}
                                                color={item.category_color}
                                            />
                                        </View>
                                        <View style={{ marginLeft: spacing.md }}>
                                            <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                                                {item.name}
                                            </Text>
                                            <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                                                {item.category_name} • {getFrequencyLabel(item.frequency)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[textStyles.h3, { color: colors.text }]}>
                                        {format(item.amount)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Swipeable>
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            icon="repeat"
                            title="No Subscriptions"
                            description="Add recurring expenses like Netflix, Spotify, or daily milk delivery"
                            actionLabel="Add Subscription"
                            onAction={() => router.push('/AddSubscription')}
                            style={{ marginTop: spacing.xxl }}
                        />
                    }
                />

                {/* FAB */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/AddSubscription')}
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
        paddingTop: 16,
    },
    summary: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    subscriptionCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 60,
        height: '100%',
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

export default SubscriptionsScreen;
