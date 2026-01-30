import React from 'react';
import { Redirect } from 'expo-router';

const Index: React.FC = () => {
    return <Redirect href="/(tabs)/Home" />;
};

export default Index;
