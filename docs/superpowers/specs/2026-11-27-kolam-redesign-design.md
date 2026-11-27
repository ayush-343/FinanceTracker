# Daily Kolam — production redesign of Finance Tracker

Date: 2026-11-27 · Status: draft for approval
Mockups: `docs/redesign-personal/mockups.html` (six iPhone screens) · Direction round: `.impeccable/mocks/decision/` (seed: 84988bf392561bd6)

## Why

The current app is a working prototype: features exist, but the interface is a set of separate screens (Home, Insights, Calendar, Subscriptions, Settings) with no reason to come back beyond need. The goal is a production app people open every day for months: logging in seconds, a clear sense of where the month is heading, a weekly ritual, goals worth watching fill.

Confirmed with the user: all four reasons to return (daily logging, weekly review, goals and savings, asking and exploring). Anti-goals: heavy gamification (badges, XP, confetti) and guilt or nagging. See `PRODUCT.md`.

## Research that shaped it

- Finance apps lose a large share of users within three months; usability, trust and relevance drive retention, with gentle nudges and goal progress as the habit tools (Branch, onething, Tink).
- Streaks work but punish: forgiving designs (Duolingo's weekend amulets, streak freezes, weekly resets, recovery-first design) keep the habit without the guilt spiral (Smashing Magazine, Yu-kai Chou, Mobbin's study of 859 streak designs).
- Indian users of Jupiter ask for category trends over time and compare its insights unfavourably with Monzo's feed (Jupiter community).

## The direction: Daily Kolam

**Thesis.** Each day you log draws one loop of the month's kolam, so your month becomes a pattern you made, not a score you failed. It refuses the category default (balance card + donut chart + red overspend) and the streak counter that resets to zero.

**Signature move.** The month kolam: a dot grid of the month's days; logging any spend (or tapping "Nothing spent today") draws that day's loop, which joins its neighbours into a lattice. Skipped days stay as quiet dots — the pattern keeps going. The weekly review shows the week's row; month end produces a finished kolam you can save.

**Raised by the challengers it beat** (each is a binding rule):
1. One fixed full-strength hue per category; a band's length is its exact share. *(from the acetate tab manual)*
2. One field dominates each screen: the kolam on Today, the forecast on Plan, the answer on Ask. *(from the guide map)*
3. Every bar and arc is an exact proportion; no decorative charts. *(from labanotation)*
4. Over budget is a hatch pattern plus words, never red alone. *(from the darkroom record)*

**Borrowed format.** The weekly review uses full-screen snap pages (from the Snap Review Feed challenger), drawn in this world.

## Visual system (to be recorded in DESIGN.md after the build)

| Role | Light | Dark |
|---|---|---|
| Ground (lime-wash) | `#EEF1EA` | `#121A16` |
| Surface | `#FFFFFF` | `#1B2520` |
| Field / ink (wet stone) | `#1E2A25` | field `#22302A`, ink `#F4EFE6` |
| Rice-flour line | `#F4EFE6` | `#F4EFE6` |
| Muted text | `#5B6A63` | `#A9B5AF` |
| Hairline | `#D5DCD4` | `#2C3A33` |
| Action / today (turmeric) | `#F2B21B` (text on it `#1E2A25`) | same |
| Data (indigo) | `#3D4FB3` | `#7C8BE0` |

- **Category hue wheel** (fixed, assigned in order, user can change): vermilion `#E8623C`, indigo `#3D4FB3`, teal `#2F9C8F`, plum `#8E4A9E`, ochre `#C98B1D`, leaf `#5E9B3A`, rose `#D2557A`, slate blue `#4F7CAC`.
- **Status:** over budget = diagonal hatch + text; at risk = turmeric outline; on track = plain. No red fills for spending.
- **Type:** SF Pro Text for UI (Dynamic Type styles); SF Pro Rounded for money and counts (tabular numerals). Large titles on top-level tabs.
- **Shape:** 20–24 pt card radii, 26 pt pill inputs, 44 pt minimum targets. Cards are white surfaces on the lime-wash ground; the slate field is reserved for the one dominant element per screen.
- **Motion:** one authored moment — the loop draws itself (≈600 ms ease-out stroke draw) with a soft haptic when a day closes. Sheets and pushes are system transitions. Reduce Motion: the loop appears without drawing.
- **Icons:** SF Symbols via `expo-symbols` (already installed) instead of Feather, so icons match iOS weight and Dynamic Type.

## Information architecture

Tab bar (5): **Today · Activity · Ask · Plan · You**.

| New | Replaces / absorbs |
|---|---|
| Today | Home (budget card, category grid), FAB menu, Quick Log entry |
| Activity | Calendar tab (becomes the Month segment), Items/Category transaction lists, search |
| Ask | Ask modal (now a tab) |
| Plan | Insights/Analytics, forecast card, budgets, Subscriptions (hidden screen), new Goals |
| You | Settings, AI & Privacy, export, appearance, security |

Logging is everywhere: the log bar on Today, a log button in the nav bar of every other tab, and later a widget and Siri shortcut. Category management moves into Plan → Budgets.

