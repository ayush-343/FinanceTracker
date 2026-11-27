# On-device AI — Phase 3 (Ask about your spending) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask questions like "How much did I spend on food last month?" and get a correct answer computed from your own data, on the phone.

**Architecture:** The model turns the question into a `QueryPlan` from a small closed set (zod-validated). A pure range resolver and a parameterized-SQL executor compute the result from SQLite — the model never writes SQL and never computes numbers. A deterministic template writes the answer sentence; the model may rephrase it only if every number in its sentence appears in the computed result.

**Tech Stack:** Phase 2's `LanguageEngine`/`generateJSON`, zod, date-fns, expo-sqlite; `sql.js` (dev only) to run the executor against a real SQLite engine in jest.

**Spec:** `docs/superpowers/specs/2026-11-27-on-device-ai-design.md` (Feature 3). Builds on `src/ai/engine.ts`, `src/ai/json.ts`, `getEngine`.

## Global Constraints

- Branch `feature/on-device-ai`; commit per task.
- Model output is only ever a `QueryPlan`; SQL is built by our code with `?` parameters.
- Every number shown comes from the executor. A model sentence containing any number not in the result is discarded for the template sentence.
- Engine `off` or not ready → Ask entry points are hidden.
- `forecast` questions return `unsupported` with "Forecasts are coming soon" (phase 4).
- Weeks start Monday (`weekStartsOn: 1`, as `getWeekRangeString` does). Dates are `yyyy-MM-dd` strings, inclusive ranges, as in `queries.ts`.
- Token budget: grep before reading, read only edited ranges, no subagents, one simulator pass at the end.

## Review Focus

- Category the user names doesn't exist ("spend on pets") → `unsupported` "I couldn't find a category called pets", not a total of 0. Test: `resolvePlan › unknown category`.
- Category names differing in case/spacing ("food", "Food & Dining" vs "food and dining") → matched. Test: `matchCategory › loose match`.
- Range with no transactions → total 0 with "You didn't spend anything…", breakdown empty state. Test: `executor › empty range`.
- `last_month` in January → December of last year; `this_week` on a Sunday → Monday–Sunday containing it. Test: `resolveRange › boundaries`.
- Model sentence rounds or invents a number (₹1,250 → "about 1,300") → template used. Test: `guardSentence › rejects unseen numbers`.

---

### Task 1: QueryPlan schema and range resolution (pure)

**Files:** Create `src/ai/ask/plan.ts`, `src/ai/ask/range.ts`; Test `src/ai/ask/__tests__/range.test.ts`, `src/ai/ask/__tests__/plan.test.ts`.

**Produces:**
- `RangeSchema` = `{ preset: 'today'|'yesterday'|'this_week'|'last_week'|'this_month'|'last_month'|'this_year'|'last_7_days'|'last_30_days' } | { from: string; to: string }`
- `QueryPlanSchema` = discriminated union on `type`:
  - `total { range, categories?: string[], merchant?: string }`
  - `breakdown { range, by: 'category'|'merchant'|'day'|'month', limit?: number (1–20, default 5) }`
  - `compare { rangeA, rangeB, categories?: string[] }`
  - `list { range, categories?: string[], merchant?: string, minAmount?: number, sort: 'largest'|'recent', limit?: number (1–20, default 5) }`
  - `budgetStatus {}` (current budget period)
  - `forecast {}`
  - `unsupported { reason: string }`
- `resolveRange(range, today: Date): { from: string; to: string; label: string }` — label like "last month (Oct 2026)", "this week", "1–15 Nov".
- `matchCategory(name: string, categories: {id:number; name:string}[]): number | null` — compare after lowercasing, `&`→`and`, removing non-letters; exact first, then one contains the other.
- `resolvePlan(plan, categories, today, budgetPeriod): ResolvedPlan | { type: 'unsupported'; reason: string }` — ranges → `{from,to,label}`, category names → ids (unknown → unsupported with the name), `budgetStatus` → current week/month by `budgetPeriod`, `forecast` → unsupported "Forecasts are coming soon."

