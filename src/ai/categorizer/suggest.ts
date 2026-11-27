import { normalizeKey, tokens } from './normalize';

export interface MemoryRow {
  key: string;
  category_id: number;
  subcategory_id: number | null;
  hits: number;
  last_used: string;
}

export interface KnownItem {
  name: string;
  category_id: number;
  subcategory_id: number;
}

export interface Suggestion {
  categoryId: number;
  subcategoryId: number | null;
  source: 'exact' | 'fuzzy' | 'item';
  confidence: number;
}

const FUZZY_THRESHOLD = 0.5;
const ITEM_CONFIDENCE = 0.8;

const jaccard = (a: Set<string>, b: Set<string>): number => {
  let shared = 0;
  a.forEach((t) => { if (b.has(t)) shared++; });
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
};

export const suggestCategory = (
  text: string,
  memory: MemoryRow[],
  items: KnownItem[],
  validCategoryIds: Set<number>,
): Suggestion | null => {
  const key = normalizeKey(text);
  if (!key) return null;
  const usable = memory.filter((m) => validCategoryIds.has(m.category_id));

  const exact = usable.find((m) => m.key === key);
  if (exact) return { categoryId: exact.category_id, subcategoryId: exact.subcategory_id, source: 'exact', confidence: 1 };

  const keyTokens = tokens(key);
  let best: { row: MemoryRow; score: number } | null = null;
  for (const row of usable) {
    const score = jaccard(keyTokens, tokens(row.key));
    if (score < FUZZY_THRESHOLD) continue;
    const better =
      !best ||
      score > best.score ||
      (score === best.score && (row.hits > best.row.hits || (row.hits === best.row.hits && row.last_used > best.row.last_used)));
    if (better) best = { row, score };
  }
  if (best) return { categoryId: best.row.category_id, subcategoryId: best.row.subcategory_id, source: 'fuzzy', confidence: best.score };

  const item = items.find((i) => validCategoryIds.has(i.category_id) && normalizeKey(i.name) === key);
  if (item) return { categoryId: item.category_id, subcategoryId: item.subcategory_id, source: 'item', confidence: ITEM_CONFIDENCE };

  return null;
};

/** Returns the memory row to upsert after the user saves a categorized entry, or null if the text has no usable key. */
export const applyLearning = (
  memory: MemoryRow[],
  text: string,
  categoryId: number,
  subcategoryId: number | null,
  now: string,
): MemoryRow | null => {
  const key = normalizeKey(text);
  if (!key) return null;
  const existing = memory.find((m) => m.key === key);
  const sameCategory = existing && existing.category_id === categoryId && existing.subcategory_id === subcategoryId;
  return { key, category_id: categoryId, subcategory_id: subcategoryId, hits: sameCategory ? existing.hits + 1 : 1, last_used: now };
};
