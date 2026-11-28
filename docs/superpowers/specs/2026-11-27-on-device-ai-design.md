# On-device AI for the personal Finance Tracker — design

Date: 2026-11-27 · Status: draft, awaiting approval

## Intent

Make the personal tracker (the `main` app, not the `redesign/client-expenses` business product) faster to use and more insightful, without breaking its core promise: **your financial data never leaves your phone**. Four features were asked for — automatic categorization, logging in plain words or voice, asking questions about spending, and forecasting — plus extra features that improve the experience.

Today the only AI is receipt scanning, which sends photos to Gemini with the user's own key (`src/services/receiptService.ts`). That's the one place data leaves the device; it stays available, but becomes opt-in, not the default path for new features.

## Goals

- Categories are suggested automatically and get better as the user corrects them.
- A purchase can be logged by typing or saying one sentence ("200 coffee at Blue Tokai yesterday") and confirming one card.
- The user can ask questions about their money in plain language and get correct numbers.
- The app projects month-end spending per category and warns before a budget is blown.
- Everything above works with no network and no API key.

## Non-goals (this design)

- Cloud sync, accounts, shared budgets.
- Bank account aggregation / reading SMS.
- The phase-5 roadmap items below; each gets its own short design when we reach it.

## Anti-goals (failure even if it "works")

- **A number the model made up is shown to the user.** Every figure comes from SQLite or deterministic code.
- **A transaction is saved without the user confirming it.**
- **Data leaves the device without an explicit, per-feature opt-in.**
- AI features make the app feel slower: no blocking spinners on the add-transaction path; categorization suggestions must be instant.
- The existing Gemini receipt flow or any current screen regresses.

## Constraints (from the project)

- Expo SDK 54, React Native 0.81.5, New Architecture on, `expo-dev-client` already present → native modules are fine; Expo Go is not a target.
- No `ios/`/`android/` folders committed; builds use prebuild / EAS (`eas.json` exists).
- SQLite via `expo-sqlite`, schema created with `CREATE TABLE IF NOT EXISTS` in `src/database/database.ts`, no migration versioning yet. Amounts are `REAL`.
- Zustand stores, Expo Router file routes, custom theme tokens in `src/theme`.
- iOS is the primary platform (README); Android exists in `app.json` and is on the roadmap.
- No test setup exists today.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | **Tiered hybrid.** Deterministic layer (history-based categorization, statistical forecast) needs no model. Apple's on-device model (Foundation Models, iOS 26+ with Apple Intelligence) handles language. Devices without it can opt in to a one-time ~0.6–1.1 GB local model via `llama.rn`. Gemini BYOK stays optional for receipts. | Two language backends to keep behind one interface. Best quality per device, zero download for most iPhone users, core features work even with no model. |
| B | One downloaded GGUF model on every device (`llama.rn` or `react-native-executorch`). | Identical behavior everywhere, single code path; but every user downloads ~1 GB, more battery, slow on older phones. |
| C | Apple Foundation Models only. | Least code, no download; nothing for iPhones older than 15 Pro, non-iOS-26 users, or Android. |

The user picked **A** ("proceed with your plan").

## Architecture

### Principle: the model reads and writes language; the app does the math

The language model is used only to turn text into a validated structured object (a draft transaction, a query plan) and to phrase results that were already computed. It never computes totals.

### `src/ai/` module

```
src/ai/
  engine.ts            # LanguageEngine interface + selection (auto | apple | local | off)
  engines/apple.ts     # @react-native-ai/apple via AI SDK `ai`
  engines/local.ts     # @react-native-ai/llama + llama.rn, model download/management
  schemas.ts           # zod schemas: DraftTransaction, QueryPlan
  prompts.ts           # prompt builders (inject categories, today's date, currency)
  json.ts              # extract + validate JSON from model text, one repair retry
  categorizer/         # deterministic, no model (see below)
  forecast/            # deterministic, no model
  query/               # QueryPlan executor over SQLite
```

`LanguageEngine` exposes: `availability(): 'ready' | 'needs-download' | 'downloading' | 'unsupported'`, `generateJSON<T>(prompt, schema)`, `streamText(prompt)`.

Engine selection under `auto`: Apple if `apple.getModelInfo().availability === 'available'`, else local if downloaded, else `off`. Every feature has a defined behavior for `off` (see each feature).

