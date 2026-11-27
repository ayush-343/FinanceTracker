# Daily Kolam redesign — R5 Ask + Weekly Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** A Sunday ritual — the weekly review as full-screen pages in the kolam field — and an Ask tab in the Kolam world whose answers tap through to the purchases behind them.

**Architecture:** `src/review/cards.ts` turns week stats, forecast, upcoming charges and goals into an ordered list of review cards (pure, tested). `app/Review.tsx` pages through them (horizontal paging, progress segments, tap edges to step). Entry: a row on Plan and the weekly summary notification (`data.url = '/Review'`, handled in the root layout). Ask: `app/Ask.tsx` and `AskResultCard` rebuilt with `src/ui`; `askQuestion` also returns the resolved range so bars and rows open Activity filtered to that month and category, and list rows open the purchase.

**Spec:** redesign spec → Weekly review, Ask. Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`.

## Global Constraints
- Review copy never shames: a quiet week is "a quiet week", an up week names the category and the size, no exclamation about overspending.
- Review numbers come from the same loaders as notifications (`loadWeekStats`, `getForecastFrom`); nothing estimated by a model.
- Last card always offers exactly one action, then "See you next Sunday".
- Month-end kolam share image is deferred (open decision in the spec).

## Review Focus
- No transactions this week → week card still shows the loops, change card says it's a quiet week, no NaN %. Test `reviewCards › quiet week`.
- No usual week yet (new user) → change card omitted. Test `reviewCards › no history`.
- Forecast insufficient → forecast card omitted. Test.
- Action choice: category up ≥10% → set a limit; else no goals → start a goal; else review goals. Test.

### Task 1: Review cards
`src/review/cards.ts`: `type ReviewCard = { kind: 'week' | 'change' | 'forecast' | 'upcoming' | 'action'; title: string; body: string; action?: { label: string; route: string; params?: Record<string,string> } }`; `reviewCards(input, money): ReviewCard[]` with input `{ weekLabel, drawn, elapsed, weekSpent, usualWeek, top: { id, name, spent, usual } | null, forecast, periodLabel, upcoming: { name, date, amount }[], goalCount }`. Export `loadWeekStats` from `insightNotifications.ts` (add category id). TDD. Commit.

### Task 2: Review screen + entry
`app/Review.tsx` (full-screen modal), `src/review/useReview.ts`; Plan gets a "This week's review" row; digest notification content gets `data: { url: '/Review' }`; root layout listens with `Notifications.addNotificationResponseReceivedListener` and pushes the url. Commit.

### Task 3: Ask restyle
`app/Ask.tsx` + `src/components/AskResultCard.tsx` on `src/ui` (Screen title "Ask", starter chips, question bubble in slate, answer cards with exact bars); `askQuestion` returns `range`; Activity accepts `month` (yyyy-MM) and `categoryId` params. Commit.

### Task 4: Verify
Simulator: open review from Plan, page through, action; Ask starters render; tap-through from a breakdown (simulated with a seeded answer is not possible — verify routing by tapping a list/breakdown when a model answer exists on device; on the simulator verify layout and error state). `npx jest`, `npx tsc`.
