import { TransactionWithDetails } from '../types';

/** The name a purchase is shown under: merchant, then item, then note, then its category. */
export const feedLabel = (t: TransactionWithDetails): string =>
  (t.merchant || t.item_name || t.notes || t.category_name || '').trim() || t.category_name;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Purchases grouped by day, newest day first; inside a day, newest entry first. */
export const groupByDay = (txs: TransactionWithDetails[]) => {
  const byDate = new Map<string, TransactionWithDetails[]>();
  for (const t of txs) byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      total: round2(items.reduce((s, t) => s + t.amount, 0)),
      items: [...items].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id - a.id),
    }));
};

export interface FeedFilter { query?: string; categoryId?: number | null; day?: string | null }

/** Case-insensitive search over merchant, item, notes and category, plus category and day filters. */
export const filterFeed = (txs: TransactionWithDetails[], f: FeedFilter): TransactionWithDetails[] => {
  const q = (f.query ?? '').trim().toLowerCase();
  return txs.filter((t) => {
    if (f.categoryId != null && t.category_id !== f.categoryId) return false;
    if (f.day && t.date !== f.day) return false;
    if (!q) return true;
    return [t.merchant, t.item_name, t.notes, t.category_name, t.subcategory_name].some((v) => v?.toLowerCase().includes(q));
  });
};

/** Each category's share of the total, largest first; categories with no spend are left out. */
export const categoryShares = (txs: TransactionWithDetails[]) => {
  const totals = new Map<number, { name: string; total: number }>();
  for (const t of txs) {
    const cur = totals.get(t.category_id) ?? { name: t.category_name, total: 0 };
    cur.total += t.amount;
    totals.set(t.category_id, cur);
  }
  const sum = [...totals.values()].reduce((s, v) => s + v.total, 0);
  return [...totals.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([categoryId, v]) => ({ categoryId, name: v.name, total: round2(v.total), share: sum > 0 ? v.total / sum : 0 }))
    .sort((a, b) => b.total - a.total);
};
