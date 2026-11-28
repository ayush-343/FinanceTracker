import { z } from 'zod';

/** Pulls the outermost JSON object out of model text and validates it. Returns null on any failure. */
export const extractJson = <T>(text: string, schema: z.ZodType<T>): T | null => {
  const unfenced = text.replace(/```(?:json)?/gi, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const result = schema.safeParse(JSON.parse(unfenced.slice(start, end + 1)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
