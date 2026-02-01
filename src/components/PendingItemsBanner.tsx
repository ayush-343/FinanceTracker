import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { useScanStore } from '../store/scanStore';

interface PendingItemsBannerProps {
    onDismiss?: () => void;
}

export const PendingItemsBanner: React.FC<PendingItemsBannerProps> = ({ onDismiss }) => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { light } = useHaptics();
    const pendingItems = useScanStore((state) => state.pendingItems);
    const count = pendingItems.length;

    if (count === 0) {
        return null;
    }

    const handlePress = () => {
        light();
        router.push('/ReviewScannedItems');
    };

    const handleDismiss = () => {
        light();
        onDismiss?.();
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.xl,
                    padding: spacing.lg,
                    marginHorizontal: spacing.lg,
                    marginTop: spacing.md,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                },
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View
                style={[
                    styles.iconContainer,
                    {
                        backgroundColor: `${colors.primary}15`,
                        borderRadius: borderRadius.md,
                    },
                ]}
            >
                <Feather name="file-text" size={24} color={colors.primary} />
            </View>

            <View style={styles.textContainer}>
                <Text style={[textStyles.body, { color: colors.text }]}>
                    {count} {count === 1 ? 'item' : 'items'} to review
                </Text>
                <Text style={[textStyles.labelSmall, { color: colors.textSecondary, marginTop: 2 }]}>
                    Tap to continue reviewing scanned items
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.dismissButton, { padding: spacing.sm }]}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Feather name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <Feather
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
                style={{ marginLeft: spacing.xs }}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
    },
    dismissButton: {
        marginLeft: 8,
    },
});
