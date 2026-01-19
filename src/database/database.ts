import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'finance_tracker.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
};

const initializeDatabase = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Create app_settings table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      biometric_enabled INTEGER DEFAULT 0,
      dark_mode INTEGER DEFAULT NULL,
      currency_code TEXT DEFAULT 'USD',
      budget_period TEXT DEFAULT 'monthly' CHECK (budget_period IN ('weekly', 'monthly')),
      onboarding_completed INTEGER DEFAULT 0
    );
  `);

  // Insert default settings if not exists
  await database.execAsync(`
    INSERT OR IGNORE INTO app_settings (id) VALUES (1);
  `);

  // Create budgets table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_limit REAL NOT NULL DEFAULT 0
    );
  `);

  // Create categories table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      budget_limit REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create subcategories table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      budget_limit REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );
  `);

  // Create items table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcategory_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      default_price REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE CASCADE
    );
  `);

  // Create transactions table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      category_id INTEGER NOT NULL,
      subcategory_id INTEGER,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE SET NULL
    );
  `);

  // Create subscriptions table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
      start_date TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );
  `);

  // Create subscription_skips table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS subscription_skips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      skip_date TEXT NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE,
      UNIQUE (subscription_id, skip_date)
    );
  `);

  // Create indexes for performance
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
    CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories (category_id);
    CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items (subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions (category_id);
  `);
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

export const initDatabase = async (): Promise<void> => {
  await getDatabase();
};
