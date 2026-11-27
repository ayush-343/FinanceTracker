import { differenceInCalendarMonths, format, parseISO } from 'date-fns';

export interface GoalLike { target: number; saved: number; target_date: string | null }

export interface GoalPlan {
  progress: number;
  remaining: number;
  monthsLeft: number | null;
  perMonth: number | null;
  status: 'reached' | 'onTrack' | 'noDate' | 'overdue';
  line: string;
}

/** Plain arithmetic for a savings goal: what's left and what a month needs. Never shames a missed date. */
export const goalPlan = (goal: GoalLike, todayISO: string, money: (n: number) => string): GoalPlan => {
  const remaining = Math.max(0, Math.round((goal.target - goal.saved) * 100) / 100);
  const progress = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 1;
  if (remaining === 0) return { progress: 1, remaining: 0, monthsLeft: null, perMonth: 0, status: 'reached', line: 'Reached. Nice work.' };
  if (!goal.target_date) return { progress, remaining, monthsLeft: null, perMonth: null, status: 'noDate', line: `${money(remaining)} to go` };
  if (goal.target_date < todayISO) {
    return { progress, remaining, monthsLeft: 0, perMonth: null, status: 'overdue', line: `${money(remaining)} to go · pick a new date?` };
  }
  const monthsLeft = Math.max(1, differenceInCalendarMonths(parseISO(goal.target_date), parseISO(todayISO)) + 1);
  const perMonth = Math.ceil(remaining / monthsLeft);
  return {
    progress, remaining, monthsLeft, perMonth, status: 'onTrack',
    line: `${money(perMonth)} a month gets you there by ${format(parseISO(goal.target_date), 'd MMM')}`,
  };
};
