// Pure-JS build: the WASM build fails to start under the jest-expo environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs: typeof import('sql.js').default = require('sql.js/dist/sql-asm.js');
import { QueryDb } from '../execute';

/** Real in-memory SQLite (sql.js) with the app's relevant tables and a small known dataset. */
export const createFixtureDb = async (withRows = true, extraSql = ''): Promise<QueryDb> => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, icon_name TEXT NOT NULL, budget_limit REAL NOT NULL DEFAULT 0);
    CREATE TABLE subcategories (id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL, name TEXT NOT NULL);
    CREATE TABLE items (id INTEGER PRIMARY KEY, subcategory_id INTEGER NOT NULL, name TEXT NOT NULL);
    CREATE TABLE transactions (id INTEGER PRIMARY KEY, item_id INTEGER, category_id INTEGER NOT NULL, subcategory_id INTEGER,
      amount REAL NOT NULL, date TEXT NOT NULL, notes TEXT DEFAULT '', merchant TEXT, source TEXT DEFAULT 'manual');
    INSERT INTO categories VALUES (1,'Food','#EF4444','coffee',3000),(2,'Transport','#14B8A6','truck',0),(3,'Shopping','#6366F1','bag',1000);
    INSERT INTO subcategories VALUES (1,2,'Cabs');
    INSERT INTO items VALUES (1,1,'Uber ride');
    CREATE TABLE subscriptions (id INTEGER PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, frequency TEXT NOT NULL,
      start_date TEXT NOT NULL, category_id INTEGER NOT NULL, is_active INTEGER DEFAULT 1);
    CREATE TABLE subscription_skips (id INTEGER PRIMARY KEY, subscription_id INTEGER NOT NULL, skip_date TEXT NOT NULL);
  `);
  if (withRows) {
    db.run(`
      INSERT INTO transactions (id,item_id,category_id,subcategory_id,amount,date,notes,merchant) VALUES
        (1,NULL,1,NULL,500,'2026-10-05','','Swiggy'),
        (2,1,2,1,300,'2026-10-20','',NULL),
        (3,NULL,1,NULL,1200,'2026-11-02','','Swiggy'),
        (4,NULL,1,NULL,800,'2026-11-10','groceries',NULL),
        (5,NULL,2,NULL,250,'2026-11-15','','Uber'),
        (6,NULL,3,NULL,900,'2026-11-20','','Amazon'),
        (7,NULL,1,NULL,150,'2026-11-26','','Blue Tokai');
    `);
  }
  if (extraSql) db.run(extraSql);
  return {
    getAllAsync: async <T,>(sql: string, params: (string | number)[]) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      stmt.free();
      return rows;
    },
  };
};
