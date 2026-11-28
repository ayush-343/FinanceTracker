import { normalizeKey, suggestCategory, applyLearning, MemoryRow, KnownItem } from '..';

const row = (key: string, category_id: number, extra: Partial<MemoryRow> = {}): MemoryRow => ({
  key, category_id, subcategory_id: null, hits: 1, last_used: '2026-11-01', ...extra,
});
const valid = new Set([1, 2, 3]);

describe('normalizeKey', () => {
  it('strips order ids and case', () => expect(normalizeKey('SWIGGY Order #4521')).toBe('swiggy'));
  it('strips company suffixes', () => expect(normalizeKey('Blue Tokai Pvt Ltd')).toBe('blue tokai'));
  it('returns empty for noise', () => {
    expect(normalizeKey('  ')).toBe('');
    expect(normalizeKey('#4521')).toBe('');
  });
  it('keeps unicode letters', () => expect(normalizeKey('चाय पॉइंट')).toBe('चाय पॉइंट'));
});

describe('suggestCategory', () => {
  const memory = [row('swiggy', 1), row('uber trip', 2, { hits: 3 })];
  const items: KnownItem[] = [{ name: 'Cappuccino', category_id: 3, subcategory_id: 7 }];

  it('exact hit', () => {
    expect(suggestCategory('Swiggy order 22', memory, items, valid)).toMatchObject({ categoryId: 1, source: 'exact', confidence: 1 });
  });
  it('fuzzy match', () => {
    expect(suggestCategory('uber trip blr', memory, items, valid)).toMatchObject({ categoryId: 2, source: 'fuzzy' });
  });
  it('below threshold is null', () => {
    expect(suggestCategory('uber eats dinner party', memory, [], valid)).toBeNull();
  });
  it('item match', () => {
    expect(suggestCategory('cappuccino', [], items, valid)).toMatchObject({ categoryId: 3, subcategoryId: 7, source: 'item', confidence: 0.8 });
  });
  it('ignores ids not in categories', () => {
    expect(suggestCategory('swiggy', [row('swiggy', 99)], [], valid)).toBeNull();
  });
  it('empty text is null', () => expect(suggestCategory('#12', memory, items, valid)).toBeNull());
});

describe('learn', () => {
  const now = '2026-11-27T10:00:00Z';
  it('new row hits 1', () => {
    expect(applyLearning([], 'Swiggy', 1, null, now)).toEqual({ key: 'swiggy', category_id: 1, subcategory_id: null, hits: 1, last_used: now });
  });
  it('same category hits+1', () => {
    expect(applyLearning([row('swiggy', 1, { hits: 2 })], 'swiggy', 1, null, now)?.hits).toBe(3);
  });
  it('correction overwrites', () => {
    expect(applyLearning([row('swiggy', 1, { hits: 5 })], 'SWIGGY', 2, 4, now)).toMatchObject({ category_id: 2, subcategory_id: 4, hits: 1 });
  });
  it('empty key returns null', () => expect(applyLearning([], '  ', 1, null, now)).toBeNull());
});
