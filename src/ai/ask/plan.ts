import { z } from 'zod';
import { resolveRange, ResolvedRange } from './range';

const PresetSchema = z.enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'last_7_days', 'last_30_days']);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const RangeSchema = z.union([z.object({ preset: PresetSchema }), z.object({ from: DateSchema, to: DateSchema })]);
const Limit = z.number().int().min(1).max(20).default(5);
const Categories = z.array(z.string().min(1)).optional();

/** The only things the model may ask the app to compute. */
export const QueryPlanSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('total'), range: RangeSchema, categories: Categories, merchant: z.string().min(1).optional() }),
  z.object({ type: z.literal('breakdown'), range: RangeSchema, by: z.enum(['category', 'merchant', 'day', 'month']), limit: Limit }),
  z.object({ type: z.literal('compare'), rangeA: RangeSchema, rangeB: RangeSchema, categories: Categories }),
  z.object({
    type: z.literal('list'), range: RangeSchema, categories: Categories, merchant: z.string().min(1).optional(),
    minAmount: z.number().nonnegative().optional(), sort: z.enum(['largest', 'recent']).default('largest'), limit: Limit,
  }),
  z.object({ type: z.literal('budgetStatus') }),
  z.object({ type: z.literal('forecast') }),
  z.object({ type: z.literal('unsupported'), reason: z.string() }),
]);

export type QueryPlan = z.infer<typeof QueryPlanSchema>;
type QueryPlanInput = z.input<typeof QueryPlanSchema>;

export type ResolvedPlan =
  | { type: 'total'; range: ResolvedRange; categoryIds: number[]; merchant?: string }
  | { type: 'breakdown'; range: ResolvedRange; by: 'category' | 'merchant' | 'day' | 'month'; limit: number }
  | { type: 'compare'; rangeA: ResolvedRange; rangeB: ResolvedRange; categoryIds: number[] }
  | { type: 'list'; range: ResolvedRange; categoryIds: number[]; merchant?: string; minAmount?: number; sort: 'largest' | 'recent'; limit: number }
  | { type: 'budgetStatus'; range: ResolvedRange };

export type Unsupported = { type: 'unsupported'; reason: string };

const canon = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Matches a category name loosely: case, "&" vs "and", punctuation; then containment either way. */
export const matchCategory = (name: string, categories: { id: number; name: string }[]): number | null => {
  const n = canon(name);
  if (!n) return null;
  const exact = categories.find((c) => canon(c.name) === n);
  if (exact) return exact.id;
  const partial = categories.find((c) => canon(c.name).includes(n) || n.includes(canon(c.name)));
  return partial?.id ?? null;
};

export const resolvePlan = (
  input: QueryPlanInput | QueryPlan,
  categories: { id: number; name: string }[],
  today: Date,
  budgetPeriod: 'weekly' | 'monthly',
): ResolvedPlan | Unsupported => {
  const plan = QueryPlanSchema.parse(input);
  const ids = (names?: string[]): number[] | Unsupported => {
    const out: number[] = [];
    for (const name of names ?? []) {
      const id = matchCategory(name, categories);
      if (id == null) return { type: 'unsupported', reason: `I couldn't find a category called ${name}.` };
      out.push(id);
    }
    return out;
  };

  switch (plan.type) {
    case 'unsupported': return plan;
    case 'forecast': return { type: 'unsupported', reason: 'Forecasts are coming soon.' };
    case 'budgetStatus':
      return { type: 'budgetStatus', range: resolveRange({ preset: budgetPeriod === 'weekly' ? 'this_week' : 'this_month' }, today) };
    case 'breakdown':
      return { type: 'breakdown', range: resolveRange(plan.range, today), by: plan.by, limit: plan.limit };
    case 'total': {
      const c = ids(plan.categories);
      if (!Array.isArray(c)) return c;
      return { type: 'total', range: resolveRange(plan.range, today), categoryIds: c, merchant: plan.merchant };
    }
    case 'compare': {
      const c = ids(plan.categories);
      if (!Array.isArray(c)) return c;
      return { type: 'compare', rangeA: resolveRange(plan.rangeA, today), rangeB: resolveRange(plan.rangeB, today), categoryIds: c };
    }
    case 'list': {
      const c = ids(plan.categories);
      if (!Array.isArray(c)) return c;
      return {
        type: 'list', range: resolveRange(plan.range, today), categoryIds: c, merchant: plan.merchant,
        minAmount: plan.minAmount, sort: plan.sort, limit: plan.limit,
      };
    }
  }
};