**Why JSON-in-text, not provider tool calling:** Apple's provider runs the tool loop natively and bypasses AI SDK step hooks; llama.rn tool support through the Callstack provider is unverified. A single "model returns JSON → zod validates → app executes" flow behaves identically on both engines and is unit-testable. If AI SDK structured output proves reliable on both, the builder may use it inside `generateJSON` — the interface doesn't change.

Packages (versions to be pinned by the builder against SDK 54 / RN 0.81): `ai` (AI SDK version matching the `@react-native-ai/*` release), `@react-native-ai/apple`, `@react-native-ai/llama`, `llama.rn` (+ its Expo config plugin), `react-native-blob-util`, `zod`, `expo-speech-recognition`, plus the AI SDK polyfills the Callstack docs require.

Local model: a Qwen3.5 small instruct GGUF (0.8B default; 2B offered on devices with ≥8 GB RAM), Q4 quantization, downloaded from Hugging Face only when the user taps "Download" in Settings, Wi-Fi recommended, size shown before download, deletable.

### Data changes

Introduce versioned migrations using `PRAGMA user_version` in `database.ts` (existing tables become version 1). Version 2 adds:

- `transactions.merchant TEXT` (nullable) and `transactions.source TEXT DEFAULT 'manual'` (`manual | scan | text | voice`).
- `category_memory(key TEXT PRIMARY KEY, category_id INTEGER NOT NULL, subcategory_id INTEGER, hits INTEGER NOT NULL DEFAULT 1, last_used TEXT NOT NULL)` with FKs `ON DELETE CASCADE` / `SET NULL`.
- Settings (Zustand + SecureStore/AsyncStorage as today): `aiEngine: 'auto'|'apple'|'local'|'off'` (default `auto`), `localModelId`, `digestEnabled` (default on), `digestDay/Time` (default Sunday 19:00), `forecastAlerts` (default on).

## Features (phases 1–4)

### 1. Automatic categorization (no model needed)

