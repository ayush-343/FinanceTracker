import { getDatabase, withDatabase } from './database';
import { AppSettings, Category, Subcategory, Item, Transaction, Subscription, SubscriptionSkip, CategoryWithSpending, TransactionWithDetails } from '../types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

// ============ APP SETTINGS ============

export const getSettings = async (): Promise<AppSettings | null> => {
  return withDatabase(async (db) => {
    const result = await db.getFirstAsync<AppSettings>('SELECT * FROM app_settings WHERE id = 1');
    return result ? {
      ...result,
      biometric_enabled: Boolean(result.biometric_enabled),
      onboarding_completed: Boolean(result.onboarding_completed),
      dark_mode: result.dark_mode === null ? null : Boolean(result.dark_mode),
    } : null;
  });
};

export const updateSettings = async (settings: Partial<Omit<AppSettings, 'id'>>): Promise<void> => {
  return withDatabase(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (settings.biometric_enabled !== undefined) {
      updates.push('biometric_enabled = ?');
      values.push(settings.biometric_enabled ? 1 : 0);
    }
    if (settings.dark_mode !== undefined) {
      updates.push('dark_mode = ?');
      values.push(settings.dark_mode === null ? null : settings.dark_mode ? 1 : 0);
    }
    if (settings.currency_code !== undefined) {
      updates.push('currency_code = ?');
      values.push(settings.currency_code);
    }
    if (settings.budget_period !== undefined) {
      updates.push('budget_period = ?');
      values.push(settings.budget_period);
    }
    if (settings.onboarding_completed !== undefined) {
      updates.push('onboarding_completed = ?');
      values.push(settings.onboarding_completed ? 1 : 0);
    }

    if (updates.length > 0) {
      await db.runAsync(`UPDATE app_settings SET ${updates.join(', ')} WHERE id = 1`, values);
    }
  });
};

export const resetAllData = async (): Promise<void> => {
  return withDatabase(async (db) => {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.runAsync('DELETE FROM subscription_skips');
    await db.runAsync('DELETE FROM subscriptions');
    await db.runAsync('DELETE FROM transactions');
    await db.runAsync('DELETE FROM items');
    await db.runAsync('DELETE FROM subcategories');
    await db.runAsync('DELETE FROM categories');
    await db.runAsync('DELETE FROM budgets');
    await db.runAsync('DELETE FROM barcode_cache');
    await db.runAsync(
      "UPDATE app_settings SET biometric_enabled = 0, dark_mode = NULL, currency_code = 'USD', budget_period = 'monthly', onboarding_completed = 0 WHERE id = 1"
    );
  });
};

// ============ CATEGORIES ============

export const getCategories = async (): Promise<Category[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
  });
};

export const getCategoryById = async (id: number): Promise<Category | null> => {
  return withDatabase(async (db) => {
    return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  });
};

export const createCategory = async (category: Omit<Category, 'id'>): Promise<number> => {
  return withDatabase(async (db) => {
    const result = await db.runAsync(
      'INSERT INTO categories (name, color, icon_name, budget_limit) VALUES (?, ?, ?, ?)',
      [category.name, category.color, category.icon_name, category.budget_limit]
    );
    return result.lastInsertRowId;
  });
};

export const updateCategory = async (id: number, category: Partial<Omit<Category, 'id'>>): Promise<void> => {
  return withDatabase(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (category.name !== undefined) { updates.push('name = ?'); values.push(category.name); }
    if (category.color !== undefined) { updates.push('color = ?'); values.push(category.color); }
    if (category.icon_name !== undefined) { updates.push('icon_name = ?'); values.push(category.icon_name); }
    if (category.budget_limit !== undefined) { updates.push('budget_limit = ?'); values.push(category.budget_limit); }

    if (updates.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  });
};

export const deleteCategory = async (id: number): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  });
};

// ============ SUBCATEGORIES ============

export const getSubcategories = async (categoryId: number): Promise<Subcategory[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name',
      [categoryId]
    );
  });
};

export const getSubcategoryById = async (id: number): Promise<Subcategory | null> => {
  return withDatabase(async (db) => {
    return db.getFirstAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE id = ?',
      [id]
    );
  });
};

export const createSubcategory = async (subcategory: Omit<Subcategory, 'id'>): Promise<number> => {
  return withDatabase(async (db) => {
    const result = await db.runAsync(
      'INSERT INTO subcategories (category_id, name, budget_limit) VALUES (?, ?, ?)',
      [subcategory.category_id, subcategory.name, subcategory.budget_limit ?? 0]
    );
    return result.lastInsertRowId;
  });
};

export const updateSubcategory = async (id: number, subcategory: Partial<Omit<Subcategory, 'id'>>): Promise<void> => {
  return withDatabase(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (subcategory.name !== undefined) { updates.push('name = ?'); values.push(subcategory.name); }
    if (subcategory.budget_limit !== undefined) { updates.push('budget_limit = ?'); values.push(subcategory.budget_limit); }

    if (updates.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE subcategories SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  });
};

