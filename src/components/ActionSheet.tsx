import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';

// Type for action sheet options
export interface ActionSheetOption {
    id: string;
    label: string;
    icon?: keyof typeof Feather.glyphMap;
    destructive?: boolean;
    onPress: () => void;
}

interface TransactionActionSheetProps extends SheetProps<'transaction-actions'> {
    payload?: {
        title?: string;
        message?: string;
        options: ActionSheetOption[];
    };
}

const TransactionActionSheetComponent: React.FC<TransactionActionSheetProps> = ({
    sheetId,
    payload,
}) => {
    const { colors, spacing, borderRadius, textStyles } = useTheme();
    const { light } = useHaptics();

    const handleOptionPress = (option: ActionSheetOption) => {
        light();
        SheetManager.hide(sheetId);
        // Small delay to allow sheet to close before action
        setTimeout(() => {
            option.onPress();
        }, 100);
    };

    return (
        <ActionSheet
            id={sheetId}
            containerStyle={{
                backgroundColor: colors.card,
                borderTopLeftRadius: borderRadius.xl,
                borderTopRightRadius: borderRadius.xl,
            }}
            indicatorStyle={{
                backgroundColor: colors.textTertiary,
                width: 40,
            }}
            gestureEnabled
            defaultOverlayOpacity={0.5}
        >
            <View style={[styles.content, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }]}>
                {payload?.title && (
                    <Text style={[textStyles.h3, { color: colors.text, textAlign: 'center', marginBottom: spacing.xs }]}>
                        {payload.title}
                    </Text>
                )}
                {payload?.message && (
                    <Text style={[textStyles.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
                        {payload.message}
                    </Text>
                )}

                <View style={[styles.optionsContainer, { borderRadius: borderRadius.lg, backgroundColor: colors.backgroundSecondary }]}>
                    {payload?.options.map((option, index) => (
                        <Pressable
                            key={option.id}
                            style={({ pressed }) => [
                                styles.option,
                                {
                                    paddingVertical: spacing.lg,
                                    paddingHorizontal: spacing.lg,
                                    borderBottomWidth: index < (payload?.options.length || 0) - 1 ? 1 : 0,
                                    borderBottomColor: colors.border,
                                    opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
                                },
                            ]}
                            onPress={() => handleOptionPress(option)}
                            android_ripple={{
                                color: option.destructive ? `${colors.error}20` : `${colors.primary}20`,
                                borderless: false,
                            }}
                        >
                            {option.icon && (
                                <Feather
                                    name={option.icon}
                                    size={22}
                                    color={option.destructive ? colors.error : colors.text}
                                    style={{ marginRight: spacing.md }}
                                />
                            )}
                            <Text
                                style={[
                                    textStyles.body,
                                    {
                                        color: option.destructive ? colors.error : colors.text,
                                        fontWeight: '500',
                                    },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Cancel button - separate from options */}
                <Pressable
                    style={({ pressed }) => [
                        styles.cancelButton,
                        {
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: borderRadius.lg,
                            paddingVertical: spacing.lg,
                            marginTop: spacing.md,
                            opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
                        },
                    ]}
                    onPress={() => {
                        light();
                        SheetManager.hide(sheetId);
                    }}
                    android_ripple={{
                        color: `${colors.primary}20`,
                        borderless: false,
                    }}
                >
                    <Text style={[textStyles.body, { color: colors.primary, fontWeight: '600', textAlign: 'center' }]}>
                        Cancel
                    </Text>
                </Pressable>
            </View>
        </ActionSheet>
    );
};

export const TransactionActionSheet = memo(TransactionActionSheetComponent);

// Helper function to show action sheet
export const showActionSheet = (
    title: string,
    message: string,
    options: ActionSheetOption[]
) => {
    SheetManager.show('transaction-actions', {
        payload: { title, message, options },
    });
};

const styles = StyleSheet.create({
    content: {
        paddingTop: 8,
    },
    optionsContainer: {
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cancelButton: {
        alignItems: 'center',
    },
});
