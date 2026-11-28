# On-device AI — Phase 2 (AI engines + log by typing or voice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log a purchase by typing or saying one sentence ("200 coffee at Blue Tokai yesterday"), then confirm it on the existing Add Transaction screen.

**Architecture:** A deterministic pre-parser always runs first and alone covers the "no model" case. A `LanguageEngine` interface hides two backends — Apple Foundation Models (`@react-native-ai/apple`) and an opt-in downloaded GGUF via `@react-native-ai/llama` — both used through AI SDK `generateText`, returning JSON that zod validates. The result pre-fills `AddTransaction` (which becomes the confirm card); the categorizer from phase 1 picks the category.

**Tech Stack:** AI SDK `ai` v7, `@react-native-ai/apple` 0.13, `@react-native-ai/llama` 0.13 + `llama.rn` 0.13 rc, `zod` 4, `expo-speech-recognition`, Expo SDK 54 / RN 0.81.5.

**Spec:** `docs/superpowers/specs/2026-11-27-on-device-ai-design.md` (Architecture; Feature 2; Settings → AI & Privacy). Builds on phase 1 (`src/ai/categorizer`, `learnCategory`).

## Global Constraints

- Branch `feature/on-device-ai`. Commit per task.
- Nothing is saved without the user pressing Save on Add Transaction.
- No number shown comes from the model unless it also appears in the user's text (amount guard).
- Works fully with engine `off`: pre-parser fills the form.
- Local model download is opt-in, shows size first, deletable. No network otherwise.
- Speech: request on-device recognition; if unavailable or denied, the text field still works and the UI says dictation is unavailable.
- Token budget: grep before reading, read only edited ranges, no subagents, simulator check once at the end.

## Review Focus

- Model invents an amount not in the text ("coffee yesterday" → 150) → amount left empty. Test: `mergeDraft › drops model amount not in text`.
- Amount formats `₹1,250`, `Rs 99`, `1.5k`, `$12.50` → 1250, 99, 1500, 12.5. Test: `preParse › amounts`.
- "last friday" when today is Friday → the Friday 7 days ago; "yesterday" across a month boundary. Test: `preParse › relative dates`.
- Model returns prose or broken JSON → one repair attempt, then pre-parse only, no crash. Test: `extractJson › invalid returns null` + `parseQuickLog › falls back when engine throws`.
- Engine `auto` on a device without Apple Intelligence and no downloaded model → `off`, no error shown. Test: `selectEngine › auto falls back to off`.

---

### Task 1: Dependencies and native config

**Files:** `package.json`, `app.json` (plugins), `index.ts` or `app/_layout.tsx` (polyfill import at top), `src/ai/polyfills.ts`.

- [ ] Step 1: `npx expo install zod expo-speech-recognition` (lets Expo pick the SDK-54-compatible speech version; if it picks one whose README requires a newer SDK, use the version its compatibility table lists for SDK 54).
- [ ] Step 2: `npm i ai@^7 @react-native-ai/apple@0.13.0 @react-native-ai/llama@0.13.0 llama.rn@0.13.0-rc.12`. Do NOT add `react-native-blob-util` directly (llama provider brings `^0.24.12`; 1.x needs RN ≥ 0.84).
- [ ] Step 3: Add the polyfills the react-native-ai docs list for AI SDK v7 in `src/ai/polyfills.ts`; import it first in the app entry.
- [ ] Step 4: `app.json` plugins add `"llama.rn"` and `["expo-speech-recognition", { "microphonePermission": "Used to log purchases by voice.", "speechRecognitionPermission": "Used to turn your words into a transaction on this device." }]`.
- [ ] Step 5: `npx tsc --noEmit` (5 pre-existing errors, 0 new) and `npx jest --silent` (18 passed).
- [ ] Step 6: `LANG=en_US.UTF-8 npx expo prebuild -p ios --clean` → completes. Commit `chore(ai): add AI SDK, on-device providers, speech recognition`.

### Task 2: Pre-parser (pure)

**Files:** Create `src/ai/quicklog/preParse.ts`; Test `src/ai/quicklog/__tests__/preParse.test.ts`.

**Produces:**
- `interface PreParsed { amount: number | null; date: string /* yyyy-MM-dd */; merchant: string | null; item: string | null; amountsInText: number[] }`
- `preParse(text: string, today: Date): PreParsed`

