import { subscriptionChargesBetween } from '../subscriptions';

const sub = (frequency: 'daily' | 'weekly' | 'monthly', start_date: string, is_active = true) => ({ amount: 100, frequency, start_date, is_active });
const none = new Set<string>();

describe('subscriptionChargesBetween', () => {
  it('daily', () => expect(subscriptionChargesBetween(sub('daily', '2026-11-25'), '2026-11-21', '2026-11-30', none)).toHaveLength(6));
  it('weekly same weekday', () => expect(subscriptionChargesBetween(sub('weekly', '2026-10-02'), '2026-11-01', '2026-11-30', none).map((c) => c.date))
    .toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']));
  it('monthly same day', () => expect(subscriptionChargesBetween(sub('monthly', '2026-01-05'), '2026-11-01', '2026-12-31', none).map((c) => c.date))
    .toEqual(['2026-11-05', '2026-12-05']));
  it('monthly on 31st skips short month', () => expect(subscriptionChargesBetween(sub('monthly', '2026-01-31'), '2026-11-01', '2026-12-31', none).map((c) => c.date))
    .toEqual(['2026-12-31']));
  it('not before start', () => expect(subscriptionChargesBetween(sub('monthly', '2026-12-05'), '2026-11-01', '2026-11-30', none)).toEqual([]));
  it('skips respected', () => expect(subscriptionChargesBetween(sub('weekly', '2026-10-02'), '2026-11-01', '2026-11-30', new Set(['2026-11-13']))).toHaveLength(3));
  it('inactive empty', () => expect(subscriptionChargesBetween(sub('daily', '2026-01-01', false), '2026-11-01', '2026-11-30', none)).toEqual([]));
});
