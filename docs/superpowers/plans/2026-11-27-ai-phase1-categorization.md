# On-device AI — Phase 0+1 (setup, migrations, auto-categorization) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship automatic category suggestions that learn from the user's own corrections, with no model and no network.

**Architecture:** Pure, unit-tested functions in `src/ai/categorizer/` decide suggestions from an in-memory list of learned keys and known item names; a thin SQLite repo loads/saves `category_memory`. Screens call `suggestCategory` while typing and `learnCategory` on save. Versioned migrations via `PRAGMA user_version`.

**Tech Stack:** Expo SDK 54, RN 0.81.5, TypeScript strict, expo-sqlite, Zustand, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-27-on-device-ai-design.md` (sections: Data changes; Feature 1; Delivery order 0–1). Phases 2–4 get their own plans.

## Global Constraints

- Work on branch `feature/on-device-ai` cut from `main`.
- No model or network in this phase; everything works offline.
- A suggestion is shown as a tappable chip, never applied silently to a category the user already picked.
- Existing tables become schema version 1; this phase adds version 2. Migrations must be idempotent on fresh installs and on upgrades.
- Token budget: implementer reads only the line ranges it edits (grep first), no screenshots, no subagents.

## Review Focus

- Upgrade from an existing install (user_version 0 with data) → migration adds columns without losing rows. Test: `migrations.test.ts › upgrades v0 schema`.
- Empty / whitespace / digits-only text ("#4521", "  ") → no suggestion, no memory row. Test: `normalizeKey › returns empty for noise`.
- Category deleted after being learned → memory row removed by FK cascade; suggestion never returns a missing id. Test: `suggestCategory › ignores ids not in categories`.
- User corrects a learned merchant → next suggestion uses the correction. Test: `learn › correction overwrites`.
- Hindi/Unicode merchant names ("चाय पॉइंट") → normalized, not stripped to empty. Test: `normalizeKey › keeps unicode letters`.

---

### Task 1: Branch + jest setup

**Files:** Modify `package.json` (scripts `test`, devDeps `jest-expo`, `jest`, `@types/jest`; `"jest": {"preset": "jest-expo"}`).

- [ ] Step 1: `git stash -u` is NOT used; untracked `PRODUCT.md`/`docs/redesign` belong to the redesign branch — leave them untracked. Run `git switch main && git switch -c feature/on-device-ai`.
- [ ] Step 2: `npx expo install jest-expo jest @types/jest -- --save-dev`; add `"test": "jest"`.
- [ ] Step 3: Add `src/ai/__tests__/smoke.test.ts` with `expect(1).toBe(1)`; run `npm test -- --silent`. Expected: 1 passed.
- [ ] Step 4: Commit `chore: add jest-expo test setup` (include `docs/superpowers/` spec + plans).

### Task 2: Versioned migrations

**Files:**
- Create: `src/database/migrations.ts`
- Modify: `src/database/database.ts` (`initializeDatabase` end: call `runMigrations(database)`)
- Modify: `src/types/index.ts` (`Transaction` add `merchant: string | null; source: TransactionSource`; export `type TransactionSource = 'manual'|'scan'|'text'|'voice'`)
- Modify: `src/database/queries.ts` `createTransaction`/`updateTransaction` to write `merchant`, `source` (defaults `null`, `'manual'`)
- Test: `src/database/__tests__/migrations.test.ts`

**Interfaces — Produces:**
- `type SqlExec = { getFirstAsync<T>(sql: string, params?: any[]): Promise<T|null>; execAsync(sql: string): Promise<void> }`
- `MIGRATIONS: { version: number; sql: string }[]`
- `runMigrations(db: SqlExec): Promise<number>` → final version.

Version 2 SQL:
```sql
ALTER TABLE transactions ADD COLUMN merchant TEXT;
ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'manual';
CREATE TABLE IF NOT EXISTS category_memory (
  key TEXT PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  last_used TEXT NOT NULL
);
```
Algorithm: read `PRAGMA user_version`; treat 0 as 1 (tables already created by `initializeDatabase`); apply each migration with `version > current` inside `BEGIN; …; PRAGMA user_version = N; COMMIT;`.

- [ ] Step 1: Tests with a fake `SqlExec` recording SQL: `upgrades v0 schema` (user_version 0 → runs v2 once, returns 2); `no-op when current` (user_version 2 → executes nothing).
- [ ] Step 2: Run `npm test migrations` → FAIL (module missing).
- [ ] Step 3: Implement; wire into `database.ts`; update types and the two queries.
- [ ] Step 4: `npm test` → PASS; `npx tsc --noEmit` → no new errors.
- [ ] Step 5: Commit `feat(db): versioned migrations, merchant/source, category_memory`.

### Task 3: Categorizer core (pure)

**Files:** Create `src/ai/categorizer/normalize.ts`, `src/ai/categorizer/suggest.ts`, `src/ai/categorizer/index.ts`; Test `src/ai/categorizer/__tests__/categorizer.test.ts`.

**Interfaces — Produces:**
- `normalizeKey(text: string): string`
- `interface MemoryRow { key: string; category_id: number; subcategory_id: number | null; hits: number; last_used: string }`
- `interface KnownItem { name: string; category_id: number; subcategory_id: number }`
- `interface Suggestion { categoryId: number; subcategoryId: number | null; source: 'exact'|'fuzzy'|'item'; confidence: number }`
- `suggestCategory(text: string, memory: MemoryRow[], items: KnownItem[], validCategoryIds: Set<number>): Suggestion | null`
- `applyLearning(memory: MemoryRow[], text: string, categoryId: number, subcategoryId: number | null, now: string): MemoryRow | null` (returns the row to upsert)

Rules: `normalizeKey` lowercases, NFKC, removes `#\d+`/order ids/standalone numbers, strips suffixes `pvt ltd|ltd|inc|llc|store|online|india`, keeps Unicode letters (`\p{L}`), collapses spaces. Lookup: exact key (confidence 1) → best Jaccard over word tokens ≥ 0.5, ties by `hits` then `last_used` (confidence = score) → item name exact normalized match (0.8) → null. Skip any row whose `category_id` ∉ `validCategoryIds`. `applyLearning`: empty key → null; same key → overwrite category/subcategory, `hits+1` if category unchanged else `hits=1`.

