import {
  endOfMonth, endOfWeek, endOfYear, format, isAfter, parseISO, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks,
} from 'date-fns';

export type RangePreset =
  | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_7_days' | 'last_30_days';

export type RangeInput = { preset: RangePreset } | { from: string; to: string };

export interface ResolvedRange { from: string; to: string; label: string }

const WEEK = { weekStartsOn: 1 as const };
const day = (d: Date) => format(d, 'yyyy-MM-dd');

/** Turns a preset or explicit range into inclusive yyyy-MM-dd bounds plus a human label. */
export const resolveRange = (range: RangeInput, today: Date): ResolvedRange => {
  if ('from' in range) {
    let a = parseISO(range.from);
    let b = parseISO(range.to);
    if (isAfter(a, b)) [a, b] = [b, a];
    return { from: day(a), to: day(b), label: `${format(a, 'd MMM')}–${format(b, 'd MMM yyyy')}` };
  }
  switch (range.preset) {
    case 'today': return { from: day(today), to: day(today), label: 'today' };
    case 'yesterday': { const y = subDays(today, 1); return { from: day(y), to: day(y), label: 'yesterday' }; }
    case 'this_week': return { from: day(startOfWeek(today, WEEK)), to: day(endOfWeek(today, WEEK)), label: 'this week' };
    case 'last_week': {
      const w = subWeeks(today, 1);
      return { from: day(startOfWeek(w, WEEK)), to: day(endOfWeek(w, WEEK)), label: 'last week' };
    }
    case 'this_month': return { from: day(startOfMonth(today)), to: day(endOfMonth(today)), label: 'this month' };
    case 'last_month': {
      const m = subMonths(today, 1);
      return { from: day(startOfMonth(m)), to: day(endOfMonth(m)), label: `last month (${format(m, 'MMM yyyy')})` };
    }
    case 'this_year': return { from: day(startOfYear(today)), to: day(endOfYear(today)), label: `this year (${format(today, 'yyyy')})` };
    case 'last_7_days': return { from: day(subDays(today, 6)), to: day(today), label: 'the last 7 days' };
    case 'last_30_days': return { from: day(subDays(today, 29)), to: day(today), label: 'the last 30 days' };
  }
};