Rules: amounts — optional `₹|rs\.?|inr|\$|usd`, digits with `,`, optional decimal, optional `k` (×1000); first amount wins, all go to `amountsInText`. Dates — `today`, `yesterday`, `day before yesterday`, `last <weekday>` (strictly before today, 1–7 days back), `on <d> <month>` / `<month> <d>`; default today. Merchant — words after `at|from|@` up to a date word or end. Item — remaining words minus amount/date/merchant/filler (`for|on|spent|paid|bought|a|an|the`), trimmed; null if empty.

- [ ] Step 1: Tests (today = Fri 2026-11-27): `amounts` (cases from Review Focus); `"200 coffee at Blue Tokai yesterday"` → `{amount:200, merchant:'Blue Tokai', item:'coffee', date:'2026-11-26'}`; `relative dates` (`last friday`→`2026-11-20`, `yesterday` with today 2026-12-01 →`2026-11-30`); `no amount` → `amount:null`.
- [ ] Step 2: `npx jest preParse` → FAIL. Step 3: implement with `date-fns`. Step 4: PASS. Step 5: commit `feat(ai): quick-log pre-parser`.

### Task 3: Schemas, JSON extraction, merge

**Files:** Create `src/ai/schemas.ts`, `src/ai/json.ts`, `src/ai/quicklog/merge.ts`; Test `src/ai/__tests__/json.test.ts`, `src/ai/quicklog/__tests__/merge.test.ts`.

**Produces:**
- `DraftTransactionSchema` (zod): `{ amount: number|null, merchant: string|null, item: string|null, date: string|null /* yyyy-MM-dd */, categoryHint: string|null }`; `type DraftTransaction = z.infer<…>`.
- `extractJson<T>(text: string, schema: z.ZodType<T>): T | null` — strips ```` ``` ```` fences, takes the outermost `{…}`, `JSON.parse`, `schema.safeParse`; null on any failure.
- `interface QuickLogResult { amount: number|null; date: string; merchant: string|null; item: string|null; categoryHint: string|null }`
- `mergeDraft(pre: PreParsed, model: DraftTransaction | null): QuickLogResult` — amount: `pre.amount` if set, else model amount only if it is in `pre.amountsInText` (else null); date: model date if valid ISO and within ±366 days of pre.date, else pre.date; merchant/item: model value if non-empty else pre; categoryHint from model.

- [ ] Step 1: Tests — `extractJson`: fenced JSON ok; prose around JSON ok; `invalid returns null`; schema mismatch → null. `mergeDraft`: `drops model amount not in text`; pre amount wins over model; model fills missing merchant; bad model date ignored; `model null → pre only`.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): draft schema, JSON extraction, merge guard`.

### Task 4: Engines and selection

**Files:** Create `src/ai/engine.ts`, `src/ai/engines/apple.ts`, `src/ai/engines/local.ts`, `src/ai/models.ts`; Test `src/ai/__tests__/engine.test.ts`.

**Produces:**
- `type EngineId = 'apple' | 'local'`; `type EnginePreference = 'auto' | 'apple' | 'local' | 'off'`
- `interface LanguageEngine { id: EngineId; isReady(): Promise<boolean>; generate(prompt: string, system: string): Promise<string> }`
- `selectEngine(pref: EnginePreference, engines: LanguageEngine[]): Promise<LanguageEngine | null>` — `off`→null; explicit id→that engine if ready else null; `auto`→first ready in order apple, local.
- `getEngine(): Promise<LanguageEngine | null>` — reads preference from settings store (Task 6), uses real engines.
- `generateJSON<T>(engine, prompt, system, schema): Promise<T | null>` — generate → `extractJson`; on null, one retry with "Return only valid JSON matching the schema." appended; still null → null.
- `appleEngine`: `isReady` = `getModelInfo()` availability `'available'` (catch → false, covers `UNSUPPORTED_OS`); `generate` via AI SDK `generateText({ model: apple(), system, prompt })`.
- `localEngine`: model file under `FileSystem.documentDirectory + 'models/'`; `isReady` = file exists; `generate` via `generateText` with the llama provider; lazy-load and keep one instance.
- `src/ai/models.ts`: `LOCAL_MODELS: { id: string; label: string; url: string; sizeMB: number }[]` with Qwen3.5 0.8B Instruct GGUF Q4_K_M (default) and 2B Q4_K_M — implementer looks up the official Hugging Face GGUF URLs and sizes and records them. Plus `downloadLocalModel(id, onProgress)`, `deleteLocalModel(id)`, `isLocalModelDownloaded(id)` using `expo-file-system` resumable download.

