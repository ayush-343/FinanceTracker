import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryItem {
    name: string;
    icon: string;
    color: string;
    amount: number;
    percentage: number;
}

interface CategoryDistributionProps {
    categories: CategoryItem[];
    formatCurrency: (amount: number) => string;
    initialCount?: number;
}

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({
    categories,
    formatCurrency,
    initialCount = 5,
}) => {
    const { colors, spacing, borderRadius } = useTheme();
    const [showAll, setShowAll] = useState(false);

    const sorted = useMemo(
        () => [...categories].sort((a, b) => b.amount - a.amount),
        [categories]
    );

    const displayed = showAll ? sorted : sorted.slice(0, initialCount);

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowAll(!showAll);
    };

    const getTileColor = (color: string) => `${color}18`;
    const getIconBgColor = (color: string) => `${color}30`;

    if (sorted.length === 0) {
        return (
            <View style={[styles.emptyContainer, { padding: spacing.xl }]}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14 }}>
                    No category data available
                </Text>
            </View>
        );
    }

    // Masonry layout: first item takes full width, rest in 2-column grid
    const renderCollapsedLayout = () => {
        const first = displayed[0];
        const rest = displayed.slice(1);

        return (
            <View style={styles.masonryContainer}>
                {/* Featured / largest category - full width */}
                {first && (
                    <View
                        style={[
                            styles.featuredTile,
                            {
                                backgroundColor: getTileColor(first.color),
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                                marginBottom: spacing.sm,
                            },
                        ]}
                    >
                        <View style={[styles.tileIconBg, { backgroundColor: getIconBgColor(first.color), borderRadius: borderRadius.lg }]}>
                            <Feather name={first.icon as any} size={24} color={first.color} />
                        </View>
                        <Text style={[styles.tileName, { color: colors.text, marginTop: spacing.sm }]} numberOfLines={1}>
                            {first.name}
                        </Text>
                        <Text style={[styles.tileAmount, { color: colors.text, marginTop: 4 }]}>
                            {formatCurrency(first.amount)}
                        </Text>
                        <Text style={[styles.tilePercent, { color: colors.textSecondary, marginTop: 2 }]}>
                            {first.percentage.toFixed(1)}%
                        </Text>
                    </View>
                )}

                {/* 2-column grid for remaining */}
                <View style={styles.gridContainer}>
                    {rest.map((cat, index) => (
                        <View
                            key={`${cat.name}-${index}`}
                            style={[
                                styles.gridTile,
                                {
                                    backgroundColor: getTileColor(cat.color),
                                    borderRadius: borderRadius.xl,
                                    padding: spacing.md,
                                    marginBottom: spacing.sm,
                                },
                            ]}
                        >
                            <View style={[styles.tileIconBgSmall, { backgroundColor: getIconBgColor(cat.color), borderRadius: borderRadius.md }]}>
                                <Feather name={cat.icon as any} size={18} color={cat.color} />
                            </View>
                            <Text style={[styles.tileName, { color: colors.text, marginTop: spacing.xs, fontSize: 13 }]} numberOfLines={1}>
                                {cat.name}
                            </Text>
                            <Text style={[styles.tileAmount, { color: colors.text, marginTop: 2, fontSize: 15 }]}>
                                {formatCurrency(cat.amount)}
                            </Text>
                            <Text style={[styles.tilePercent, { color: colors.textSecondary, marginTop: 1 }]}>
                                {cat.percentage.toFixed(1)}%
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View>
            <View style={[styles.header, { marginBottom: spacing.md }]}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                    Category Distribution
                </Text>
                {sorted.length > initialCount && (
                    <TouchableOpacity onPress={handleToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>
                            {showAll ? 'Show Less' : 'See All'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {renderCollapsedLayout()}

            {/* Footer */}
            <View style={[styles.footer, { marginTop: spacing.sm }]}>
                <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                    Total Categories: {sorted.length}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    masonryContainer: {},
    featuredTile: {
        minHeight: 120,
    },
    tileIconBg: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileIconBgSmall: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileName: {
        fontSize: 15,
        fontWeight: '500',
    },
    tileAmount: {
        fontSize: 17,
        fontWeight: '700',
    },
    tilePercent: {
        fontSize: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridTile: {
        width: '48.5%',
        minHeight: 110,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footer: {
        alignItems: 'center',
    },
});
