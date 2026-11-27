jest.mock('@react-native-ai/apple', () => ({}));
jest.mock('@react-native-ai/llama', () => ({}));
jest.mock('ai', () => ({}));

import { askQuestion } from '../ask';
import { buildAskPrompt } from '../../prompts';
import { LanguageEngine } from '../../engine';
import { createFixtureDb } from './fixtureDb';

const money = (n: number) => `₹${n.toLocaleString('en-US')}`;
const cats = [{ id: 1, name: 'Food' }, { id: 2, name: 'Transport' }, { id: 3, name: 'Shopping' }];
const engine = (replies: (string | Error)[]): LanguageEngine => {
  let i = 0;
  return {
    id: 'apple',
    isReady: async () => true,
    generate: async () => { const r = replies[i++] ?? ''; if (r instanceof Error) throw r; return r; },
  };
};
const deps = async (e: LanguageEngine) => ({
  engine: e, db: await createFixtureDb(), today: new Date(2026, 10, 27), categories: cats, budgetPeriod: 'monthly' as const, formatMoney: money,
});
const FOOD_NOV = '{"type":"total","range":{"preset":"this_month"},"categories":["food"]}';

describe('askQuestion', () => {
  it('valid plan → correct total, model sentence kept when numbers match', async () => {
    const r = await askQuestion('food this month?', await deps(engine([FOOD_NOV, 'Food came to ₹2,150 over 3 purchases this month.'])));
    expect(r.result).toEqual({ kind: 'total', value: 2150, count: 3, label: 'this month' });
    expect(r.sentence).toBe('Food came to ₹2,150 over 3 purchases this month.');
  });
  it('model sentence with a wrong number → template', async () => {
    const r = await askQuestion('food this month?', await deps(engine([FOOD_NOV, 'About ₹2,200 on food.'])));
    expect(r.sentence).toBe('You spent ₹2,150 on Food this month across 3 purchases.');
  });
  it('garbage JSON twice → unsupported', async () => {
    const r = await askQuestion('hmm', await deps(engine(['no idea', 'still no'])));
    expect(r.result.kind).toBe('unsupported');
    expect(r.sentence).toBe("I couldn't understand that. Try one of the suggestions.");
  });
  it('engine throwing on narration → template', async () => {
    const r = await askQuestion('food this month?', await deps(engine([FOOD_NOV, new Error('boom')])));
    expect(r.sentence).toBe('You spent ₹2,150 on Food this month across 3 purchases.');
  });
  it('unknown category → reason, no narration', async () => {
    const r = await askQuestion('pets?', await deps(engine(['{"type":"total","range":{"preset":"this_month"},"categories":["pets"]}'])));
    expect(r.sentence).toBe("I couldn't find a category called pets.");
  });
  it('planning call throwing → unsupported', async () => {
    const r = await askQuestion('x', await deps(engine([new Error('down')])));
    expect(r.result.kind).toBe('unsupported');
  });
});

describe('buildAskPrompt', () => {
  it('mentions today, categories and plan types', () => {
    const { system } = buildAskPrompt('2026-11-27', ['Food', 'Transport'], 'monthly');
    for (const s of ['2026-11-27', 'Food', 'Transport', 'total', 'breakdown', 'compare', 'list', 'budgetStatus', 'unsupported', 'last_month']) expect(system).toContain(s);
  });
});
