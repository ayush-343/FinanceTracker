import React from 'react';
import { Redirect } from 'expo-router';
import { useSettingsStore } from '../src/store';

const Index: React.FC = () => {
    const { isOnboardingCompleted } = useSettingsStore();

    return <Redirect href={isOnboardingCompleted ? "/(tabs)/Home" : "/(onboarding)/AnimatedOnboarding"} />;
};

export default Index;
