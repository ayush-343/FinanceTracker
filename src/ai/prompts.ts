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
