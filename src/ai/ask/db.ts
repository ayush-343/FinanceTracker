import { withDatabase } from '../../database/database';
import { QueryDb } from './execute';

/** The app's SQLite database, shaped for the Ask executor. */
export const askDb: QueryDb = {
  getAllAsync: (sql, params) => withDatabase((db) => db.getAllAsync(sql, params)),
};
