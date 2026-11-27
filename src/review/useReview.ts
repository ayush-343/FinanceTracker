import { useEffect, useState } from 'react';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { useSettingsStore } from '../store/settingsStore';
import { askDb } from '../ai/ask/db';
import { getForecastFrom } from '../ai/forecast/load';
import { subscriptionChargesBetween } from '../ai/forecast/subscriptions';
import { loadWeekStats } from '../services/insightNotifications';
import { getGoals, getSubscriptions, getSubscriptionSkips, loadDrawnDays, loadFirstDay } from '../database';
import { KolamCell } from '../today/kolamGrid';
import { ReviewInput } from './cards';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const WEEK = { weekStartsOn: 1 as const };

/** Everything the weekly review shows, plus the week's row of loops. */
export const useReview = () => {
  const budgetPeriod = useSettingsStore((s) => s.budgetPeriod);
  const [data, setData] = useState<{ input: ReviewInput; cells: KolamCell[] } | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const todayISO = iso(now);
      const start = startOfWeek(now, WEEK);
      const end = endOfWeek(now, WEEK);
      const [stats, forecast, drawnSet, goals, subs, firstDay] = await Promise.all([
        loadWeekStats(askDb, now), getForecastFrom(askDb, now, budgetPeriod), loadDrawnDays(iso(start), iso(end)), getGoals(), getSubscriptions(), loadFirstDay(),
      ]);
      const startISO = firstDay ?? todayISO;
      const cells: KolamCell[] = Array.from({ length: 7 }, (_, i) => {
        const d = iso(addDays(start, i));
        const logged = drawnSet.has(d);
        const state = d < startISO && !logged ? 'before'
          : d < todayISO ? (logged ? 'drawn' : 'skipped') : d === todayISO ? (logged ? 'today-drawn' : 'today-open') : 'future';
        return { day: Number(format(addDays(start, i), 'd')), iso: d, col: i, row: 0, state };
      });
      const elapsed = cells.filter((x) => x.iso <= todayISO && x.state !== 'before').length;
      const drawn = cells.filter((x) => x.iso <= todayISO && drawnSet.has(x.iso)).length;
      const from = iso(addDays(now, 1));
      const to = iso(addDays(now, 7));
      const upcoming = (await Promise.all(subs.map(async (s) => {
        const skips = new Set((await getSubscriptionSkips(s.id)).map((k) => k.skip_date));
        return subscriptionChargesBetween({ ...s, is_active: Boolean(s.is_active) }, from, to, skips).map((ch) => ({ name: s.name, date: ch.date, amount: ch.amount }));
      }))).flat().sort((a, b) => a.date.localeCompare(b.date));
      setData({
        cells,
        input: {
          weekLabel: `${format(start, 'd')}–${format(end, 'd MMM')}`,
          drawn, elapsed,
          weekSpent: stats.weekSpent, usualWeek: stats.usualWeek, top: stats.topCategory,
          forecast, periodLabel: budgetPeriod === 'weekly' ? 'this week' : 'this month',
          upcoming, goalCount: goals.length,
        },
      });
    })().catch((e) => console.warn('[Review] load failed:', e));
  }, [budgetPeriod]);

  return data;
};
