import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { CategoryScreen, ItemsScreen } from '../screens/main';
import {
    AddTransactionScreen,
    EditTransactionScreen,
    AddCategoryScreen,
    EditCategoryScreen,
    AddSubcategoryScreen,
    AddSubscriptionScreen,
    EditSubscriptionScreen,
} from '../screens/forms';
import { LoadingScreen } from '../components';
import { useSettingsStore } from '../store';
import { useBiometricAuth } from '../hooks';
import { useTheme } from '../theme';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
    const { colors } = useTheme();
    const { isOnboardingCompleted, isBiometricEnabled, loadSettings } = useSettingsStore();
    const { authenticate, isAuthenticated } = useBiometricAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isUnlocked, setIsUnlocked] = useState(false);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        // Load saved settings
        await loadSettings();
        setIsLoading(false);
    };

    useEffect(() => {
        // Handle biometric authentication
        if (!isLoading && isOnboardingCompleted && isBiometricEnabled && !isUnlocked) {
            handleBiometricAuth();
        } else if (!isBiometricEnabled) {
            setIsUnlocked(true);
        }
    }, [isLoading, isOnboardingCompleted, isBiometricEnabled]);

    useEffect(() => {
        // Update unlock state when authentication status changes
        if (isAuthenticated) {
            setIsUnlocked(true);
        }
    }, [isAuthenticated]);

    const handleBiometricAuth = async () => {
        const success = await authenticate();
        setIsUnlocked(success);
    };

    if (isLoading) {
        return <LoadingScreen message="Loading..." />;
    }

    // Show lock screen if biometric is enabled but not authenticated
    if (isOnboardingCompleted && isBiometricEnabled && !isUnlocked) {
        return (
            <LoadingScreen
                message="Tap to unlock"
                showUnlock
                onUnlock={handleBiometricAuth}
            />
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                {!isOnboardingCompleted ? (
                    <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={MainTabNavigator} />
                        <Stack.Screen
                            name="Category"
                            component={CategoryScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="Items"
                            component={ItemsScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="AddTransaction"
                            component={AddTransactionScreen}
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="EditTransaction"
                            component={EditTransactionScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="AddCategory"
                            component={AddCategoryScreen}
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="EditCategory"
                            component={EditCategoryScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="AddSubcategory"
                            component={AddSubcategoryScreen}
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="AddSubscription"
                            component={AddSubscriptionScreen}
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="EditSubscription"
                            component={EditSubscriptionScreen}
                            options={{
                                animation: 'slide_from_right',
                            }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