- [ ] Step 1: Tests: `normalizeKey` — `"SWIGGY Order #4521"`→`"swiggy"`, `"Blue Tokai Pvt Ltd"`→`"blue tokai"`, `"  "`/`"#4521"`→`""`, `"चाय पॉइंट"`→`"चाय पॉइंट"`. `suggestCategory` — exact hit; fuzzy `"uber trip blr"` matches key `"uber trip"`; below 0.5 → null; item match; ignores ids not in categories. `learn` — new row hits 1; same category hits+1; correction overwrites (hits 1).
- [ ] Step 2: `npm test categorizer` → FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: `npm test` → PASS.
- [ ] Step 5: Commit `feat(ai): history-based categorizer`.

### Task 4: Memory repo + hook

**Files:** Create `src/database/categoryMemory.ts`, `src/hooks/useCategorySuggestion.ts`; Modify `src/database/index.ts`, `src/hooks/index.ts` exports.

**Interfaces:**
- Consumes: Task 3 types/functions; `withDatabase`.
- Produces: `loadCategoryMemory(): Promise<MemoryRow[]>`, `upsertCategoryMemory(row: MemoryRow): Promise<void>` (`INSERT … ON CONFLICT(key) DO UPDATE`), `clearCategoryMemory(): Promise<void>`, `loadKnownItems(): Promise<KnownItem[]>` (join items→subcategories), `learnCategory(text: string, categoryId: number, subcategoryId: number | null): Promise<void>` (load row for key, `applyLearning`, upsert; swallow+log errors so a save never fails because of learning).
- `useCategorySuggestion(text: string): Suggestion | null` — loads memory+items once (module cache invalidated by `learnCategory`), debounces 150 ms, returns `suggestCategory(...)`.

- [ ] Step 1: Implement (thin SQL wrappers; logic already tested in Task 3).
- [ ] Step 2: `npx tsc --noEmit` → no new errors.
- [ ] Step 3: Commit `feat(ai): category memory repo and suggestion hook`.

### Task 5: Wire into screens + Settings

**Files:** Modify `app/AddTransaction.tsx`, `app/EditTransaction.tsx`, `app/ReviewScannedItems.tsx`, `app/(tabs)/Settings.tsx`; Create `src/components/SuggestionChip.tsx`.

**Interfaces:** Consumes Task 4. `SuggestionChip({ label: string; color: string; onPress(): void })`.

- AddTransaction: text = `itemName || description`; when `useCategorySuggestion` returns a suggestion whose category ≠ `selectedCategory`, render `SuggestionChip` ("Suggested: Food › Coffee") under the category field; tap sets category+subcategory. If no category is selected yet and confidence = 1, preselect it (user can change). On save, `learnCategory(text, category, subcategory)`.
- EditTransaction: on save, if category changed, `learnCategory`.
- ReviewScannedItems: for each item, if memory suggestion exists use it over Gemini's `suggestedCategoryId`; on save of each item, `learnCategory(item.name, …)`.
- Settings: new "AI & Privacy" group (follow existing row component) containing "Clear learned categories" (confirm alert → `clearCategoryMemory`). Move the existing Gemini API Key row into this group with subtitle "Sends receipt photos to Google".
- Use the impeccable skill only for the chip and the Settings group styling, against existing theme tokens.

- [ ] Step 1: Implement the four edits + chip.
- [ ] Step 2: `npx tsc --noEmit` and `npm test` → clean.
- [ ] Step 3: Manual check on simulator (`npx expo run:ios`): add "Swiggy" under Food → add "swiggy order 22" → chip suggests Food; change to Dining → next "Swiggy" suggests Dining; Clear learned categories → no chip.
- [ ] Step 4: Commit `feat(ai): category suggestions in add/edit/scan, AI & Privacy settings`.
