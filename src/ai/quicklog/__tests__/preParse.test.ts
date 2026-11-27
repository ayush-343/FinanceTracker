import { preParse } from '../preParse';

const FRI = new Date(2026, 10, 27); // Fri 27 Nov 2026

describe('preParse', () => {
  it('full sentence', () => {
    expect(preParse('200 coffee at Blue Tokai yesterday', FRI)).toMatchObject({
      amount: 200, merchant: 'Blue Tokai', item: 'coffee', date: '2026-11-26',
    });
  });

  it('amounts', () => {
    expect(preParse('₹1,250 groceries', FRI).amount).toBe(1250);
    expect(preParse('Rs 99 chai', FRI).amount).toBe(99);
    expect(preParse('rent 1.5k', FRI).amount).toBe(1500);
    expect(preParse('$12.50 lunch', FRI).amount).toBe(12.5);
    expect(preParse('paid 300 and 40 tip', FRI).amountsInText).toEqual([300, 40]);
  });

  it('relative dates', () => {
    expect(preParse('lunch 120 today', FRI).date).toBe('2026-11-27');
    expect(preParse('lunch 120 last friday', FRI).date).toBe('2026-11-20');
    expect(preParse('lunch 120 last monday', FRI).date).toBe('2026-11-23');
    expect(preParse('taxi 80 yesterday', new Date(2026, 11, 1)).date).toBe('2026-11-30');
    expect(preParse('taxi 80 day before yesterday', FRI).date).toBe('2026-11-25');
    expect(preParse('books 500 on 3 nov', FRI).date).toBe('2026-11-03');
  });

  it('no amount', () => {
    const r = preParse('coffee at Starbucks', FRI);
    expect(r.amount).toBeNull();
    expect(r.merchant).toBe('Starbucks');
    expect(r.item).toBe('coffee');
    expect(r.date).toBe('2026-11-27');
  });

  it('empty text', () => {
    expect(preParse('   ', FRI)).toMatchObject({ amount: null, item: null, merchant: null });
  });
});
