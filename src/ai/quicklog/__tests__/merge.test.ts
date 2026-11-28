import { mergeDraft } from '../merge';
import { PreParsed } from '../preParse';
import { DraftTransaction } from '../../schemas';

const pre = (p: Partial<PreParsed> = {}): PreParsed => ({
  amount: null, date: '2026-11-27', dateFound: false, merchant: null, item: 'coffee', amountsInText: [], ...p,
});
const model = (m: Partial<DraftTransaction> = {}): DraftTransaction => ({
  amount: null, merchant: null, item: null, date: null, categoryHint: null, ...m,
});

describe('mergeDraft', () => {
  it('drops model amount not in text', () => {
    expect(mergeDraft(pre(), model({ amount: 150 })).amount).toBeNull();
  });
  it('keeps model amount that appears in text', () => {
    expect(mergeDraft(pre({ amountsInText: [40] }), model({ amount: 40 })).amount).toBe(40);
  });
  it('pre amount wins over model', () => {
    expect(mergeDraft(pre({ amount: 200, amountsInText: [200, 40] }), model({ amount: 40 })).amount).toBe(200);
  });
  it('model fills missing merchant and hint', () => {
    expect(mergeDraft(pre(), model({ merchant: 'Starbucks', categoryHint: 'Food' }))).toMatchObject({ merchant: 'Starbucks', categoryHint: 'Food', item: 'coffee' });
  });
  it('bad model date ignored', () => {
    expect(mergeDraft(pre(), model({ date: '2019-01-01' })).date).toBe('2026-11-27');
    expect(mergeDraft(pre(), model({ date: 'yesterday' })).date).toBe('2026-11-27');
  });
  it('explicit date in text wins over model', () => {
    expect(mergeDraft(pre({ date: '2026-11-26', dateFound: true }), model({ date: '2026-11-20' })).date).toBe('2026-11-26');
  });
  it('good model date used', () => {
    expect(mergeDraft(pre(), model({ date: '2026-11-20' })).date).toBe('2026-11-20');
  });
  it('model null → pre only', () => {
    expect(mergeDraft(pre({ amount: 5, amountsInText: [5] }), null)).toEqual({ amount: 5, date: '2026-11-27', merchant: null, item: 'coffee', categoryHint: null });
  });
});
