import { format, parseISO } from 'date-fns';
import type { Forecast } from '../forecast/forecast';

const NOTABLE_INCREASE = 0.1;

export interface DigestInput {
  weekSpent: number;
  usualWeek: number | null;
  topCategory: { name: string; spent: number; usual: number } | null;
  forecast: Forecast;
  /** Weekday name the numbers were computed on, e.g. "Thu". */
  asOf: string;
  periodLabel: string;
}

const pctChange = (now: number, usual: number) => Math.round((now / usual - 1) * 100);

/** Weekly summary notification text. Every clause is optional and computed, never model-written. */
export const buildDigest = (input: DigestInput, money: (n: number) => string): { title: string; body: string } => {
  let first = `${money(input.weekSpent)} spent (as of ${input.asOf})`;
  if (input.usualWeek && input.usualWeek > 0 && input.weekSpent !== input.usualWeek) {
    const change = pctChange(input.weekSpent, input.usualWeek);
    if (change !== 0) first += `, ${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than a usual week`;
  }
  const parts = [`${first}.`];

  const top = input.topCategory;
  if (top && top.usual > 0 && top.spent > top.usual * (1 + NOTABLE_INCREASE)) {
    parts.push(`${top.name} is up ${pctChange(top.spent, top.usual)}% on your usual.`);
  }
  if (input.forecast.status === 'ok') {
    parts.push(`On pace for ${money(input.forecast.total.low)}–${money(input.forecast.total.high)} ${input.periodLabel}.`);
  }
  return { title: 'Your week so far', body: parts.join(' ') };
};

/** Budget-at-risk notifications, one per category per period (keys already sent are skipped). */
export const overspendAlerts = (
  forecast: Forecast,
  alreadySent: Set<string>,
  periodKey: string,
  money: (n: number) => string,
): { key: string; title: string; body: string }[] => {
  if (forecast.status !== 'ok') return [];
  return forecast.categories
    .filter((c) => c.overOn && !alreadySent.has(`${periodKey}:${c.categoryId}`))
    .map((c) => ({
      key: `${periodKey}:${c.categoryId}`,
      title: `${c.name} budget at risk`,
      body: `${c.name} is on pace for ${money(c.likely)} against a ${money(c.budget)} budget — likely over around ${format(parseISO(c.overOn!), 'd MMM')}.`,
    }));
};
