import React, { useCallback } from 'react';
import { Platform, ActionSheetIOS } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { CustomTabBar } from '../../src/components/CustomTabBar';
import { showActionSheet } from '../../src/components/ActionSheet';
import { useHaptics } from '../../src/hooks';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
    const { colors } = useTheme();
    const router = useRouter();
    const { light } = useHaptics();

    const handleFabPress = useCallback(() => {
        light();
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Add Manually', 'Scan Receipt'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        router.push('/AddTransaction');
                    } else if (buttonIndex === 2) {
                        router.push('/AddTransaction');
                    }
                }
            );
        } else {
            showActionSheet(
                'Add Transaction',
                'Choose how to add a transaction',
                [
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
                        onPress: () => router.push('/AddTransaction'),
                    },
                ]
            );
        }
    }, [light, router]);

    return (
        <Tabs
            initialRouteName="Home"
            tabBar={(props) => (
                <CustomTabBar
                    currentRoute={props.state.routes[props.state.index]?.name ?? 'Home'}
                    onTabPress={(name) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        router.push(`/(tabs)/${name}` as any);
                    }}
                    onFabPress={handleFabPress}
                />
            )}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
            }}
        >
            <Tabs.Screen name="Home" options={{ title: 'Home' }} />
            <Tabs.Screen name="Analytics" options={{ title: 'Insights' }} />
            <Tabs.Screen name="Calendar" options={{ title: 'Calendar' }} />
            <Tabs.Screen name="Settings" options={{ title: 'Settings' }} />
            <Tabs.Screen
                name="Subscriptions"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
