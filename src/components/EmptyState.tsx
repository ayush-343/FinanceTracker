import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';

interface EmptyStateProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    style,
}) => {
    const { colors, spacing, textStyles } = useTheme();
    const { light } = useHaptics();

    const handleAction = () => {
        light();
        onAction?.();
    };

    return (
        <View style={[styles.container, style]}>
            <View
                style={[
                    styles.iconContainer,
                    { backgroundColor: colors.backgroundSecondary },
                ]}
            >
                <Feather name={icon} size={48} color={colors.textTertiary} />
            </View>
            <Text
                style={[
                    textStyles.h3,
                    { color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
                ]}
            >
                {title}
            </Text>
            <Text
                style={[
                    textStyles.body,
                    {
                        color: colors.textSecondary,
                        marginTop: spacing.sm,
                        textAlign: 'center',
                        paddingHorizontal: spacing.xxl,
                    },
                ]}
            >
                {description}
            </Text>
            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        { backgroundColor: colors.primary, marginTop: spacing.xl },
                    ]}
                    onPress={handleAction}
                >
                    <Text style={[textStyles.button, { color: '#FFF' }]}>
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
});
