---
name: Daily Kolam
description: A personal spending log where each logged day draws one loop of the month's kolam.
colors:
  ground: "#EEF1EA"
  surface: "#FFFFFF"
  field: "#1E2A25"
  field-ink: "#F4EFE6"
  field-muted: "#B9C4BE"
  field-line: "#33433B"
  ink: "#1E2A25"
  muted: "#5B6A63"
  hairline: "#D5DCD4"
  action: "#F2B21B"
  on-action: "#1E2A25"
  data: "#3D4FB3"
  scrim: "rgba(30,42,37,0.45)"
  ground-dark: "#121A16"
  surface-dark: "#1B2520"
  field-dark: "#293B32"
  field-muted-dark: "#A9B5AF"
  field-line-dark: "#3F5147"
  ink-dark: "#F4EFE6"
  muted-dark: "#A9B5AF"
  hairline-dark: "#2C3A33"
  data-dark: "#7C8BE0"
  scrim-dark: "rgba(0,0,0,0.55)"
  hue-1: "#E8623C"
  hue-2: "#3D4FB3"
  hue-3: "#2F9C8F"
  hue-4: "#8E4A9E"
  hue-5: "#C98B1D"
  hue-6: "#5E9B3A"
  hue-7: "#D2557A"
  hue-8: "#4F7CAC"
  hue-1-dark: "#F07A55"
  hue-2-dark: "#8C99E8"
  hue-3-dark: "#3DB5A7"
  hue-4-dark: "#B97FCB"
  hue-5-dark: "#DDA23A"
  hue-6-dark: "#7CBB5A"
  hue-7-dark: "#E3789A"
  hue-8-dark: "#7AA4D2"
typography:
  large-title:
    fontFamily: "SF Pro Display, system-ui"
    fontSize: "34px"
    fontWeight: 700
    letterSpacing: "-0.4px"
  title:
    fontFamily: "SF Pro Text, system-ui"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "SF Pro Text, system-ui"
    fontSize: "16px"
    fontWeight: 400
  sub:
    fontFamily: "SF Pro Text, system-ui"
    fontSize: "15px"
    fontWeight: 400
  caption:
    fontFamily: "SF Pro Text, system-ui"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "SF Pro Text, system-ui"
    fontSize: "13px"
    fontWeight: 600
  money:
    fontFamily: "ui-rounded, SF Pro Rounded"
    fontSize: "16px"
    fontWeight: 600
    fontFeature: "tnum"
  money-hero:
    fontFamily: "ui-rounded, SF Pro Rounded"
    fontSize: "40px"
    fontWeight: 700
    letterSpacing: "-1px"
    fontFeature: "tnum"
rounded:
  small: "12px"
  chip: "17px"
  card: "20px"
  field: "24px"
  pill: "26px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.pill}"
    height: "54px"
    padding: "0 20px"
  button-primary-disabled:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    height: "54px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "54px"
    padding: "0 20px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.field}"
    padding: "16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  pill-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "52px"
    padding: "0 18px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    height: "34px"
    padding: "0 14px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.chip}"
    height: "34px"
  list-row:
    textColor: "{colors.ink}"
    height: "56px"
---

# Design System: Daily Kolam

## Overview

**Creative North Star: "The Daily Kolam"**

Each logged day draws one loop of the month's kolam on a slate threshold stone, so the month reads as a pattern you made rather than a score you failed. The app is a calm native iOS surface: a lime-wash ground, white cards that each hold one idea, and a single dark wet-stone field per screen that carries the dominant element (the kolam, the month total, the forecast) in rice-flour lines.

Colour is rationed. Turmeric belongs to action and to today, nothing else. Categories keep a fixed hue for life, and their bands are drawn at exact proportions. Over budget is shown with diagonal hatch and plain words, never with red.

**Key Characteristics:**
- One slate field per screen, everything else white on lime-wash.
- Turmeric is the only action and today colour.
- Exact-share category bands in a fixed hue wheel.
- Hatch plus words for over budget and forecast range.
- SF Pro Text for UI, SF Pro Rounded tabular numerals for money.
- Native large titles, pill inputs, SF Symbols, generous 20-26pt radii.

