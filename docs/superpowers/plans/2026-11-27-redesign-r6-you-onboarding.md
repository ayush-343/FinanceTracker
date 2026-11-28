# Daily Kolam redesign — R6 You + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** The You tab replaces Settings (every existing setting kept), and a three-step onboarding replaces the Lottie carousel, biometric screen, category builder and walkthrough overlay — ending with the user drawing day one of their kolam.

**Architecture:** `src/ui/SettingsRow.tsx` (grouped row: SF Symbol, title, subtitle, value/switch/chevron). `app/(tabs)/You.tsx` uses native pickers (ActionSheetIOS / Alert, Alert.prompt for amounts and the API key). PDF export moves to `src/services/pdfReport.ts`. Onboarding is one route, `app/(onboarding)/Start.tsx`, with four internal steps (welcome, currency, budget, first loop); pure starter-split math in `src/onboarding/starter.ts` (tested). Legacy Home/Analytics/Calendar/Settings screens, the old onboarding screens, the walkthrough (context, overlay, store) and CustomTabBar are deleted.

**Spec:** redesign spec → You, Onboarding. Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`.

## Global Constraints
- Every existing setting survives: currency, budget period, monthly total (rescaled across categories as before), appearance, Face ID, On-device AI, local model, Gemini key, weekly summary, budget alerts, clear learned categories, PDF export, subscriptions, reset.
- "Log Out" is renamed **Erase all data** (there is no account); confirmation states it cannot be undone.
- Onboarding: no Lottie, no carousel. Step 1 shows the empty month kolam and the promise in one sentence. Budget step: total + starter categories with an exact live split (the user can untick any). First-loop step: one sentence → amount + category, Save draws today's loop on screen; "Nothing spent today" also draws it.
- Face ID moves to You (no onboarding step). The evening nudge is deferred.

## Review Focus
- Starter split with no categories ticked → Continue disabled, no divide-by-zero. Test `starterSplit › none selected`.
- Split rounding → category budgets sum exactly to the total. Test `starterSplit › sums to total`.
- Budget left empty → categories created with 0 budgets; Today shows the "Set budgets" card.
- Erase all data → onboarding starts again at step 1.

### Task 1: Starter split
`src/onboarding/starter.ts`: `STARTERS: { key; name; icon; weight }[]` (Food & dining 30, Rent & bills 25, Groceries 15, Transport 12, Shopping 10, Fun 8), `starterSplit(total: number, keys: string[]): { key; amount }[]` (whole units, last absorbs rounding). TDD. Commit.

### Task 2: You tab
`src/ui/SettingsRow.tsx`, `src/services/pdfReport.ts` (Kolam-styled HTML report via expo-print + expo-sharing), `app/(tabs)/You.tsx`. Commit.

### Task 3: Onboarding
`app/(onboarding)/Start.tsx`, onboarding layout → single `Start` screen; root redirects to `/(onboarding)/Start`; `app/index.tsx` likewise. Commit.

### Task 4: Retire legacy
Delete Home, Analytics, Calendar, Settings tab screens; old onboarding screens; WalkthroughContext/Overlay, walkthroughStore, CustomTabBar; remove their providers/exports; tabs layout drops hidden legacy routes except Subscriptions. `npx tsc` clean of new errors. Commit.

### Task 5: Verify
Simulator: You rows (currency sheet, budget prompt, appearance, AI), Erase all data → onboarding → complete all steps → Today shows day one drawn. Dark mode pass on You and onboarding.
