import { reviewCards, ReviewInput } from '../cards';
import type { Forecast } from '../../ai/forecast/forecast';

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-US')}`;
const ok: Forecast = {
  status: 'ok', period: { from: '2026-11-01', to: '2026-11-30' },
  total: { spent: 28000, likely: 44000, low: 43000, high: 45000, budget: 45000 }, categories: [],
};
const base = (p: Partial<ReviewInput> = {}): ReviewInput => ({
  weekLabel: '23–29 Nov', drawn: 6, elapsed: 7, weekSpent: 8940, usualWeek: 7860,
  top: { id: 1, name: 'Food', spent: 4320, usual: 3320 }, forecast: ok, periodLabel: 'this month',
  upcoming: [{ name: 'Spotify', date: '2026-12-05', amount: 119 }], goalCount: 1, ...p,
});

describe('reviewCards', () => {
  it('full week in order', () => {
    const cards = reviewCards(base(), money);
    expect(cards.map((c) => c.kind)).toEqual(['week', 'change', 'forecast', 'upcoming', 'action']);
    expect(cards[0]).toMatchObject({ title: '6 of 7 days drawn' });
    expect(cards[1].title).toBe('Food came in 30% above your usual week');
    expect(cards[1].body).toBe('₹4,320 this week against a usual ₹3,320.');
    expect(cards[2].title).toBe('On pace for ₹43,000–₹45,000 this month');
    expect(cards[4].action).toMatchObject({ label: 'Set a Food limit', route: '/EditCategory', params: { categoryId: '1' } });
  });
  it('quiet week', () => {
    const cards = reviewCards(base({ weekSpent: 0, top: null, drawn: 7 }), money);
    const change = cards.find((c) => c.kind === 'change');
    expect(change?.title).toBe('A quiet week');
    expect(JSON.stringify(cards)).not.toContain('NaN');
  });
  it('no history', () => {
    expect(reviewCards(base({ usualWeek: null, top: { id: 1, name: 'Food', spent: 400, usual: 0 } }), money).find((c) => c.kind === 'change')).toBeUndefined();
  });
  it('forecast insufficient', () => {
    expect(reviewCards(base({ forecast: { status: 'insufficient' } }), money).find((c) => c.kind === 'forecast')).toBeUndefined();
  });
  it('no upcoming charges → no upcoming card', () => {
    expect(reviewCards(base({ upcoming: [] }), money).find((c) => c.kind === 'upcoming')).toBeUndefined();
  });
  it('action: start a goal when nothing is up and there are no goals', () => {
    const a = reviewCards(base({ top: { id: 1, name: 'Food', spent: 3000, usual: 3320 }, goalCount: 0 }), money).pop();
    expect(a?.action).toMatchObject({ label: 'Start a savings goal', route: '/Goal' });
  });
  it('action: review goals otherwise', () => {
    const a = reviewCards(base({ top: { id: 1, name: 'Food', spent: 3000, usual: 3320 } }), money).pop();
    expect(a?.action).toMatchObject({ label: 'Look at your goals', route: '/(tabs)/Plan' });
  });
});
