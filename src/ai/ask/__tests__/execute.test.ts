import { executePlan } from '../execute';
import { createFixtureDb } from './fixtureDb';

const NOV = { from: '2026-11-01', to: '2026-11-30', label: 'this month' };
const OCT = { from: '2026-10-01', to: '2026-10-31', label: 'last month' };
const SEP = { from: '2026-09-01', to: '2026-09-30', label: 'September' };

describe('executePlan', () => {
  it('total for a category', async () => {
    const db = await createFixtureDb();
    expect(await executePlan({ type: 'total', range: NOV, categoryIds: [1] }, db)).toEqual({ kind: 'total', value: 2150, count: 3, label: 'this month' });
  });
  it('total filtered by merchant matches merchant or item name', async () => {
    const db = await createFixtureDb();
    expect(await executePlan({ type: 'total', range: { ...OCT, to: NOV.to }, categoryIds: [], merchant: 'uber' }, db)).toMatchObject({ value: 550, count: 2 });
  });
  it('breakdown by category sorted with limit', async () => {
    const db = await createFixtureDb();
    const r = await executePlan({ type: 'breakdown', range: NOV, by: 'category', limit: 2 }, db);
    expect(r).toEqual({ kind: 'breakdown', total: 3300, label: 'this month', rows: [
      { label: 'Food', value: 2150, color: '#EF4444' }, { label: 'Shopping', value: 900, color: '#6366F1' },
    ] });
  });
  it('breakdown by merchant falls back to item name then notes', async () => {
    const db = await createFixtureDb();
    const r = await executePlan({ type: 'breakdown', range: { ...OCT, to: NOV.to }, by: 'merchant', limit: 10 }, db);
    expect(r.kind === 'breakdown' && r.rows.map((x) => x.label)).toEqual(['Swiggy', 'Amazon', 'groceries', 'Uber ride', 'Uber', 'Blue Tokai']);
  });
  it('breakdown by month', async () => {
    const db = await createFixtureDb();
    const r = await executePlan({ type: 'breakdown', range: { ...OCT, to: NOV.to }, by: 'month', limit: 5 }, db);
    expect(r.kind === 'breakdown' && r.rows).toEqual([{ label: '2026-11', value: 3300 }, { label: '2026-10', value: 800 }]);
  });
  it('compare two months', async () => {
    const db = await createFixtureDb();
    expect(await executePlan({ type: 'compare', rangeA: OCT, rangeB: NOV, categoryIds: [] }, db)).toEqual({
      kind: 'compare', a: { label: 'last month', value: 800 }, b: { label: 'this month', value: 3300 }, diff: 2500, pct: 312.5,
    });
  });
  it('compare pct null when first range is zero', async () => {
    const db = await createFixtureDb();
    const r = await executePlan({ type: 'compare', rangeA: SEP, rangeB: NOV, categoryIds: [] }, db);
    expect(r).toMatchObject({ diff: 3300, pct: null });
  });
  it('list largest', async () => {
    const db = await createFixtureDb();
    const r = await executePlan({ type: 'list', range: NOV, categoryIds: [], sort: 'largest', limit: 3 }, db);
    expect(r.kind === 'list' && r.rows.map((x) => [x.amount, x.label, x.category])).toEqual([[1200, 'Swiggy', 'Food'], [900, 'Amazon', 'Shopping'], [800, 'groceries', 'Food']]);
  });
  it('list recent with min amount', async () => {
    const db = await createFixtureDb();
    const r = await executePlan({ type: 'list', range: NOV, categoryIds: [], sort: 'recent', limit: 5, minAmount: 500 }, db);
    expect(r.kind === 'list' && r.rows.map((x) => x.id)).toEqual([6, 4, 3]);
  });
  it('budget skips categories without a limit', async () => {
    const db = await createFixtureDb();
    expect(await executePlan({ type: 'budgetStatus', range: NOV }, db)).toEqual({ kind: 'budget', label: 'this month', rows: [
      { category: 'Shopping', color: '#6366F1', spent: 900, limit: 1000, pct: 90 },
      { category: 'Food', color: '#EF4444', spent: 2150, limit: 3000, pct: 71.67 },
    ] });
  });
  it('empty range', async () => {
    const db = await createFixtureDb();
    expect(await executePlan({ type: 'total', range: SEP, categoryIds: [] }, db)).toEqual({ kind: 'total', value: 0, count: 0, label: 'September' });
    expect(await executePlan({ type: 'breakdown', range: SEP, by: 'category', limit: 5 }, db)).toMatchObject({ rows: [], total: 0 });
  });
});
