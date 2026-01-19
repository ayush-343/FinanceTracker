import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '../../theme';
import { useSettingsStore, useBudgetStore } from '../../store';
import { useCurrency, useBiometricAuth, useHaptics } from '../../hooks';
import { RootStackParamList, BudgetPeriod } from '../../types';
import { CURRENCIES, BUDGET_PERIODS } from '../../constants';
import { getCategoriesWithSpending, getTransactionsByCategory, updateCategory } from '../../database';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

const CURRENCY_OPTIONS = CURRENCIES.slice(0, 10); // Show top 10 currencies

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, textStyles, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { isAvailable: biometricAvailable, biometricType } = useBiometricAuth();
    const { light, success } = useHaptics();

    const {
        isBiometricEnabled,
        currency,
        budgetPeriod,
        setBiometricEnabled,
        setCurrency,
        setBudgetPeriod,
        resetOnboarding,
    } = useSettingsStore();

    const { totalSpending, totalBudget, categories } = useBudgetStore();

    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [showBudgetEditor, setShowBudgetEditor] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isSavingBudget, setIsSavingBudget] = useState(false);

    const currencyName = CURRENCIES.find(c => c.code === currency)?.name || currency;
    const periodName = BUDGET_PERIODS.find(p => p.key === budgetPeriod)?.label || budgetPeriod;

    const handleBiometricToggle = async (value: boolean) => {
        light();
        await setBiometricEnabled(value);
    };

    const handleCurrencyChange = async (code: string) => {
        light();
        await setCurrency(code);
        setShowCurrencyPicker(false);
    };

    const handlePeriodChange = async (period: BudgetPeriod) => {
        light();
        await setBudgetPeriod(period);
        setShowPeriodPicker(false);
    };

    const handleOpenBudgetEditor = () => {
        setBudgetInput(totalBudget.toString());
        setShowBudgetEditor(true);
    };

    const handleSaveBudget = async () => {
        const newTotal = parseFloat(budgetInput);
        if (isNaN(newTotal) || newTotal <= 0) {
            Alert.alert('Invalid Budget', 'Please enter a valid budget amount.');
            return;
        }

        setIsSavingBudget(true);
        try {
            // Update all category budgets proportionally
            if (categories.length > 0 && totalBudget > 0) {
                for (const category of categories) {
                    const proportion = category.budget_limit / totalBudget;
                    const newCategoryBudget = newTotal * proportion;
                    await updateCategory(category.id, { budget_limit: newCategoryBudget });
                }
            } else if (categories.length > 0) {
                // If current total is 0, distribute evenly
                const perCategory = newTotal / categories.length;
                for (const category of categories) {
                    await updateCategory(category.id, { budget_limit: perCategory });
                }
            }

            // Refresh data to update UI
            const { loadCategories, loadSpendingData } = useBudgetStore.getState();
            await loadCategories();
            await loadSpendingData();

            success();
            setShowBudgetEditor(false);
        } catch (error) {
            console.error('Failed to update budget:', error);
            Alert.alert('Error', 'Failed to update budget. Please try again.');
        } finally {
            setIsSavingBudget(false);
        }
    };

    const generatePDFReport = async () => {
        setIsExporting(true);
        try {
            const now = new Date();
            const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

            const categoriesData = await getCategoriesWithSpending(startDate, endDate);
            const totalSpent = categoriesData.reduce((sum, c) => sum + c.spent, 0);
            const totalBudgetAmount = categoriesData.reduce((sum, c) => sum + c.budget_limit, 0);

            let transactionsHTML = '';
            for (const category of categoriesData) {
                const transactions = await getTransactionsByCategory(category.id, startDate, endDate);
                if (transactions.length > 0) {
                    transactionsHTML += `
            <h3 style="color: ${category.color}; margin-top: 20px;">${category.name}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #f5f5f5;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Notes</th>
                <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Amount</th>
              </tr>
              ${transactions.map(t => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${format(new Date(t.date), 'MMM d, yyyy')}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${t.notes || '-'}</td>
                  <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${formatCurrency(t.amount)}</td>
                </tr>
              `).join('')}
            </table>
          `;
                }
            }

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Budget Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; }
            h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 30px; }
            .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .label { color: #666; }
            .value { font-weight: 600; color: #333; }
            .progress { margin-top: 20px; }
            .progress-bar { height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; }
            .progress-fill { height: 100%; background: #6366f1; }
          </style>
        </head>
        <body>
          <h1>📊 Budget Report</h1>
          <p style="color: #666;">Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
          
          <div class="summary">
            <div class="summary-row">
              <span class="label">Budget Period:</span>
              <span class="value">${format(startOfMonth(now), 'MMM d')} - ${format(endOfMonth(now), 'MMM d, yyyy')}</span>
            </div>
            <div class="summary-row">
              <span class="label">Total Budget:</span>
              <span class="value">${formatCurrency(totalBudgetAmount)}</span>
            </div>
            <div class="summary-row">
              <span class="label">Total Spent:</span>
              <span class="value">${formatCurrency(totalSpent)}</span>
            </div>
            <div class="summary-row">
              <span class="label">Remaining:</span>
              <span class="value" style="color: ${totalBudgetAmount - totalSpent >= 0 ? '#22c55e' : '#ef4444'}">
                ${formatCurrency(totalBudgetAmount - totalSpent)}
              </span>
            </div>
            <div class="progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min((totalSpent / totalBudgetAmount) * 100, 100)}%"></div>
              </div>
            </div>
          </div>

          <h2>Category Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Category</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Budget</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Spent</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Remaining</th>
            </tr>
            ${categoriesData.map(c => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">
                  <span style="color: ${c.color};">●</span> ${c.name}
                </td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(c.budget_limit)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(c.spent)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: ${c.budget_limit - c.spent >= 0 ? '#22c55e' : '#ef4444'}">
                  ${formatCurrency(c.budget_limit - c.spent)}
                </td>
              </tr>
            `).join('')}
          </table>

          <h2>Transaction Details</h2>
          ${transactionsHTML || '<p style="color: #666;">No transactions recorded.</p>'}

          <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #999; font-size: 12px;">
            Generated by Finance Tracker App
          </footer>
        </body>
        </html>
      `;

            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Budget Report',
                    UTI: 'com.adobe.pdf',
                });
                success();
            }
        } catch (error) {
            console.error('PDF export failed:', error);
            Alert.alert('Export Failed', 'Failed to generate PDF report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetOnboarding = () => {
        Alert.alert(
            'Reset App',
            'This will reset the app and show the onboarding screens again. Your data will be preserved.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await resetOnboarding();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Onboarding' }],
                        });
                    },
                },
            ]
        );
    };

    const SettingRow = ({
        icon,
        title,
        subtitle,
        onPress,
        rightComponent,
    }: {
        icon: string;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        rightComponent?: React.ReactNode;
    }) => (
        <TouchableOpacity
            style={[
                styles.settingRow,
                {
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                    marginBottom: spacing.sm,
                },
            ]}
            onPress={onPress}
            disabled={!onPress && !rightComponent}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <Feather name={icon as any} size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[textStyles.body, { color: colors.text }]}>{title}</Text>
                {subtitle && (
                    <Text style={[textStyles.labelSmall, { color: colors.textSecondary }]}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {rightComponent || (
                onPress && <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <Text style={[textStyles.h2, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Security */}
                <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                    SECURITY
                </Text>
                {biometricAvailable && (
                    <SettingRow
                        icon="lock"
                        title={`${biometricType === 'faceid' ? 'Face ID' : 'Touch ID'} Lock`}
                        subtitle="Require biometric to open app"
                        rightComponent={
                            <Switch
                                value={isBiometricEnabled}
                                onValueChange={handleBiometricToggle}
                                trackColor={{ false: colors.border, true: colors.primary }}
                            />
                        }
                    />
                )}

                {/* Budget */}
                <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                    BUDGET
                </Text>
                <SettingRow
                    icon="target"
                    title={`${budgetPeriod === 'monthly' ? 'Monthly' : 'Weekly'} Budget`}
                    subtitle={formatCurrency(totalBudget)}
                    onPress={handleOpenBudgetEditor}
                />

                {/* Preferences */}
                <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                    PREFERENCES
                </Text>
                <SettingRow
                    icon="dollar-sign"
                    title="Currency"
                    subtitle={`${currencyName} (${currency})`}
                    onPress={() => setShowCurrencyPicker(true)}
                />
                <SettingRow
                    icon="calendar"
                    title="Budget Period"
                    subtitle={periodName}
                    onPress={() => setShowPeriodPicker(true)}
                />

                {/* Data */}
                <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                    DATA
                </Text>
                <SettingRow
                    icon="file-text"
                    title="Export PDF Report"
                    subtitle={isExporting ? 'Generating...' : 'Share your budget summary'}
                    onPress={!isExporting ? generatePDFReport : undefined}
                />

                {/* About */}
                <Text style={[textStyles.label, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                    ABOUT
                </Text>
                <SettingRow
                    icon="info"
                    title="App Version"
                    subtitle="0.0.1"
                />
                <SettingRow
                    icon="refresh-cw"
                    title="Reset Onboarding"
                    subtitle="Show welcome screens again"
                    onPress={handleResetOnboarding}
                />

                {/* Currency Picker Modal */}
                {showCurrencyPicker && (
                    <View
                        style={[
                            styles.picker,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                                marginTop: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.h4, { color: colors.text, marginBottom: spacing.md }]}>
                            Select Currency
                        </Text>
                        {CURRENCY_OPTIONS.map((c) => (
                            <TouchableOpacity
                                key={c.code}
                                style={[
                                    styles.pickerOption,
                                    {
                                        backgroundColor: currency === c.code ? `${colors.primary}20` : 'transparent',
                                        borderRadius: borderRadius.md,
                                        padding: spacing.md,
                                    },
                                ]}
                                onPress={() => handleCurrencyChange(c.code)}
                            >
                                <Text style={{ fontSize: 20, marginRight: spacing.sm }}>{c.symbol}</Text>
                                <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                                    {c.name} ({c.code})
                                </Text>
                                {currency === c.code && (
                                    <Feather name="check" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.closeButton,
                                { backgroundColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md },
                            ]}
                            onPress={() => setShowCurrencyPicker(false)}
                        >
                            <Text style={[textStyles.body, { color: colors.text, textAlign: 'center' }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Period Picker Modal */}
                {showPeriodPicker && (
                    <View
                        style={[
                            styles.picker,
                            {
                                backgroundColor: colors.card,
                                borderRadius: borderRadius.xl,
                                padding: spacing.lg,
                                marginTop: spacing.lg,
                            },
                        ]}
                    >
                        <Text style={[textStyles.h4, { color: colors.text, marginBottom: spacing.md }]}>
                            Budget Period
                        </Text>
                        {BUDGET_PERIODS.map((p) => (
                            <TouchableOpacity
                                key={p.key}
                                style={[
                                    styles.pickerOption,
                                    {
                                        backgroundColor: budgetPeriod === p.key ? `${colors.primary}20` : 'transparent',
                                        borderRadius: borderRadius.md,
                                        padding: spacing.md,
                                    },
                                ]}
                                onPress={() => handlePeriodChange(p.key as BudgetPeriod)}
                            >
                                <Text style={[textStyles.body, { color: colors.text, flex: 1 }]}>
                                    {p.label}
                                </Text>
                                {budgetPeriod === p.key && (
                                    <Feather name="check" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.closeButton,
                                { backgroundColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md },
                            ]}
                            onPress={() => setShowPeriodPicker(false)}
                        >
                            <Text style={[textStyles.body, { color: colors.text, textAlign: 'center' }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Budget Editor Modal */}
            <Modal
                visible={showBudgetEditor}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowBudgetEditor(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: borderRadius.xl }]}>
                        <Text style={[textStyles.h3, { color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }]}>
                            Edit {budgetPeriod === 'monthly' ? 'Monthly' : 'Weekly'} Budget
                        </Text>

                        <Text style={[textStyles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                            Total Budget Amount
                        </Text>
                        <TextInput
                            style={[
                                styles.budgetInput,
                                {
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    borderRadius: borderRadius.lg,
                                    padding: spacing.lg,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                },
                            ]}
                            value={budgetInput}
                            onChangeText={setBudgetInput}
                            keyboardType="decimal-pad"
                            placeholder="Enter budget amount"
                            placeholderTextColor={colors.textTertiary}
                            autoFocus
                        />

                        <Text style={[textStyles.labelSmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                            This will proportionally adjust all category budgets.
                        </Text>

                        <View style={[styles.modalButtons, { marginTop: spacing.xl }]}>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: colors.border, borderRadius: borderRadius.md },
                                ]}
                                onPress={() => setShowBudgetEditor(false)}
                            >
                                <Text style={[textStyles.body, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: colors.primary, borderRadius: borderRadius.md },
                                ]}
                                onPress={handleSaveBudget}
                                disabled={isSavingBudget}
                            >
                                <Text style={[textStyles.body, { color: '#FFF', fontWeight: '600' }]}>
                                    {isSavingBudget ? 'Saving...' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 16,
    },
    scrollView: {
        flex: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    picker: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    closeButton: {},
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    budgetInput: {
        fontSize: 18,
        fontWeight: '500',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
});
