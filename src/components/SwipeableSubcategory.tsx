import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
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

export const SwipeableSubcategory: React.FC<SwipeableSubcategoryProps> = ({
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

    const handleEdit = () => {
        light();
        swipeableRef.current?.close();
        onEdit();
    };

    const handleDelete = () => {
        error();
        swipeableRef.current?.close();
        onDelete();
    };

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

    const content = (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    padding: spacing.lg,
                    borderRadius: borderRadius.lg,
                },
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
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
        </TouchableOpacity>
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
