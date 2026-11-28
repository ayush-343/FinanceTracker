import { QueryPlanSchema, matchCategory, resolvePlan } from '../plan';

const FRI = new Date(2026, 10, 27);
const cats = [{ id: 1, name: 'Food & Dining' }, { id: 2, name: 'Transport' }];

describe('matchCategory', () => {
  it('loose match', () => {
    expect(matchCategory('food and dining', cats)).toBe(1);
    expect(matchCategory('Food & Dining', cats)).toBe(1);
    expect(matchCategory('food', cats)).toBe(1);
    expect(matchCategory('TRANSPORT', cats)).toBe(2);
    expect(matchCategory('pets', cats)).toBeNull();
  });
});

describe('resolvePlan', () => {
  it('resolves categories and range', () => {
    const r = resolvePlan({ type: 'total', range: { preset: 'last_month' }, categories: ['food'] }, cats, FRI, 'monthly');
    expect(r).toMatchObject({ type: 'total', categoryIds: [1], range: { from: '2026-10-01', to: '2026-10-31' } });
  });
  it('unknown category', () => {
    const r = resolvePlan({ type: 'total', range: { preset: 'this_month' }, categories: ['pets'] }, cats, FRI, 'monthly');
    expect(r).toEqual({ type: 'unsupported', reason: "I couldn't find a category called pets." });
  });
  it('forecast resolves', () => {
    expect(resolvePlan({ type: 'forecast' }, cats, FRI, 'monthly')).toEqual({ type: 'forecast' });
  });
  it('budget status uses budget period', () => {
    expect(resolvePlan({ type: 'budgetStatus' }, cats, FRI, 'weekly')).toMatchObject({ range: { from: '2026-11-23', to: '2026-11-29' } });
    expect(resolvePlan({ type: 'budgetStatus' }, cats, FRI, 'monthly')).toMatchObject({ range: { from: '2026-11-01', to: '2026-11-30' } });
  });
});

describe('QueryPlanSchema', () => {
  it('rejects huge limit', () => {
    expect(QueryPlanSchema.safeParse({ type: 'list', range: { preset: 'today' }, sort: 'largest', limit: 500 }).success).toBe(false);
  });
  it('defaults limit', () => {
    const r = QueryPlanSchema.parse({ type: 'breakdown', range: { preset: 'today' }, by: 'category' });
    expect(r).toMatchObject({ limit: 5 });
  });
});
