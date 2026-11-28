import { keywordCategory } from '../keywords';

const cats = [
  { id: 3, name: 'Food & dining' }, { id: 4, name: 'Rent & bills' }, { id: 5, name: 'Groceries' },
  { id: 6, name: 'Transport' }, { id: 7, name: 'Shopping' }, { id: 8, name: 'Fun' },
];

describe('keywordCategory', () => {
  it('maps common merchants and words', () => {
    expect(keywordCategory('250 uber yesterday', cats)).toBe(6);
    expect(keywordCategory('coffee at Blue Tokai', cats)).toBe(3);
    expect(keywordCategory('DMart run', cats)).toBe(5);
    expect(keywordCategory('netflix', cats)).toBe(8);
    expect(keywordCategory('electricity bill', cats)).toBe(4);
  });
  it('no match → null', () => expect(keywordCategory('gift for mom', cats)).toBeNull());
  it('category missing → null', () => expect(keywordCategory('uber', [{ id: 1, name: 'Food' }])).toBeNull());
});
