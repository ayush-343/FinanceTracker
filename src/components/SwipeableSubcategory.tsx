import React, { useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { Subcategory } from '../types';

interface SwipeableSubcategoryProps {
    subcategory: Subcategory;
    onPress?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    rightLabel?: string;
    disableActions?: boolean;
}

// Extracted to module scope to avoid re-creation on each render
const SwipeRightActions = ({
    dragX,
    onEdit,
    onDelete,
    editColor,
    deleteColor,
}: {
    dragX: RNAnimated.AnimatedInterpolation<number>;
    onEdit: () => void;
    onDelete: () => void;
    editColor: string;
    deleteColor: string;
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

const SwipeableSubcategoryComponent: React.FC<SwipeableSubcategoryProps> = ({
    subcategory,
    onPress,
    onEdit,
    onDelete,
    rightLabel,
    disableActions = false,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
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

    const renderRightActions = useCallback(
        (_progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => (
            <SwipeRightActions
                dragX={dragX}
                onEdit={handleEdit}
                onDelete={handleDelete}
                editColor={colors.primary}
                deleteColor={colors.error}
            />
        ),
        [handleEdit, handleDelete, colors.primary, colors.error]
    );

    const content = (
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
                color: `${colors.primary}30`,
                borderless: false,
            }}
        >
            <View style={styles.leftContent}>
                <Text style={[textStyles.body, { color: colors.text, fontWeight: '500' }]}>
                    {subcategory.name}
                </Text>
                {!!rightLabel && (
                    <Text style={[textStyles.labelSmall, { color: colors.textSecondary, marginTop: 2 }]}>
                        {rightLabel}
                    </Text>
                )}
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
        </Pressable>
    );

    if (disableActions) {
        return content;
    }

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            overshootRight={false}
            friction={2}
            rightThreshold={40}
            onSwipeableWillOpen={() => light()}
        >
            {content}
        </Swipeable>
    );
};

export const SwipeableSubcategory = memo(SwipeableSubcategoryComponent);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftContent: {
        flex: 1,
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