## Screens

**Today** — month kolam (dominant), "₹1,180 left today to stay on pace" with exact category bands and a pace marker, the log bar with mic, yesterday/today entries. Empty month: dots only plus "Log your first spend to draw day one."

**Log sheet** — one sentence typed or spoken; the parsed result appears as an editable confirm card in the same sheet (amount, what, when, category with "learned" tag), duplicate/unusual warning inline, Save names the loop it closes, "Nothing spent today" closes the loop with zero. Replaces the QuickLog → Add Transaction hop. Manual mode = the same card, blank. Receipt scan opens from the sheet's camera button and returns line items into the same card list.

**Activity** — search (merchant, note, natural phrases routed through Ask), List/Month segment, month switcher with exact category bands, filter chips with shares, day groups with day totals, source tags (voice, scanned). Swipe to edit/delete. Month view: calendar grid where each day cell carries its loop and total.

**Plan** — forecast range (dominant field) with spent fill and hatched likely band against the budget marker; budgets with exact bars and hatch + words when over; goals (new) with plain arithmetic ("₹4,000 a month gets you there by 28 Feb"); upcoming subscriptions and suggestions; category management.

**Ask** — becomes a tab; answer sentence plus exact bars/cards; every bar taps through to the matching purchases in Activity; follow-up chips; starter questions when empty.

**Weekly review** — Sunday notification opens 4–5 snap pages in the slate field: the week's kolam row ("6 of 7 days drawn"), the biggest change vs a usual week, the month forecast, upcoming charges, one suggested action (set a limit, start a goal). Ends with "See you next Sunday". Also reachable from Plan.

**You** — profile, currency, budget period, appearance, security, AI & Privacy (engine, local model, learned categories, Gemini key), notifications (daily nudge off by default, weekly review, budget alerts), export, replay intro.

**Onboarding (rebuilt)** — three steps: currency, monthly budget (with suggested split), first log ("what did you spend today?") that draws day one of the kolam on screen. Replaces the Lottie carousel and walkthrough overlay.

## Engagement mechanics (within the anti-goals)

- Daily loop with forgiveness built in; no counter resets, no streak loss messages.
- "Nothing spent today" counts — logging is about awareness, not spending.
- Optional evening nudge (off by default): "Close today's loop?" only if today is open.
- Weekly review ritual and a month-end finished kolam (save or share image).
- Goals with visible progress and plain arithmetic.
- Learned categories and one-sentence logging keep each session under ten seconds.
- No badges, XP, levels, leaderboards or confetti.

## Integration plan (phases, each shippable)

| Phase | Scope | Main code touch points |
|---|---|---|
| R0 Foundations | New theme tokens (light/dark), Rounded numerals, SF Symbols wrapper, base components: Screen, Field, Card, ListRow, Chip, Bands, HatchBar, PillInput, Sheet | `src/theme/*` rewritten, new `src/ui/*`; old components kept until replaced |
| R1 Shell + Today | 5-tab layout, Today screen, Kolam component (react-native-svg + Reanimated stroke draw), "logged day" query incl. zero-spend marker | `app/(tabs)/_layout.tsx`, new `app/(tabs)/Today.tsx`, `src/ui/Kolam.tsx`, migration v3 `day_marks` |
| R2 Log sheet | Unified log sheet (sentence, manual, scan) with inline confirm; retire QuickLog→AddTransaction hop; keep Edit as the same sheet | `app/Log.tsx`, reuse `parseQuickLog`, detectors, `learnCategory` |
| R3 Activity | Feed, search, month bands, filters, Month segment replacing Calendar | `app/(tabs)/Activity.tsx`; remove `Calendar.tsx`, `Items.tsx` |
| R4 Plan + Goals | Forecast field, budgets with hatch, goals (new `goals` table + CRUD), subscriptions and suggestions, category management | `app/(tabs)/Plan.tsx`, migration v4 `goals`, absorb `Analytics.tsx`, `Subscriptions.tsx` |
| R5 Ask tab + Weekly review | Ask as a tab with tap-through bars; review snap pages + notification deep link; month-end kolam export | `app/(tabs)/Ask.tsx`, `app/Review.tsx`, `insightNotifications.ts` |
| R6 You + onboarding | Settings regrouped as You; three-step onboarding drawing day one; retire walkthrough overlay | `app/(tabs)/You.tsx`, `app/(onboarding)/*` |
| R7 Finish | Dark mode pass, Dynamic Type XL pass, VoiceOver pass, finish review, DESIGN.md + `.impeccable/design.json` | all |

All AI logic from phases 1–4 (categorizer, engines, quick-log parser, Ask executor, forecast, detectors, notifications) is reused unchanged; the redesign replaces presentation and navigation only. Each phase keeps the test suite green and ends with a simulator pass in light and dark.

## Open decisions

- App name stays "Finance Tracker" for now? (A name with character would help the identity; not required for the build.)
- Android: same design with Material-appropriate controls later, or iOS only for this release? Assumed iOS only.
- Month-end kolam share image: include in R5, or defer?
