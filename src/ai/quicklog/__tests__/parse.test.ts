jest.mock('@react-native-ai/apple', () => ({}));
jest.mock('@react-native-ai/llama', () => ({}));
jest.mock('ai', () => ({}));

import { parseQuickLog } from '../parse';
import { buildQuickLogPrompt } from '../../prompts';
import { LanguageEngine } from '../../engine';

const TODAY = new Date(2026, 10, 27);
const deps = (engine: LanguageEngine | null) => ({ engine, today: TODAY, currency: 'INR', categoryNames: ['Food', 'Transport'] });
const engineReturning = (reply: string | Error): LanguageEngine => ({
  id: 'apple',
  isReady: async () => true,
  generate: async () => { if (reply instanceof Error) throw reply; return reply; },
});

describe('parseQuickLog', () => {
  it('engine null → pre-parse only', async () => {
    expect(await parseQuickLog('250 uber yesterday', deps(null))).toEqual({
      amount: 250, date: '2026-11-26', merchant: null, item: 'uber', categoryHint: null,
    });
  });

  it('falls back when engine throws', async () => {
    const r = await parseQuickLog('250 uber yesterday', deps(engineReturning(new Error('model crashed'))));
    expect(r).toMatchObject({ amount: 250, item: 'uber', categoryHint: null });
  });

  it('uses model merchant when pre has none', async () => {
    const reply = '{"amount":120,"merchant":"Starbucks","item":"latte","date":"2026-11-27","categoryHint":"Food"}';
    const r = await parseQuickLog('120 latte starbucks', deps(engineReturning(reply)));
    expect(r).toMatchObject({ amount: 120, merchant: 'Starbucks', item: 'latte', categoryHint: 'Food' });
  });
});

describe('buildQuickLogPrompt', () => {
  it('contains today and every category name', () => {
    const { system, prompt } = buildQuickLogPrompt('x', '2026-11-27', 'INR', ['Food', 'Transport']);
    const all = system + prompt;
    expect(all).toContain('2026-11-27');
    expect(all).toContain('Food');
    expect(all).toContain('Transport');
    expect(all).toContain('INR');
  });
});
