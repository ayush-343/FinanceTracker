import { STARTERS, starterSplit } from '../starter';

describe('starterSplit', () => {
  it('splits by weight in whole units', () => {
    expect(starterSplit(30000, ['food', 'rent'])).toEqual([{ key: 'food', amount: 16364 }, { key: 'rent', amount: 13636 }]);
  });
  it('sums to total', () => {
    const all = STARTERS.map((s) => s.key);
    expect(starterSplit(45001, all).reduce((s, x) => s + x.amount, 0)).toBe(45001);
  });
  it('none selected', () => expect(starterSplit(30000, [])).toEqual([]));
  it('zero total gives zero budgets', () => expect(starterSplit(0, ['food'])).toEqual([{ key: 'food', amount: 0 }]));
  it('keeps the STARTERS order', () => expect(starterSplit(100, ['fun', 'food']).map((x) => x.key)).toEqual(['food', 'fun']));
});