export const deleteSubcategory = async (id: number): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync('DELETE FROM subcategories WHERE id = ?', [id]);
  });
};

// ============ ITEMS ============

export const getItems = async (subcategoryId: number): Promise<Item[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<Item>(
      'SELECT * FROM items WHERE subcategory_id = ? ORDER BY name',
      [subcategoryId]
    );
  });
};

export const createItem = async (item: Omit<Item, 'id'>): Promise<number> => {
  return withDatabase(async (db) => {
    const result = await db.runAsync(
      'INSERT INTO items (subcategory_id, name, default_price) VALUES (?, ?, ?)',
      [item.subcategory_id, item.name, item.default_price]
    );
    return result.lastInsertRowId;
  });
};

const updateItem = async (id: number, item: Partial<Omit<Item, 'id'>>): Promise<void> => {
  return withDatabase(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (item.name !== undefined) { updates.push('name = ?'); values.push(item.name); }
    if (item.default_price !== undefined) { updates.push('default_price = ?'); values.push(item.default_price); }

    if (updates.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  });
};

const deleteItem = async (id: number): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  });
};

// ============ TRANSACTIONS ============

export const getTransactions = async (startDate: string, endDate: string): Promise<TransactionWithDetails[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<TransactionWithDetails>(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon_name as category_icon,
        s.name as subcategory_name,
        i.name as item_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN items i ON t.item_id = i.id
      WHERE t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC, t.created_at DESC
    `, [startDate, endDate]);
  });
};

export const getTransactionsByDate = async (date: string): Promise<TransactionWithDetails[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<TransactionWithDetails>(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon_name as category_icon,
        s.name as subcategory_name,
        i.name as item_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN items i ON t.item_id = i.id
      WHERE t.date = ?
      ORDER BY t.created_at DESC
    `, [date]);
  });
};

