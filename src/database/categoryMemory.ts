import { withDatabase } from './database';
import { applyLearning, KnownItem, MemoryRow, normalizeKey } from '../ai/categorizer';

export const loadCategoryMemory = async (): Promise<MemoryRow[]> =>
  withDatabase((db) => db.getAllAsync<MemoryRow>('SELECT key, category_id, subcategory_id, hits, last_used FROM category_memory'));

export const upsertCategoryMemory = async (row: MemoryRow): Promise<void> =>
  withDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO category_memory (key, category_id, subcategory_id, hits, last_used) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET category_id = excluded.category_id, subcategory_id = excluded.subcategory_id,
         hits = excluded.hits, last_used = excluded.last_used`,
      [row.key, row.category_id, row.subcategory_id, row.hits, row.last_used]
    );
  });

export const clearCategoryMemory = async (): Promise<void> =>
  withDatabase(async (db) => {
    await db.runAsync('DELETE FROM category_memory');
  });

export const loadKnownItems = async (): Promise<KnownItem[]> =>
  withDatabase((db) =>
    db.getAllAsync<KnownItem>(
      'SELECT i.name, s.category_id, i.subcategory_id FROM items i JOIN subcategories s ON s.id = i.subcategory_id'
    )
  );

/** Records the user's choice for this text. Never throws: a save must not fail because learning failed. */
export const learnCategory = async (text: string, categoryId: number, subcategoryId: number | null): Promise<void> => {
  try {
    const key = normalizeKey(text);
    if (!key) return;
    const existing = await withDatabase((db) =>
      db.getAllAsync<MemoryRow>('SELECT key, category_id, subcategory_id, hits, last_used FROM category_memory WHERE key = ?', [key])
    );
    const row = applyLearning(existing, text, categoryId, subcategoryId, new Date().toISOString());
    if (row) await upsertCategoryMemory(row);
  } catch (error) {
    console.warn('[CategoryMemory] learn failed:', error);
  }
};
