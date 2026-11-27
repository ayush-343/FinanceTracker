# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Individuals tracking their own day-to-day spending on iPhone, India-first (INR, UPI-style everyday purchases: food delivery, cabs, groceries, subscriptions), with other currencies supported. They open the app in short moments right after spending, and in a longer weekly sit-down to see how the month is going.

## Product Purpose

A personal finance tracker that makes logging effortless and turns the data into clear, honest guidance, entirely on the phone. Success: people keep logging every day for months, end each month knowing where their money went, and hit the savings goals they set.

## Positioning

Private by construction: categorisation, forecasting, questions and summaries run on the device (rule-based logic plus an on-device language model). Every figure shown is computed from the user's own data, never invented by a model. Logging is one sentence, typed or spoken.

## Operating Context

- Moments of use: right after a purchase (log in seconds), a daily glance (how is today/this month going), a weekly review (Sunday summary), occasional exploration (ask a question, dig into a category).
- Inputs: manual entry, one-sentence typed or spoken logging, receipt photo scanning (Gemini, opt-in with the user's own key), barcode scan.
- Outputs: budgets per category, forecasts to period end, alerts, weekly summary notification, subscription tracking and suggestions, PDF export.

## Capabilities and Constraints

- Expo SDK 54 / React Native 0.81 (New Architecture), Expo Router, Zustand, expo-sqlite. Local-only data; no accounts or cloud sync today.
- On-device AI: Apple Foundation Models (iOS 26+, Apple Intelligence) or an optional downloaded Qwen3.5 GGUF via llama.rn; rule-based fallbacks everywhere.
- Features: categories/subcategories/items, budgets (weekly or monthly period), transactions, subscriptions with skips, learned categorisation, quick log (type or speak), Ask (questions answered by computed queries), forecast, duplicate/unusual warnings, subscription detection, weekly summary and budget alerts, biometric lock, onboarding and walkthrough, PDF export.
- Planned, not built: savings goals and challenges, income tracking, widgets and Siri shortcuts, Android release.

## Brand Commitments

Name: Finance Tracker (working name). No other binding visual or naming commitments.

## Evidence on Hand

No real user data, testimonials or metrics. Demo content must be labelled synthetic.

## Product Principles

1. Logging must be faster than forgetting: one tap or one sentence.
2. Honest numbers: computed from the user's data, never estimated by a model, uncertainty shown as ranges.
3. Encourage, never shame: no guilt copy, no nagging notification cadence.
4. Light motivation only: streaks and progress are welcome; badges, XP, leaderboards and confetti are not.
5. Private by default: nothing leaves the phone unless the user opts in per feature.

## Accessibility & Inclusion

Dynamic Type, VoiceOver labels, 44 pt targets, light and dark appearance, amounts readable at a glance.
