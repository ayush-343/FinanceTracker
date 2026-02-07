import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="AnimatedOnboarding" />
            <Stack.Screen name="CurrencySetup" />
            <Stack.Screen name="BiometricSetup" />
            <Stack.Screen name="CategorySetup" />
        </Stack>
    );
}
