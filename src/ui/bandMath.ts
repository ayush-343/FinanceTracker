import { CATEGORY_HUES } from './tokens';

export interface BandInput { key: string; value: number; color: string }
export interface BandSegment { key: string; color: string; fraction: number }

/**
 * Exact proportional segments. Fractions are of `total` (default: the sum of positive values);
 * the last segment absorbs floating-point error so the segments sum exactly to sum/total.
 */
export const bandSegments = (values: BandInput[], total?: number): BandSegment[] => {
  const positive = values.filter((v) => v.value > 0);
  const sum = positive.reduce((s, v) => s + v.value, 0);
  const denom = total ?? sum;
  if (!positive.length || denom <= 0) return [];
  const target = Math.min(sum / denom, 1);
  let used = 0;
  return positive.map((v, i) => {
    const fraction = i === positive.length - 1 ? target - used : v.value / denom;
    used += fraction;
    return { key: v.key, color: v.color, fraction };
  });
};

/** Category hue for a stable index (e.g. category id or position). */
export const hueFor = (index: number): string => {
  const n = CATEGORY_HUES.length;
  return CATEGORY_HUES[((Math.trunc(index) % n) + n) % n];
};
