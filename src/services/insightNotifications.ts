import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { askDb } from '../ai/ask/db';
import { QueryDb } from '../ai/ask/execute';
import { resolveRange } from '../ai/ask/range';
import { getForecastFrom } from '../ai/forecast/load';
import { buildDigest, overspendAlerts } from '../ai/insights/digest';
import { useSettingsStore } from '../store/settingsStore';
import { getCurrencyByCode } from '../constants';

const DIGEST_ID = 'weekly-digest';
const SENT_KEY = 'insight_alerts_sent';
const DIGEST_WEEKDAY = 1; // expo-notifications weekly trigger: 1 = Sunday
const DIGEST_HOUR = 19;
const USUAL_WEEKS = 4;

const moneyFor = (code: string) => {
  const c = getCurrencyByCode(code);
  return (n: number) => {
    try {
      return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${c.symbol}${Math.round(n)}`;
    }
  };
};

/** Asks for notification permission (only called when the user turns a notification setting on). */
export const ensureNotificationPermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
};

/** This week so far vs the average of the previous 4 weeks, prorated to the days elapsed. */
export const loadWeekStats = async (db: QueryDb, today: Date) => {
  const week = resolveRange({ preset: 'this_week' }, today);
  const todayISO = format(today, 'yyyy-MM-dd');
  const elapsed = (today.getDay() + 6) % 7 + 1; // Monday = 1 … Sunday = 7
  const usualFrom = format(subDays(new Date(`${week.from}T00:00:00`), USUAL_WEEKS * 7), 'yyyy-MM-dd');
  const usualTo = format(subDays(new Date(`${week.from}T00:00:00`), 1), 'yyyy-MM-dd');

  const rows = await db.getAllAsync<{ id: number; name: string; now: number; before: number }>(
    `SELECT c.id AS id, c.name AS name,
       COALESCE(SUM(CASE WHEN t.date >= ? AND t.date <= ? THEN t.amount END), 0) AS now,
       COALESCE(SUM(CASE WHEN t.date >= ? AND t.date <= ? THEN t.amount END), 0) AS before
     FROM categories c LEFT JOIN transactions t ON t.category_id = c.id GROUP BY c.id`,
    [week.from, todayISO, usualFrom, usualTo],
  );
  const prorate = (fourWeekTotal: number) => (fourWeekTotal / USUAL_WEEKS) * (elapsed / 7);
  const weekSpent = rows.reduce((s, r) => s + r.now, 0);
  const before = rows.reduce((s, r) => s + r.before, 0);
  const top = [...rows].sort((a, b) => b.now - a.now)[0];
  return {
    weekSpent,
    usualWeek: before > 0 ? prorate(before) : null,
    topCategory: top && top.now > 0 ? { id: top.id, name: top.name, spent: top.now, usual: prorate(top.before) } : null,
  };
};

/** Recomputes and reschedules the weekly summary and budget alerts. Safe to call on every app foreground. */
export const refreshInsightNotifications = async (db: QueryDb = askDb): Promise<void> => {
  const { digestEnabled, alertsEnabled, budgetPeriod, currency } = useSettingsStore.getState();
  try {
    await Notifications.cancelScheduledNotificationAsync(DIGEST_ID).catch(() => {});
    if (!digestEnabled && !alertsEnabled) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const today = new Date();
    const money = moneyFor(currency);
    const forecast = await getForecastFrom(db, today, budgetPeriod);

    if (digestEnabled) {
      const digest = buildDigest(
        { ...(await loadWeekStats(db, today)), forecast, asOf: format(today, 'EEE'), periodLabel: budgetPeriod === 'weekly' ? 'this week' : 'this month' },
        money,
      );
      await Notifications.scheduleNotificationAsync({
        identifier: DIGEST_ID,
        content: { ...digest, data: { url: '/Review' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: DIGEST_WEEKDAY, hour: DIGEST_HOUR, minute: 0 },
      });
    }

    if (alertsEnabled && forecast.status === 'ok') {
      const periodKey = forecast.period.from;
      const stored: string[] = JSON.parse((await AsyncStorage.getItem(SENT_KEY)) ?? '[]');
      const sent = new Set(stored.filter((k) => k.startsWith(`${periodKey}:`)));
      const alerts = overspendAlerts(forecast, sent, periodKey, money);
      for (const alert of alerts) {
        await Notifications.scheduleNotificationAsync({ content: { title: alert.title, body: alert.body }, trigger: null });
        sent.add(alert.key);
      }
      await AsyncStorage.setItem(SENT_KEY, JSON.stringify([...sent]));
    }
  } catch (error) {
    console.warn('[Insights] notification refresh failed:', error);
  }
};