- [ ] Step 1: Tests (today Fri 2026-11-27): `boundaries` — this_week 2026-11-23..2026-11-29; last_month 2026-10-01..2026-10-31; last_month with today 2026-01-10 → 2025-12-01..2025-12-31; this_week on Sun 2026-11-29 → 11-23..11-29; last_7_days 11-21..11-27. `loose match` — "food" & "Food & Dining" both match "Food & Dining"? ("food" contains-match yes); "food and dining" exact. `unknown category` → unsupported mentioning "pets". `forecast` → unsupported. Schema rejects `limit: 500`.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): query plan schema and range resolution`.

### Task 2: Executor over SQLite (tested with sql.js)

**Files:** Create `src/ai/ask/execute.ts`; Test `src/ai/ask/__tests__/execute.test.ts`, `src/ai/ask/__tests__/fixtureDb.ts`; `npm i -D sql.js @types/sql.js`.

**Produces:**
- `interface QueryDb { getAllAsync<T>(sql: string, params: (string|number)[]): Promise<T[]> }`
- `type AskResult =`
  - `{ kind: 'total'; value: number; count: number; label: string }`
  - `{ kind: 'breakdown'; rows: { label: string; value: number; color?: string }[]; total: number; label: string }`
  - `{ kind: 'compare'; a: { label: string; value: number }; b: { label: string; value: number }; diff: number; pct: number | null }`
  - `{ kind: 'list'; rows: { id: number; date: string; label: string; category: string; color: string; amount: number }[]; label: string }`
  - `{ kind: 'budget'; rows: { category: string; color: string; spent: number; limit: number; pct: number }[]; label: string }`
  - `{ kind: 'unsupported'; reason: string }`
- `executePlan(plan: ResolvedPlan, db: QueryDb): Promise<AskResult>` — SQL with `?` only; category filters via `category_id IN (?,?,…)` built from the count of ids; merchant filter `LOWER(COALESCE(t.merchant, i.name, t.notes)) LIKE ?` with `%term%`; row label = `COALESCE(t.merchant, i.name, NULLIF(t.notes,''), c.name)`. `breakdown by month` uses `substr(date,1,7)`. `budget` joins `categories` and uses `budget_limit`, skipping limit 0 rows. Amounts rounded to 2 decimals in JS.
- App adapter: `askDb: QueryDb` in `src/ai/ask/db.ts` = `withDatabase(db => db.getAllAsync(sql, params))`.

- [ ] Step 1: `fixtureDb.ts` builds an in-memory sql.js DB with `categories`, `subcategories`, `items`, `transactions (… merchant, source)` and ~10 rows across Oct/Nov 2026 in Food/Transport, and exposes it as `QueryDb`.
- [ ] Step 2: Tests: total Food Nov = expected sum and count; breakdown by category sorted desc with limit; breakdown by merchant uses merchant then item name; compare Oct vs Nov diff and pct (pct null when A is 0); list largest 3; budget skips limit 0 and computes pct; `empty range` total 0 count 0 and breakdown rows [].
- [ ] Step 3: FAIL. Step 4: implement. Step 5: PASS. Step 6: commit `feat(ai): query plan executor with parameterized SQL`.

### Task 3: Answer text and number guard (pure)

**Files:** Create `src/ai/ask/answer.ts`; Test `src/ai/ask/__tests__/answer.test.ts`.

**Produces:**
- `templateSentence(result: AskResult, formatMoney: (n: number) => string): string` — e.g. total: "You spent ₹4,320 on Food last month across 12 purchases." / zero: "You didn't spend anything on Food last month."; compare: "₹3,100 in Nov vs ₹2,400 in Oct — 29% more."; breakdown: "Food was your biggest at ₹2,100 of ₹4,320."; list: "Your 3 largest purchases last month."; budget: "2 of 3 budgets are over 80%."; unsupported: the reason.
- `allowedNumbers(result: AskResult): Set<string>` — every value, count, pct (rounded int), diff, plus their integer and 2-dp forms, and day/month/year numbers from labels.
- `guardSentence(sentence: string, result: AskResult): boolean` — extract numbers (`/\d[\d,]*(?:\.\d+)?/g`, strip commas); true only if all are in `allowedNumbers`.
- `buildNarrationPrompt(question: string, template: string, result: AskResult): { system: string; prompt: string }` — "Rewrite this answer in one friendly sentence. Use only these numbers…"

- [ ] Step 1: Tests: templates for each kind incl. zero; `rejects unseen numbers` (1250 → "about 1,300" false); accepts "₹1,250" and "1250.00"; percentages ok.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): answer templates and number guard`.

### Task 4: askQuestion orchestration

**Files:** Create `src/ai/ask/ask.ts`, add `buildAskPrompt` to `src/ai/prompts.ts`; Test `src/ai/ask/__tests__/ask.test.ts`.

**Produces:**
- `buildAskPrompt(question, todayISO, categoryNames, budgetPeriod): { system; prompt }` — lists the plan types with one example each and the range presets; JSON only; "If the question is not about the user's spending, return unsupported".
- `askQuestion(question: string, deps: { engine: LanguageEngine; db: QueryDb; today: Date; categories: {id;name}[]; budgetPeriod: 'weekly'|'monthly'; formatMoney }): Promise<{ result: AskResult; sentence: string }>` — `generateJSON(QueryPlanSchema)` → null → `unsupported` "I couldn't understand that. Try one of the suggestions." → `resolvePlan` → `executePlan` → `templateSentence` → narration via `engine.generate` (any throw or guard fail → template).

- [ ] Step 1: Tests with fake engine + sql.js fixture: valid plan → correct total and template; model sentence with wrong number → template used; garbage JSON twice → unsupported; engine throwing on narration → template.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): ask orchestration`.

### Task 5: Ask screen and entry points

**Files:** Create `app/Ask.tsx`, `src/components/AskResultCard.tsx`, `src/hooks/useAiAvailable.ts`; Modify `app/_layout.tsx` (register `Ask` modal), `app/(tabs)/Home.tsx` header (~line 128), `app/(tabs)/Analytics.tsx` header.

**Produces:**
- `useAiAvailable(): boolean` — `getEngine(aiEngine, localModelId) !== null`, re-checked on screen focus.
- `AskResultCard({ result, sentence })` — total: big number + label; breakdown: horizontal bars (category color, value, share of total); compare: two values + diff badge (green less / red more); list: rows of date · label · amount; budget: progress bars; unsupported: muted text. Uses `useCurrency().format` and theme tokens.
- Ask screen: header "Ask", empty state with 4 starter chips ("How much did I spend this month?", "Biggest categories last month", "This month vs last month", "Largest purchases this week"); conversation list (question bubble + card), input pinned at bottom with send; while answering show a "Thinking…" row; questions are not stored after closing.
- Entry: a "sparkles"-style icon button (Feather `message-circle`) in Home and Analytics headers, only when `useAiAvailable()`; `accessibilityLabel="Ask about your spending"`.

- [ ] Step 1: Implement. Step 2: `npx tsc --noEmit` (5 pre-existing, 0 new); `npx jest --silent` green.
- [ ] Step 3: Simulator (one pass): Settings → On-Device AI → Off → Ask buttons hidden; set Auto → visible. On the simulator Apple generation fails, so verify the failure path shows "I couldn't understand that…" without crashing. Full answers need a real iPhone with Apple Intelligence or the downloaded local model — note this.
- [ ] Step 4: Commit `feat(ai): ask screen with result cards`.
