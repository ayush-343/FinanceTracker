import { categoryShares, feedLabel, filterFeed, groupByDay } from '../feed';
import { TransactionWithDetails } from '../../types';

let id = 0;
const tx = (p: Partial<TransactionWithDetails>): TransactionWithDetails => ({
  id: ++id, item_id: null, category_id: 1, subcategory_id: null, amount: 100, date: '2026-11-26', notes: '', created_at: '2026-11-26 10:00:00',
  category_name: 'Food', category_color: '#000', category_icon: 'coffee', merchant: null, ...p,
});

const feed = [
  tx({ amount: 250, category_id: 2, category_name: 'Transport', merchant: 'Uber', created_at: '2026-11-26 09:00:00' }),
  tx({ amount: 180, merchant: 'Blue Tokai', created_at: '2026-11-26 11:00:00' }),
  tx({ amount: 1200, date: '2026-11-25', category_id: 3, category_name: 'Groceries', item_name: 'DMart run' }),
  tx({ amount: 0, date: '2026-11-24', category_id: 4, category_name: 'Rent', notes: 'adjustment' }),
];

describe('groupByDay', () => {
  it('groups by date desc with totals, newest first inside a day', () => {
    const g = groupByDay(feed);
    expect(g.map((d) => [d.date, d.total])).toEqual([['2026-11-26', 430], ['2026-11-25', 1200], ['2026-11-24', 0]]);
    expect(g[0].items.map(feedLabel)).toEqual(['Blue Tokai', 'Uber']);
  });
});

describe('filterFeed', () => {
  it('matches merchant, item, notes and category', () => {
    expect(filterFeed(feed, { query: 'uber' }).map(feedLabel)).toEqual(['Uber']);
    expect(filterFeed(feed, { query: 'dmart' })).toHaveLength(1);
    expect(filterFeed(feed, { query: 'groceries' })).toHaveLength(1);
  });
  it('blank query', () => expect(filterFeed(feed, { query: '   ' })).toHaveLength(4));
  it('category and day', () => {
    expect(filterFeed(feed, { categoryId: 1 })).toHaveLength(1);
    expect(filterFeed(feed, { day: '2026-11-25' })).toHaveLength(1);
  });
});

describe('categoryShares', () => {
  it('shares of total, desc', () => {
    const s = categoryShares(feed);
    expect(s.map((x) => x.name)).toEqual(['Groceries', 'Transport', 'Food']);
    expect(s[0].share).toBeCloseTo(1200 / 1630, 10);
  });
  it('skips zero', () => expect(categoryShares(feed).find((x) => x.name === 'Rent')).toBeUndefined());
});

describe('feedLabel', () => {
  it('falls back to category', () => expect(feedLabel(tx({ category_name: 'Rent' }))).toBe('Rent'));
});
