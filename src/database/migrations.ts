/**
 * Versioned schema migrations tracked with PRAGMA user_version.
 * Version 1 = the tables created by initializeDatabase (installs before
 * migrations existed report user_version 0 and are treated as 1).
 */
export type SqlExec = {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
};

export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 2,
    sql: `
      ALTER TABLE transactions ADD COLUMN merchant TEXT;
      ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'manual';
      CREATE TABLE IF NOT EXISTS category_memory (
        key TEXT PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
        hits INTEGER NOT NULL DEFAULT 1,
        last_used TEXT NOT NULL
      );
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS day_marks (
        date TEXT PRIMARY KEY,
        kind TEXT NOT NULL DEFAULT 'nothing',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target REAL NOT NULL,
        saved REAL NOT NULL DEFAULT 0,
        target_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

export const runMigrations = async (db: SqlExec): Promise<number> => {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = Math.max(row?.user_version ?? 0, 1);

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    try {
      await db.execAsync(`BEGIN; ${m.sql} PRAGMA user_version = ${m.version}; COMMIT;`);
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => {});
      throw error;
    }
    current = m.version;
  }
  return current;
};
