---
version: 1
slug: "app-tabs-today-tsx"
primary_target: "app/(tabs)/Today.tsx"
related_targets: ["app/(tabs)/_layout.tsx"]
---

Scope: the whole personal app shell (Today, Activity, Ask, Plan, You, Log sheet, Weekly review). Visitor mode: Operate.
Audience and job: one person logging everyday spends in seconds and checking where the month is heading; weekly review on Sunday. Spec: docs/superpowers/specs/2026-11-27-kolam-redesign-design.md. Mockups: docs/redesign-personal/mockups.html.
Unresolved: app name; Android later; month-end kolam share timing.

## Direction contract

THESIS: Each day you log draws one loop of the month's kolam, so the month is a pattern you made, not a score you failed. Refuses the balance-card + donut + red-overspend dashboard and the reset-to-zero streak.

OWN-WORLD: Lime-wash ground #EEF1EA, white surfaces, one wet-stone slate field #1E2A25 per screen carrying rice-flour lines #F4EFE6; turmeric #F2B21B is the only action and today colour; fixed category hue wheel; hatch instead of red for over budget; SF Pro Text UI with SF Pro Rounded tabular money; 20-24pt radii, pill inputs, SF Symbols.

STORY: Open, see the month's lattice and what is left today, log one sentence, watch today's loop draw; on Sunday flick through the week; plan goals against an honest forecast range.

FIRST VIEWPORT: Today large title and date; slate field with the 7-column month kolam (logged = joined loops, skipped = dots, today = turmeric dashed loop); white card with left-today amount in Rounded 40pt, exact category bands and pace marker; pill log bar with turmeric mic; recent entries; five-tab bar Today, Activity, Ask, Plan, You.

FORM: assigned direction, position 7 of the grounded list (Daily Kolam); seed:84988bf392561bd6. Raises: fixed hue per category with exact-share bands; one dominant field per screen; exact proportions only; hatch plus words for over budget. Borrowed: snap-page weekly review. Signature interaction: the loop draws itself (about 600ms stroke) with a soft haptic when a day closes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
