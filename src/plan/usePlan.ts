import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { addDays, format } from 'date-fns';
import { useSettingsStore } from '../store/settingsStore';
import { getCategoriesWithSpending, getGoals, getSubscriptions, getSubscriptionSkips, Goal } from '../database';
import { resolveRange } from '../ai/ask/range';
import { subscriptionChargesBetween } from '../ai/forecast/subscriptions';
import { CategoryWithSpending } from '../types';

export interface UpcomingCharge { key: string; name: string; date: string; amount: number; categoryId: number }

const UPCOMING_DAYS = 14;
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Budgets for the current period, goals, and subscription charges in the next two weeks. Reloads on focus. */
export const usePlan = () => {
  const budgetPeriod = useSettingsStore((s) => s.budgetPeriod);
  const [data, setData] = useState<{
    period: { from: string; to: string; label: string };
    categories: CategoryWithSpending[];
    goals: Goal[];
    upcoming: UpcomingCharge[];
  } | null>(null);

  const load = useCallback(async () => {
    const now = new Date();
    const period = resolveRange({ preset: budgetPeriod === 'weekly' ? 'this_week' : 'this_month' }, now);
    const [categories, goals, subs] = await Promise.all([getCategoriesWithSpending(period.from, period.to), getGoals(), getSubscriptions()]);
    const from = iso(addDays(now, 1));
    const to = iso(addDays(now, UPCOMING_DAYS));
    const upcoming = (await Promise.all(subs.map(async (s) => {
      const skips = new Set((await getSubscriptionSkips(s.id)).map((k) => k.skip_date));
      return subscriptionChargesBetween({ ...s, is_active: Boolean(s.is_active) }, from, to, skips)
        .map((ch) => ({ key: `${s.id}-${ch.date}`, name: s.name, date: ch.date, amount: ch.amount, categoryId: s.category_id }));
    }))).flat().sort((a, b) => a.date.localeCompare(b.date));
    setData({ period, categories, goals, upcoming });
  }, [budgetPeriod]);

  useFocusEffect(useCallback(() => { load().catch((e) => console.warn('[Plan] load failed:', e)); }, [load]));
  return data;
};
