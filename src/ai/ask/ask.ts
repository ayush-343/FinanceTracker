import { format } from 'date-fns';
import { generateJSON, LanguageEngine } from '../engine';
import { buildAskPrompt } from '../prompts';
import { buildNarrationPrompt, guardSentence, templateSentence } from './answer';
import { AskResult, executePlan, QueryDb } from './execute';
import { QueryPlan, QueryPlanSchema, resolvePlan } from './plan';

export interface AskDeps {
  engine: LanguageEngine;
  db: QueryDb;
  today: Date;
  categories: { id: number; name: string }[];
  budgetPeriod: 'weekly' | 'monthly';
  formatMoney: (n: number) => string;
}

const NOT_UNDERSTOOD = "I couldn't understand that. Try one of the suggestions.";

/** "on Food and Transport" / "at Uber" — built from the resolved plan, never from model text. */
const subjectFor = (categoryIds: number[], merchant: string | undefined, categories: AskDeps['categories']): string | undefined => {
  if (merchant) return `at ${merchant}`;
  const names = categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean);
  return names.length ? `on ${names.join(' and ')}` : undefined;
};

/** Question → plan (model) → resolved plan → SQL result (app) → sentence (template, optionally rephrased under the number guard). */
export const askQuestion = async (question: string, deps: AskDeps): Promise<{ result: AskResult; sentence: string }> => {
  const { system } = buildAskPrompt(format(deps.today, 'yyyy-MM-dd'), deps.categories.map((c) => c.name), deps.budgetPeriod);

  let plan: QueryPlan | null = null;
  try {
    plan = await generateJSON(deps.engine, `Question: ${question}`, system, QueryPlanSchema);
  } catch (error) {
    console.warn('[Ask] planning failed:', error);
  }
  if (!plan) return { result: { kind: 'unsupported', reason: NOT_UNDERSTOOD }, sentence: NOT_UNDERSTOOD };

  const resolved = resolvePlan(plan, deps.categories, deps.today, deps.budgetPeriod);
  if (resolved.type === 'unsupported') return { result: { kind: 'unsupported', reason: resolved.reason }, sentence: resolved.reason };

  const result = await executePlan(resolved, deps.db);
  const subject =
    resolved.type === 'total' ? subjectFor(resolved.categoryIds, resolved.merchant, deps.categories)
    : resolved.type === 'list' || resolved.type === 'compare' ? subjectFor(resolved.categoryIds, undefined, deps.categories)
    : undefined;
  const template = templateSentence(result, deps.formatMoney, subject);

  try {
    const narration = buildNarrationPrompt(question, template);
    const rephrased = (await deps.engine.generate(narration.prompt, narration.system)).trim().split('\n')[0];
    if (rephrased && guardSentence(rephrased, result)) return { result, sentence: rephrased };
  } catch (error) {
    console.warn('[Ask] narration failed, using template:', error);
  }
  return { result, sentence: template };
};
