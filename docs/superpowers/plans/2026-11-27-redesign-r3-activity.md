# Daily Kolam redesign — R3 Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** The Activity tab: every purchase for a month, searchable and filterable, with exact category shares, a Month view of the days, and editing in the same log sheet.

**Architecture:** Pure helpers in `src/activity/feed.ts` (tested): day grouping with totals, filtering (query, category, day), category shares. `useActivity(month)` loads the month's transactions, categories and drawn days on focus. `app/(tabs)/Activity.tsx` replaces the Calendar wrapper. `app/Log.tsx` gains edit mode (`transactionId`): prefilled card, "Save changes", "Delete purchase" with confirmation; `app/EditTransaction.tsx` re-exports it.

**Spec:** redesign spec → Activity. Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`.

## Global Constraints
- Search matches merchant, item, notes and category name, case-insensitive. A query of 3+ words also offers "Ask about “…”", which opens the Ask tab and asks it.
- Category shares are of the month's total; bands exact; chips show the share rounded to a whole percent.
- Month view: Monday-first grid; each day shows its number, a loop mark when drawn, and its total; tapping a day filters the list to it (tap again to clear).
- Deleting asks for confirmation and states it cannot be undone.
- No swipe actions this phase (edit sheet carries Delete).

## Review Focus
- Two purchases at the same date: group total sums both, order newest first by `created_at`. Test `groupByDay`.
- Category with zero spend → no chip. Test `categoryShares › skips zero`.
- Query with only spaces → no filtering. Test `filterFeed › blank query`.
- Edit: changing only the category re-learns it; delete returns to Activity and the row is gone.

### Task 1: Feed logic
`src/activity/feed.ts`: `groupByDay(txs: TransactionWithDetails[]): { date: string; total: number; items: TransactionWithDetails[] }[]` (dates desc), `filterFeed(txs, f: { query?: string; categoryId?: number | null; day?: string | null })`, `categoryShares(txs): { categoryId: number; name: string; total: number; share: number }[]` (desc), `feedLabel(t)`. TDD. Commit `feat(activity): feed logic`.

### Task 2: Edit mode in the log sheet
`app/Log.tsx`: `transactionId` param → load with `getTransactionById`, fill draft, mark all fields touched; title "Edit purchase"; Save → `updateTransaction` + `learnCategory` when the category changed; ghost "Delete purchase" → `Alert` confirm → `deleteTransaction`. `app/EditTransaction.tsx` → re-export. Commit `feat(log): edit and delete in the log sheet`.

### Task 3: Activity screen
`src/activity/useActivity.ts`, `app/(tabs)/Activity.tsx`: title + List/Month segment; search pill; month switcher (chevrons, label, total); exact bands; filter chips; day groups (header with weekday date and total) of ListRows → edit sheet; Month grid with day totals and loop marks; empty states (no purchases this month; no search results). Ask tab reads an optional `q` param and asks it. Commit `feat(activity): Activity tab`.

### Task 4: Verify
Simulator light + dark: browse months, search "uber", filter Food, Month view tap a day, edit and delete a purchase. `npx jest`, `npx tsc` (5 pre-existing).
