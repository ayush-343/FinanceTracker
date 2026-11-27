import { withDatabase } from './database';

/** Days that count as logged: any transaction, or an explicit "nothing spent today" mark. */
export const loadDrawnDays = async (from: string, to: string): Promise<Set<string>> =>
  withDatabase(async (db) => {
    const rows = await db.getAllAsync<{ date: string }>(
      `SELECT DISTINCT date FROM transactions WHERE date >= ? AND date <= ?
       UNION SELECT date FROM day_marks WHERE date >= ? AND date <= ?`,
      [from, to, from, to],
    );
    return new Set(rows.map((r) => r.date));
  });

export const markNothingSpent = async (date: string): Promise<void> =>
  withDatabase(async (db) => {
    await db.runAsync("INSERT OR IGNORE INTO day_marks (date, kind) VALUES (?, 'nothing')", [date]);
  });
