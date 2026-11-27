import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { useSettingsStore } from '../store/settingsStore';
import { getCategoriesWithSpending, getTransactions, loadDrawnDays, markNothingSpent } from '../database';
import { resolveRange } from '../ai/ask/range';
import { CategoryWithSpending, TransactionWithDetails } from '../types';
import { buildMonthKolam, KolamCell } from './kolamGrid';
import { computePace, Pace } from './pace';

export interface TodayData {
  todayISO: string;
  monthLabel: string;
  kolam: { cells: KolamCell[]; rows: number; drawn: number; elapsed: number };
  pace: Pace;
  budget: number;
  periodSpent: number;
  /** Fraction of the budget period elapsed, including today. */
  periodElapsed: number;
  categories: CategoryWithSpending[];
  recent: TransactionWithDetails[];
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Everything the Today screen shows, reloaded whenever the tab gains focus. */
export const useToday = () => {
  const budgetPeriod = useSettingsStore((s) => s.budgetPeriod);
  const [data, setData] = useState<TodayData | null>(null);

  const load = useCallback(async () => {
    const now = new Date();
    const todayISO = iso(now);
    const period = resolveRange({ preset: budgetPeriod === 'weekly' ? 'this_week' : 'this_month' }, now);
    const [drawn, categories, todayCats, recent] = await Promise.all([
      loadDrawnDays(iso(startOfMonth(now)), iso(endOfMonth(now))),
      getCategoriesWithSpending(period.from, todayISO),
      getCategoriesWithSpending(todayISO, todayISO),
      getTransactions(iso(subDays(now, 1)), todayISO),
    ]);
    const budget = categories.reduce((s, c) => s + (c.budget_limit || 0), 0);
    const periodSpent = categories.reduce((s, c) => s + c.spent, 0);
    const spentToday = todayCats.reduce((s, c) => s + c.spent, 0);
    const totalDays = (new Date(`${period.to}T00:00:00`).getTime() - new Date(`${period.from}T00:00:00`).getTime()) / 86400000 + 1;
    const elapsedDays = (new Date(`${todayISO}T00:00:00`).getTime() - new Date(`${period.from}T00:00:00`).getTime()) / 86400000 + 1;
    setData({
      todayISO,
      monthLabel: format(now, 'MMMM'),
      kolam: buildMonthKolam(now.getFullYear(), now.getMonth(), drawn, todayISO),
      pace: computePace({ budget, spentBeforeToday: periodSpent - spentToday, spentToday, periodEnd: period.to, today: todayISO }),
      budget,
      periodSpent,
      periodElapsed: Math.min(1, elapsedDays / totalDays),
      categories,
      recent: [...recent].sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at)),
    });
  }, [budgetPeriod]);

  useFocusEffect(useCallback(() => { load().catch((e) => console.warn('[Today] load failed:', e)); }, [load]));

  const nothingSpentToday = useCallback(async () => {
    await markNothingSpent(iso(new Date()));
    await load();
  }, [load]);

  return { data, reload: load, nothingSpentToday };
};
