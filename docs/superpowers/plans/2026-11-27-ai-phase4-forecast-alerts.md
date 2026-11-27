# On-device AI — Phase 4 (Forecast, alerts, weekly summary, subscription detection) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show where spending is heading this budget period, warn before a budget is blown, flag likely duplicates and unusually large entries before saving, send a weekly summary, and suggest tracking repeat payments as subscriptions.

**Architecture:** All math is pure, deterministic TypeScript (no model): a forecaster, three detectors and a digest-text builder, unit-tested. Thin loaders read SQLite through the phase 3 `QueryDb` (tested with the sql.js fixture). Local notifications via `expo-notifications`, rescheduled whenever the app comes to the foreground. Ask's `forecast` plan type now returns the forecast.

**Tech Stack:** TypeScript, date-fns, expo-sqlite, `expo-notifications` (already installed), AsyncStorage, jest + sql.js.

**Spec:** `docs/superpowers/specs/2026-11-27-on-device-ai-design.md` (Feature 4; Settings). Builds on `src/ai/ask/execute.ts` (`QueryDb`, `AskResult`), `src/ai/ask/range.ts`, `src/ai/ask/__tests__/fixtureDb.ts`, settings store `ai_prefs`.

## Global Constraints

- Branch `feature/on-device-ai`; commit per task.
- No model involvement in any figure. Forecast copy is template text.
- Period = the user's budget period (`weekly` Monday–Sunday, `monthly` calendar month), matching `budgetStatus` in phase 3.
- Fewer than 21 days between the earliest transaction and today → no forecast; UI says "Forecast appears after 3 weeks of history."
- Subscription-generated transactions are those with `notes LIKE 'Subscription:%'` (see `subscriptionStore.ts:138`). They are excluded from spending-rate math and future subscription charges are added separately.
- Notifications: ask permission only when the user turns on a notification setting or on first forecast alert; never on launch. Each overspend alert at most once per category per period. Digest Sunday 19:00 local, on by default once permission is granted; both toggleable in Settings → AI & Privacy.
- Token budget: grep before reading, read only edited ranges, no subagents, one simulator pass at the end.

## Decisions made in this plan (builder's calls — flagged for review)

- Duplicate and unusually-large checks show as an inline warning on Add Transaction **before** saving (more useful than a notification after the fact); overspend and digest are notifications.
- No background task: iOS runs background fetch rarely and it needs extra native config. Notifications are recomputed on each app open; digest text says "as of <weekday>".
- Subscription "price change" alerts are dropped: subscription charges are generated at a fixed amount, so the data can't show a price change.
- Forecast band = variable part ×0.7 / ×1.3 (scheduled subscriptions are certain).

## Review Focus

- Monthly subscription on the 31st in a 30-day month → the existing generator never charges it; the forecast must match the generator (no charge), not invent one. Test: `subscriptionChargesBetween › monthly on 31st skips short month`.
- Last day of the period (no remaining days) → likely = spent, no projection, no "over by" date in the past. Test: `forecast › last day of period`.
- Category with budget 0 → forecast shown but never "over budget". Test: `forecast › no budget`.
- Same purchase entered twice within 10 minutes vs same amount different merchant → only the first warns. Test: `detectDuplicate › needs same label`.
- A category with fewer than 5 past transactions → no "unusually large" warning. Test: `detectUnusual › needs history`.

---

### Task 1: Forecast core (pure)

**Files:** Create `src/ai/forecast/subscriptions.ts`, `src/ai/forecast/forecast.ts`; Tests `src/ai/forecast/__tests__/subscriptions.test.ts`, `src/ai/forecast/__tests__/forecast.test.ts`.

**Produces:**
- `subscriptionChargesBetween(sub: { amount: number; frequency: 'daily'|'weekly'|'monthly'; start_date: string; is_active: boolean }, from: string, to: string, skips: Set<string>): { date: string; amount: number }[]` — same trigger rules as `subscriptionStore.ts:105-130` (daily every day ≥ start; weekly same weekday; monthly same day-of-month, no clamping), inclusive, inactive → [].
- `interface ForecastInput { today: string; period: { from: string; to: string }; earliestTransaction: string | null; categories: { id: number; name: string; color: string; budget: number }[]; daily: { date: string; categoryId: number; amount: number }[] /* non-subscription spend, period start − 56 days .. today */; spentSoFar: Record<number, number> /* all spend incl. subscriptions, period start..today */; upcomingSubscriptions: { date: string; categoryId: number; amount: number }[] /* after today .. period end */ }`
- `interface CategoryForecast { categoryId: number; name: string; color: string; spent: number; likely: number; low: number; high: number; budget: number; overOn: string | null }`
- `type Forecast = { status: 'insufficient' } | { status: 'ok'; period: { from: string; to: string }; total: { spent: number; likely: number; low: number; high: number; budget: number }; categories: CategoryForecast[] /* sorted by likely/budget risk desc, then likely desc */ }`
- `computeForecast(input: ForecastInput): Forecast`

