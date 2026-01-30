import React, { useEffect, useRef } from 'react';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
    const { colors } = useTheme();
    const segments = useSegments();
    const lastTabRef = useRef<string | null>(null);

    useEffect(() => {
        const isInTabs = segments[0] === '(tabs)';
        const currentTab = isInTabs && typeof segments[1] === 'string' ? segments[1] : null;

        if (currentTab && lastTabRef.current && lastTabRef.current !== currentTab) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        if (currentTab) {
            lastTabRef.current = currentTab;
        }
    }, [segments]);


    return (
        <NativeTabs
            initialRouteName="Home"
            screenOptions={{ headerShown: false }}
        >
            <NativeTabs.Trigger
                name="Home"
                options={{
                    iconColor: colors.textSecondary,
                    selectedIconColor: colors.primary,
                    labelStyle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
                }}
            >
                <Icon src={<VectorIcon family={Feather} name="home" />} />
                <Label selectedStyle={{ color: colors.primary }}>Home</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Calendar"
                options={{
                    iconColor: colors.textSecondary,
                    selectedIconColor: colors.primary,
                    labelStyle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
                }}
            >
                <Icon src={<VectorIcon family={Feather} name="calendar" />} />
                <Label selectedStyle={{ color: colors.primary }}>Calendar</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Analytics"
                options={{
                    iconColor: colors.textSecondary,
                    selectedIconColor: colors.primary,
                    labelStyle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
                }}
            >
                <Icon src={<VectorIcon family={Feather} name="bar-chart-2" />} />
                <Label selectedStyle={{ color: colors.primary }}>Analytics</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Subscriptions"
                options={{
                    iconColor: colors.textSecondary,
                    selectedIconColor: colors.primary,
                    labelStyle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
                }}
            >
                <Icon src={<VectorIcon family={Feather} name="repeat" />} />
                <Label selectedStyle={{ color: colors.primary }}>Subscriptions</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Settings"
                options={{
                    iconColor: colors.textSecondary,
                    selectedIconColor: colors.primary,
                    labelStyle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
                }}
            >
                <Icon src={<VectorIcon family={Feather} name="settings" />} />
                <Label selectedStyle={{ color: colors.primary }}>Settings</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
