# Daily Kolam redesign — R2 Unified Log Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** One sheet for every way of logging: type or speak a sentence and watch the confirm card fill live, or fill the card by hand; scan a receipt from the same sheet; save closes that day's loop.

**Architecture:** `app/Log.tsx` (modal sheet) replaces QuickLog and AddTransaction; both routes re-export it so every existing link (Today, Category, Items, scanner manual fallback) lands on it with the same params. Pure draft logic in `src/log/draft.ts` (tested): amount input parsing, applying a parse to untouched fields only, the Save label. The rule-based `preParse` fills the card as you type; on submit the model refines (`parseQuickLog`), never overwriting fields the user edited. Category: learned suggestion (`suggestCategory`) preselected with a "learned" tag, then the model's hint.

**Spec:** redesign spec → Log sheet. Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`.

## Global Constraints
- Nothing saves without pressing Save. Amount must be > 0 and a category chosen; Save stays disabled with the reason shown.
- Save label: "Save · closes <Weekday>'s loop" when that date's loop is open and the date ≤ today; otherwise "Save".
- "Nothing spent today" shows only while the sentence and amount are empty and today is open.
- Warnings (duplicate, unusual) inline, non-blocking, hatch icon, no red.
- Params accepted: `voice`, `categoryId`, `subcategoryId`, `itemName`, `amount`, `notes`, `date`, `merchant`, `source`.
- Receipt scan: camera button runs the existing scanner → ReviewScannedItems (unchanged this phase).

## Review Focus
- "1,250.50", "₹ 99", "" , "abc" in the amount field → 1250.5, 99, null, null. Test `parseAmountInput`.
- User edits the amount, then the model returns a different amount → user's value kept. Test `applyParse › keeps touched fields`.
- Date in the future → Save label plain "Save" (no loop claim). Test `saveLabel › future`.
- Logging for a past skipped day → "closes Tuesday's loop". Test `saveLabel › past open day`.

### Task 1: Draft logic
`src/log/draft.ts`: `interface Draft { amount: string; what: string; merchant: string | null; date: string; categoryId: number | null; subcategoryId: number | null; categorySource: 'learned' | 'model' | 'user' | null; note: string }`, `type Touched = Partial<Record<'amount'|'what'|'date'|'category', boolean>>`, `parseAmountInput(s: string): number | null`, `applyParse(draft: Draft, parsed: { amount: number|null; item: string|null; merchant: string|null; date: string }, touched: Touched): Draft`, `saveLabel(dateISO: string, todayISO: string, drawn: Set<string>): string`. TDD. Commit `feat(log): draft logic`.

### Task 2: Log sheet
`app/Log.tsx` (+ `Stack.Screen name="Log"` modal in `app/_layout.tsx`). Header: title, camera (scan), Cancel. Sentence pill with mic (auto-start when `voice=1`). Confirm card: amount (Rounded 34, decimal keyboard), What, When (Today / Yesterday chips + compact date picker), Category chips (hue dots, learned tag), Subcategory chips when the category has any. Warnings. Save (turmeric) + "Nothing spent today". Saving: find/create item under subcategory (as AddTransaction did), `addTransaction` with merchant/source, `learnCategory`, haptic, close. Commit `feat(log): unified log sheet`.

### Task 3: Routes
`app/QuickLog.tsx`, `app/AddTransaction.tsx` → `export { default } from './Log'`. Today + header button opens `/Log` directly; remove the log menu and `LogActions` context; tabs layout keeps the scanner modals (the sheet's camera button uses `useReceiptScanner`). Commit `refactor(log): route all logging to the sheet`.

### Task 4: Verify
Simulator: type "250 uber yesterday" → card fills live, category learned, Save label names Thursday; manual entry; Nothing spent today; voice param; dark mode. `npx jest`, `npx tsc` (5 pre-existing).