Algorithm per category, for each remaining day d (today+1 .. period.to):
```
currentRate = (variable spend this period up to today) / (days elapsed in period, incl. today)
weekdayAvg(d) = variable spend on d's weekday during the 56 days before today (today−56 .. today−1)
                ÷ number of those weekdays on or after earliestTransaction (max 8)
expected_d = 0.5 * currentRate + 0.5 * weekdayAvg(d)
variable = Σ expected_d ; subs = Σ upcomingSubscriptions for the category
likely = spent + variable + subs ; low = spent + 0.7*variable + subs ; high = spent + 1.3*variable + subs
overOn = budget > 0 && likely > budget ? first remaining day where spent + cumulative(expected + subs) > budget (or today if spent > budget already) : null
```
Round money to 2 dp. `insufficient` when `earliestTransaction` is null or < 21 days before `today`.

- [ ] Step 1: Tests: subscriptions — daily/weekly/monthly counts in Nov 2026, skips respected, `monthly on 31st skips short month`, inactive empty. Forecast (today 2026-11-20, monthly period) — steady ₹100/day history → likely ≈ spent + 10×100; budget 2500 with spent 2000 → overOn 2026-11-26 (2,600 > 2,500); `last day of period` (today 11-30) → likely = spent, overOn null unless already over; `no budget` → overOn null; upcoming subscription adds exactly its amount to low/likely/high; `insufficient` with 10 days of history.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): spending forecast`.

### Task 2: Forecast loader + Ask forecast

**Files:** Create `src/ai/forecast/load.ts`; Modify `src/ai/ask/__tests__/fixtureDb.ts` (add `subscriptions`, `subscription_skips` tables with one monthly ₹199 row on the 5th in Food), `src/ai/ask/execute.ts` (`AskResult` adds `{ kind: 'forecast'; forecast: Forecast }`), `src/ai/ask/plan.ts` (`forecast` resolves to `{ type: 'forecast' }` instead of unsupported), `src/ai/ask/ask.ts` (calls loader for forecast), `src/ai/ask/answer.ts` (template + allowed numbers for forecast), `src/components/AskResultCard.tsx` (forecast body reuses Task 5's `ForecastRows`); Test `src/ai/forecast/__tests__/load.test.ts`; update phase 3 tests that expected "Forecasts are coming soon."

**Produces:**
- `loadForecastInput(db: QueryDb, today: Date, budgetPeriod: 'weekly'|'monthly'): Promise<ForecastInput>` — period via `resolveRange` (`this_week`/`this_month`); queries: categories (id, name, color, budget_limit), `MIN(date)` from transactions, daily variable spend `GROUP BY date, category_id WHERE notes NOT LIKE 'Subscription:%'`, spent-so-far by category, subscriptions + skips → `subscriptionChargesBetween(sub, tomorrow, period.to, skips)`.
- `getForecast(db = askDb, today = new Date(), budgetPeriod): Promise<Forecast>`.
- Forecast template: ok → "You're on pace for ₹X–₹Y this month (likely ₹Z). Food may go over budget around 24 Nov." / no risk → "…All categories look on track." / insufficient → "Forecast appears after 3 weeks of history."

- [ ] Step 1: Tests against fixture (today 2026-11-20): input has the ₹199 subscription on none of the remaining days (5th passed) and on 2026-12-05 not included; spentSoFar matches SQL sums; `askQuestion` with `{"type":"forecast"}` returns kind forecast.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS (whole suite). Step 5: commit `feat(ai): forecast loader and forecast answers in Ask`.

### Task 3: Detectors (pure)

**Files:** Create `src/ai/insights/detectors.ts`; Test `src/ai/insights/__tests__/detectors.test.ts`.

**Produces:**
- `interface TxLite { id: number; amount: number; date: string; createdAt: string /* ISO */; categoryId: number; label: string /* merchant ?? item ?? notes */ }`
- `detectDuplicate(candidate: { amount: number; label: string; now: string }, recent: TxLite[]): TxLite | null` — same amount, `normalizeKey(label)` equal (phase 1 categorizer), `createdAt` within 10 minutes of `now`.
- `detectUnusual(candidate: { amount: number; categoryId: number }, history: TxLite[]): { median: number } | null` — category history ≥ 5 transactions, amount > 3× median and amount ≥ 500.
- `detectSubscriptionCandidates(history: TxLite[], tracked: { name: string; amount: number }[], dismissed: Set<string>): { key: string; label: string; amount: number; frequency: 'weekly'|'monthly'; categoryId: number; count: number }[]` — group by `normalizeKey(label)`; ≥ 3 occurrences with amounts within ±5% of their median; consecutive gaps all 6–8 days (weekly) or 27–33 days (monthly); skip if a tracked subscription's normalized name matches or amount within 5% and name overlaps, or key dismissed; `key = normalizedLabel|frequency`.

- [ ] Step 1: Tests: duplicate within 10 min yes / 11 min no / `needs same label`; unusual yes / below 500 no / `needs history`; subscriptions — Spotify 119 on 5 Sep/5 Oct/5 Nov → monthly; amounts 119/129/119 within 5%? (129 is 8% off → no); irregular gaps no; already tracked no; dismissed no; weekly gym.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(ai): duplicate, unusual and subscription detectors`.

