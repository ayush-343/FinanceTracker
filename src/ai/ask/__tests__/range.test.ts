import { resolveRange } from '../range';

const FRI = new Date(2026, 10, 27);

describe('resolveRange', () => {
  it('boundaries', () => {
    expect(resolveRange({ preset: 'this_week' }, FRI)).toMatchObject({ from: '2026-11-23', to: '2026-11-29' });
    expect(resolveRange({ preset: 'last_week' }, FRI)).toMatchObject({ from: '2026-11-16', to: '2026-11-22' });
    expect(resolveRange({ preset: 'last_month' }, FRI)).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
    expect(resolveRange({ preset: 'last_month' }, new Date(2026, 0, 10))).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(resolveRange({ preset: 'this_week' }, new Date(2026, 10, 29))).toMatchObject({ from: '2026-11-23', to: '2026-11-29' });
    expect(resolveRange({ preset: 'last_7_days' }, FRI)).toMatchObject({ from: '2026-11-21', to: '2026-11-27' });
    expect(resolveRange({ preset: 'yesterday' }, FRI)).toMatchObject({ from: '2026-11-26', to: '2026-11-26' });
    expect(resolveRange({ preset: 'this_year' }, FRI)).toMatchObject({ from: '2026-01-01', to: '2026-12-31' });
  });
  it('explicit range keeps order and labels', () => {
    const r = resolveRange({ from: '2026-11-15', to: '2026-11-01' }, FRI);
    expect(r).toMatchObject({ from: '2026-11-01', to: '2026-11-15' });
    expect(r.label).toBeTruthy();
  });
  it('labels presets', () => {
    expect(resolveRange({ preset: 'last_month' }, FRI).label).toBe('last month (Oct 2026)');
    expect(resolveRange({ preset: 'this_month' }, FRI).label).toBe('this month');
  });
});
