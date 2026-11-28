import { templateSentence, guardSentence, allowedNumbers } from '../answer';
import { AskResult } from '../execute';

const money = (n: number) => `₹${n.toLocaleString('en-US')}`;
const total: AskResult = { kind: 'total', value: 1250, count: 3, label: 'last month (Oct 2026)' };

describe('templateSentence', () => {
  it('total', () => expect(templateSentence(total, money, 'on Food')).toBe('You spent ₹1,250 on Food last month (Oct 2026) across 3 purchases.'));
  it('total zero', () => expect(templateSentence({ ...total, value: 0, count: 0 }, money, 'on Food')).toBe("You didn't spend anything on Food last month (Oct 2026)."));
  it('single purchase', () => expect(templateSentence({ ...total, count: 1 }, money)).toBe('You spent ₹1,250 last month (Oct 2026) across 1 purchase.'));
  it('breakdown', () => expect(templateSentence({ kind: 'breakdown', total: 3300, label: 'this month', rows: [{ label: 'Food', value: 2150 }] }, money))
    .toBe('Food was your biggest at ₹2,150 of ₹3,300 this month.'));
  it('breakdown empty', () => expect(templateSentence({ kind: 'breakdown', total: 0, label: 'this month', rows: [] }, money)).toBe('No spending this month.'));
  it('compare', () => expect(templateSentence({ kind: 'compare', a: { label: 'last month', value: 2400 }, b: { label: 'this month', value: 3100 }, diff: 700, pct: 29.17 }, money))
    .toBe('₹3,100 this month vs ₹2,400 last month — 29% more.'));
  it('compare less', () => expect(templateSentence({ kind: 'compare', a: { label: 'A', value: 200 }, b: { label: 'B', value: 100 }, diff: -100, pct: -50 }, money))
    .toBe('₹100 B vs ₹200 A — 50% less.'));
  it('list', () => expect(templateSentence({ kind: 'list', label: 'this week', rows: [{ id: 1, date: '2026-11-27', label: 'x', category: 'Food', color: '#000', amount: 5 }] }, money))
    .toBe('Here is 1 purchase from this week.'));
  it('budget', () => expect(templateSentence({ kind: 'budget', label: 'this month', rows: [
    { category: 'Shopping', color: '#000', spent: 900, limit: 1000, pct: 90 }, { category: 'Food', color: '#000', spent: 10, limit: 3000, pct: 0.33 },
  ] }, money)).toBe('1 of 2 budgets is over 80% this month.'));
  it('unsupported', () => expect(templateSentence({ kind: 'unsupported', reason: 'Nope.' }, money)).toBe('Nope.'));
});

describe('guardSentence', () => {
  it('rejects unseen numbers', () => {
    expect(guardSentence('You spent about ₹1,300 on food.', total)).toBe(false);
    expect(guardSentence('That was 5 purchases.', total)).toBe(false);
  });
  it('accepts numbers from the result', () => {
    expect(guardSentence('Food cost you ₹1,250 over 3 purchases.', total)).toBe(true);
    expect(guardSentence('That is 1250.00 in Oct 2026.', total)).toBe(true);
  });
  it('accepts rounded percentages', () => {
    const cmp: AskResult = { kind: 'compare', a: { label: 'A', value: 2400 }, b: { label: 'B', value: 3100 }, diff: 700, pct: 29.17 };
    expect(guardSentence('Up 29%, or ₹700 more than ₹2,400.', cmp)).toBe(true);
  });
  it('sentence without numbers is fine', () => expect(guardSentence('Nice work this month!', total)).toBe(true));
  it('allowedNumbers includes label digits', () => expect(allowedNumbers(total).has(2026)).toBe(true));
});