## Colors

A quiet green-grey world with one warm voice and a categorical wheel; light and dark palettes share roles, swapped through `useKolam()`.

### Primary
- **Turmeric** (action): primary buttons, the round mic/send action, switch tracks, today's dot and today's loop in the kolam, the forecast hatch. Same value in both themes; text on it is slate (on-action).

### Secondary
- **Category Hue Wheel** (hue-1..hue-8, with -dark variants lifted to at least 3:1 on the dark surface): assigned to categories in order and never reshuffled. Used for band segments, row dots and chip dots.
- **Ledger Indigo** (data): fallback hue for a category without an assigned colour.

### Neutral
- **Lime-wash Ground** (ground): every screen background and the tab bar.
- **White Surface** (surface): cards, inputs, unselected chips.
- **Wet-stone Slate** (field): the one dominant field per screen; also the ink colour in light mode.
- **Rice-flour Line** (field-ink): text and kolam loops on the field; ink in dark mode.
- **Field Muted / Field Line** (field-muted, field-line): secondary text and band tracks on the field.
- **Moss Muted** (muted): captions, subtitles, placeholders, inactive tabs, disabled labels.
- **Hairline** (hairline): row dividers, card-free borders, band tracks on light surfaces, disabled primary fill.

### Named Rules
**The One Turmeric Rule.** Turmeric marks the thing you can do and the day you are in. It is never decoration, never a category, never a status.

**The Hatch-Not-Red Rule.** Over budget and uncertain ranges are drawn with diagonal hatch (1.6pt strokes on a 6pt tile, `hatchInk` or turmeric) plus a sentence saying what happened. There is no red or error colour for money.

**The Fixed Wheel Rule.** A category's hue is assigned once from the wheel and stays the same on every screen and in both themes (dark uses the lifted twin).

## Typography

**UI Font:** SF Pro Text (system)
**Money Font:** SF Pro Rounded (`ui-rounded`) with tabular numerals

**Character:** The native system face carries every word; the rounded face is reserved for numbers so amounts feel soft and line up in columns.

### Hierarchy
- **Large Title** (700, 34pt, -0.4 tracking): one per screen, top-left, collapses to a 17pt centred title bar after 48pt of scroll.
- **Title** (600, 17pt): collapsed bar, button labels, section heads.
- **Body** (400, 16pt): row titles, inputs, conversation.
- **Sub** (400, 15pt): screen subtitles, explanatory lines under hero amounts.
- **Caption / Label** (400 / 600, 13pt): row subtitles, card titles in muted.
- **Money** (600, 16pt default; hero 34-40pt at 700 with -1 tracking): every amount via `Money`.

### Named Rules
**The Scaling Caps Rule.** Large titles and display money cap at 1.3x Dynamic Type; all other text caps at 2x. Money at 24pt or larger is single-line and shrinks to fit (down to 0.5) instead of wrapping.

**The Rounded-Means-Money Rule.** SF Pro Rounded appears only on amounts; labels next to them stay in SF Pro Text.

## Layout

Single-column iOS screens on the ground with a 16pt side gutter for cards and fields (20pt for the large-title header). Cards stack with 12pt gaps. Spacing follows a 4pt base (4, 8, 12, 16, 20, 24, 32). Rows are at least 56pt; chips are 34pt with a 44pt hit area. Scroll content clears the tab bar with 100pt bottom padding. Five tabs: Today, Activity, Ask, Plan, You. Log and Goal are sheets; the weekly Review is a snap-paged deck of slate cards. At accessibility text sizes, settings values move under their label rather than truncating.

## Elevation & Depth

Flat. There are no shadows. Depth comes from tone alone: the dark slate field sits on the light ground, white cards sit on the ground, and a scrim (45% slate light, 55% black dark) dims behind sheets.

