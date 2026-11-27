import { buildMonthKolam } from '../kolamGrid';
import { computePace } from '../pace';

describe('buildMonthKolam', () => {
  const logged = new Set(['2026-11-02', '2026-11-03', '2026-11-27']);
  it('places days Monday-first and marks states', () => {
    const k = buildMonthKolam(2026, 10, logged, '2026-11-27');
    expect(k.cells).toHaveLength(30);
    // 1 Nov 2026 is a Sunday → last column of the first row.
    expect(k.cells[0]).toMatchObject({ day: 1, col: 6, row: 0, state: 'skipped' });
    expect(k.cells[1]).toMatchObject({ day: 2, col: 0, row: 1, state: 'drawn' });
    expect(k.cells[26]).toMatchObject({ day: 27, state: 'today-drawn' });
    expect(k.cells[27].state).toBe('future');
    expect(k.rows).toBe(6);
    expect(k.drawn).toBe(3);
    expect(k.elapsed).toBe(27);
  });
  it('sunday start', () => expect(buildMonthKolam(2026, 10, new Set(), '2026-11-15').cells[0].col).toBe(6));
  it('today open when not logged', () => {
    expect(buildMonthKolam(2026, 10, new Set(), '2026-11-10').cells[9].state).toBe('today-open');
  });
  it('past month is fully elapsed', () => {
    const k = buildMonthKolam(2026, 9, new Set(['2026-10-01']), '2026-11-27');
    expect(k.elapsed).toBe(31);
    expect(k.cells.every((c) => c.state === 'drawn' || c.state === 'skipped')).toBe(true);
  });
});

describe('computePace', () => {
  const base = { budget: 45000, spentBeforeToday: 28000, spentToday: 0, periodEnd: '2026-11-30', today: '2026-11-27' };
  it('splits the remaining budget over the days left', () => {
    expect(computePace(base)).toEqual({ status: 'onPace', allowanceToday: 4250, leftToday: 4250, daysLeft: 4 });
  });
  it('subtracts today\'s spend', () => {
    expect(computePace({ ...base, spentToday: 250 }).leftToday).toBe(4000);
  });
  it('past pace when today exceeds allowance', () => {
    expect(computePace({ ...base, spentToday: 5000 })).toMatchObject({ status: 'pastPace', leftToday: -750 });
  });
  it('last day', () => {
    expect(computePace({ ...base, today: '2026-11-30' })).toMatchObject({ daysLeft: 1, allowanceToday: 17000 });
  });
  it('over before today', () => {
    expect(computePace({ ...base, spentBeforeToday: 46000 })).toMatchObject({ status: 'pastPace', allowanceToday: 0 });
  });
  it('no budget', () => expect(computePace({ ...base, budget: 0 }).status).toBe('noBudget'));
});