- [ ] Step 1: Tests with fake engines: `selectEngine › auto prefers apple`; `› auto falls back to local`; `› auto falls back to off`; `› explicit not ready → null`; `generateJSON › retries once then null` (fake returns prose twice; assert 2 calls).
- [ ] Step 2: FAIL. Step 3: implement (provider modules mocked in jest via `jest.mock`). Step 4: PASS; tsc 0 new. Step 5: commit `feat(ai): language engine interface, Apple and local engines`.

### Task 5: parseQuickLog orchestration

**Files:** Create `src/ai/quicklog/parse.ts`, `src/ai/prompts.ts`; Test `src/ai/quicklog/__tests__/parse.test.ts`.

**Produces:**
- `buildQuickLogPrompt(text: string, todayISO: string, currency: string, categoryNames: string[]): { system: string; prompt: string }` — system says: extract one purchase, output only JSON with the DraftTransaction keys, resolve relative dates against today, `categoryHint` must be one of the given names or null, never guess an amount.
- `parseQuickLog(text: string, deps: { engine: LanguageEngine | null; today: Date; currency: string; categoryNames: string[] }): Promise<QuickLogResult>` — `preParse` → if engine, `generateJSON` (any throw → null) → `mergeDraft`.

- [ ] Step 1: Tests: `engine null → pre-parse only`; `falls back when engine throws`; `uses model merchant when pre has none`; prompt contains today and every category name.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): quick-log parsing with engine fallback`.

### Task 6: Settings — engine and local model

**Files:** Modify `src/store/settingsStore.ts` (add `aiEngine: EnginePreference` default `'auto'`, `localModelId: string` default first of `LOCAL_MODELS`, persisted like existing non-secret prefs, with setters), `app/(tabs)/Settings.tsx` AI & PRIVACY group.

- Rows: "On-device AI" — subtitle shows status: `Apple Intelligence · ready` / `Local model · ready` / `Off` / `Not available on this device`; tap opens an action sheet Auto / Apple / Local model / Off. "Local Model" — subtitle `Qwen3.5 0.8B · 0.6 GB · Download` / `Downloading 42%` / `Downloaded · Delete`; download asks for confirmation with size and "Wi-Fi recommended"; delete asks to confirm.
- [ ] Step 1: Implement. Step 2: tsc 0 new; jest green. Step 3: commit `feat(ai): engine choice and local model management in settings`.

### Task 7: Quick Log screen + entry point

**Files:** Create `app/QuickLog.tsx`, `src/hooks/useDictation.ts`; Modify `app/(tabs)/_layout.tsx` (FAB menus, iOS lines ~44 and Android ~62: add "Type or Say It" first), `app/_layout.tsx` (register `QuickLog` as modal like `AddTransaction`), `app/AddTransaction.tsx` (accept `merchant` and `source` params; pass to `addTransaction` with `merchant`, `source`).

**Produces:**
- `useDictation(): { available: boolean; listening: boolean; transcript: string; start(): Promise<void>; stop(): void; error: string | null }` — `expo-speech-recognition` with `requiresOnDeviceRecognition: true`, `interimResults: true`; `available=false` when permission denied or on-device recognition unsupported.
- QuickLog: multiline text field (autofocus), mic button (hidden-with-note when `!available`), live transcript fills the field, hint examples, "Continue" button → `parseQuickLog` (spinner ≤ engine time; button disabled while parsing) → `router.replace('/AddTransaction', { amount, itemName: item ?? merchant ?? text, notes: '', date, merchant, source: usedMic ? 'voice' : 'text', categoryId? })` — `categoryId` from `suggestCategory(merchant ?? item)`; if none, from `categoryHint` matched case-insensitively to a category name.
- Use the impeccable skill for this one screen's layout, against existing theme tokens.

- [ ] Step 1: Implement. Step 2: tsc 0 new; jest green.
- [ ] Step 3: Simulator check (one pass, `LANG=en_US.UTF-8 npx expo run:ios`): FAB → Type or Say It → type "250 uber trip yesterday" → Continue → Add Transaction shows 250, yesterday's date, Transport preselected if learned → Save → DB row has `source='text'`. Settings shows engine status. (Mic and Apple model can't be fully verified on the simulator; note that.)
- [ ] Step 4: Commit `feat(ai): type-or-say quick log`.
