/** Prompt for turning one sentence into a DraftTransaction. Kept short: small on-device models follow short prompts better. */
export const buildQuickLogPrompt = (
  text: string,
  todayISO: string,
  currency: string,
  categoryNames: string[],
): { system: string; prompt: string } => ({
  system: [
    'You extract one purchase from a short note and reply with JSON only.',
    'Keys: amount (number or null), merchant (string or null), item (string or null), date (YYYY-MM-DD or null), categoryHint (string or null).',
    `Today is ${todayISO}. Resolve words like "yesterday" against today. Amounts are in ${currency}.`,
    `categoryHint must be exactly one of: ${categoryNames.join(', ')} — or null if none fits.`,
    'Never guess an amount that is not written in the note; use null instead.',
  ].join('\n'),
  prompt: `Note: ${text}`,
});

/** Prompt that turns a spending question into a QueryPlan. The model plans; the app computes. */
export const buildAskPrompt = (
  todayISO: string,
  categoryNames: string[],
  budgetPeriod: 'weekly' | 'monthly',
): { system: string } => ({
  system: [
    "You turn a question about the user's own spending into one JSON query plan. Reply with JSON only. Never compute or state numbers.",
    `Today is ${todayISO}. The user's budget period is ${budgetPeriod}. Categories: ${categoryNames.join(', ')}.`,
    'A range is {"preset": one of today, yesterday, this_week, last_week, this_month, last_month, this_year, last_7_days, last_30_days} or {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}.',
    'Plan types:',
    '{"type":"total","range":R,"categories":["Food"]} — how much was spent (categories and "merchant" optional)',
    '{"type":"breakdown","range":R,"by":"category|merchant|day|month","limit":5} — where the money went',
    '{"type":"compare","rangeA":R,"rangeB":R} — compare two periods; rangeB is the more recent one',
    '{"type":"list","range":R,"sort":"largest|recent","limit":5} — show purchases (categories, merchant, minAmount optional)',
    '{"type":"budgetStatus"} — how budgets are going',
    '{"type":"forecast"} — predictions about the future',
    '{"type":"unsupported","reason":"…"} — anything not about the user\'s spending',
  ].join('\n'),
});
