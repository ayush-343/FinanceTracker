import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface PaceInput {
  budget: number;
  spentBeforeToday: number;
  spentToday: number;
  periodEnd: string;
  today: string;
}

export interface Pace {
  status: 'noBudget' | 'onPace' | 'pastPace';
  allowanceToday: number;
  leftToday: number;
  daysLeft: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What is left to spend today if the rest of the budget is spread evenly over the remaining days. */
export const computePace = ({ budget, spentBeforeToday, spentToday, periodEnd, today }: PaceInput): Pace => {
  const daysLeft = Math.max(1, differenceInCalendarDays(parseISO(periodEnd), parseISO(today)) + 1);
  if (budget <= 0) return { status: 'noBudget', allowanceToday: 0, leftToday: 0, daysLeft };
  const remaining = budget - spentBeforeToday;
  const allowanceToday = round2(Math.max(0, remaining) / daysLeft);
  const leftToday = round2(allowanceToday - spentToday);
  const status = remaining <= 0 || leftToday < 0 ? 'pastPace' : 'onPace';
  return { status, allowanceToday, leftToday, daysLeft };
};