### Task 4: Notifications (digest + overspend)

**Files:** Create `src/ai/insights/digest.ts` (pure), `src/services/insightNotifications.ts`; Modify `src/store/settingsStore.ts` (`ai_prefs` gains `digestEnabled: boolean` default true, `alertsEnabled: boolean` default true, setters), `app/_layout.tsx` (on mount + `AppState` → `active`: `refreshInsightNotifications()`; set `Notifications.setNotificationHandler` to show banners), `app.json` (plugin `"expo-notifications"`), `app/(tabs)/Settings.tsx` (two `Switch` rows "Weekly Summary", "Budget Alerts" in AI & PRIVACY); Test `src/ai/insights/__tests__/digest.test.ts`.

**Produces:**
- `buildDigest(input: { weekSpent: number; usualWeek: number | null; topCategory: { name: string; spent: number; usual: number } | null; forecast: Forecast; asOf: string /* weekday name */ }, money: (n: number) => string): { title: string; body: string }` — e.g. title "Your week so far", body "₹4,320 spent (as of Thu). Food is up 30% on your usual. On pace for ₹38–42k this month." Omits clauses that lack data.
- `overspendAlerts(forecast: Forecast, alreadySent: Set<string>, periodKey: string): { key: string; title: string; body: string }[]` — one per category with `overOn`, key `${periodKey}:${categoryId}`, skipping sent keys. Body: "Food is on pace for ₹3,400 against a ₹3,000 budget — likely over around 24 Nov."
- `refreshInsightNotifications(): Promise<void>` — if neither setting on or permission not granted → cancel ours and return; compute forecast + week stats (via loaders); cancel and reschedule digest (identifier `weekly-digest`, weekly trigger Sunday 19:00); for new overspend alerts schedule immediately and store sent keys in AsyncStorage `insight_alerts_sent` (prune keys from old periods).
- `ensureNotificationPermission(): Promise<boolean>` — called when a toggle is switched on.

- [ ] Step 1: Tests for `buildDigest` (full, no usual, insufficient forecast) and `overspendAlerts` (once per key, none when no risk).
- [ ] Step 2: FAIL. Step 3: implement pure + service + wiring. Step 4: jest PASS; tsc 0 new. Step 5: commit `feat(ai): weekly summary and budget alert notifications`.

### Task 5: Forecast and insight UI

**Files:** Create `src/components/ForecastCard.tsx` (exports `ForecastCard` and `ForecastRows`), `src/components/SubscriptionSuggestion.tsx`, `src/hooks/useForecast.ts`; Modify `app/(tabs)/Home.tsx` (ForecastCard under `BudgetSummaryCard`, ~line 153), `app/Category.tsx` (one line "On pace for ₹X by <period end>" under the budget figure, ~line 213), `app/AddTransaction.tsx` (inline warnings), `app/(tabs)/Subscriptions.tsx` (suggestion cards above the list), `app/AddSubscription.tsx` (accept `name`, `amount`, `frequency`, `categoryId` params to prefill).

**Produces:**
- `useForecast(): { forecast: Forecast | null; refresh(): void }` — loads on focus.
- `ForecastCard` — insufficient: muted one-liner; ok: "On pace for ₹38k–₹42k" + "likely ₹40k of ₹45k budget" + up to 3 at-risk categories with color dot and "over around 24 Nov"; nothing at risk: "All categories on track". Tapping a category opens Category.
- AddTransaction: debounced on amount/item/category change → `detectDuplicate` (recent 20 transactions) and `detectUnusual` (category last 90 days); show a non-blocking warning row above the Save button: "Looks like a duplicate of ₹250 Uber added 3 min ago." / "This is much bigger than your usual Food purchase (₹180)." Save still works.
- Subscriptions tab: `SubscriptionSuggestion` cards from `detectSubscriptionCandidates` over the last 120 days — "You've paid Spotify ₹119 3 months in a row. Track it?" with "Track" (→ AddSubscription prefilled) and "Dismiss" (adds key to AsyncStorage `dismissed_subscription_suggestions`).
- Use the impeccable skill only for `ForecastCard` (the one prominent new surface), against existing tokens.

- [ ] Step 1: Implement. Step 2: tsc 0 new; jest green.
- [ ] Step 3: Simulator pass (rebuild needed for the notifications plugin): seed ~4 weeks of transactions via sqlite3 into the simulator DB (scratch script, not committed) → Home shows forecast card; Category shows projection; add a duplicate → warning appears; three monthly "Spotify 119" rows → suggestion on Subscriptions; Settings toggles present. Notification delivery itself is best checked on device; note it.
- [ ] Step 4: Commit `feat(ai): forecast card, inline warnings, subscription suggestions`.
