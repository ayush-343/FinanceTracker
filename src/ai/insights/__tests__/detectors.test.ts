import { detectDuplicate, detectUnusual, detectSubscriptionCandidates, TxLite } from '../detectors';

let id = 0;
const tx = (p: Partial<TxLite>): TxLite => ({ id: ++id, amount: 100, date: '2026-11-27', createdAt: '2026-11-27T10:00:00.000Z', categoryId: 1, label: 'x', ...p });

describe('detectDuplicate', () => {
  const recent = [tx({ amount: 250, label: 'Uber', createdAt: '2026-11-27T10:00:00.000Z' })];
  it('within 10 minutes', () => expect(detectDuplicate({ amount: 250, label: 'uber', now: '2026-11-27T10:09:00.000Z' }, recent)?.label).toBe('Uber'));
  it('after 10 minutes', () => expect(detectDuplicate({ amount: 250, label: 'Uber', now: '2026-11-27T10:11:00.000Z' }, recent)).toBeNull());
  it('needs same label', () => expect(detectDuplicate({ amount: 250, label: 'Ola', now: '2026-11-27T10:01:00.000Z' }, recent)).toBeNull());
  it('needs same amount', () => expect(detectDuplicate({ amount: 251, label: 'Uber', now: '2026-11-27T10:01:00.000Z' }, recent)).toBeNull());
});

describe('detectUnusual', () => {
  const history = [100, 150, 180, 200, 220].map((amount) => tx({ amount, categoryId: 1 }));
  it('flags much bigger than usual', () => expect(detectUnusual({ amount: 900, categoryId: 1 }, history)).toEqual({ median: 180 }));
  it('ignores small amounts', () => expect(detectUnusual({ amount: 499, categoryId: 1 }, history.map((t) => ({ ...t, amount: t.amount / 10 })))).toBeNull());
  it('needs history', () => expect(detectUnusual({ amount: 900, categoryId: 1 }, history.slice(0, 4))).toBeNull());
  it('other categories ignored', () => expect(detectUnusual({ amount: 900, categoryId: 2 }, history)).toBeNull());
});

describe('detectSubscriptionCandidates', () => {
  const monthly = (label: string, amounts: number[], dates = ['2026-09-05', '2026-10-05', '2026-11-05']) =>
    dates.map((date, i) => tx({ label, amount: amounts[i], date, categoryId: 3 }));
  it('monthly repeat', () => expect(detectSubscriptionCandidates(monthly('Spotify', [119, 119, 119]), [], new Set())).toEqual([
    { key: 'spotify|monthly', label: 'Spotify', amount: 119, frequency: 'monthly', categoryId: 3, count: 3 },
  ]));
  it('amounts must be close', () => expect(detectSubscriptionCandidates(monthly('Spotify', [119, 129, 119]), [], new Set())).toEqual([]));
  it('irregular gaps', () => expect(detectSubscriptionCandidates(monthly('Spotify', [119, 119, 119], ['2026-09-05', '2026-09-20', '2026-11-05']), [], new Set())).toEqual([]));
  it('already tracked', () => expect(detectSubscriptionCandidates(monthly('Spotify', [119, 119, 119]), [{ name: 'Spotify Premium', amount: 119 }], new Set())).toEqual([]));
  it('dismissed', () => expect(detectSubscriptionCandidates(monthly('Spotify', [119, 119, 119]), [], new Set(['spotify|monthly']))).toEqual([]));
  it('weekly', () => {
    const r = detectSubscriptionCandidates(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27'].map((date) => tx({ label: 'Gym class', amount: 300, date, categoryId: 4 })), [], new Set());
    expect(r).toMatchObject([{ key: 'gym class|weekly', frequency: 'weekly', count: 4 }]);
  });
});
