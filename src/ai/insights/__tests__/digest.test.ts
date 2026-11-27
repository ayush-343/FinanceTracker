import { buildDigest, overspendAlerts } from '../digest';
import type { Forecast } from '../../forecast/forecast';

const money = (n: number) => `₹${n.toLocaleString('en-US')}`;
const ok: Forecast = {
  status: 'ok',
  period: { from: '2026-11-01', to: '2026-11-30' },
  total: { spent: 20000, likely: 40000, low: 38000, high: 42000, budget: 45000 },
  categories: [
    { categoryId: 1, name: 'Food', color: '#f00', spent: 2000, likely: 3400, low: 3000, high: 3800, budget: 3000, overOn: '2026-11-24' },
    { categoryId: 2, name: 'Transport', color: '#0f0', spent: 500, likely: 900, low: 800, high: 1000, budget: 2000, overOn: null },
  ],
};

describe('buildDigest', () => {
  it('full', () => {
    expect(buildDigest({ weekSpent: 4320, usualWeek: 4000, topCategory: { name: 'Food', spent: 1300, usual: 1000 }, forecast: ok, asOf: 'Thu', periodLabel: 'this month' }, money)).toEqual({
      title: 'Your week so far',
      body: '₹4,320 spent (as of Thu), 8% more than a usual week. Food is up 30% on your usual. On pace for ₹38,000–₹42,000 this month.',
    });
  });
  it('no usual and insufficient forecast', () => {
    expect(buildDigest({ weekSpent: 500, usualWeek: null, topCategory: null, forecast: { status: 'insufficient' }, asOf: 'Mon', periodLabel: 'this month' }, money).body)
      .toBe('₹500 spent (as of Mon).');
  });
  it('category not notably up is omitted', () => {
    expect(buildDigest({ weekSpent: 500, usualWeek: null, topCategory: { name: 'Food', spent: 105, usual: 100 }, forecast: { status: 'insufficient' }, asOf: 'Mon', periodLabel: 'this week' }, money).body)
      .toBe('₹500 spent (as of Mon).');
  });
});

describe('overspendAlerts', () => {
  it('one per at-risk category, skipping sent keys', () => {
    expect(overspendAlerts(ok, new Set(), '2026-11', money)).toEqual([{
      key: '2026-11:1', title: 'Food budget at risk', body: 'Food is on pace for ₹3,400 against a ₹3,000 budget — likely over around 24 Nov.',
    }]);
    expect(overspendAlerts(ok, new Set(['2026-11:1']), '2026-11', money)).toEqual([]);
  });
  it('none when insufficient', () => expect(overspendAlerts({ status: 'insufficient' }, new Set(), '2026-11', money)).toEqual([]));
});
