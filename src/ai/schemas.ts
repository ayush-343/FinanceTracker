import { z } from 'zod';

const optionalText = z.string().trim().min(1).nullable().catch(null).default(null);

/** What the language model may return for a one-line purchase. Missing keys become null. */
export const DraftTransactionSchema = z.object({
  amount: z.number().positive().nullable().default(null),
  merchant: optionalText,
  item: optionalText,
  date: z.string().nullable().default(null),
  categoryHint: optionalText,
});

export type DraftTransaction = z.infer<typeof DraftTransactionSchema>;
