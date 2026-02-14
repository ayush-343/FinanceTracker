import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Alert, TextInput, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '../../src/theme';
import { useSettingsStore, useBudgetStore } from '../../src/store';
import { useCurrency, useBiometricAuth, useHaptics } from '../../src/hooks';
import { BudgetPeriod } from '../../src/types';
import { CURRENCIES, BUDGET_PERIODS } from '../../src/constants';
import { getCategoriesWithSpending, getTransactionsByCategory, updateCategory } from '../../src/database';

const CURRENCY_OPTIONS = CURRENCIES.slice(0, 10);

// Icon badge color map for settings rows
const ICON_COLORS: Record<string, string> = {
    user: '#3B82F6',
    lock: '#EF4444',
    shield: '#8B5CF6',
    'dollar-sign': '#10B981',
    calendar: '#F59E0B',
    moon: '#6366F1',
    target: '#EC4899',
    'file-text': '#0EA5E9',
    info: '#6B7280',
    'refresh-cw': '#F97316',
    'log-out': '#EF4444',
};

export const SettingsScreen: React.FC = () => {
    const router = useRouter();
    const { colors, spacing, borderRadius } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { isAvailable: biometricAvailable, biometricType } = useBiometricAuth();
    const { light, success } = useHaptics();

    const {
        isBiometricEnabled,
        darkMode,
        currency,
        budgetPeriod,
        setBiometricEnabled,
        setDarkMode,
        setCurrency,
        setBudgetPeriod,
        resetOnboarding,
    } = useSettingsStore();

    const { totalBudget, categories } = useBudgetStore();

    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [showBudgetEditor, setShowBudgetEditor] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isSavingBudget, setIsSavingBudget] = useState(false);
    const [pendingTheme, setPendingTheme] = useState<boolean | null>(darkMode);
    const pendingThemeToApply = useRef<{ mode: boolean | null } | null>(null);

    const currencyName = CURRENCIES.find(c => c.code === currency)?.name || currency;
    const periodName = BUDGET_PERIODS.find(p => p.key === budgetPeriod)?.label || budgetPeriod;
    const themeName = darkMode === null ? 'System' : darkMode ? 'Dark' : 'Light';

    const handleBiometricToggle = async (value: boolean) => {
        light();
        await setBiometricEnabled(value);
    };

    const handleCurrencyChange = (code: string) => {
        setShowCurrencyPicker(false);
        setTimeout(async () => {
            light();
            await setCurrency(code);
        }, 400);
    };

    const handlePeriodChange = (period: BudgetPeriod) => {
        setShowPeriodPicker(false);
        setTimeout(async () => {
            light();
            await setBudgetPeriod(period);
        }, 400);
    };

    const handleThemeChange = (mode: boolean | null) => {
        light();
        pendingThemeToApply.current = { mode };
        setShowThemePicker(false);
    };

    const handleThemeModalDismiss = async () => {
        if (pendingThemeToApply.current) {
            const { mode } = pendingThemeToApply.current;
            pendingThemeToApply.current = null;
            await setDarkMode(mode);
        }
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
            if (categories.length > 0 && totalBudget > 0) {
                for (const category of categories) {
                    const proportion = category.budget_limit / totalBudget;
                    const newCategoryBudget = newTotal * proportion;
                    await updateCategory(category.id, { budget_limit: newCategoryBudget });
                }
            } else if (categories.length > 0) {
                const perCategory = newTotal / categories.length;
                for (const category of categories) {
                    await updateCategory(category.id, { budget_limit: perCategory });
                }
            }

            success();
            setShowBudgetEditor(false);

            // Reload data after modal closes to avoid freeze
            setTimeout(async () => {
                const { loadCategories, loadSpendingData } = useBudgetStore.getState();
                await loadCategories();
                await loadSpendingData();
            }, 400);
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
                    h1 { color: #333; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; }
                    h2 { color: #666; margin-top: 30px; }
                    .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
                    .label { color: #666; }
                    .value { font-weight: 600; color: #333; }
                  </style>
                </head>
                <body>
                  <h1>Budget Report</h1>
                  <p style="color: #666;">Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
                  <div class="summary">
                    <div class="summary-row">
                      <span class="label">Period:</span>
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
                        <td style="padding: 10px; border: 1px solid #ddd;"><span style="color: ${c.color};">●</span> ${c.name}</td>
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
                        router.replace('/(onboarding)/AnimatedOnboarding');
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: () => { /* stub */ } },
            ]
        );
    };

    // SettingRow with colored icon badge
    const SettingRow = ({
        icon,
        title,
        subtitle,
        onPress,
        rightComponent,
        isLast = false,
    }: {
        icon: string;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        rightComponent?: React.ReactNode;
        isLast?: boolean;
    }) => {
        const iconColor = ICON_COLORS[icon] || colors.primary;
        return (
            <TouchableOpacity
                style={[
                    styles.settingRow,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={onPress}
                disabled={!onPress && !rightComponent}
                activeOpacity={0.6}
            >
                <View style={[styles.iconBadge, { backgroundColor: `${iconColor}15` }]}>
                    <Feather name={icon as any} size={18} color={iconColor} />
                </View>
                <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                {rightComponent || (
                    onPress && <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                )}
            </TouchableOpacity>
        );
    };

    // Grouped card wrapper
    const SettingsGroup = ({
        title,
        children,
    }: {
        title?: string;
        children: React.ReactNode;
    }) => (
        <View style={{ marginTop: spacing.lg }}>
            {title && (
                <Text style={[styles.groupTitle, { color: colors.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs }]}>
                    {title}
                </Text>
            )}
            <View
                style={[
                    styles.groupCard,
                    {
                        backgroundColor: colors.card,
                        borderRadius: borderRadius.xl,
                        overflow: 'hidden',
                    },
                ]}
            >
                {children}
            </View>
        </View>
    );

    // Picker Modal
    const PickerModal = ({
        visible,
        onClose,
        title,
        children,
    }: {
        visible: boolean;
        onClose: () => void;
        title: string;
        children: React.ReactNode;
    }) => (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
                <View style={[styles.modalSheet, { backgroundColor: colors.card, borderRadius: borderRadius.xl }]}>
                    <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    {children}
                    <TouchableOpacity
                        style={[styles.modalCancelButton, { backgroundColor: colors.background, borderRadius: borderRadius.lg }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Section */}
                <SettingsGroup>
                    <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
                        <View style={[styles.profileAvatar, { backgroundColor: `${colors.primary}20` }]}>
                            <Feather name="user" size={24} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                            <Text style={[styles.profileName, { color: colors.text }]}>Finance Tracker</Text>
                            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>Manage your profile</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                </SettingsGroup>

                {/* Preferences */}
                <SettingsGroup title="PREFERENCES">
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
                    <SettingRow
                        icon="moon"
                        title="Appearance"
                        subtitle={themeName}
                        onPress={() => {
                            setPendingTheme(darkMode);
                            setShowThemePicker(true);
                        }}
                    />
                    <SettingRow
                        icon="target"
                        title={`${budgetPeriod === 'monthly' ? 'Monthly' : 'Weekly'} Budget`}
                        subtitle={formatCurrency(totalBudget)}
                        onPress={handleOpenBudgetEditor}
                        isLast
                    />
                </SettingsGroup>

                {/* Security */}
                {biometricAvailable && (
                    <SettingsGroup title="SECURITY">
                        <SettingRow
                            icon="lock"
                            title={`${biometricType === 'faceid' ? 'Face ID' : 'Touch ID'} Lock`}
                            subtitle="Require biometric to open app"
                            rightComponent={
                                <Switch
                                    value={isBiometricEnabled}
                                    onValueChange={handleBiometricToggle}
                                    trackColor={{ false: colors.border, true: '#34D399' }}
                                    thumbColor="#FFFFFF"
                                />
                            }
                            isLast
                        />
                    </SettingsGroup>
                )}

                {/* Data */}
                <SettingsGroup title="DATA">
                    <SettingRow
                        icon="file-text"
                        title="Export PDF Report"
                        subtitle={isExporting ? 'Generating...' : 'Share your budget summary'}
                        onPress={!isExporting ? generatePDFReport : undefined}
                    />
                    <SettingRow
                        icon="refresh-cw"
                        title="Reset Onboarding"
                        subtitle="Show welcome screens again"
                        onPress={handleResetOnboarding}
                        isLast
                    />
                </SettingsGroup>

                {/* Log Out */}
                <TouchableOpacity
                    style={[
                        styles.logoutButton,
                        {
                            backgroundColor: colors.card,
                            borderRadius: borderRadius.xl,
                            marginTop: spacing.lg,
                        },
                    ]}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Feather name="log-out" size={18} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
                </TouchableOpacity>

                {/* Version footer */}
                <Text style={[styles.versionText, { color: colors.textTertiary, marginTop: spacing.lg }]}>
                    Finance Tracker v0.4.0
                </Text>
            </ScrollView>

            {/* Currency Picker */}
            <PickerModal
                visible={showCurrencyPicker}
                onClose={() => setShowCurrencyPicker(false)}
                title="Select Currency"
            >
                {CURRENCY_OPTIONS.map((c) => (
                    <TouchableOpacity
                        key={c.code}
                        style={[
                            styles.pickerOption,
                            {
                                backgroundColor: currency === c.code ? `${colors.primary}15` : 'transparent',
                                borderRadius: borderRadius.lg,
                            },
                        ]}
                        onPress={() => handleCurrencyChange(c.code)}
                    >
                        <Text style={{ fontSize: 20, marginRight: spacing.sm }}>{c.symbol}</Text>
                        <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                            {c.name} ({c.code})
                        </Text>
                        {currency === c.code && (
                            <Feather name="check" size={18} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                ))}
            </PickerModal>

            {/* Period Picker */}
            <PickerModal
                visible={showPeriodPicker}
                onClose={() => setShowPeriodPicker(false)}
                title="Budget Period"
            >
                {BUDGET_PERIODS.map((p) => (
                    <TouchableOpacity
                        key={p.key}
                        style={[
                            styles.pickerOption,
                            {
                                backgroundColor: budgetPeriod === p.key ? `${colors.primary}15` : 'transparent',
                                borderRadius: borderRadius.lg,
                            },
                        ]}
                        onPress={() => handlePeriodChange(p.key as BudgetPeriod)}
                    >
                        <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                            {p.label}
                        </Text>
                        {budgetPeriod === p.key && (
                            <Feather name="check" size={18} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                ))}
            </PickerModal>

            {/* Theme Picker — inline Modal to avoid unmount/remount issues with theme changes */}
            <Modal
                visible={showThemePicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowThemePicker(false)}
                onDismiss={handleThemeModalDismiss}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowThemePicker(false)} activeOpacity={1} />
                    <View style={[styles.modalSheet, { backgroundColor: colors.card, borderRadius: borderRadius.xl }]}>
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Appearance</Text>
                        {[
                            { key: true, label: 'Dark', icon: 'moon' },
                            { key: false, label: 'Light', icon: 'sun' },
                            { key: null, label: 'Use device theme', icon: 'smartphone' },
                        ].map((theme) => (
                            <TouchableOpacity
                                key={String(theme.key)}
                                style={[
                                    styles.pickerOption,
                                    {
                                        backgroundColor: pendingTheme === theme.key ? `${colors.primary}15` : 'transparent',
                                        borderRadius: borderRadius.lg,
                                    },
                                ]}
                                onPress={() => setPendingTheme(theme.key)}
                            >
                                <Feather name={theme.icon as any} size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                                <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                                    {theme.label}
                                </Text>
                                {pendingTheme === theme.key && (
                                    <Feather name="check" size={18} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.themeSaveButton, { backgroundColor: colors.primary, borderRadius: borderRadius.lg }]}
                            onPress={() => handleThemeChange(pendingTheme)}
                        >
                            <Text style={styles.themeSaveText}>Save preference</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalCancelButton, { backgroundColor: colors.background, borderRadius: borderRadius.lg }]}
                            onPress={() => setShowThemePicker(false)}
                        >
                            <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                    <View style={[styles.budgetModal, { backgroundColor: colors.card, borderRadius: borderRadius.xl }]}>
                        <Text style={[styles.budgetModalTitle, { color: colors.text }]}>
                            Edit {budgetPeriod === 'monthly' ? 'Monthly' : 'Weekly'} Budget
                        </Text>

                        <Text style={[styles.budgetModalLabel, { color: colors.textSecondary }]}>
                            Total Budget Amount
                        </Text>
                        <TextInput
                            style={[
                                styles.budgetInput,
                                {
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                    borderRadius: borderRadius.lg,
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

                        <Text style={[styles.budgetModalHint, { color: colors.textTertiary }]}>
                            This will proportionally adjust all category budgets.
                        </Text>

                        <View style={styles.budgetButtons}>
                            <TouchableOpacity
                                style={[styles.budgetButton, { backgroundColor: colors.background, borderRadius: borderRadius.lg }]}
                                onPress={() => setShowBudgetEditor(false)}
                            >
                                <Text style={[styles.budgetButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.budgetButton, { backgroundColor: colors.primary, borderRadius: borderRadius.lg }]}
                                onPress={handleSaveBudget}
                                disabled={isSavingBudget}
                            >
                                <Text style={[styles.budgetButtonText, { color: '#FFF', fontWeight: '600' }]}>
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
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    // Profile
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    profileAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 17,
        fontWeight: '600',
    },
    profileEmail: {
        fontSize: 13,
        marginTop: 2,
    },
    // Groups
    groupTitle: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    groupCard: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    // Setting row
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    iconBadge: {
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Version
    versionText: {
        fontSize: 12,
        textAlign: 'center',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalBackdrop: {
        flex: 1,
    },
    modalSheet: {
        padding: 20,
        paddingBottom: 34,
        maxHeight: '70%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    modalCancelButton: {
        paddingVertical: 14,
        marginTop: 12,
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
    },
    // Picker options
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 4,
    },
    pickerOptionText: {
        fontSize: 15,
        flex: 1,
    },
    // Theme save
    themeSaveButton: {
        paddingVertical: 14,
        marginTop: 12,
    },
    themeSaveText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    // Budget
    budgetModal: {
        margin: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    budgetModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
    },
    budgetModalLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    budgetInput: {
        fontSize: 18,
        fontWeight: '500',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    budgetModalHint: {
        fontSize: 12,
        marginTop: 8,
    },
    budgetButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    budgetButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    budgetButtonText: {
        fontSize: 15,
    },
});

export default SettingsScreen;
