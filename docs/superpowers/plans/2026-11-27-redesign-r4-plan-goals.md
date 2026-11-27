# Daily Kolam redesign — R4 Plan + Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** The Plan tab: where the period is heading (forecast field), budgets per category with honest over-budget marks, savings goals with plain arithmetic, and what's coming up.

**Architecture:** Migration v4 adds `goals`. Pure goal math in `src/plan/goals.ts` (tested). `app/Goal.tsx` sheet creates/edits goals and adds money. `app/(tabs)/Plan.tsx` replaces the Analytics wrapper and reuses `useForecast`, `getCategoriesWithSpending`, `subscriptionChargesBetween`. Category create/edit keep the existing AddCategory/EditCategory screens for now; Subscriptions keeps its screen.

**Spec:** redesign spec → Plan. Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`.

## Global Constraints
- Forecast field is the screen's one slate field: range in Rounded, "likely X of your Y budget", spent fill + hatched likely band + budget marker; insufficient history → the existing message.
- Over budget: hatch + "₹X over", never red. Categories without a budget list as "No budget · Set one".
- Goal copy: "₹4,000 a month gets you there by 28 Feb" (target date set) or "₹12,000 to go" (no date); reached → "Reached. Nice work." Never shame a missed date: past date with money left → "₹X to go · pick a new date?".
- Money for goals is the user's own record of what they set aside; no bank connection implied.

## Review Focus
- Target date this month → months left = 1 (never 0, no divide by zero). Test `goalPlan › this month`.
- Saved ≥ target → reached, per-month 0. Test `goalPlan › reached`.
- Past target date with money left → status "overdue" (copy invites a new date). Test `goalPlan › past date`.
- Adding a negative or empty amount → rejected. Test `parseAmountInput` reuse.

### Task 1: Goals data + math
Migration v4: `goals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, target REAL NOT NULL, saved REAL NOT NULL DEFAULT 0, target_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`. `src/database/goals.ts`: `getGoals()`, `getGoal(id)`, `createGoal({name,target,saved,target_date})`, `updateGoal(id, patch)`, `addToGoal(id, amount)`, `deleteGoal(id)`. `src/plan/goals.ts`: `goalPlan(goal, todayISO): { progress: number; remaining: number; monthsLeft: number | null; perMonth: number | null; status: 'reached' | 'onTrack' | 'noDate' | 'overdue'; line: string }` with a money formatter param. TDD. Commit.

### Task 2: Goal sheet
`app/Goal.tsx` (modal, registered in root stack): new → name, target, by (optional date), already saved; edit (`goalId`) → same fields, "Add money" amount + button, Delete with confirmation. Commit.

### Task 3: Plan screen
`app/(tabs)/Plan.tsx`: forecast field; Budgets card (rows → EditCategory; "Add category" → AddCategory); Goals card (rows → Goal edit; "New goal"); Coming up card (subscription charges in the next 14 days; link to Subscriptions). Reload on focus. Commit.

### Task 4: Verify
Simulator light + dark: forecast, over-budget hatch row, create a goal, add money, coming-up list. `npx jest`, `npx tsc` (5 pre-existing).
