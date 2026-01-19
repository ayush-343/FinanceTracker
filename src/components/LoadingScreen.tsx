import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface LoadingScreenProps {
    message?: string;
    showUnlock?: boolean;
    onUnlock?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message,
    showUnlock = false,
    onUnlock,
}) => {
    const { colors, textStyles, spacing, borderRadius } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {showUnlock ? (
                <TouchableOpacity
                    style={[
                        styles.unlockButton,
                        {
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.full,
                            padding: spacing.xl,
                        },
                    ]}
                    onPress={onUnlock}
                    activeOpacity={0.8}
                >
                    <Feather name="lock" size={40} color="#FFF" />
                </TouchableOpacity>
            ) : (
                <ActivityIndicator size="large" color={colors.primary} />
            )}
            {message && (
                <Text
                    style={[
                        textStyles.body,
                        { color: colors.textSecondary, marginTop: spacing.lg },
                    ]}
                >
                    {message}
                </Text>
            )}
            {showUnlock && (
                <Text
                    style={[
                        textStyles.labelSmall,
                        { color: colors.textSecondary, marginTop: spacing.sm },
                    ]}
                >
                    Tap the lock to authenticate
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unlockButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
});
