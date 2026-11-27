import { z } from 'zod';
import { extractJson } from './json';

export type EngineId = 'apple' | 'local';
export type EnginePreference = 'auto' | 'apple' | 'local' | 'off';

export interface LanguageEngine {
  id: EngineId;
  isReady(): Promise<boolean>;
  generate(prompt: string, system: string): Promise<string>;
}

const AUTO_ORDER: EngineId[] = ['apple', 'local'];

/** Picks the engine to use for a preference; null means "no model", and every feature has a fallback for that. */
export const selectEngine = async (pref: EnginePreference, engines: LanguageEngine[]): Promise<LanguageEngine | null> => {
  if (pref === 'off') return null;
  const order = pref === 'auto' ? AUTO_ORDER : [pref];
  for (const id of order) {
    const engine = engines.find((e) => e.id === id);
    if (engine && (await engine.isReady().catch(() => false))) return engine;
  }
  return null;
};

const RETRY_SUFFIX = '\n\nReturn only valid JSON matching the schema. No other text.';

/** Asks the engine for JSON and validates it, retrying once. Returns null when the model can't produce valid output. */
export const generateJSON = async <T>(
  engine: LanguageEngine,
  prompt: string,
  system: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  const first = extractJson(await engine.generate(prompt, system), schema);
  if (first !== null) return first;
  return extractJson(await engine.generate(prompt + RETRY_SUFFIX, system), schema);
};

/** The engine for the user's current preference, built from the real providers. */
export const getEngine = async (pref: EnginePreference, localModelId: string): Promise<LanguageEngine | null> => {
  const [{ appleEngine }, { createLocalEngine }] = await Promise.all([import('./engines/apple'), import('./engines/local')]);
  return selectEngine(pref, [appleEngine, createLocalEngine(localModelId)]);
};
