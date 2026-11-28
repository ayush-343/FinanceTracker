import { format, parseISO } from 'date-fns';

export interface Draft {
  amount: string;
  what: string;
  merchant: string | null;
  date: string;
  categoryId: number | null;
  subcategoryId: number | null;
  categorySource: 'learned' | 'model' | 'user' | null;
  note: string;
}

export type Touched = Partial<Record<'amount' | 'what' | 'date' | 'category', boolean>>;

export const emptyDraft = (todayISO: string): Draft => ({
  amount: '', what: '', merchant: null, date: todayISO, categoryId: null, subcategoryId: null, categorySource: null, note: '',
});

/** Reads a typed amount ("1,250.50", "₹ 99"); null when empty, invalid or not positive. */
export const parseAmountInput = (s: string): number | null => {
  const cleaned = s.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Applies a parse result to the fields the user has not edited by hand. */
export const applyParse = (
  draft: Draft,
  parsed: { amount: number | null; item: string | null; merchant: string | null; date: string },
  touched: Touched,
): Draft => ({
  ...draft,
  amount: touched.amount ? draft.amount : parsed.amount != null ? String(parsed.amount) : '',
  what: touched.what ? draft.what : parsed.item ?? parsed.merchant ?? '',
  merchant: parsed.merchant,
  date: touched.date ? draft.date : parsed.date,
});

/** "Save · closes Friday's loop" when saving draws an open, non-future day's loop. */
export const saveLabel = (dateISO: string, todayISO: string, drawn: Set<string>): string =>
  dateISO <= todayISO && !drawn.has(dateISO) ? `Save · closes ${format(parseISO(dateISO), 'EEEE')}'s loop` : 'Save';
