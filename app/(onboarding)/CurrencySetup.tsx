import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components';
import { useSettingsStore } from '../../src/store';
import { useHaptics } from '../../src/hooks';
import { CURRENCIES, LOCALE_TO_CURRENCY, getCurrencyByCode } from '../../src/constants';
export const CurrencySetupScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { setCurrency } = useSettingsStore();
    const { selection } = useHaptics();

    // Auto-detect currency from locale
    const detectedLocale = Localization.getLocales()[0]?.languageTag || 'en-US';
    const detectedCurrency = LOCALE_TO_CURRENCY[detectedLocale] || 'USD';

    const [selectedCurrency, setSelectedCurrency] = useState(detectedCurrency);
    const [showAll, setShowAll] = useState(false);

    const handleSelect = (code: string) => {
        selection();
        setSelectedCurrency(code);
    };

    const handleContinue = async () => {
        await setCurrency(selectedCurrency);
        router.push('/(onboarding)/BiometricSetup');
    };

    const displayedCurrencies = showAll
        ? CURRENCIES
        : CURRENCIES.slice(0, 6);

    const selectedInfo = getCurrencyByCode(selectedCurrency);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[textStyles.h1, { color: colors.text }]}>
                    Choose Currency
                </Text>
                <Text
                    style={[
                        textStyles.body,
                        { color: colors.textSecondary, marginTop: spacing.sm },
                    ]}
                >
                    We detected {getCurrencyByCode(detectedCurrency).name} based on your location
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ padding: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Selected currency highlight */}
                <View
                    style={[
                        styles.selectedCard,
                        {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary,
                            borderRadius: borderRadius.lg,
                            padding: spacing.lg,
                            marginBottom: spacing.xl,
                        },
                    ]}
                >
                    <View style={styles.selectedInfo}>
                        <Text style={[textStyles.currency, { color: colors.primary }]}>
                            {selectedInfo.symbol}
                        </Text>
                        <View style={{ marginLeft: spacing.md }}>
                            <Text style={[textStyles.h3, { color: colors.text }]}>
                                {selectedInfo.code}
                            </Text>
                            <Text style={[textStyles.bodySmall, { color: colors.textSecondary }]}>
                                {selectedInfo.name}
                            </Text>
                        </View>
                    </View>
                    <Feather name="check-circle" size={24} color={colors.primary} />
                </View>

                {/* Currency grid */}
                <View style={styles.grid}>
                    {displayedCurrencies.map((currency) => (
                        <TouchableOpacity
                            key={currency.code}
                            style={[
                                styles.currencyCard,
                                {
                                    backgroundColor:
                                        selectedCurrency === currency.code
                                            ? colors.primary
                                            : colors.card,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.md,
                                },
                            ]}
                            onPress={() => handleSelect(currency.code)}
                        >
                            <Text
                                style={[
                                    textStyles.h3,
                                    {
                                        color:
                                            selectedCurrency === currency.code
                                                ? '#FFF'
                                                : colors.text,
                                    },
                                ]}
                            >
                                {currency.symbol}
                            </Text>
                            <Text
                                style={[
                                    textStyles.label,
                                    {
                                        color:
                                            selectedCurrency === currency.code
                                                ? '#FFF'
                                                : colors.textSecondary,
                                        marginTop: spacing.xs,
                                    },
                                ]}
                            >
                                {currency.code}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {!showAll && (
                    <TouchableOpacity
                        style={[styles.showAllButton, { marginTop: spacing.lg }]}
                        onPress={() => setShowAll(true)}
                    >
                        <Text style={[textStyles.body, { color: colors.primary }]}>
                            Show all currencies
                        </Text>
                        <Feather name="chevron-down" size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingHorizontal: spacing.xl }]}>
                <Button
                    title="Continue"
                    onPress={handleContinue}
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    scrollView: {
        flex: 1,
    },
    selectedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 2,
    },
    selectedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    currencyCard: {
        width: '30%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    showAllButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    footer: {
        paddingBottom: 20,
        paddingTop: 12,
    },
});

export default CurrencySetupScreen;
