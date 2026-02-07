import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SheetProvider } from 'react-native-actions-sheet';
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
    const { authenticate, isAuthenticated, isAuthenticating } = useBiometricAuth();
    const router = useRouter();
    const segments = useSegments();

    // Memoize route checks to prevent unnecessary re-renders
    const segmentFirst = segments[0];
    const segmentSecond = (segments as string[])[1];
    const isInOnboarding = useMemo(() => segmentFirst === '(onboarding)', [segmentFirst]);
    const isInSettings = useMemo(() => segmentFirst === '(tabs)' && segmentSecond === 'Settings', [segmentFirst, segmentSecond]);

    // Memoize StatusBar style to prevent unnecessary updates
    const statusBarStyle = useMemo(() => isDark ? 'light' : 'dark', [isDark]);

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
            // Allow default behavior for most screens
            // Can be extended to show confirmation dialogs for forms
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

    if (isOnboardingCompleted && isBiometricEnabled && !isInSettings && isAuthenticating) {
        return <LoadingScreen message="Authenticating..." />;
    }

    if (isOnboardingCompleted && isBiometricEnabled && !isInSettings && !isAuthenticated) {
        return (
            <LoadingScreen
                message="Tap to unlock"
                showUnlock
                onUnlock={handleBiometricAuth}
            />
        );
    }

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
        </>
    );
};

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
