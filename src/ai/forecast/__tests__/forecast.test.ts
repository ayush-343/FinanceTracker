import { addDays, format, parseISO } from 'date-fns';
import { computeForecast, ForecastInput } from '../forecast';

const days = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = parseISO(from); format(d, 'yyyy-MM-dd') <= to; d = addDays(d, 1)) out.push(format(d, 'yyyy-MM-dd'));
  return out;
};
const input = (p: Partial<ForecastInput> = {}): ForecastInput => ({
  today: '2026-11-20',
  period: { from: '2026-11-01', to: '2026-11-30' },
  earliestTransaction: '2026-09-01',
  categories: [{ id: 1, name: 'Food', color: '#f00', budget: 2500 }],
  daily: days('2026-09-01', '2026-11-20').map((date) => ({ date, categoryId: 1, amount: 100 })),
  spentSoFar: { 1: 2000 },
  upcomingSubscriptions: [],
  ...p,
});

describe('computeForecast', () => {
  it('steady spending projects forward and finds the over-budget day', () => {
    const f = computeForecast(input());
    expect(f.status).toBe('ok');
    if (f.status !== 'ok') return;
    expect(f.categories[0]).toMatchObject({ spent: 2000, likely: 3000, low: 2700, high: 3300, overOn: '2026-11-26' });
    expect(f.total).toEqual({ spent: 2000, likely: 3000, low: 2700, high: 3300, budget: 2500 });
  });
  it('upcoming subscription adds exactly its amount', () => {
    const f = computeForecast(input({ upcomingSubscriptions: [{ date: '2026-11-25', categoryId: 1, amount: 199 }] }));
    expect(f.status === 'ok' && f.categories[0]).toMatchObject({ likely: 3199, low: 2899, high: 3499 });
  });
  it('last day of period', () => {
    const f = computeForecast(input({ today: '2026-11-30', spentSoFar: { 1: 2400 } }));
    expect(f.status === 'ok' && f.categories[0]).toMatchObject({ spent: 2400, likely: 2400, low: 2400, high: 2400, overOn: null });
  });
  it('already over budget → over today', () => {
    const f = computeForecast(input({ today: '2026-11-30', spentSoFar: { 1: 3000 } }));
    expect(f.status === 'ok' && f.categories[0].overOn).toBe('2026-11-30');
  });
  it('no budget', () => {
    const f = computeForecast(input({ categories: [{ id: 1, name: 'Food', color: '#f00', budget: 0 }] }));
    expect(f.status === 'ok' && f.categories[0].overOn).toBeNull();
  });
  it('insufficient history', () => {
    expect(computeForecast(input({ earliestTransaction: '2026-11-11' }))).toEqual({ status: 'insufficient' });
    expect(computeForecast(input({ earliestTransaction: null }))).toEqual({ status: 'insufficient' });
  });
  it('sorts at-risk categories first', () => {
    const f = computeForecast(input({
      categories: [{ id: 2, name: 'Fun', color: '#0f0', budget: 0 }, { id: 1, name: 'Food', color: '#f00', budget: 2500 }],
      spentSoFar: { 1: 2000, 2: 0 },
    }));
    expect(f.status === 'ok' && f.categories.map((c) => c.categoryId)).toEqual([1, 2]);
  });
});
