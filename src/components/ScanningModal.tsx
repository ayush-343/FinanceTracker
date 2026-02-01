import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Button } from './Button';

interface ScanningModalProps {
    visible: boolean;
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    onManualEntry: () => void;
    onClose: () => void;
}

export const ScanningModal: React.FC<ScanningModalProps> = ({
    visible,
    isLoading,
    error,
    onRetry,
    onManualEntry,
    onClose,
}) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <View
                    style={[
                        styles.content,
                        {
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.xxl,
                            padding: spacing.xxl,
                            marginHorizontal: spacing.xl,
                        },
                    ]}
                >
                    {isLoading ? (
                        // Loading State
                        <View style={styles.centerContent}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text
                                style={[
                                    textStyles.body,
                                    {
                                        color: colors.text,
                                        marginTop: spacing.xl,
                                        textAlign: 'center',
                                    },
                                ]}
                            >
                                Analyzing receipt...
                            </Text>
                            <Text
                                style={[
                                    textStyles.labelSmall,
                                    {
                                        color: colors.textSecondary,
                                        marginTop: spacing.sm,
                                        textAlign: 'center',
                                    },
                                ]}
                            >
                                This may take a few seconds
                            </Text>
                        </View>
                    ) : error ? (
                        // Error State
                        <View style={styles.centerContent}>
                            <View
                                style={[
                                    styles.errorIconContainer,
                                    {
                                        backgroundColor: `${colors.error}15`,
                                        borderRadius: borderRadius.full,
                                    },
                                ]}
                            >
                                <Feather name="alert-circle" size={32} color={colors.error} />
                            </View>
                            <Text
                                style={[
                                    textStyles.h4,
                                    {
                                        color: colors.text,
                                        marginTop: spacing.lg,
                                        textAlign: 'center',
                                    },
                                ]}
                            >
                                Scan Failed
                            </Text>
                            <Text
                                style={[
                                    textStyles.body,
                                    {
                                        color: colors.textSecondary,
                                        marginTop: spacing.sm,
                                        textAlign: 'center',
                                    },
                                ]}
                            >
                                {error}
                            </Text>

                            <View style={[styles.buttonContainer, { marginTop: spacing.xl }]}>
                                <Button
                                    title="Retry"
                                    onPress={onRetry}
                                    variant="primary"
                                    fullWidth
                                />
                                <Button
                                    title="Add Manually"
                                    onPress={onManualEntry}
                                    variant="ghost"
                                    fullWidth
                                    style={{ marginTop: spacing.md }}
                                />
                            </View>
                        </View>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    centerContent: {
        alignItems: 'center',
    },
    errorIconContainer: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonContainer: {
        width: '100%',
    },
});
