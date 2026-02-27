import React, { useEffect, useState, useMemo } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, BackHandler, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SheetProvider } from 'react-native-actions-sheet';
import { Feather } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../src/theme';
import { initDatabase } from '../src/database';
import { LoadingScreen } from '../src/components';
import { useSettingsStore } from '../src/store';
import { useBiometricAuth } from '../src/hooks';

// Import sheets registration
import '../src/components/sheets';

const AppShell: React.FC = () => {
    const { colors, isDark } = useTheme();
    const { isOnboardingCompleted, isBiometricEnabled, loadSettings } = useSettingsStore();
    const { authenticate, isAuthenticated, isAuthenticating, isLocked } = useBiometricAuth();
    const router = useRouter();
    const segments = useSegments();

    // Memoize route checks to prevent unnecessary re-renders
    const segmentFirst = segments[0];
    const segmentSecond = (segments as string[])[1];
    const isInOnboarding = segmentFirst === '(onboarding)';
    const isInSettings = segmentFirst === '(tabs)' && segmentSecond === 'Settings';

    const statusBarStyle = isDark ? 'light' : 'dark';

    // Memoize Stack screenOptions to prevent re-renders
    const stackScreenOptions = useMemo(() => ({
        headerShown: false,
        animation: 'slide_from_right' as const,
        contentStyle: { backgroundColor: colors.background },
    }), [colors.background]);

    const [isDbReady, setIsDbReady] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isSettingsReady, setIsSettingsReady] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            try {
                // First: Initialize database
                await initDatabase();
                setIsDbReady(true);

                // Then: Load settings (requires database)
                await loadSettings();
                setIsSettingsReady(true);
            } catch (error) {
                console.error('Initialization failed:', error);
                setDbError('Failed to initialize app');
            }
        };

        initialize();
    }, [loadSettings]);

    useEffect(() => {
        if (!isSettingsReady) return;

        if (!isOnboardingCompleted && !isInOnboarding) {
            router.replace('/(onboarding)/AnimatedOnboarding');
            return;
        }

        if (isOnboardingCompleted && isInOnboarding) {
            router.replace('/(tabs)/Home');
        }
    }, [isOnboardingCompleted, isSettingsReady, router, isInOnboarding]);

    // Android back button handler
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            return false;
        });

        return () => backHandler.remove();
    }, []);

    const handleBiometricAuth = async () => {
        if (!isAuthenticating) {
            await authenticate();
        }
    };

    if (!isDbReady) {
        return <LoadingScreen message={dbError || 'Initializing...'} />;
    }

    if (!isSettingsReady) {
        return <LoadingScreen message="Loading..." />;
    }

    // Determine if we should show the biometric overlay
    const showBiometricOverlay = isOnboardingCompleted && isBiometricEnabled && !isInSettings && isLocked;
    const needsAuth = showBiometricOverlay && !isAuthenticated;

    return (
        <>
            <StatusBar style={statusBarStyle} />
            <Stack screenOptions={stackScreenOptions}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                <Stack.Screen name="Category" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="Items" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                    name="AddTransaction"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="EditTransaction" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                    name="AddCategory"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="EditCategory" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                    name="AddSubcategory"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                    name="EditSubcategory"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                    name="AddSubscription"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="EditSubscription" options={{ animation: 'slide_from_right' }} />
            </Stack>

            {/* Biometric privacy/lock overlay — renders ON TOP of the app */}
            {showBiometricOverlay && (
                <View style={StyleSheet.absoluteFill} pointerEvents={needsAuth ? 'auto' : 'none'}>
                    <BlurView
                        intensity={60}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Solid background layer for extra privacy */}
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(13, 13, 13, 0.85)'
                                    : 'rgba(255, 255, 255, 0.85)',
                            },
                        ]}
                    />
                    {/* Lock screen UI — only shown when auth is actually needed */}
                    {needsAuth && (
                        <View style={lockStyles.container}>
                            <View style={[lockStyles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                                <Feather name="lock" size={32} color={colors.primary} />
                            </View>
                            <Text style={[lockStyles.title, { color: colors.text }]}>
                                Finance Tracker
                            </Text>
                            <Text style={[lockStyles.subtitle, { color: colors.textSecondary }]}>
                                {isAuthenticating ? 'Authenticating...' : 'Tap to unlock'}
                            </Text>
                            {!isAuthenticating && (
                                <TouchableOpacity
                                    style={[lockStyles.unlockButton, { backgroundColor: colors.primary }]}
                                    onPress={handleBiometricAuth}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="unlock" size={20} color="#FFFFFF" />
                                    <Text style={lockStyles.unlockText}>Unlock</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}
        </>
    );
};

const lockStyles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 32,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        gap: 8,
    },
    unlockText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <SheetProvider>
                        <AppShell />
                    </SheetProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
