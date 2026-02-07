import React, { useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useCurrency, useHaptics } from '../hooks';
import { TransactionWithDetails } from '../types';
import { formatDate } from '../utils';

interface SwipeableTransactionProps {
    transaction: TransactionWithDetails;
    onEdit: () => void;
    onDelete: () => void;
    onPress?: () => void;
}

const SwipeableTransactionComponent: React.FC<SwipeableTransactionProps> = ({
    transaction,
    onEdit,
    onDelete,
    onPress,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
    const { format } = useCurrency();
    const { light, error } = useHaptics();
    const swipeableRef = useRef<Swipeable>(null);

    const handleEdit = useCallback(() => {
        light();
        swipeableRef.current?.close();
        onEdit();
    }, [light, onEdit]);

    const handleDelete = useCallback(() => {
        error();
        swipeableRef.current?.close();
        onDelete();
    }, [error, onDelete]);

    const handlePress = useCallback(() => {
        if (onPress) {
            onPress();
        }
    }, [onPress]);

    const renderRightActions = (
        progress: RNAnimated.AnimatedInterpolation<number>,
        dragX: RNAnimated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0.5],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.rightActions}>
                <RectButton
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={handleEdit}
                >
                    <RNAnimated.View style={{ transform: [{ scale }] }}>
                        <Feather name="edit-2" size={20} color="#FFF" />
                    </RNAnimated.View>
                </RectButton>
                <RectButton
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={handleDelete}
                >
                    <RNAnimated.View style={{ transform: [{ scale }] }}>
                        <Feather name="trash-2" size={20} color="#FFF" />
                    </RNAnimated.View>
                </RectButton>
            </View>
        );
    };

    const displayName = transaction.item_name
        || transaction.subcategory_name
        || transaction.category_name;

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            overshootRight={false}
            friction={2}
            rightThreshold={40}
            onSwipeableWillOpen={() => light()}
        >
            <Pressable
                style={({ pressed }) => [
                    styles.container,
                    {
                        backgroundColor: colors.card,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        opacity: Platform.OS === 'ios' && pressed && onPress ? 0.7 : 1,
                    },
                ]}
                onPress={handlePress}
                disabled={!onPress}
                android_ripple={{
                    color: `${transaction.category_color}30`,
                    borderless: false,
                }}
            >
                <View style={styles.leftContent}>
                    <View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: `${transaction.category_color}20` },
                        ]}
                    >
                        <Feather
                            name={transaction.category_icon as any}
                            size={20}
                            color={transaction.category_color}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text
                            style={[textStyles.body, { color: colors.text, fontWeight: '500' }]}
                            numberOfLines={1}
                        >
                            {displayName}
                        </Text>
                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                            {transaction.category_name}
                            {transaction.subcategory_name && ` • ${transaction.subcategory_name}`}
                        </Text>
                    </View>
                </View>
                <View style={styles.rightContent}>
                    <Text style={[textStyles.body, { color: colors.text, fontWeight: '600' }]}>
                        {format(transaction.amount)}
                    </Text>
                    <Text style={[textStyles.labelSmall, { color: colors.textTertiary }]}>
                        {formatDate(transaction.date, 'MMM d')}
                    </Text>
                </View>
            </Pressable>
        </Swipeable>
    );
};

export const SwipeableTransaction = memo(SwipeableTransactionComponent);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    rightContent: {
        alignItems: 'flex-end',
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
});
