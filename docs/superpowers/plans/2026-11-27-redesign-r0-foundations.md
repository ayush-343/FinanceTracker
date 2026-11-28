# Daily Kolam redesign — R0 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** The Daily Kolam design tokens and base components, usable by every later phase, viewable on a dev-only kit screen.

**Architecture:** New `src/ui/` module, independent of the old `src/theme` components (which stay until each screen is replaced). `useKolam()` reads light/dark from the existing `ThemeProvider` (`isDark`) and returns the Kolam palette. Pure helpers (exact band shares, category hues) are unit-tested; components are verified on `app/dev-kit.tsx` in the simulator, light and dark.

**Spec:** `docs/superpowers/specs/2026-11-27-kolam-redesign-design.md` (Visual system). Contract: `.impeccable/surfaces/app-tabs-today-tsx.md`.

## Global Constraints
- Branch `feature/kolam-redesign`. Colours exactly as the spec's table and hue wheel. Money uses `fontFamily: 'ui-rounded'` + `fontVariant: ['tabular-nums']`.
- 44pt minimum touch targets; every interactive component takes `accessibilityLabel`.
- No red fills for spending; over budget is `Hatch`.
- Icons through `Symbol` (expo-symbols `SymbolView` on iOS, Feather fallback elsewhere).

## Review Focus
- Shares that don't sum to 100 after rounding → bands still fill exactly the total width. Test: `bandSegments › widths sum to 1`.
- Zero or negative values → omitted, no NaN widths. Test: `bandSegments › ignores non-positive`.
- More categories than hues → wheel repeats deterministically. Test: `hueFor › wraps`.
- Dark mode text on surfaces keeps ≥4.5:1. Check on the kit screen.

### Task 1: Tokens + hook + pure helpers
Files: `src/ui/tokens.ts`, `src/ui/useKolam.ts`, `src/ui/bands.ts`, test `src/ui/__tests__/bands.test.ts`.
Produces: `kolamLight`, `kolamDark` (keys: ground, surface, field, fieldInk, fieldMuted, line, ink, muted, hairline, action, onAction, data, hatchInk), `CATEGORY_HUES: string[]`, `radii {card:20, field:24, pill:26, chip:17}`, `type` styles (largeTitle 34/700, title 17/600, body 16, sub 15, caption 13, money(size)), `useKolam(): { c: KolamPalette; isDark: boolean }`, `hueFor(index: number): string`, `bandSegments(values: {key: string; value: number; color: string}[], total?: number): {key; color; fraction}[]` (fractions of `total ?? sum`, non-positive dropped, last segment absorbs float error so fractions sum exactly to sum/total).
TDD: tests first (sum to 1, total larger than sum leaves remainder, ignores non-positive, hueFor wraps), FAIL, implement, PASS, commit `feat(ui): Kolam tokens and band math`.

### Task 2: Base components
Files in `src/ui/`: `Symbol.tsx`, `Money.tsx`, `Screen.tsx` (safe area, large title, subtitle, right accessory, scroll), `Field.tsx` (slate dominant block), `Card.tsx`, `ListRow.tsx` (hue dot, title, subtitle, trailing Money, onPress), `Chip.tsx` (selected state, optional hue dot), `Bands.tsx` (exact segments + optional marker fraction + optional hatched remainder), `Hatch.tsx` (SVG diagonal pattern box), `PillInput.tsx` (TextInput pill + trailing 52pt action), `Button.tsx` (primary turmeric / ghost, loading, disabled), `index.ts`.
Verify: `npx tsc --noEmit` (5 pre-existing errors, 0 new). Commit `feat(ui): Kolam base components`.

### Task 3: Dev kit screen
File: `app/dev-kit.tsx` (renders every component and both palettes' swatches; route returns null outside `__DEV__`).
Verify in simulator via `xcrun simctl openurl booted finance-tracker://dev-kit`, light and dark. Commit `chore(ui): dev kit screen`.
