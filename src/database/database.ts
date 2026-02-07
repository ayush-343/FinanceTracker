import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'finance_tracker.db';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let isInitialized = false;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Mutex for serializing database operations on Android
let operationQueue: Promise<any> = Promise.resolve();

// Retry configuration for Android
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 300;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper to serialize database operations on Android to prevent race conditions
export const withDatabase = async <T>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> => {
  const database = await getDatabase();
  
  if (Platform.OS === 'android') {
    // Serialize operations on Android to prevent NullPointerException
    const result = operationQueue.then(async () => {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          return await operation(database);
        } catch (error: any) {
          lastError = error;
          // Only retry on NullPointerException
          if (error?.message?.includes('NullPointerException') && attempt < 3) {
            console.warn(`[Database] Operation failed (attempt ${attempt}), retrying...`);
            await delay(100 * attempt);
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    });
    
    operationQueue = result.catch(() => {});
    return result;
  }
  
  return operation(database);
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // Return existing database if already initialized and verified
  if (db && isInitialized) return db;
  
  // If currently initializing, wait for the existing promise
  if (isInitializing && initPromise) {
    return initPromise;
  }
  
  // Start initialization
  isInitializing = true;
  initPromise = (async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Add delay on Android to ensure native modules are ready
        if (Platform.OS === 'android') {
          await delay(RETRY_DELAY_MS * attempt);
        }
        
        console.log(`[Database] Opening database (attempt ${attempt}/${MAX_RETRIES})...`);
        const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
        
        // Verify database is working with a simple query
        await database.execAsync('SELECT 1');
        
        console.log('[Database] Database opened, initializing schema...');
        await initializeDatabase(database);
        
        console.log('[Database] Database initialized successfully');
        db = database;
        isInitialized = true;
        return database;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[Database] Initialization attempt ${attempt} failed:`, error);
        
        // Reset for retry
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
        }
      }
    }
    
    // All retries failed
    isInitializing = false;
    initPromise = null;
    throw lastError || new Error('Failed to initialize database');
  })();
  
  return initPromise;
};

export const isDatabaseReady = (): boolean => isInitialized;

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

  // Create barcode_cache table for product lookups
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS barcode_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL UNIQUE,
      product_name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      last_known_price REAL,
      cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );
  `);

  // Create indexes for performance
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
    CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories (category_id);
    CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items (subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions (category_id);
    CREATE INDEX IF NOT EXISTS idx_barcode_cache_barcode ON barcode_cache (barcode);
    CREATE INDEX IF NOT EXISTS idx_barcode_cache_expires ON barcode_cache (expires_at);
  `);
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    isInitializing = false;
    isInitialized = false;
    initPromise = null;
  }
};

export const initDatabase = async (): Promise<void> => {
  try {
    await getDatabase();
  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
    throw error;
  }
};