**The Flat Stone Rule.** Hierarchy is ground, surface, field. If something needs to stand out, it moves onto the field; it never gets a shadow.

## Shapes

Soft, generous corners throughout: cards 20pt, fields 24pt, pills and buttons fully rounded (26-27pt), chips 17pt, small tiles 12pt, settings icon wells 9pt. Bands are capsules with a height-derived radius. Borders are 1-1.5pt hairlines on inputs, chips and ghost buttons only. The kolam loop is a rounded diamond (quadratic curves at 0.62 of the half-cell) so neighbouring loops touch at their points and form a lattice.

## Components

### Buttons
- **Shape:** full pill, 54pt tall, 20pt horizontal padding, 17pt semibold label.
- **Primary:** turmeric fill, slate label. Disabled: hairline fill with a muted but readable label (it often says why).
- **Ghost:** 1.5pt hairline outline with ink label; on the field the outline uses field-line and the label field-ink.
- **Pressed:** opacity 0.85. Loading swaps the label for a spinner.

### Chips
- **Style:** 34pt pill, white with hairline border, 14pt ink text, optional 8pt category hue dot.
- **Selected:** slate fill and border, ground-coloured text. Pressed: opacity 0.7.

### Cards / Containers
- **Card:** white, 20pt radius, 16pt padding, optional muted 13pt semibold header. Holds one idea.
- **Field:** slate, 24pt radius, 16pt padding; content in field-ink and field-muted.

### Inputs / Fields
- **Pill Input:** 52pt min height, 26pt radius, 1.5pt hairline border, white fill, 16pt text, muted placeholder, with an optional 52pt turmeric round action (mic, send) that goes hairline when disabled.

### Lists
- **List Row:** 56pt min, 10pt category dot, body title, caption subtitle, trailing `Money`; hairline divider except on the last row; pressed opacity 0.6.
- **Settings Row:** 32pt ground-tinted icon well holding an SF Symbol, title and subtitle, trailing value with chevron or a switch (turmeric track).

### Navigation
- **Tab bar:** ground background, hairline top border, 22pt SF Symbols, 10pt semibold labels; active ink, inactive muted.
- **Icons:** always through `Symbol` (SF Symbols on iOS, Feather fallback elsewhere).

### Bands
Exact proportional segments: each segment's length is exactly its share of the total (the budget, or spend if higher). 10pt capsule on a hairline track (field-line on the field). Optional 2pt pace marker in ink (field-ink on the field) and an optional hatched range for forecasts.

### Kolam (signature)
A 7-column month lattice on the field. Cell states:
- **drawn:** joined rice-flour loop (1.8pt) with a 3pt dot.
- **skipped:** muted dot at 75% opacity, no loop.
- **today-open:** 4pt turmeric dot inside a dashed (5/5) turmeric loop, 2.5pt.
- **today-drawn:** solid turmeric loop, 2.2pt.
- **future / before:** 1.5pt muted dot at 40% opacity.

**Motion:** when today goes from open to drawn, the loop strokes itself in about 600ms with cubic ease-out and a light haptic. Reduce Motion shows the finished loop without drawing. This is the only celebratory motion in the app.

## Do's and Don'ts

### Do:
- **Do** put exactly one slate field on a screen, carrying its dominant element.
- **Do** reserve turmeric for the primary action and for today.
- **Do** render every amount with `Money` (rounded, tabular) and every icon with `Symbol`.
- **Do** draw category shares at exact proportions in their fixed wheel hue.
- **Do** show over budget with hatch and a plain sentence about what happened and what's next.
- **Do** respect the 1.3x / 2x text-scaling caps and let large money shrink to fit.

### Don't:
- **Don't** use red, or any error colour, for overspend.
- **Don't** add shadows; use the ground, surface, field ladder.
- **Don't** reassign or reshuffle a category's hue.
- **Don't** use turmeric for categories, decoration or status.
- **Don't** animate anything with the loop's ceremony other than closing a day, and never ignore Reduce Motion.
