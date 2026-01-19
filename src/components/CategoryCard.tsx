import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useCurrency, useHaptics } from '../hooks';
import { ProgressBar } from './ProgressBar';
import { CategoryWithSpending } from '../types';

interface CategoryCardProps {
    category: CategoryWithSpending;
    onPress: () => void;
    style?: ViewStyle;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
    category,
    onPress,
    style,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
    const { format } = useCurrency();
    const { light } = useHaptics();

    const handlePress = () => {
        light();
        onPress();
    };

    const remaining = category.budget_limit - category.spent;
    const isOverBudget = remaining < 0;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    borderLeftWidth: 4,
                    borderLeftColor: category.color,
                },
                style,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: `${category.color}20` }
                        ]}
                    >
                        <Feather
                            name={category.icon_name as any}
                            size={20}
                            color={category.color}
                        />
                    </View>
                    <Text
                        style={[
                            textStyles.bodyLarge,
                            { color: colors.text, fontWeight: '600', marginLeft: spacing.md }
                        ]}
                    >
                        {category.name}
                    </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
            </View>

            <View style={[styles.amounts, { marginTop: spacing.md }]}>
                <Text style={[textStyles.h3, { color: colors.text }]}>
                    {format(category.spent)}
                </Text>
                <Text style={[textStyles.bodySmall, { color: colors.textSecondary }]}>
                    of {format(category.budget_limit)}
                </Text>
            </View>

            <ProgressBar
                progress={category.percentage}
                style={{ marginTop: spacing.md }}
            />

            <Text
                style={[
                    textStyles.labelSmall,
                    {
                        color: isOverBudget ? colors.error : colors.textSecondary,
                        marginTop: spacing.sm,
                    }
                ]}
            >
                {isOverBudget
                    ? `Over budget by ${format(Math.abs(remaining))}`
                    : `${format(remaining)} remaining`
                }
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amounts: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
});
