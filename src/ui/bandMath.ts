import { CATEGORY_HUES, CATEGORY_HUES_DARK } from './tokens';

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
export const hueFor = (index: number, dark = false): string => {
  const wheel = dark ? CATEGORY_HUES_DARK : CATEGORY_HUES;
  const n = wheel.length;
  return wheel[((Math.trunc(index) % n) + n) % n];
};

/** Stable category → hue mapping: categories are ordered by id so a category keeps its colour everywhere. */
export const hueMap = (categoryIds: number[], dark = false): Map<number, string> =>
  new Map([...categoryIds].sort((a, b) => a - b).map((id, i) => [id, hueFor(i, dark)]));