- `normalizeKey(text)`: lowercase, strip digits/punctuation/common suffixes ("pvt ltd", "order #…"), collapse whitespace.
- Lookup order: exact `category_memory` key → token-overlap match against memory (Jaccard ≥ 0.5) → item names in `items` table → model (if available) with the user's category list → none.
- Learning: whenever a transaction is saved or its category edited with a merchant/note/item name, upsert memory (`hits+1`, `last_used`). A correction overwrites.
- Used in: AddTransaction (suggest as the user types the note/merchant, shown as a tappable chip, never auto-applied silently), ReviewScannedItems (replaces Gemini's suggestion when memory has a hit), text/voice logging.
- `off` engine: everything except the model step still works.

### 2. Log by typing or voice

- Entry: the FAB action sheet gains "Type or Say It" (alongside Add Manually / Scan Receipt). Opens a bottom sheet with a text field and a mic button.
- Voice: `expo-speech-recognition` with on-device recognition requested (`requiresOnDeviceRecognition` where supported); if on-device isn't available, show that dictation uses the system service and let the user type instead. Transcript fills the text field live; user can edit.
- Parse: model → `DraftTransaction { amount, merchant?, note?, date (ISO, relative words resolved against today), categoryHint? }`. Categorizer (feature 1) assigns category from merchant/note; model's `categoryHint` is used only when the categorizer has nothing.
- Deterministic pre-parse runs first and always: amount regex (₹/Rs/$/numbers with k), "today/yesterday/last <weekday>" dates. If engine is `off`, the pre-parse alone fills the card.
- Confirm card shows every field editable; "Save" writes with `source = 'text' | 'voice'`. Nothing is saved without Save.

### 3. Ask about your spending

- Route `/Ask` (modal). Entry points: a search/ask affordance on Home and Analytics headers.
- Model output is a `QueryPlan` (zod-validated), a small closed set:
  - `total { range, categoryIds?, merchant? }`
  - `breakdown { range, by: 'category'|'subcategory'|'merchant'|'day'|'month' , limit? }`
  - `compare { rangeA, rangeB, categoryIds? }`
  - `list { range, categoryIds?, merchant?, minAmount?, sort, limit }`
  - `budgetStatus { range }`
  - `forecast { categoryIds? }` (uses feature 4)
  - `unsupported { reason }`
- Ranges are structured (`{ preset: 'this_month'|'last_month'|'this_week'|…}` or explicit ISO dates); the executor resolves presets with `date-fns` and the user's budget period.
- Executor in `src/ai/query/` uses parameterized SQL only (built on existing query patterns in `src/database/queries.ts`); never executes model-written SQL.
- Answer = a computed result card (number, small chart or list using existing chart components) + one sentence the model phrases from the computed numbers. If the sentence contains a number not present in the result, drop the sentence and show the card only.
- Suggested starter questions shown when empty. `off` engine: Ask is hidden, replaced by the existing search.

### 4. Forecasting, weekly digest, alerts

- Forecast (pure function, unit-tested): for the current budget period, per category: spent so far + remaining days × daily rate, where daily rate blends this period's rate with the trailing 8-week weekday-weighted average; add remaining scheduled subscription charges (respecting skips). Output a likely value and a low/high band; with fewer than 3 weeks of history, show "not enough history yet".
- UI: a forecast card on Home under the budget summary ("On pace for ₹38–42k · Food likely over by the 24th") and per-category projection in Analytics/Category.
- Alerts (local notifications via existing `expo-notifications`): projected overspend crossing 100% of a category budget (at most once per category per period); unusually large transaction (> 3× the category's median and above a floor); likely duplicate (same amount + merchant within 10 minutes).
- Weekly digest: scheduled local notification computed on open/background fetch (`expo-background-fetch` is installed) — top change vs 4-week average, forecast status. Copy may be phrased by the model; numbers come from code.
- Subscription detection: same merchant + similar amount (±5%) at ~monthly/weekly intervals 3+ times and not already a subscription → suggestion card "Track as subscription?". Price change on a tracked subscription → alert.

### Settings → "AI & Privacy" section

Engine status (Apple ready / local downloaded / off), engine choice, local model download/delete with size, Gemini key (moved here, labeled "sends receipt photos to Google"), digest/alerts toggles, "clear learned categories".

## Phase 5 roadmap (separate designs later)

On-device receipt text reading (ML Kit / Apple Vision, then the local model structures it, making Gemini a fallback); income tracking and savings goals; budget suggestions from history; semantic search with on-device embeddings (`apple.embeddingModel()` / llama embeddings); Siri/App Intents and widgets; share-sheet import of payment screenshots; encrypted local backup and CSV import/export.

## Delivery order

0. Branch `feature/on-device-ai` from `main`. Add `jest-expo` + tests for pure logic.
1. Migrations + categorizer (ships value with no model) + AI module skeleton + Settings section.
2. Apple and local engines, text/voice logging.
3. Ask.
4. Forecast, alerts, digest, subscription detection.

Each phase is usable on its own and can be merged separately.

## Testing

- Unit (jest): `normalizeKey`, categorizer lookup/learning, pre-parser (amounts, relative dates), JSON extraction/repair, QueryPlan range resolution and executor against an in-memory SQLite fixture, forecast math, duplicate/anomaly/subscription detectors, "number not in result" guard.
- Model evals: a fixture file of ~40 sentences and ~40 questions with expected `DraftTransaction` / `QueryPlan`; a dev-only screen runs them on-device against the active engine and reports pass rate. Target ≥ 90% for Apple, ≥ 80% for the 0.8B local model before enabling a feature by default on that engine.
- Device checks: iPhone with Apple Intelligence, iPhone without it (local model + off), airplane mode, Dynamic Type large, VoiceOver labels on new controls.

## Decided by the user

- Approach A (tiered hybrid).
- All four features, plus extra features (scoped as phase 4 extras and the phase 5 roadmap).

## Builder's calls (marked as such; correct me if wrong)

- Work happens on the personal app from `main`, not the business redesign branch.
- JSON-in-text over provider tool calling.
- Qwen3.5 0.8B as default local model; download is opt-in.
- Entry points: FAB "Type or Say It", Ask on Home/Analytics headers, forecast card on Home.
- Digest default Sunday 19:00; alerts on by default, all toggleable.
- Android gets the deterministic features and the local model, but iOS is the verified platform this round.
- New screens follow the existing theme tokens and are refined with the impeccable design skill during implementation.

## Left to the builder

Exact package versions and polyfills; prompt wording; chart choice per answer type; thresholds tuned against the eval set; copy.
