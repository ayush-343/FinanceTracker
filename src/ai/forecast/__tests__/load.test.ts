jest.mock('@react-native-ai/apple', () => ({}));
jest.mock('@react-native-ai/llama', () => ({}));
jest.mock('ai', () => ({}));

import { loadForecastInput } from '../load';
import { createFixtureDb } from '../../ask/__tests__/fixtureDb';
import { askQuestion } from '../../ask/ask';

const TODAY = new Date(2026, 10, 20);
const EXTRA = `
  INSERT INTO subscriptions VALUES (1,'Spotify',199,'monthly','2026-06-05',1,1),(2,'Gym',50,'weekly','2026-11-06',2,1),(3,'Old',10,'daily','2026-01-01',3,0);
  INSERT INTO transactions (id,category_id,amount,date,notes) VALUES (8,1,199,'2026-11-05','Subscription: Spotify');
`;

describe('loadForecastInput', () => {
  it('builds the forecast input from SQLite', async () => {
    const input = await loadForecastInput(await createFixtureDb(true, EXTRA), TODAY, 'monthly');
    expect(input.period).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(input.today).toBe('2026-11-20');
    expect(input.earliestTransaction).toBe('2026-10-05');
    expect(input.spentSoFar).toEqual({ 1: 2199, 2: 250, 3: 900 });
    expect(input.daily.find((d) => d.date === '2026-11-05')).toBeUndefined();
    expect(input.upcomingSubscriptions).toEqual([{ date: '2026-11-27', categoryId: 2, amount: 50 }]);
    expect(input.categories.find((c) => c.id === 1)).toEqual({ id: 1, name: 'Food', color: '#EF4444', budget: 3000 });
  });
  it('respects skips', async () => {
    const input = await loadForecastInput(await createFixtureDb(true, EXTRA + "INSERT INTO subscription_skips VALUES (1,2,'2026-11-27');"), TODAY, 'monthly');
    expect(input.upcomingSubscriptions).toEqual([]);
  });
  it('Ask answers forecast questions', async () => {
    const engine = { id: 'apple' as const, isReady: async () => true, generate: jest.fn().mockResolvedValueOnce('{"type":"forecast"}').mockResolvedValueOnce('') };
    const r = await askQuestion('will I go over?', {
      engine, db: await createFixtureDb(true, EXTRA), today: TODAY, categories: [{ id: 1, name: 'Food' }],
      budgetPeriod: 'monthly', formatMoney: (n) => `₹${n}`,
    });
    expect(r.result.kind).toBe('forecast');
    expect(r.sentence).toMatch(/^You're on pace for ₹/);
  });
});