export const getTransactionById = async (id: number): Promise<TransactionWithDetails | null> => {
  return withDatabase(async (db) => {
    const result = await db.getFirstAsync<TransactionWithDetails>(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon_name as category_icon,
        s.name as subcategory_name,
        i.name as item_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN items i ON t.item_id = i.id
      WHERE t.id = ?
    `, [id]);
    return result || null;
  });
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<number> => {
  return withDatabase(async (db) => {
    console.log('[Database] createTransaction called with:', JSON.stringify(transaction, null, 2));
    const result = await db.runAsync(
      'INSERT INTO transactions (item_id, category_id, subcategory_id, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [transaction.item_id, transaction.category_id, transaction.subcategory_id, transaction.amount, transaction.date, transaction.notes]
    );
    console.log('[Database] Transaction inserted, lastInsertRowId:', result.lastInsertRowId);
    return result.lastInsertRowId;
  });
};

export const updateTransaction = async (id: number, transaction: Partial<Omit<Transaction, 'id' | 'created_at'>>): Promise<void> => {
  return withDatabase(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (transaction.item_id !== undefined) { updates.push('item_id = ?'); values.push(transaction.item_id); }
    if (transaction.category_id !== undefined) { updates.push('category_id = ?'); values.push(transaction.category_id); }
    if (transaction.subcategory_id !== undefined) { updates.push('subcategory_id = ?'); values.push(transaction.subcategory_id); }
    if (transaction.amount !== undefined) { updates.push('amount = ?'); values.push(transaction.amount); }
    if (transaction.date !== undefined) { updates.push('date = ?'); values.push(transaction.date); }
    if (transaction.notes !== undefined) { updates.push('notes = ?'); values.push(transaction.notes); }

    if (updates.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  });
};

export const deleteTransaction = async (id: number): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  });
};

export const getTransactionsByCategory = async (categoryId: number, startDate?: string, endDate?: string): Promise<TransactionWithDetails[]> => {
  return withDatabase(async (db) => {
    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon_name as category_icon,
        s.name as subcategory_name,
        i.name as item_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN items i ON t.item_id = i.id
      WHERE t.category_id = ?
    `;

    const params: (number | string)[] = [categoryId];

    if (startDate && endDate) {
      query += ` AND t.date >= ? AND t.date <= ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;

    return db.getAllAsync<TransactionWithDetails>(query, params);
  });
};

// ============ SPENDING AGGREGATIONS ============

export const getCategoriesWithSpending = async (startDate: string, endDate: string): Promise<CategoryWithSpending[]> => {
  return withDatabase(async (db) => {
    const results = await db.getAllAsync<Category & { spent: number }>(`
      SELECT 
        c.*,
        COALESCE(SUM(t.amount), 0) as spent
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.date >= ? AND t.date <= ?
      GROUP BY c.id
      ORDER BY c.name
    `, [startDate, endDate]);

    return results.map(cat => ({
      ...cat,
      percentage: cat.budget_limit > 0 ? (cat.spent / cat.budget_limit) * 100 : 0,
    }));
  });
};

export const getTotalSpending = async (startDate: string, endDate: string): Promise<number> => {
  return withDatabase(async (db) => {
    const result = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date >= ? AND date <= ?',
      [startDate, endDate]
    );
    return result?.total || 0;
  });
};

export const getDailySpending = async (startDate: string, endDate: string): Promise<{ date: string; total: number }[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<{ date: string; total: number }>(`
      SELECT date, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date
    `, [startDate, endDate]);
  });
};

// ============ SUBSCRIPTIONS ============

export const getSubscriptions = async (): Promise<Subscription[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<Subscription>('SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY name');
  });
};

export const getSubscriptionById = async (id: number): Promise<Subscription | null> => {
  return withDatabase(async (db) => {
    return db.getFirstAsync<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id]);
  });
};

export const createSubscription = async (subscription: Omit<Subscription, 'id' | 'is_active'>): Promise<number> => {
  return withDatabase(async (db) => {
    const result = await db.runAsync(
      'INSERT INTO subscriptions (name, amount, frequency, start_date, category_id) VALUES (?, ?, ?, ?, ?)',
      [subscription.name, subscription.amount, subscription.frequency, subscription.start_date, subscription.category_id]
    );
    return result.lastInsertRowId;
  });
};

export const updateSubscription = async (id: number, subscription: Partial<Omit<Subscription, 'id'>>): Promise<void> => {
  return withDatabase(async (db) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (subscription.name !== undefined) { updates.push('name = ?'); values.push(subscription.name); }
    if (subscription.amount !== undefined) { updates.push('amount = ?'); values.push(subscription.amount); }
    if (subscription.frequency !== undefined) { updates.push('frequency = ?'); values.push(subscription.frequency); }
    if (subscription.start_date !== undefined) { updates.push('start_date = ?'); values.push(subscription.start_date); }
    if (subscription.category_id !== undefined) { updates.push('category_id = ?'); values.push(subscription.category_id); }
    if (subscription.is_active !== undefined) { updates.push('is_active = ?'); values.push(subscription.is_active ? 1 : 0); }

    if (updates.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  });
};

export const deleteSubscription = async (id: number): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
  });
};

// ============ SUBSCRIPTION SKIPS ============

export const getSubscriptionSkips = async (subscriptionId: number): Promise<SubscriptionSkip[]> => {
  return withDatabase(async (db) => {
    return db.getAllAsync<SubscriptionSkip>(
      'SELECT * FROM subscription_skips WHERE subscription_id = ? ORDER BY skip_date',
      [subscriptionId]
    );
  });
};

export const addSubscriptionSkip = async (subscriptionId: number, skipDate: string): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync(
      'INSERT OR IGNORE INTO subscription_skips (subscription_id, skip_date) VALUES (?, ?)',
      [subscriptionId, skipDate]
    );
  });
};

export const removeSubscriptionSkip = async (subscriptionId: number, skipDate: string): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync(
      'DELETE FROM subscription_skips WHERE subscription_id = ? AND skip_date = ?',
      [subscriptionId, skipDate]
    );
  });
};

export const isSubscriptionSkipped = async (subscriptionId: number, date: string): Promise<boolean> => {
  return withDatabase(async (db) => {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM subscription_skips WHERE subscription_id = ? AND skip_date = ?',
      [subscriptionId, date]
    );
    return (result?.count || 0) > 0;
  });
};

// ============ BARCODE CACHE ============

interface BarcodeCache {
  id: number;
  barcode: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  last_known_price: number | null;
  cached_at: string;
  expires_at: string;
}

/**
 * Get cached barcode product if not expired
 */
export const getCachedBarcode = async (barcode: string): Promise<BarcodeCache | null> => {
  return withDatabase(async (db) => {
    return db.getFirstAsync<BarcodeCache>(
      `SELECT * FROM barcode_cache 
       WHERE barcode = ? 
       AND datetime(expires_at) > datetime('now')`,
      [barcode]
    );
  });
};

/**
 * Cache a barcode product with 1-month expiry
 */
export const cacheBarcode = async (product: {
  barcode: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  last_known_price: number | null;
}): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync(
      `INSERT OR REPLACE INTO barcode_cache 
       (barcode, product_name, brand, category, last_known_price, cached_at, expires_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now', '+1 month'))`,
      [product.barcode, product.product_name, product.brand, product.category, product.last_known_price]
    );
  });
};

/**
 * Clean up expired barcode cache entries
 */
export const cleanupExpiredCache = async (): Promise<void> => {
  return withDatabase(async (db) => {
    await db.runAsync(
      `DELETE FROM barcode_cache WHERE datetime(expires_at) <= datetime('now')`
    );
  });
};
