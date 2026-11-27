import { addDays, format, getDate, getDay, isBefore, parseISO } from 'date-fns';

export interface SubscriptionLike {
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  is_active: boolean;
}

/** Charge dates in [from, to], using the same rules as subscriptionStore's generator (no month-end clamping). */
export const subscriptionChargesBetween = (
  sub: SubscriptionLike,
  from: string,
  to: string,
  skips: Set<string>,
): { date: string; amount: number }[] => {
  if (!sub.is_active) return [];
  const start = parseISO(sub.start_date);
  const out: { date: string; amount: number }[] = [];
  for (let d = parseISO(from); format(d, 'yyyy-MM-dd') <= to; d = addDays(d, 1)) {
    if (isBefore(d, start)) continue;
    const hit =
      sub.frequency === 'daily' ||
      (sub.frequency === 'weekly' && getDay(d) === getDay(start)) ||
      (sub.frequency === 'monthly' && getDate(d) === getDate(start));
    const date = format(d, 'yyyy-MM-dd');
    if (hit && !skips.has(date)) out.push({ date, amount: sub.amount });
  }
  return out;
};
