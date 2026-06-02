# Gasty — GitHub Copilot Always-On Instructions

These rules are **always applied** to every Copilot Chat interaction in this repository. They cover the hard constraints, conventions, and anti-patterns that no agent should violate. For role-specific behavior, use one of the chat modes in `.github/chatmodes/gasty-*.chatmode.md`.

## Project

Gasty is a **mobile-first PWA** for personal expense tracking (es-AR locale). Smart input in natural Spanish, recurring auto-cloning, dark mode, no backend, ready for Capacitor → Play Store.

Stack: **Vite 6 + React 19 + TypeScript + Tailwind v4 + Dexie 4 + vite-plugin-pwa + Vitest**.

## Hard constraints (non-negotiable)

| Metric | Budget |
|---|---|
| JS bundle (gzipped) | < 100KB |
| CSS bundle (gzipped) | < 10KB |
| Container width | `max-w-[480px]` mobile-first (already on `#root`) |
| Locale | es-AR only (v1) |
| Touch targets | ≥ 44px (`py-3` min) |

## Always-on rules

1. **No banned libraries.** Refuse Framer Motion, Recharts, D3, react-router, wouter, Zustand, Redux, styled-components, Emotion, MUI, Chakra, lodash (full), moment. Use the alternatives inlined in the relevant chat mode.
2. **No `localStorage` for user data.** Dexie/IndexedDB only. `useLiveQuery` for reactivity.
3. **Use design tokens, not hex literals.** All colors come from `src/index.css` `@theme` (`bg-accent`, `text-expense`, `bg-card`, `border-border`, etc.). Never `bg-[#7c3aed]` or `style={{ color: '#...' }}` for theme values. Dynamic per-category colors (from `Category.color`) ARE allowed in `style={{ background: c.color }}`.
4. **Dark mode parity required.** Every new color in `@theme` must have a counterpart in `[data-theme="dark"]` in `src/index.css`.
5. **Animate only `transform` and `opacity`.** Never `width`, `height`, `top`, `left`, `margin`. Use `transition-colors`, `transition-transform`, `transition-opacity` — never `transition-all`.
6. **Touch targets ≥ 44px.** `py-3` minimum on buttons, tabs, and any tappable element.
7. **Respect `safe-area-inset-bottom`** on bottom-anchored elements (sheets, FABs, BottomNav).
8. **Local ISO dates only.** Use `toLocalISO(d)` (defined in `src/lib/parser.ts` and `src/lib/recurring.ts`). Never `toISOString()` for the `Transaction.date` field — it produces off-by-one days in negative timezones.
9. **Recurring clones are derived.** Never edit a row with `originalId` set — only edit/delete the source. The recurring algorithm (`checkAndCloneRecurring` in `src/lib/recurring.ts`) regenerates clones idempotently per month.
10. **Schema changes go through `db.version(N)`** with an `.upgrade()` callback. Never silent index changes.
11. **Format money and dates through helpers.** `formatMoney(amount, settings.currency)`, `formatDate(iso)`, `formatDateFull(iso)`, `formatMonth(date)`. Never `toLocaleString()` directly.
12. **User-facing strings in es-AR only** (v1). No i18n library.
13. **No emoji as the only signifier of state** — pair with text or color for color-blind users.
14. **Every interactive element needs an accessible label** — visible text, `aria-label`, or `aria-labelledby`.
15. **Keys in `.map()` are stable IDs**, never indices.

## File layout (do not reorganize)

```
src/
├── components/
│   ├── add/         # input sheets (SmartInputSheet)
│   ├── dashboard/   # BalanceCard, MonthSummary, CategoryDonutChart, Dashboard
│   ├── layout/      # AppShell, BottomNav, FAB
│   ├── settings/    # Settings
│   ├── stats/       # Stats (bars + donut SVG custom)
│   ├── transactions/# Transactions, TransactionItem
│   └── ui/          # Card, Button, Badge (primitives)
├── context/         # SettingsContext
├── hooks/           # useTransactions, useCategories, useRecurringCheck
├── lib/             # db, parser, recurring, format, categories
└── types/           # single index.ts
tests/
├── parser.test.ts
├── recurring.test.ts
└── integration.test.ts
```

Do not add `src/utils/`, `src/store/`, `src/router/`, `src/pages/`.

## Commands

```bash
npm install
npm run dev              # vite dev server
npm run build            # tsc -b && vite build → dist/
npm run lint             # eslint .
npm test                 # vitest run
npm run test:watch       # vitest watch
npm run preview          # serve dist/ locally
```

After any non-trivial change, run **both** `npm run lint` and `npm test` before declaring done.

## Domain quick reference

- `Transaction` (id, type `'expense'|'income'`, amount, description, categoryId, date `'YYYY-MM-DD'`, recurring, originalId?, createdAt)
- `Category` (id, name, emoji, color, type `'expense'|'income'|'both'`) — 12 canonical IDs in `src/lib/categories.ts`
- `RecurringConfig` (kind `'fixed'|'fixed_temporary'|'none'`, totalMonths?, currentMonth?, invoiceDay?)
- `Settings` (theme `'light'|'dark'`, currency `'ARS'|'USD'`) — persisted in `db.settings` with id `'app-settings'`
- Defaults: theme=light, currency=ARS

## How to use chat modes

Open Copilot Chat, click the mode selector, pick one of:

- **gasty-feature-dev** ⭐ — default; for general feature work
- **gasty-architect** — before adding deps or new screens
- **gasty-parser-expert** — only when changing `src/lib/parser.ts` or `categories.ts`
- **gasty-data-engineer** — Dexie schema, hooks, recurring
- **gasty-test-writer** — when writing/modifying tests
- **gasty-reviewer** — read-only diff review
- **gasty-release** — build, PWA, Capacitor, Play Store

For role-specific rules and deeper context, each chat mode inlines the relevant opencode skill content (the canonical version lives in `.opencode/skill/*/SKILL.md`).
