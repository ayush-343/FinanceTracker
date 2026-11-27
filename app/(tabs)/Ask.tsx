import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AskView } from '../Ask';

export default function AskTab() {
    const { q } = useLocalSearchParams<{ q?: string }>();
    return <AskView asTab initialQuestion={q} />;
}
