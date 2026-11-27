import { addDays, differenceInCalendarDays, format, getDay, parseISO, subDays } from 'date-fns';

export interface ForecastInput {
  today: string;
  period: { from: string; to: string };
  earliestTransaction: string | null;
  categories: { id: number; name: string; color: string; budget: number }[];
  /** Non-subscription spend per day and category, from 56 days before the period start through today. */
  daily: { date: string; categoryId: number; amount: number }[];
  /** All spend (including subscriptions) from period start through today. */
  spentSoFar: Record<number, number>;
  /** Scheduled subscription charges after today through period end. */
  upcomingSubscriptions: { date: string; categoryId: number; amount: number }[];
}

export interface CategoryForecast {
  categoryId: number;
  name: string;
  color: string;
  spent: number;
  likely: number;
  low: number;
  high: number;
  budget: number;
  overOn: string | null;
}

export type Forecast =
  | { status: 'insufficient' }
  | {
      status: 'ok';
      period: { from: string; to: string };
      total: { spent: number; likely: number; low: number; high: number; budget: number };
      categories: CategoryForecast[];
    };

const MIN_HISTORY_DAYS = 21;
const LOOKBACK_DAYS = 56;
const BAND_LOW = 0.7;
const BAND_HIGH = 1.3;
const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Deterministic projection of spending to the end of the budget period, per category. */
export const computeForecast = (input: ForecastInput): Forecast => {
  const today = parseISO(input.today);
  if (!input.earliestTransaction || differenceInCalendarDays(today, parseISO(input.earliestTransaction)) < MIN_HISTORY_DAYS) {
    return { status: 'insufficient' };
  }

  const periodStart = parseISO(input.period.from);
  const elapsedDays = differenceInCalendarDays(today, periodStart) + 1;
  const remaining: string[] = [];
  for (let d = addDays(today, 1); iso(d) <= input.period.to; d = addDays(d, 1)) remaining.push(iso(d));

  const lookbackFrom = iso(subDays(today, LOOKBACK_DAYS));
  const earliest = input.earliestTransaction;
  // How many of each weekday the lookback window contains (on or after the first transaction).
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
  for (let d = subDays(today, LOOKBACK_DAYS); iso(d) < input.today; d = addDays(d, 1)) {
    if (iso(d) >= earliest) weekdayCount[getDay(d)]++;
  }

  const categories: CategoryForecast[] = input.categories.map((cat) => {
    const rows = input.daily.filter((r) => r.categoryId === cat.id);
    const periodVariable = rows.filter((r) => r.date >= input.period.from && r.date <= input.today).reduce((s, r) => s + r.amount, 0);
    const currentRate = periodVariable / elapsedDays;
    const weekdaySum = [0, 0, 0, 0, 0, 0, 0];
    for (const r of rows) if (r.date >= lookbackFrom && r.date < input.today) weekdaySum[getDay(parseISO(r.date))] += r.amount;

    const subsByDay = new Map<string, number>();
    for (const s of input.upcomingSubscriptions) if (s.categoryId === cat.id) subsByDay.set(s.date, (subsByDay.get(s.date) ?? 0) + s.amount);

    const spent = round2(input.spentSoFar[cat.id] ?? 0);
    let variable = 0;
    let subs = 0;
    let running = spent;
    let overOn: string | null = cat.budget > 0 && spent > cat.budget ? input.today : null;
    for (const date of remaining) {
      const wd = getDay(parseISO(date));
      const weekdayAvg = weekdayCount[wd] ? weekdaySum[wd] / weekdayCount[wd] : currentRate;
      const expected = 0.5 * currentRate + 0.5 * weekdayAvg;
      const sub = subsByDay.get(date) ?? 0;
      variable += expected;
      subs += sub;
      running += expected + sub;
      if (!overOn && cat.budget > 0 && running > cat.budget) overOn = date;
    }

    return {
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      spent,
      likely: round2(spent + variable + subs),
      low: round2(spent + BAND_LOW * variable + subs),
      high: round2(spent + BAND_HIGH * variable + subs),
      budget: cat.budget,
      overOn,
    };
  });

  const risk = (c: CategoryForecast) => (c.budget > 0 ? c.likely / c.budget : 0);
  categories.sort((a, b) => risk(b) - risk(a) || b.likely - a.likely);

  const sum = (k: 'spent' | 'likely' | 'low' | 'high' | 'budget') => round2(categories.reduce((s, c) => s + c[k], 0));
  return {
    status: 'ok',
    period: input.period,
    total: { spent: sum('spent'), likely: sum('likely'), low: sum('low'), high: sum('high'), budget: sum('budget') },
    categories,
  };
};
