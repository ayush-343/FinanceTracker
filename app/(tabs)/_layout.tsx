import React, { useCallback, useEffect } from 'react';
import { Platform, ActionSheetIOS } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Symbol, useKolam } from '../../src/ui';
import { LogActionsContext } from '../../src/today/LogActions';
import { showActionSheet } from '../../src/components/ActionSheet';
import { useWalkthroughContext } from '../../src/components/WalkthroughContext';
import { useHaptics } from '../../src/hooks';
import { useReceiptScanner } from '../../src/hooks/useReceiptScanner';
import { ScanningModal } from '../../src/components/ScanningModal';
import { BarcodeScannerModal } from '../../src/components/BarcodeScannerModal';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
    const { colors } = useTheme();
    const { c: k } = useKolam();
    const router = useRouter();
    const { light } = useHaptics();
    const {
        isScanning,
        error,
        showModal,
        showBarcodeScanner,
        pickImage,
        retry,
        goToManualEntry,
        closeModal,
        closeBarcodeScanner,
        handleBarcodeScanComplete,
    } = useReceiptScanner();

    // Connect walkthrough tab navigation
    const { setNavigateToTab } = useWalkthroughContext();
    useEffect(() => {
        setNavigateToTab((tabName: string) => {
            router.push(`/(tabs)/${tabName}` as any);
        });
    }, [router, setNavigateToTab]);

    const handleFabPress = useCallback(() => {
        light();
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Type or Say It', 'Add Manually', 'Scan Receipt'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        router.push('/QuickLog');
                    } else if (buttonIndex === 2) {
                        router.push('/AddTransaction');
                    } else if (buttonIndex === 3) {
                        pickImage();
                    }
                }
            );
        } else {
            showActionSheet(
                'Add Transaction',
                'Choose how to add a transaction',
                [
                    {
                        id: 'quick',
                        label: 'Type or Say It',
                        icon: 'mic',
                        onPress: () => router.push('/QuickLog'),
                    },
                    {
                        id: 'manual',
                        label: 'Add Manually',
                        icon: 'edit-3',
                        onPress: () => router.push('/AddTransaction'),
                    },
                    {
                        id: 'scan',
                        label: 'Scan Receipt',
                        icon: 'camera',
                        onPress: () => pickImage(),
                    },
                ]
            );
        }
    }, [light, router]);

    return (
        <>
            <LogActionsContext.Provider value={{ openLogMenu: handleFabPress }}>
            <Tabs
                initialRouteName="Today"
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: k.ink,
                    tabBarInactiveTintColor: k.muted,
                    tabBarStyle: { backgroundColor: k.ground, borderTopColor: k.hairline },
                    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
                }}
                screenListeners={{ tabPress: () => { Haptics.selectionAsync().catch(() => {}); } }}
            >
                <Tabs.Screen name="Today" options={{ title: 'Today', tabBarIcon: ({ color }) => <Symbol name="sun.max" fallback="sun" color={color} size={22} /> }} />
                <Tabs.Screen name="Activity" options={{ title: 'Activity', tabBarIcon: ({ color }) => <Symbol name="list.bullet" fallback="list" color={color} size={22} /> }} />
                <Tabs.Screen name="Ask" options={{ title: 'Ask', tabBarIcon: ({ color }) => <Symbol name="bubble.left" fallback="message-circle" color={color} size={22} /> }} />
                <Tabs.Screen name="Plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <Symbol name="chart.line.uptrend.xyaxis" fallback="trending-up" color={color} size={22} /> }} />
                <Tabs.Screen name="You" options={{ title: 'You', tabBarIcon: ({ color }) => <Symbol name="person.crop.circle" fallback="user" color={color} size={22} /> }} />
                {/* Legacy screens, still reachable by route until R3–R6 replace them. */}
                <Tabs.Screen name="Home" options={{ href: null }} />
                <Tabs.Screen name="Analytics" options={{ href: null }} />
                <Tabs.Screen name="Calendar" options={{ href: null }} />
                <Tabs.Screen name="Settings" options={{ href: null }} />
                <Tabs.Screen name="Subscriptions" options={{ href: null }} />
            </Tabs>
            </LogActionsContext.Provider>

            <ScanningModal
                visible={showModal}
                isLoading={isScanning}
                error={error}
                onRetry={retry}
                onManualEntry={goToManualEntry}
                onClose={closeModal}
            />

            <BarcodeScannerModal
                visible={showBarcodeScanner}
                onClose={closeBarcodeScanner}
                onScanComplete={handleBarcodeScanComplete}
            />
        </>
    );
}
