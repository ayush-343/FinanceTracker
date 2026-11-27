import { format, subDays } from 'date-fns';
import { askDb } from '../ask/db';
import { QueryDb } from '../ask/execute';
import { TxLite } from './detectors';

const SELECT = `SELECT t.id AS id, t.amount AS amount, t.date AS date, t.created_at AS createdAt, t.category_id AS categoryId,
  COALESCE(t.merchant, i.name, NULLIF(t.notes, ''), '') AS label
  FROM transactions t LEFT JOIN items i ON i.id = t.item_id`;

// SQLite CURRENT_TIMESTAMP is "YYYY-MM-DD HH:MM:SS" in UTC.
const toIso = (rows: TxLite[]): TxLite[] =>
  rows.map((r) => ({ ...r, createdAt: r.createdAt?.includes('T') ? r.createdAt : `${r.createdAt?.replace(' ', 'T')}Z` }));

export const loadRecentTransactions = async (limit = 20, db: QueryDb = askDb): Promise<TxLite[]> =>
  toIso(await db.getAllAsync<TxLite>(`${SELECT} ORDER BY t.created_at DESC, t.id DESC LIMIT ?`, [limit]));

export const loadTransactionsSince = async (days: number, db: QueryDb = askDb): Promise<TxLite[]> =>
  toIso(await db.getAllAsync<TxLite>(`${SELECT} WHERE t.date >= ? AND COALESCE(t.notes, '') NOT LIKE 'Subscription:%'`,
    [format(subDays(new Date(), days), 'yyyy-MM-dd')]));
