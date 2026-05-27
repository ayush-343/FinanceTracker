import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActionSheetIOS } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useHaptics } from '../hooks';
import { showActionSheet } from './ActionSheet';
import { useWalkthroughContext } from './WalkthroughContext';

interface TabItem {
    name: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
}

const TABS: TabItem[] = [
    { name: 'Home', label: 'Home', icon: 'home' },
    { name: 'Analytics', label: 'Insights', icon: 'pie-chart' },
    // Center FAB placeholder
    { name: 'Calendar', label: 'Calendar', icon: 'calendar' },
    { name: 'Settings', label: 'Settings', icon: 'settings' },
];

interface CustomTabBarProps {
    currentRoute: string;
    onTabPress: (routeName: string) => void;
    onFabPress: () => void;
}

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
    currentRoute,
    onTabPress,
    onFabPress,
}) => {
    const { colors } = useTheme();
    const { light } = useHaptics();
    const insets = useSafeAreaInsets();
    const { registerRef } = useWalkthroughContext();
    const fabRef = useRef<View>(null);

    useEffect(() => {
        registerRef('fab', fabRef);
    }, [registerRef]);

    const handleTabPress = useCallback((name: string) => {
        light();
        onTabPress(name);
    }, [light, onTabPress]);

    const handleFabPress = useCallback(() => {
        light();
        onFabPress();
    }, [light, onFabPress]);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: `${colors.background}F2`,
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 8),
                },
            ]}
        >
            <View style={styles.tabRow}>
                {/* Left tabs */}
                {TABS.slice(0, 2).map((tab) => {
                    const isActive = currentRoute === tab.name;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.tabItem}
                            onPress={() => handleTabPress(tab.name)}
                            activeOpacity={0.7}
                        >
                            <Feather
                                name={tab.icon}
                                size={24}
                                color={isActive ? colors.primary : colors.tabBarInactive}
                            />
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: isActive ? colors.primary : colors.tabBarInactive },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                {/* Center FAB */}
                <View style={styles.fabContainer}>
                    <TouchableOpacity
                        onPress={handleFabPress}
                        activeOpacity={0.85}
                    >
                        <View
                            ref={fabRef}
                            style={[styles.fab, { backgroundColor: colors.primary }]}
                            collapsable={false}
                        >
                            <Feather name="plus" size={32} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Right tabs */}
                {TABS.slice(2).map((tab) => {
                    const isActive = currentRoute === tab.name;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.tabItem}
                            onPress={() => handleTabPress(tab.name)}
                            activeOpacity={0.7}
                        >
                            <Feather
                                name={tab.icon}
                                size={24}
                                color={isActive ? colors.primary : colors.tabBarInactive}
                            />
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: isActive ? colors.primary : colors.tabBarInactive },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 60,
        paddingHorizontal: 16,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        paddingBottom: 4,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
    },
    fabContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 4,
        borderColor: '#0D0D0D',
    },
});
