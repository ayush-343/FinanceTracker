import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useCurrency, useHaptics } from '../hooks';
import { CircularProgress } from './CircularProgress';
import { CategoryWithSpending } from '../types';

interface CategoryCardProps {
    category: CategoryWithSpending;
    onPress: () => void;
    style?: ViewStyle;
    compact?: boolean;
}

const CategoryCardComponent: React.FC<CategoryCardProps> = ({
    category,
    onPress,
    style,
    compact = false,
}) => {
    const { colors, spacing, borderRadius } = useTheme();
    const { format } = useCurrency();
    const { light } = useHaptics();

    const handlePress = useCallback(() => {
        light();
        onPress();
    }, [light, onPress]);

    const percentage = Math.min(category.percentage, 100);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
                },
                style,
            ]}
            onPress={handlePress}
            android_ripple={{
                color: `${category.color}20`,
                borderless: false,
            }}
        >
            <View style={styles.ringContainer}>
                <CircularProgress
                    size={96}
                    strokeWidth={6}
                    progress={percentage}
                    color={category.color}
                    trackColor={colors.backgroundTertiary}
                >
                    <View
                        style={[
                            styles.iconCircle,
                            { backgroundColor: `${category.color}15` },
                        ]}
                    >
                        <Feather
                            name={category.icon_name as any}
                            size={28}
                            color={category.color}
                        />
                    </View>
                </CircularProgress>
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>
                {category.name}
            </Text>
            <Text style={[styles.amounts, { color: colors.textTertiary }]}>
                {format(category.spent)} / {format(category.budget_limit)}
            </Text>
        </Pressable>
    );
};

export const CategoryCard = memo(CategoryCardComponent);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    ringContainer: {
        marginBottom: 12,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F3F4F6',
        textAlign: 'center',
    },
    amounts: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
});
