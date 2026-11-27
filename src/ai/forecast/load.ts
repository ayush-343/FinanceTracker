import { addDays, format, parseISO, subDays } from 'date-fns';
import { QueryDb } from '../ask/execute';
import { resolveRange } from '../ask/range';
import { computeForecast, Forecast, ForecastInput } from './forecast';
import { subscriptionChargesBetween, SubscriptionLike } from './subscriptions';

const LOOKBACK_DAYS = 56;
const NOT_SUBSCRIPTION = "COALESCE(notes, '') NOT LIKE 'Subscription:%'";

/** Reads everything the forecaster needs for the current budget period. */
export const loadForecastInput = async (db: QueryDb, today: Date, budgetPeriod: 'weekly' | 'monthly'): Promise<ForecastInput> => {
  const todayISO = format(today, 'yyyy-MM-dd');
  const { from, to } = resolveRange({ preset: budgetPeriod === 'weekly' ? 'this_week' : 'this_month' }, today);
  const lookback = format(subDays(today, LOOKBACK_DAYS), 'yyyy-MM-dd');
  const dailyFrom = lookback < from ? lookback : from;

  const [categories, [earliest], daily, spent, subs, skips] = await Promise.all([
    db.getAllAsync<{ id: number; name: string; color: string; budget: number }>(
      'SELECT id, name, color, budget_limit AS budget FROM categories', []),
    db.getAllAsync<{ d: string | null }>('SELECT MIN(date) AS d FROM transactions', []),
    db.getAllAsync<{ date: string; categoryId: number; amount: number }>(
      `SELECT date, category_id AS categoryId, SUM(amount) AS amount FROM transactions
       WHERE date >= ? AND date <= ? AND ${NOT_SUBSCRIPTION} GROUP BY date, category_id`, [dailyFrom, todayISO]),
    db.getAllAsync<{ categoryId: number; total: number }>(
      `SELECT category_id AS categoryId, SUM(amount) AS total FROM transactions
       WHERE date >= ? AND date <= ? GROUP BY category_id`, [from, todayISO]),
    db.getAllAsync<SubscriptionLike & { id: number; category_id: number }>(
      'SELECT id, amount, frequency, start_date, category_id, is_active FROM subscriptions', []),
    db.getAllAsync<{ subscription_id: number; skip_date: string }>('SELECT subscription_id, skip_date FROM subscription_skips', []),
  ]);

  const tomorrow = format(addDays(parseISO(todayISO), 1), 'yyyy-MM-dd');
  const upcomingSubscriptions = subs.flatMap((s) => {
    const skipSet = new Set(skips.filter((k) => k.subscription_id === s.id).map((k) => k.skip_date));
    return subscriptionChargesBetween({ ...s, is_active: Boolean(s.is_active) }, tomorrow, to, skipSet)
      .map((c) => ({ date: c.date, categoryId: s.category_id, amount: c.amount }));
  });

  return {
    today: todayISO,
    period: { from, to },
    earliestTransaction: earliest?.d ?? null,
    categories,
    daily,
    spentSoFar: Object.fromEntries(spent.map((r) => [r.categoryId, Math.round(r.total * 100) / 100])),
    upcomingSubscriptions,
  };
};

export const getForecastFrom = async (db: QueryDb, today: Date, budgetPeriod: 'weekly' | 'monthly'): Promise<Forecast> =>
  computeForecast(await loadForecastInput(db, today, budgetPeriod));
