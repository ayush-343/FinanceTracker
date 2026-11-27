import { withDatabase } from './database';

export interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
  target_date: string | null;
  created_at: string;
}

export const getGoals = async (): Promise<Goal[]> =>
  withDatabase((db) => db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY created_at'));

export const getGoal = async (id: number): Promise<Goal | null> =>
  withDatabase((db) => db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]));

export const createGoal = async (g: { name: string; target: number; saved: number; target_date: string | null }): Promise<number> =>
  withDatabase(async (db) => {
    const r = await db.runAsync('INSERT INTO goals (name, target, saved, target_date) VALUES (?, ?, ?, ?)', [g.name, g.target, g.saved, g.target_date]);
    return r.lastInsertRowId;
  });

export const updateGoal = async (id: number, g: { name: string; target: number; saved: number; target_date: string | null }): Promise<void> =>
  withDatabase(async (db) => {
    await db.runAsync('UPDATE goals SET name = ?, target = ?, saved = ?, target_date = ? WHERE id = ?', [g.name, g.target, g.saved, g.target_date, id]);
  });

export const addToGoal = async (id: number, amount: number): Promise<void> =>
  withDatabase(async (db) => {
    await db.runAsync('UPDATE goals SET saved = saved + ? WHERE id = ?', [amount, id]);
  });

export const deleteGoal = async (id: number): Promise<void> =>
  withDatabase(async (db) => {
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  });
