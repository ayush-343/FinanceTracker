import { differenceInCalendarDays, parseISO } from 'date-fns';
import { normalizeKey, tokens } from '../categorizer';

export interface TxLite {
  id: number;
  amount: number;
  date: string;
  createdAt: string;
  categoryId: number;
  /** merchant ?? item name ?? notes */
  label: string;
}

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const UNUSUAL_MULTIPLIER = 3;
const UNUSUAL_MIN_AMOUNT = 500;
const UNUSUAL_MIN_HISTORY = 5;
const SUB_MIN_COUNT = 3;
const SUB_AMOUNT_TOLERANCE = 0.05;
const GAPS = { weekly: [6, 8], monthly: [27, 33] } as const;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const near = (a: number, b: number) => Math.abs(a - b) <= SUB_AMOUNT_TOLERANCE * b;

/** Same amount and same normalized label, entered within the last 10 minutes. */
export const detectDuplicate = (candidate: { amount: number; label: string; now: string }, recent: TxLite[]): TxLite | null => {
  const key = normalizeKey(candidate.label);
  if (!key) return null;
  const now = Date.parse(candidate.now);
  return recent.find((t) =>
    t.amount === candidate.amount &&
    normalizeKey(t.label) === key &&
    Math.abs(now - Date.parse(t.createdAt)) <= DUPLICATE_WINDOW_MS,
  ) ?? null;
};

/** More than 3× the category's median purchase (and at least 500), given 5+ past purchases. */
export const detectUnusual = (candidate: { amount: number; categoryId: number }, history: TxLite[]): { median: number } | null => {
  const amounts = history.filter((t) => t.categoryId === candidate.categoryId).map((t) => t.amount);
  if (amounts.length < UNUSUAL_MIN_HISTORY || candidate.amount < UNUSUAL_MIN_AMOUNT) return null;
  const m = median(amounts);
  return candidate.amount > UNUSUAL_MULTIPLIER * m ? { median: m } : null;
};

export interface SubscriptionCandidate {
  key: string;
  label: string;
  amount: number;
  frequency: 'weekly' | 'monthly';
  categoryId: number;
  count: number;
}

/** Repeat payments (3+, similar amount, regular weekly or monthly gaps) that aren't tracked or dismissed. */
export const detectSubscriptionCandidates = (
  history: TxLite[],
  tracked: { name: string; amount: number }[],
  dismissed: Set<string>,
): SubscriptionCandidate[] => {
  const groups = new Map<string, TxLite[]>();
  for (const t of history) {
    const key = normalizeKey(t.label);
    if (key) groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const out: SubscriptionCandidate[] = [];
  for (const [label, txs] of groups) {
    if (txs.length < SUB_MIN_COUNT) continue;
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const m = median(sorted.map((t) => t.amount));
    if (!sorted.every((t) => near(t.amount, m))) continue;
    const gaps = sorted.slice(1).map((t, i) => differenceInCalendarDays(parseISO(t.date), parseISO(sorted[i].date)));
    const frequency = (['weekly', 'monthly'] as const).find((f) => gaps.every((g) => g >= GAPS[f][0] && g <= GAPS[f][1]));
    if (!frequency) continue;

    const key = `${label}|${frequency}`;
    if (dismissed.has(key)) continue;
    const labelTokens = tokens(label);
    const isTracked = tracked.some((s) => {
      const name = normalizeKey(s.name);
      if (name === label) return true;
      const shared = [...tokens(name)].some((tok) => labelTokens.has(tok));
      return shared && near(s.amount, m);
    });
    if (isTracked) continue;

    const last = sorted[sorted.length - 1];
    out.push({ key, label: last.label, amount: last.amount, frequency, categoryId: last.categoryId, count: sorted.length });
  }
  return out;
};
