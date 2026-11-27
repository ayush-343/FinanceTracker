# Daily Kolam redesign — R1 Shell + Today Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Five-tab shell (Today · Activity · Ask · Plan · You) with the new Today screen: month kolam that draws today's loop, left-today pace, log bar, recent entries, "Nothing spent today".

**Architecture:** Pure helpers in `src/today/` (month grid, pace) unit-tested; `day_marks` table (migration v3) stores zero-spend days; `src/ui/Kolam.tsx` renders the grid with react-native-svg and animates today's loop with Reanimated (skipped under Reduce Motion). Activity, Ask, Plan and You temporarily wrap the existing Calendar, Ask, Analytics and Settings screens until R3–R6 replace them. Logging still goes through QuickLog until R2.

**Spec:** `docs/superpowers/specs/2026-11-27-kolam-redesign-design.md` (Today, IA). Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`. Builds on R0 `src/ui`.

## Global Constraints
- Weeks start Monday in the grid (matches `weekStartsOn: 1` elsewhere). Month kolam always shows the calendar month; pace uses the user's budget period (weekly/monthly).
- A day is "drawn" if it has any transaction or a `day_marks` row. Skipped past days are dots; no counters reset; no loss copy.
- Budget = sum of category `budget_limit` (as today). Budget 0 → "Set a monthly budget" prompt instead of pace.
- Past today's pace → neutral copy ("₹X past today's pace · tomorrow starts fresh"), hatch not red.

## Review Focus
- Month starting Sunday → first cell in column 6, 6 rows. Test `buildMonthKolam › sunday start`.
- Today is last day of period → daysLeft 1, allowance = remaining budget. Test `computePace › last day`.
- Spent more than budget before today → allowance 0, status pastPace. Test `computePace › over before today`.
- Logging the first spend of today flips today to drawn and animates once (not on every re-render).
- Zero categories (fresh install) → Today renders, no crash, empty copy.

### Task 1: Pure helpers + migration
Files: `src/today/kolamGrid.ts`, `src/today/pace.ts`, tests in `src/today/__tests__/`; `src/database/migrations.ts` (v3), `src/database/dayMarks.ts`.
Produces:
- `type KolamCellState = 'drawn' | 'skipped' | 'today-open' | 'today-drawn' | 'future'`
- `buildMonthKolam(year: number, month: number /*0-11*/, logged: Set<string>, todayISO: string): { cells: { day: number; iso: string; col: number; row: number; state: KolamCellState }[]; rows: number; drawn: number; elapsed: number }`
- `computePace(i: { budget: number; spentBeforeToday: number; spentToday: number; periodEnd: string; today: string }): { status: 'noBudget' | 'onPace' | 'pastPace'; allowanceToday: number; leftToday: number; daysLeft: number }` (allowance = max(0, budget − spentBeforeToday) / daysLeft incl. today; left = allowance − spentToday)
- v3 SQL: `CREATE TABLE IF NOT EXISTS day_marks (date TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'nothing', created_at TEXT DEFAULT CURRENT_TIMESTAMP);`
- `loadDrawnDays(from: string, to: string): Promise<Set<string>>`, `markNothingSpent(date: string): Promise<void>`
TDD; update `migrations.test.ts` for version 3. Commit `feat(today): month kolam grid, pace, day marks`.

### Task 2: Kolam component
File: `src/ui/Kolam.tsx` — props `{ cells, rows, width }`; loop = rounded diamond around each drawn dot joining neighbours; today-open = turmeric dashed loop; today-drawn animates stroke once on transition (≈600 ms, ease-out) with a light haptic; future = faint dot; accessibilityLabel "N of M days drawn in <Month>". Commit `feat(ui): Kolam component`.

### Task 3: Today screen
File: `app/(tabs)/Today.tsx`, `src/today/useToday.ts` (loads on focus: drawn days, period spend by category, spent today/before today, budget, recent 2 days of transactions).
Layout per contract FIRST VIEWPORT. Log bar opens QuickLog (mic opens it with `voice=1`, auto-starting dictation); header + button opens QuickLog. "Nothing spent today" ghost button in the field when today is open. Commit `feat(today): Today screen`.

### Task 4: Five-tab shell
Files: `app/(tabs)/_layout.tsx` (native-style tab bar with SF Symbols, Kolam palette, initial route Today; Home/Analytics/Calendar/Settings/Subscriptions hidden routes), `app/(tabs)/Activity.tsx`, `Ask.tsx`, `Plan.tsx`, `You.tsx` (wrappers), `app/Ask.tsx` gains `asTab` (no close button), `app/index.tsx` redirects to Today. `app/QuickLog.tsx` accepts `voice=1`. Commit `feat(shell): five-tab Kolam shell`.

### Task 5: Verify
Simulator light + dark: Today with seeded data, log a spend → loop draws, Nothing spent today on a fresh day, tabs navigate. `npx jest`, `npx tsc --noEmit` (5 pre-existing). Commit fixes.
