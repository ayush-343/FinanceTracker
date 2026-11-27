import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useWalkthroughContext } from '../../src/components/WalkthroughContext';
import { Symbol, useKolam } from '../../src/ui';

export default function TabsLayout() {
    const router = useRouter();
    const { c } = useKolam();

    // Connect walkthrough tab navigation
    const { setNavigateToTab } = useWalkthroughContext();
    useEffect(() => {
        setNavigateToTab((tabName: string) => {
            router.push(`/(tabs)/${tabName}` as any);
        });
    }, [router, setNavigateToTab]);

    return (
        <Tabs
            initialRouteName="Today"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: c.ink,
                tabBarInactiveTintColor: c.muted,
                tabBarStyle: { backgroundColor: c.ground, borderTopColor: c.hairline },
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
    );
}
