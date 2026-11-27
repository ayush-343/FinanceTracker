import { applyParse, parseAmountInput, saveLabel, Draft, emptyDraft } from '../draft';

const TODAY = '2026-11-27'; // Friday

describe('parseAmountInput', () => {
  it('parses common inputs', () => {
    expect(parseAmountInput('1,250.50')).toBe(1250.5);
    expect(parseAmountInput('₹ 99')).toBe(99);
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('0')).toBeNull();
  });
});

describe('applyParse', () => {
  const parsed = { amount: 250, item: 'uber trip', merchant: null, date: '2026-11-26' };
  it('fills untouched fields', () => {
    expect(applyParse(emptyDraft(TODAY), parsed, {})).toMatchObject({ amount: '250', what: 'uber trip', date: '2026-11-26' });
  });
  it('keeps touched fields', () => {
    const d: Draft = { ...emptyDraft(TODAY), amount: '300', what: 'cab' };
    expect(applyParse(d, parsed, { amount: true, what: true })).toMatchObject({ amount: '300', what: 'cab', date: '2026-11-26' });
  });
  it('merchant becomes the label when there is no item', () => {
    expect(applyParse(emptyDraft(TODAY), { amount: 180, item: null, merchant: 'Blue Tokai', date: TODAY }, {})).toMatchObject({ what: 'Blue Tokai', merchant: 'Blue Tokai' });
  });
  it('null amount clears an untouched amount', () => {
    expect(applyParse({ ...emptyDraft(TODAY), amount: '250' }, { ...parsed, amount: null }, {}).amount).toBe('');
  });
});

describe('saveLabel', () => {
  it('today open', () => expect(saveLabel(TODAY, TODAY, new Set())).toBe("Save · closes Friday's loop"));
  it('today already drawn', () => expect(saveLabel(TODAY, TODAY, new Set([TODAY]))).toBe('Save'));
  it('past open day', () => expect(saveLabel('2026-11-24', TODAY, new Set())).toBe("Save · closes Tuesday's loop"));
  it('future', () => expect(saveLabel('2026-11-29', TODAY, new Set())).toBe('Save'));
});
