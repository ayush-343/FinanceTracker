import React, { useEffect, useRef, useMemo } from 'react';
import { Appearance } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
    const { colors, isDark } = useTheme();
    const { darkMode } = useSettingsStore();
    const segments = useSegments();
    const lastTabRef = useRef<string | null>(null);

    // Extract primitive values to avoid re-renders on segment array changes
    const segmentFirst = segments[0];
    const segmentSecond = (segments as string[])[1];

    // Force native appearance to match our theme
    useEffect(() => {
        // When darkMode is explicitly set (not system/null), override the native appearance
        if (darkMode !== null) {
            Appearance.setColorScheme(darkMode ? 'dark' : 'light');
        } else {
            // Reset to system default
            Appearance.setColorScheme(null);
        }
    }, [darkMode]);

    useEffect(() => {
        const isInTabs = segmentFirst === '(tabs)';
        const currentTab = isInTabs && typeof segmentSecond === 'string' ? segmentSecond : null;

        if (currentTab && lastTabRef.current && lastTabRef.current !== currentTab) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        if (currentTab) {
            lastTabRef.current = currentTab;
        }
    }, [segmentFirst, segmentSecond]);

    // Memoize screen options with tab bar styling
    const screenOptions = useMemo(() => ({
        headerShown: false,
        tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
    }), [colors.tabBar, colors.tabBarBorder, colors.tabBarActive, colors.tabBarInactive]);

    // Memoize tab options to prevent unnecessary re-renders
    const tabOptions = useMemo(() => ({
        iconColor: colors.tabBarInactive,
        selectedIconColor: colors.tabBarActive,
        labelStyle: { fontSize: 11, fontWeight: '500' as const, color: colors.tabBarInactive },
    }), [colors.tabBarInactive, colors.tabBarActive]);

    const selectedLabelStyle = useMemo(() => ({ color: colors.tabBarActive }), [colors.tabBarActive]);

    // Use key to force NativeTabs to completely re-mount when theme changes
    // NativeTabs uses UITabBarController which caches its appearance
    // We need to destroy and recreate it when theme changes
    const tabBarKey = useMemo(() => {
        // Create a unique key based on the actual theme state
        const themeKey = darkMode === null ? 'system' : darkMode ? 'dark' : 'light';
        const resolvedTheme = isDark ? 'resolved-dark' : 'resolved-light';
        return `nativetabs-${themeKey}-${resolvedTheme}`;
    }, [darkMode, isDark]);

    return (
        <NativeTabs
            key={tabBarKey}
            initialRouteName="Home"
            screenOptions={screenOptions}
        >
            <NativeTabs.Trigger
                name="Home"
                options={tabOptions}
            >
                <Icon src={<VectorIcon family={Feather} name="home" />} />
                <Label selectedStyle={selectedLabelStyle}>Home</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Calendar"
                options={tabOptions}
            >
                <Icon src={<VectorIcon family={Feather} name="calendar" />} />
                <Label selectedStyle={selectedLabelStyle}>Calendar</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Analytics"
                options={tabOptions}
            >
                <Icon src={<VectorIcon family={Feather} name="bar-chart-2" />} />
                <Label selectedStyle={selectedLabelStyle}>Analytics</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Subscriptions"
                options={tabOptions}
            >
                <Icon src={<VectorIcon family={Feather} name="repeat" />} />
                <Label selectedStyle={selectedLabelStyle}>Subscriptions</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="Settings"
                options={tabOptions}
            >
                <Icon src={<VectorIcon family={Feather} name="settings" />} />
                <Label selectedStyle={selectedLabelStyle}>Settings</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
