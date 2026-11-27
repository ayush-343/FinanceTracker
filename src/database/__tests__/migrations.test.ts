import { runMigrations, MIGRATIONS, SqlExec } from '../migrations';

const fakeDb = (userVersion: number) => {
  const executed: string[] = [];
  let version = userVersion;
  const db: SqlExec = {
    getFirstAsync: async <T,>(_sql: string) => ({ user_version: version } as unknown as T),
    execAsync: async (sql: string) => {
      executed.push(sql);
      const m = sql.match(/PRAGMA user_version = (\d+)/);
      if (m) version = Number(m[1]);
    },
  };
  return { db, executed, getVersion: () => version };
};

describe('runMigrations', () => {
  it('upgrades v0 schema', async () => {
    const { db, executed, getVersion } = fakeDb(0);
    const final = await runMigrations(db);
    expect(final).toBe(3);
    expect(getVersion()).toBe(3);
    expect(executed).toHaveLength(2);
    expect(executed[0]).toContain('ALTER TABLE transactions ADD COLUMN merchant TEXT');
    expect(executed[0]).toContain('CREATE TABLE IF NOT EXISTS category_memory');
  });

  it('no-op when current', async () => {
    const { db, executed } = fakeDb(3);
    expect(await runMigrations(db)).toBe(3);
    expect(executed).toHaveLength(0);
  });

  it('v3 adds day_marks', async () => {
    const { db, executed } = fakeDb(2);
    expect(await runMigrations(db)).toBe(3);
    expect(executed[0]).toContain('CREATE TABLE IF NOT EXISTS day_marks');
  });

  it('versions are ascending', () => {
    const v = MIGRATIONS.map((m) => m.version);
    expect([...v].sort((a, b) => a - b)).toEqual(v);
  });
});
