import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components';
import { useSettingsStore } from '../../src/store';
export const BiometricSetupScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { setBiometricEnabled } = useSettingsStore();

    const [isAvailable, setIsAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<'faceid' | 'fingerprint' | 'none'>('none');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkBiometricAvailability();
    }, []);

    const checkBiometricAvailability = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        setIsAvailable(compatible && enrolled);

        if (compatible && enrolled) {
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                setBiometricType('faceid');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                setBiometricType('fingerprint');
            }
        }
    };

    const handleEnable = async () => {
        setIsLoading(true);

        // Test authentication first
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Confirm your identity',
            cancelLabel: 'Cancel',
        });

        if (result.success) {
            await setBiometricEnabled(true);
            router.push('/(onboarding)/CategorySetup');
        }

        setIsLoading(false);
    };

    const handleSkip = async () => {
        await setBiometricEnabled(false);
        router.push('/(onboarding)/CategorySetup');
    };

    const getIcon = () => {
        if (biometricType === 'faceid') return 'eye';
        if (biometricType === 'fingerprint') return 'smartphone';
        return 'lock';
    };

    const getTitle = () => {
        if (biometricType === 'faceid') return 'Face ID';
        if (biometricType === 'fingerprint') return 'Touch ID';
        return 'Biometric Lock';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View
                    style={[
                        styles.iconCircle,
                        { backgroundColor: colors.primary + '20' },
                    ]}
                >
                    <Feather name={getIcon()} size={64} color={colors.primary} />
                </View>

                <Text style={[textStyles.h1, { color: colors.text, textAlign: 'center', marginTop: spacing.xl }]}>
                    Secure Your Data
                </Text>

                <Text
                    style={[
                        textStyles.body,
                        {
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.md,
                            paddingHorizontal: spacing.xl,
                        },
                    ]}
                >
                    {isAvailable
                        ? `Enable ${getTitle()} to protect your financial data. You can change this later in Settings.`
                        : 'Biometric authentication is not available on this device.'}
                </Text>

                {isAvailable && (
                    <View style={[styles.features, { marginTop: spacing.xxl }]}>
                        {[
                            { icon: 'shield', text: 'Keep your data private' },
                            { icon: 'clock', text: 'Quick access with Face ID' },
                            { icon: 'lock', text: 'Secure when app is in background' },
                        ].map((feature, index) => (
                            <View
                                key={index}
                                style={[styles.featureRow, { marginTop: index > 0 ? spacing.md : 0 }]}
                            >
                                <View
                                    style={[
                                        styles.featureIcon,
                                        { backgroundColor: colors.success + '20' },
                                    ]}
                                >
                                    <Feather name={feature.icon as any} size={16} color={colors.success} />
                                </View>
                                <Text
                                    style={[
                                        textStyles.body,
                                        { color: colors.text, marginLeft: spacing.md },
                                    ]}
                                >
                                    {feature.text}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View style={[styles.footer, { paddingHorizontal: spacing.xl }]}>
                {isAvailable ? (
                    <>
                        <Button
                            title={`Enable ${getTitle()}`}
                            onPress={handleEnable}
                            loading={isLoading}
                            fullWidth
                        />
                        <TouchableOpacity
                            style={[styles.skipButton, { marginTop: spacing.lg }]}
                            onPress={handleSkip}
                        >
                            <Text style={[textStyles.body, { color: colors.textSecondary }]}>
                                Skip for now
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <Button
                        title="Continue"
                        onPress={handleSkip}
                        fullWidth
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    features: {
        alignSelf: 'stretch',
        paddingHorizontal: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingBottom: 20,
    },
    skipButton: {
        alignItems: 'center',
    },
});

export default BiometricSetupScreen;
