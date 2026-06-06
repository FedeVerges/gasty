name: gasty-core
description: Project-wide constraints and always-on rules for every Gasty agent.

Gasty is a mobile-first PWA for personal expense tracking in es-AR. This skill captures the shared project rules that every agent must obey.

## Always-on constraints

- **No banned libraries.** Refuse Framer Motion, Recharts, D3, react-router, wouter, Zustand, Redux, styled-components, Emotion, MUI, Chakra, lodash (full), moment. Use existing Tailwind/SVG/CSS alternatives.
- **No localStorage for user data.** Persist transactions and settings via Dexie/IndexedDB only.
- **Use design tokens, not hex literals.** Prefer `bg-accent`, `text-expense`, `bg-card`, `border-border`, etc. from `src/index.css`.
- **Dark mode parity required.** Every new theme color must also exist in `[data-theme="dark"]`.
- **Touch targets ≥ 44px.** Buttons, tabs, and tappable controls should use at least `py-3`.
- **Respect safe-area-inset-bottom.** Bottom sheets, FABs, and fixed bottom controls must include `env(safe-area-inset-bottom)`.
- **Animate only transform and opacity.** Use `transition-colors`, `transition-transform`, `transition-opacity`; never `transition-all`.
- **Local ISO dates only.** Use `toLocalISO(d)` for `Transaction.date` and recurring clones; never `toISOString()` for local dates.
- **Recurring clones are derived.** Do not mutate or edit transactions where `originalId` is set; edit the source only.
- **Schema changes go through `db.version(N)`.** Add an `.upgrade()` callback for backfills; do not silently change indexes.
- **Use helpers for formatting.** Use `formatMoney`, `formatDate`, `formatDateFull`, `formatMonth` from `src/lib/format.ts`; avoid `toLocaleString()` directly.
- **Strings in es-AR only.** User-facing text must be Spanish, no i18n library.
- **Stable keys in lists.** Use stable IDs in `.map()`, not array indices.

## File layout contract

The repository layout is fixed. Do not add `src/utils/`, `src/store/`, `src/router/`, or `src/pages/`.

## Verification

- `npm run lint` must pass.
- `npm test` must pass.
- For data or recurring changes, verify `useLiveQuery` reactivity and clone idempotency.
