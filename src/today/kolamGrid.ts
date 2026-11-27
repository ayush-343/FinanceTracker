import { format, getDaysInMonth } from 'date-fns';

export type KolamCellState = 'drawn' | 'skipped' | 'today-open' | 'today-drawn' | 'future';

export interface KolamCell {
  day: number;
  iso: string;
  col: number;
  row: number;
  state: KolamCellState;
}

/** Lays a calendar month on a Monday-first 7-column grid and marks each day's loop state. */
export const buildMonthKolam = (year: number, month: number, logged: Set<string>, todayISO: string) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const count = getDaysInMonth(first);
  let drawn = 0;
  let elapsed = 0;
  const cells: KolamCell[] = [];
  for (let day = 1; day <= count; day++) {
    const iso = format(new Date(year, month, day), 'yyyy-MM-dd');
    const index = offset + day - 1;
    const isLogged = logged.has(iso);
    let state: KolamCellState;
    if (iso < todayISO) state = isLogged ? 'drawn' : 'skipped';
    else if (iso === todayISO) state = isLogged ? 'today-drawn' : 'today-open';
    else state = 'future';
    if (iso <= todayISO) elapsed++;
    if (isLogged && iso <= todayISO) drawn++;
    cells.push({ day, iso, col: index % 7, row: Math.floor(index / 7), state });
  }
  return { cells, rows: Math.ceil((offset + count) / 7), drawn, elapsed };
};
