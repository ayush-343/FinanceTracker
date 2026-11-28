import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { DraftTransaction } from '../schemas';
import { PreParsed } from './preParse';

export interface QuickLogResult {
  amount: number | null;
  date: string;
  merchant: string | null;
  item: string | null;
  categoryHint: string | null;
}

const MAX_DATE_DRIFT_DAYS = 366;

/** Combines the deterministic parse with the model's draft. Amounts the user never typed are discarded. */
export const mergeDraft = (pre: PreParsed, model: DraftTransaction | null): QuickLogResult => {
  if (!model) return { amount: pre.amount, date: pre.date, merchant: pre.merchant, item: pre.item, categoryHint: null };

  const modelAmount = model.amount != null && pre.amountsInText.includes(model.amount) ? model.amount : null;

  let date = pre.date;
  if (!pre.dateFound && model.date && /^\d{4}-\d{2}-\d{2}$/.test(model.date)) {
    const parsed = parseISO(model.date);
    if (isValid(parsed) && Math.abs(differenceInCalendarDays(parsed, parseISO(pre.date))) <= MAX_DATE_DRIFT_DAYS) date = model.date;
  }

  return {
    amount: pre.amount ?? modelAmount,
    date,
    merchant: model.merchant ?? pre.merchant,
    item: model.item ?? pre.item,
    categoryHint: model.categoryHint,
  };
};
