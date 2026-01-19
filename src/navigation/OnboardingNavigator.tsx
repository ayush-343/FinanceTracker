import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
    WelcomeScreen,
    CurrencySetupScreen,
    BiometricSetupScreen,
    CategorySetupScreen,
} from '../screens/onboarding';
import { OnboardingStackParamList } from '../types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CurrencySetup" component={CurrencySetupScreen} />
            <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
            <Stack.Screen name="CategorySetup" component={CategorySetupScreen} />
        </Stack.Navigator>
    );
};
