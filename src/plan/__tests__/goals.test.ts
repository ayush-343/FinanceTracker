import { goalPlan } from '../goals';

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-US')}`;
const goal = (p: Partial<{ target: number; saved: number; target_date: string | null }>) => ({ target: 30000, saved: 18000, target_date: '2027-02-28', ...p });

describe('goalPlan', () => {
  it('spreads the rest over the months left, counting this month', () => {
    const g = goalPlan(goal({}), '2026-11-27', money);
    expect(g).toMatchObject({ remaining: 12000, monthsLeft: 4, perMonth: 3000, status: 'onTrack', progress: 0.6 });
    expect(g.line).toBe('₹3,000 a month gets you there by 28 Feb');
  });
  it('this month', () => {
    expect(goalPlan(goal({ target_date: '2026-11-30' }), '2026-11-27', money)).toMatchObject({ monthsLeft: 1, perMonth: 12000 });
  });
  it('no date', () => {
    expect(goalPlan(goal({ target_date: null }), '2026-11-27', money)).toMatchObject({ status: 'noDate', perMonth: null, line: '₹12,000 to go' });
  });
  it('reached', () => {
    expect(goalPlan(goal({ saved: 31000 }), '2026-11-27', money)).toMatchObject({ status: 'reached', remaining: 0, progress: 1, line: 'Reached. Nice work.' });
  });
  it('past date', () => {
    expect(goalPlan(goal({ target_date: '2026-10-31' }), '2026-11-27', money)).toMatchObject({ status: 'overdue', line: '₹12,000 to go · pick a new date?' });
  });
  it('zero target is reached, not NaN', () => {
    expect(goalPlan(goal({ target: 0, saved: 0 }), '2026-11-27', money).progress).toBe(1);
  });
});
