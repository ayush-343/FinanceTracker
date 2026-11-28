jest.mock('@react-native-ai/apple', () => ({ apple: Object.assign(() => ({}), { getModelInfo: jest.fn() }) }));
jest.mock('@react-native-ai/llama', () => ({ llama: { languageModel: jest.fn() }, isModelDownloaded: jest.fn(), getModelPath: jest.fn() }));
jest.mock('ai', () => ({ generateText: jest.fn() }));

import { z } from 'zod';
import { selectEngine, generateJSON, LanguageEngine } from '../engine';

const fake = (id: 'apple' | 'local', ready: boolean, replies: string[] = []): LanguageEngine & { calls: number } => {
  const engine = {
    id,
    calls: 0,
    isReady: async () => ready,
    generate: async () => replies[engine.calls++] ?? '',
  };
  return engine;
};

describe('selectEngine', () => {
  it('off returns null', async () => {
    expect(await selectEngine('off', [fake('apple', true)])).toBeNull();
  });
  it('auto prefers apple', async () => {
    expect((await selectEngine('auto', [fake('local', true), fake('apple', true)]))?.id).toBe('apple');
  });
  it('auto falls back to local', async () => {
    expect((await selectEngine('auto', [fake('apple', false), fake('local', true)]))?.id).toBe('local');
  });
  it('auto falls back to off', async () => {
    expect(await selectEngine('auto', [fake('apple', false), fake('local', false)])).toBeNull();
  });
  it('explicit not ready → null', async () => {
    expect(await selectEngine('local', [fake('apple', true), fake('local', false)])).toBeNull();
  });
});

describe('generateJSON', () => {
  const schema = z.object({ a: z.number() });
  it('parses first reply', async () => {
    const e = fake('apple', true, ['{"a":1}']);
    expect(await generateJSON(e, 'p', 's', schema)).toEqual({ a: 1 });
    expect(e.calls).toBe(1);
  });
  it('retries once then null', async () => {
    const e = fake('apple', true, ['nope', 'still nope', '{"a":1}']);
    expect(await generateJSON(e, 'p', 's', schema)).toBeNull();
    expect(e.calls).toBe(2);
  });
  it('retry can succeed', async () => {
    const e = fake('apple', true, ['nope', '{"a":2}']);
    expect(await generateJSON(e, 'p', 's', schema)).toEqual({ a: 2 });
  });
});
