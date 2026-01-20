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
    EditSubcategoryScreen,
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
    const { authenticate, isAuthenticated, isAuthenticating } = useBiometricAuth();

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        // Load saved settings
        await loadSettings();
        setIsLoading(false);
    };

    const handleBiometricAuth = async () => {
        if (!isAuthenticating) {
            await authenticate();
        }
    };

    if (isLoading) {
        return <LoadingScreen message="Loading..." />;
    }

    // Show lock screen if biometric is enabled but not authenticated (and not currently authenticating)
    if (isOnboardingCompleted && isBiometricEnabled && !isAuthenticated && !isAuthenticating) {
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
                            name="EditSubcategory"
                            component={EditSubcategoryScreen}
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
