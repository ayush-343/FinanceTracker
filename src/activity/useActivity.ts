import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { getCategories, getTransactions, loadDrawnDays } from '../database';
import { Category, TransactionWithDetails } from '../types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** One month of purchases, all categories (for stable hues) and the month's drawn days. Reloads on focus. */
export const useActivity = (month: Date) => {
  const [txs, setTxs] = useState<TransactionWithDetails[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drawn, setDrawn] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const from = iso(startOfMonth(month));
    const to = iso(endOfMonth(month));
    const [t, cats, days] = await Promise.all([getTransactions(from, to), getCategories(), loadDrawnDays(from, to)]);
    setTxs(t);
    setCategories(cats);
    setDrawn(days);
  }, [month]);

  useFocusEffect(useCallback(() => { load().catch((e) => console.warn('[Activity] load failed:', e)); }, [load]));

  return { txs, categories, drawn };
};
