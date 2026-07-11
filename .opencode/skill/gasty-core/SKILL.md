---
name: gasty-core
description: Project-wide always-on constraints for every Gasty agent. No banned libs, no localStorage, design tokens, dark mode, touch targets, safe area, local ISO dates, recurring clone rules.
---

Gasty is a mobile-first PWA for personal expense tracking in es-AR. This skill captures the shared project rules that every agent must obey.

## Always-on constraints

- **No banned libraries.** Refuse Framer Motion (~15KB), Recharts/D3 (~50KB+), react-router (~12KB), wouter, Zustand, Redux, styled-components, Emotion, MUI, Chakra, lodash (full ~25KB), moment (~20KB), date-fns (~15KB). Use existing Tailwind/SVG/CSS alternatives.
- **No localStorage for user data.** Persist transactions and settings via Dexie/IndexedDB only.
- **Use design tokens, not hex literals.** Use canonical tokens from `src/index.css` (see Token Reference below). Legacy aliases (`bg-accent`, `bg-card`, `text-expense`) still work via CSS variable forwarding but prefer canonical names.
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

## Layout

- **Mobile-first**: `#root` has `max-width: 480px` + `margin: 0 auto` (defined in `index.css`). Do not wrap again.
- **Desktop (≥768px)**: `#root` switches to `flex-direction: row` with `max-width: none`. A `Sidebar` component renders laterally. Sheets use `.sheet-desktop` class for centered modal style.

## Token Reference (`src/index.css`)

### Canonical tokens (prefer these)

| Category | Token | Light | Dark | Usage |
|----------|-------|-------|------|-------|
| **Surface** | `bg-canvas` | #ffffff | #1a1e17 | App background, inputs |
| | `bg-canvas-soft` | #f5f5f4 | #22261f | Secondary surfaces, chips |
| | `bg-card-hover` | #ececeb | #262b23 | Hover state on cards |
| **Brand** | `bg-primary` | #9fe870 | #9fe870 | CTA, FAB, active states |
| | `bg-primary-pale` | #e2f6d5 | #2a3324 | Soft brand background |
| | `bg-primary-active` | #cdffad | #cdffad | Pressed state |
| | `text-on-primary` | #0e0f0c | #0e0f0c | Text on primary bg |
| **Text** | `text-ink` | #0e0f0c | #eef0ea | Primary text |
| | `text-body` | #454745 | #abada7 | Secondary text |
| | `text-mute` | #5c5e59 | #8f918b | Tertiary / placeholders |
| **Semantic** | `text-positive` | #1a7a35 | #4ade80 | Income / success |
| | `text-negative` | #d03238 | #f87171 | Expense / error |
| | `text-warning` | #ffd11a | #fbbf24 | Recurring / warnings |
| | `bg-expense-soft` | #fbe4e4 | #3b1a1a | Soft expense background |
| | `bg-income-soft` | #e4f3e4 | #1a2e1a | Soft income background |
| | `bg-recurring-soft` | #fef3c7 | #3a2f1a | Soft recurring background |
| **Border** | `border-border` | #d6d9d3 | #2d322a | Default borders |
| | `border-border-strong` | #c1c4be | #3d4339 | Emphasized borders |

### Proyector tokens (future month projection)

Used ONLY when `selectedMonth > currentMonth`. Never apply to current/past months.

| Token | Value | Usage |
|-------|-------|-------|
| `bg-proyector-bg` | #0c4a6e | Card background in projection |
| `text-proyector-text` | #e0f2fe | Text in projection |
| `border-proyector-accent` | #22d3ee | Borders in projection |
| `bg-proyector-card` | #0e3a5c | Secondary card in projection |

### Legacy aliases (still work, prefer canonical)

`bg-accent` → `bg-primary`, `bg-card` → `bg-canvas`, `text-expense` → `text-negative`, `text-income` → `text-positive`, `text-recurring` → `text-warning`

## File layout contract

The repository layout is fixed. Do not add `src/utils/`, `src/store/`, `src/router/`, or `src/pages/`.

```
src/
├── components/   # Feature folders: add/, dashboard/, layout/, settings/, stats/, transactions/, ui/
├── context/      # SettingsContext, EditTransactionContext, CsvImportContext
├── hooks/        # useTransactions, useCategories, useRecurringCheck, useProjections, useViewport, useKeyboardHeight
├── lib/          # db, parser, recurring, format, categories, csv, flash
└── types/        # Single index.ts
```

## Verification

After any non-trivial change, run:

1. `npm run lint` — must pass (ESLint flat config)
2. `npm test` — must pass (Vitest + fake-indexeddb)
3. `npm run build` — must pass (tsc -b + vite build, type-checks both tsconfigs)
4. For UI-breaking changes: `npm run test:e2e` — must pass (Playwright, Chromium 375x812)

### Pre-commit checklist

- [ ] No new dependencies without ADR in `docs/adr/`
- [ ] Dark mode counterpart for new colors (`[data-theme="dark"]`)
- [ ] Touch targets ≥ 44px on all interactive elements
- [ ] Dates use `toLocalISO()`, never `toISOString()`
- [ ] No editing of recurring clones (only source rows)
- [ ] Bundle size < 100KB JS / < 10KB CSS gzipped
- [ ] Stable keys in `.map()`, not array indices
