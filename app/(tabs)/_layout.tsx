import React from 'react';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Symbol, useKolam } from '../../src/ui';

export default function TabsLayout() {
    const { c } = useKolam();

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
            {/* Reached from Plan and You, not from the tab bar. */}
            <Tabs.Screen name="Subscriptions" options={{ href: null }} />
        </Tabs>
    );
}
