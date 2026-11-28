import { format } from 'date-fns';
import { generateJSON, LanguageEngine } from '../engine';
import { buildQuickLogPrompt } from '../prompts';
import { DraftTransactionSchema, DraftTransaction } from '../schemas';
import { mergeDraft, QuickLogResult } from './merge';
import { preParse } from './preParse';

export interface QuickLogDeps {
  engine: LanguageEngine | null;
  today: Date;
  currency: string;
  categoryNames: string[];
}

/** Rule-based parse first, then the model if one is available. Any model failure falls back to the rule-based result. */
export const parseQuickLog = async (text: string, deps: QuickLogDeps): Promise<QuickLogResult> => {
  const pre = preParse(text, deps.today);
  let draft: DraftTransaction | null = null;
  if (deps.engine) {
    const { system, prompt } = buildQuickLogPrompt(text, format(deps.today, 'yyyy-MM-dd'), deps.currency, deps.categoryNames);
    try {
      draft = await generateJSON(deps.engine, prompt, system, DraftTransactionSchema);
    } catch (error) {
      console.warn('[QuickLog] model failed, using rule-based parse:', error);
    }
  }
  return mergeDraft(pre, draft);
};
