import { ResolvedPlan } from './plan';

export interface QueryDb {
  getAllAsync<T>(sql: string, params: (string | number)[]): Promise<T[]>;
}

export type AskResult =
  | { kind: 'total'; value: number; count: number; label: string }
  | { kind: 'breakdown'; rows: { label: string; value: number; color?: string }[]; total: number; label: string }
  | { kind: 'compare'; a: { label: string; value: number }; b: { label: string; value: number }; diff: number; pct: number | null }
  | { kind: 'list'; rows: { id: number; date: string; label: string; category: string; color: string; amount: number }[]; label: string }
  | { kind: 'budget'; rows: { category: string; color: string; spent: number; limit: number; pct: number }[]; label: string }
  | { kind: 'unsupported'; reason: string };

const FROM = 'FROM transactions t JOIN categories c ON c.id = t.category_id LEFT JOIN items i ON i.id = t.item_id';
const LABEL = "COALESCE(t.merchant, i.name, NULLIF(t.notes, ''), c.name)";
const SEARCH = "LOWER(COALESCE(t.merchant, '') || ' ' || COALESCE(i.name, '') || ' ' || COALESCE(t.notes, ''))";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** WHERE clause for a date range plus optional filters; every value is a bound parameter. */
const where = (
  range: { from: string; to: string },
  filters: { categoryIds?: number[]; merchant?: string; minAmount?: number } = {},
): { sql: string; params: (string | number)[] } => {
  const parts = ['t.date >= ?', 't.date <= ?'];
  const params: (string | number)[] = [range.from, range.to];
  if (filters.categoryIds?.length) {
    parts.push(`t.category_id IN (${filters.categoryIds.map(() => '?').join(', ')})`);
    params.push(...filters.categoryIds);
  }
  if (filters.merchant) {
    parts.push(`${SEARCH} LIKE ?`);
    params.push(`%${filters.merchant.toLowerCase()}%`);
  }
  if (filters.minAmount != null) {
    parts.push('t.amount >= ?');
    params.push(filters.minAmount);
  }
  return { sql: `WHERE ${parts.join(' AND ')}`, params };
};

const sumFor = async (db: QueryDb, range: { from: string; to: string }, filters: Parameters<typeof where>[1]) => {
  const w = where(range, filters);
  const [row] = await db.getAllAsync<{ total: number; count: number }>(
    `SELECT COALESCE(SUM(t.amount), 0) AS total, COUNT(t.id) AS count ${FROM} ${w.sql}`, w.params,
  );
  return { total: round2(row?.total ?? 0), count: row?.count ?? 0 };
};

/** Computes the answer for a resolved plan. This is the only place answer numbers come from. */
export const executePlan = async (plan: ResolvedPlan, db: QueryDb): Promise<AskResult> => {
  switch (plan.type) {
    case 'total': {
      const { total, count } = await sumFor(db, plan.range, { categoryIds: plan.categoryIds, merchant: plan.merchant });
      return { kind: 'total', value: total, count, label: plan.range.label };
    }
    case 'breakdown': {
      const w = where(plan.range);
      const group = {
        category: { key: 'c.id', label: 'c.name', color: 'c.color' },
        merchant: { key: LABEL, label: LABEL, color: 'NULL' },
        day: { key: 't.date', label: 't.date', color: 'NULL' },
        month: { key: 'substr(t.date, 1, 7)', label: 'substr(t.date, 1, 7)', color: 'NULL' },
      }[plan.by];
      const rows = await db.getAllAsync<{ label: string; value: number; color: string | null }>(
        `SELECT ${group.label} AS label, SUM(t.amount) AS value, ${group.color} AS color ${FROM} ${w.sql}
         GROUP BY ${group.key} ORDER BY value DESC LIMIT ?`,
        [...w.params, plan.limit],
      );
      const { total } = await sumFor(db, plan.range, {});
      return {
        kind: 'breakdown',
        total,
        label: plan.range.label,
        rows: rows.map((r) => ({ label: r.label, value: round2(r.value), ...(r.color ? { color: r.color } : {}) })),
      };
    }
    case 'compare': {
      const a = await sumFor(db, plan.rangeA, { categoryIds: plan.categoryIds });
      const b = await sumFor(db, plan.rangeB, { categoryIds: plan.categoryIds });
      const diff = round2(b.total - a.total);
      return {
        kind: 'compare',
        a: { label: plan.rangeA.label, value: a.total },
        b: { label: plan.rangeB.label, value: b.total },
        diff,
        pct: a.total === 0 ? null : round2((diff / a.total) * 100),
      };
    }
    case 'list': {
      const w = where(plan.range, { categoryIds: plan.categoryIds, merchant: plan.merchant, minAmount: plan.minAmount });
      const order = plan.sort === 'largest' ? 't.amount DESC, t.date DESC' : 't.date DESC, t.id DESC';
      const rows = await db.getAllAsync<{ id: number; date: string; label: string; category: string; color: string; amount: number }>(
        `SELECT t.id AS id, t.date AS date, ${LABEL} AS label, c.name AS category, c.color AS color, t.amount AS amount
         ${FROM} ${w.sql} ORDER BY ${order} LIMIT ?`,
        [...w.params, plan.limit],
      );
      return { kind: 'list', label: plan.range.label, rows: rows.map((r) => ({ ...r, amount: round2(r.amount) })) };
    }
    case 'budgetStatus': {
      const rows = await db.getAllAsync<{ category: string; color: string; spent: number; limit: number }>(
        `SELECT c.name AS category, c.color AS color, c.budget_limit AS "limit",
           COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = c.id AND t.date >= ? AND t.date <= ?), 0) AS spent
         FROM categories c WHERE c.budget_limit > 0`,
        [plan.range.from, plan.range.to],
      );
      return {
        kind: 'budget',
        label: plan.range.label,
        rows: rows
          .map((r) => ({ category: r.category, color: r.color, spent: round2(r.spent), limit: r.limit, pct: round2((r.spent / r.limit) * 100) }))
          .sort((x, y) => y.pct - x.pct),
      };
    }
  }
};
