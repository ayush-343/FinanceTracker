import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components';
export const WelcomeScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <View
                        style={[
                            styles.iconCircle,
                            { backgroundColor: colors.primary + '20' },
                        ]}
                    >
                        <Feather name="pie-chart" size={64} color={colors.primary} />
                    </View>
                </View>

                <Text style={[textStyles.displayLarge, { color: colors.text, textAlign: 'center' }]}>
                    Finance Tracker
                </Text>

                <Text
                    style={[
                        textStyles.bodyLarge,
                        {
                            color: colors.textSecondary,
                            textAlign: 'center',
                            marginTop: spacing.lg,
                            paddingHorizontal: spacing.xl,
                        },
                    ]}
                >
                    Take control of your finances. Track spending, manage budgets, and achieve your financial goals.
                </Text>

                <View style={styles.features}>
                    {[
                        { icon: 'trending-up', text: 'Track daily spending' },
                        { icon: 'folder', text: 'Organize by categories' },
                        { icon: 'repeat', text: 'Manage subscriptions' },
                        { icon: 'bar-chart-2', text: 'Visualize your progress' },
                    ].map((feature, index) => (
                        <View
                            key={index}
                            style={[styles.featureRow, { marginTop: index > 0 ? spacing.md : 0 }]}
                        >
                            <Feather name={feature.icon as any} size={20} color={colors.primary} />
                            <Text
                                style={[
                                    textStyles.body,
                                    { color: colors.text, marginLeft: spacing.md },
                                ]}
                            >
                                {feature.text}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[styles.footer, { paddingHorizontal: spacing.xl }]}>
                <Button
                    title="Get Started"
                    onPress={() => router.push('/(onboarding)/CurrencySetup')}
                    fullWidth
                />
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
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconContainer: {
        marginBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    features: {
        marginTop: 48,
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        paddingBottom: 20,
    },
});

export default WelcomeScreen;
