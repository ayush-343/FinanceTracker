import React from 'react';
import { Text, Alert, ActionSheetIOS, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Screen, Card, SettingsRow, useKolam, type, space } from '../../src/ui';
import { useAiStatus, useBiometricAuth, useCurrency, useHaptics } from '../../src/hooks';
import { useBudgetStore, useSettingsStore } from '../../src/store';
import { CURRENCIES } from '../../src/constants';
import { clearCategoryMemory, getCategories, updateCategory } from '../../src/database';
import { ensureNotificationPermission, refreshInsightNotifications } from '../../src/services/insightNotifications';
import { exportMonthReport } from '../../src/services/pdfReport';
import { parseAmountInput } from '../../src/log/draft';

/** Native single-choice picker: an action sheet on iOS, an alert elsewhere. */
const pick = (title: string, options: string[], onPick: (index: number) => void) => {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options, 'Cancel'], cancelButtonIndex: options.length }, (i) => {
      if (i < options.length) onPick(i);
    });
  } else {
    Alert.alert(title, undefined, [...options.map((o, i) => ({ text: o, onPress: () => onPick(i) })), { text: 'Cancel', style: 'cancel' as const }]);
  }
};

export default function YouScreen() {
  const router = useRouter();
  const { c } = useKolam();
  const { formatWhole, format: money } = useCurrency();
  const { light, success } = useHaptics();
  const ai = useAiStatus();
  const { isAvailable: biometricAvailable, biometricType } = useBiometricAuth();
  const {
    currency, budgetPeriod, darkMode, isBiometricEnabled, geminiApiKey, digestEnabled, alertsEnabled,
    setCurrency, setBudgetPeriod, setDarkMode, setBiometricEnabled, setGeminiApiKey, setAiEngine, setDigestEnabled, setAlertsEnabled, resetAppData,
  } = useSettingsStore();
  const [totalBudget, setTotalBudget] = React.useState(0);
  const loadBudget = React.useCallback(() => {
    getCategories().then((cats) => setTotalBudget(cats.reduce((s, x) => s + x.budget_limit, 0))).catch(() => {});
  }, []);
  useFocusEffect(loadBudget);
  const [notificationsGranted, setNotificationsGranted] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setNotificationsGranted(p.granted)).catch(() => {});
  }, []);

  const reloadBudgets = async () => {
    const { loadCategories, loadSpendingData } = useBudgetStore.getState();
    await loadCategories();
    await loadSpendingData();
  };

  const chooseCurrency = () => pick('Currency', CURRENCIES.map((x) => `${x.symbol}  ${x.name}`), (i) => { light(); setCurrency(CURRENCIES[i].code); });
  const choosePeriod = () => pick('Budget period', ['Monthly', 'Weekly'], (i) => { light(); setBudgetPeriod(i === 0 ? 'monthly' : 'weekly'); });
  const chooseAppearance = () => pick('Appearance', ['Match iPhone', 'Light', 'Dark'], (i) => { light(); setDarkMode(i === 0 ? null : i === 2); });

  const editBudget = async () => {
    const cats = await getCategories();
    if (!cats.length) {
      Alert.alert('Add a category first', 'Budgets are set per category. Add one in Plan.');
      return;
    }
    const apply = async (text?: string) => {
      const total = parseAmountInput(text ?? '');
      if (!total) return;
      const current = cats.reduce((s, x) => s + x.budget_limit, 0);
      // Keep each category's share; with no budgets yet, split evenly.
      for (const cat of cats) {
        const share = current > 0 ? cat.budget_limit / current : 1 / cats.length;
        await updateCategory(cat.id, { budget_limit: Math.round(total * share) });
      }
      success();
      loadBudget();
      reloadBudgets();
    };
    Alert.prompt(
      `${budgetPeriod === 'weekly' ? 'Weekly' : 'Monthly'} budget`,
      'Category budgets keep their current shares of the new total.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', onPress: apply }],
      'plain-text',
      totalBudget > 0 ? String(Math.round(totalBudget)) : '',
      'number-pad',
    );
  };

  const chooseAiEngine = () => pick('On-device AI', ['Auto', 'Apple Intelligence', `Local model (${ai.model.label})`, 'Off'], (i) => {
    light();
    setAiEngine((['auto', 'apple', 'local', 'off'] as const)[i]);
  });

  const manageLocalModel = () => {
    if (ai.localState === 'downloading') return;
    if (ai.localState === 'ready') {
      Alert.alert(`Delete ${ai.model.label}?`, `Frees ${ai.model.sizeMB} MB. You can download it again later.`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => ai.remove() },
      ]);
      return;
    }
    Alert.alert(`Download ${ai.model.label}?`, `${ai.model.sizeMB} MB, downloaded once from Hugging Face. Wi-Fi recommended. After that it runs offline on this phone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Download', onPress: () => ai.download().then(success).catch(() => Alert.alert('Download failed', 'Check your connection and try again.')) },
    ]);
  };

  const editGeminiKey = () => Alert.prompt(
    'Gemini API key',
    'Used only for receipt scanning. Receipt photos are sent to Google when you scan. Leave empty to remove.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', onPress: (v?: string) => { setGeminiApiKey(v?.trim() || null); success(); } }],
    'secure-text',
    geminiApiKey ?? '',
  );

  const toggleNotification = async (setter: (on: boolean) => Promise<void>, on: boolean) => {
    light();
    if (on) {
      const granted = await ensureNotificationPermission();
      setNotificationsGranted(granted);
      if (!granted) {
        Alert.alert('Notifications are off', 'Turn on notifications for this app in iOS Settings to get these.');
        return;
      }
    }
    await setter(on);
    refreshInsightNotifications();
  };

  const clearLearned = () => Alert.alert('Clear learned categories?', 'Category suggestions will start fresh. Your purchases are not changed.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: async () => { await clearCategoryMemory(); success(); } },
  ]);

  const exportReport = async () => {
    setExporting(true);
    try {
      await exportMonthReport(money);
    } catch (e) {
      console.warn('[You] export failed:', e);
      Alert.alert('Could not create the report', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const eraseAll = () => Alert.alert('Erase all data?', 'Every purchase, category, goal and setting on this phone will be deleted, and setup starts again. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Erase', style: 'destructive', onPress: async () => { await resetAppData(); router.replace('/(onboarding)/Start'); } },
  ]);

  const currencyLabel = CURRENCIES.find((x) => x.code === currency);
  const faceId = biometricType === 'faceid' ? 'Face ID' : 'Touch ID';

  return (
    <Screen title="You">
      <Card title="Money">
        <SettingsRow icon="indianrupeesign.circle" fallback="dollar-sign" title="Currency" value={currencyLabel ? `${currencyLabel.symbol} ${currencyLabel.code}` : currency} onPress={chooseCurrency} />
        <SettingsRow icon="calendar" fallback="calendar" title="Budget period" value={budgetPeriod === 'weekly' ? 'Weekly' : 'Monthly'} onPress={choosePeriod} />
        <SettingsRow icon="target" fallback="target" title={`${budgetPeriod === 'weekly' ? 'Weekly' : 'Monthly'} budget`} value={totalBudget > 0 ? formatWhole(totalBudget) : 'Not set'} onPress={editBudget} />
        <SettingsRow icon="square.grid.2x2" fallback="grid" title="Categories and budgets" onPress={() => router.push('/(tabs)/Plan')} />
        <SettingsRow icon="repeat" fallback="repeat" title="Subscriptions" subtitle="Recurring payments and suggestions" onPress={() => router.push('/(tabs)/Subscriptions')} last />
      </Card>

      <Card title="Notifications">
        <SettingsRow icon="sparkles" fallback="star" title="Weekly review" subtitle="Sunday 7 pm · your week's loops and one thing to try"
          toggle={{ value: digestEnabled && notificationsGranted, onChange: (on) => toggleNotification(setDigestEnabled, on) }} />
        <SettingsRow icon="exclamationmark.triangle" fallback="alert-triangle" title="Budget alerts" subtitle="When a category is on pace to go over"
          toggle={{ value: alertsEnabled && notificationsGranted, onChange: (on) => toggleNotification(setAlertsEnabled, on) }} last />
      </Card>

      <Card title="On-device AI & privacy">
        <SettingsRow icon="cpu" fallback="cpu" title="On-device AI" subtitle={ai.active}
          value={ai.aiEngine === 'auto' ? 'Auto' : ai.aiEngine === 'apple' ? 'Apple' : ai.aiEngine === 'local' ? 'Local' : 'Off'} onPress={chooseAiEngine} />
        <SettingsRow icon="arrow.down.circle" fallback="download" title="Local model"
          subtitle={ai.localState === 'downloading' ? `Downloading ${ai.progress}%` : ai.localState === 'ready' ? `${ai.model.label} · on this phone · tap to delete` : `${ai.model.label} · ${ai.model.sizeMB} MB · tap to download`}
          onPress={manageLocalModel} />
        <SettingsRow icon="key" fallback="key" title="Gemini key for receipts" subtitle={geminiApiKey ? 'Set · receipt photos go to Google' : 'Not set · receipt photos go to Google'} onPress={editGeminiKey} />
        <SettingsRow icon="arrow.counterclockwise" fallback="rotate-ccw" title="Clear learned categories" subtitle="Forget what the app learned from you" onPress={clearLearned} last />
      </Card>

      <Card title="This phone">
        <SettingsRow icon="circle.lefthalf.filled" fallback="moon" title="Appearance" value={darkMode === null ? 'Match iPhone' : darkMode ? 'Dark' : 'Light'} onPress={chooseAppearance} />
        {biometricAvailable ? (
          <SettingsRow icon={biometricType === 'faceid' ? 'faceid' : 'touchid'} fallback="lock" title={`${faceId} lock`} subtitle="Ask before opening the app"
            toggle={{ value: isBiometricEnabled, onChange: (on) => { light(); setBiometricEnabled(on); } }} />
        ) : null}
        <SettingsRow icon="doc.richtext" fallback="file-text" title="Export this month" subtitle={exporting ? 'Creating PDF…' : 'A PDF report to save or share'} onPress={exporting ? undefined : exportReport} last />
      </Card>

      <Card>
        <SettingsRow icon="trash" fallback="trash-2" title="Erase all data" subtitle="Delete everything on this phone and start again" onPress={eraseAll} destructive last />
      </Card>

      <Text maxFontSizeMultiplier={2} style={[type.caption, styles.footer, { color: c.muted }]}>
        Finance Tracker {Constants.expoConfig?.version ?? ''} · your data stays on this phone
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: space.xl },
});
