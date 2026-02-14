import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { Button } from '../src/components';

const NotFoundScreen: React.FC = () => {
    const { colors, spacing, textStyles } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Not Found' }} />
            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
                    <Feather name="map-pin" size={48} color={colors.primary} />
                </View>
                <Text style={[textStyles.h2, { color: colors.text, marginTop: spacing.lg }]}>Page not found</Text>
                <Text style={[textStyles.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}
                >
                    The page you’re looking for doesn’t exist.
                </Text>
                <View style={{ marginTop: spacing.xl, width: '100%' }}>
                    <Link href="/" asChild>
                        <Button title="Go to Home" fullWidth onPress={() => {}} />
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default NotFoundScreen;
