# AGENTS.md

> Portable project context for AI agents. Auto-loaded by OpenCode, Copilot, Cursor, and
> others that honor the standard. For tool-specific extras see `.opencode/` and `.github/`.

## What is Gasty

A **mobile-first PWA** for personal expense tracking (locale es-AR), ready for Capacitor → Play
Store. Smart input in natural Spanish ("alquiler 45000", "cuota auto 25000 4/24"), recurring
transaction auto-cloning, dark mode, no backend.

## Stack (locked)

- **Vite 6 + React 19 + TypeScript** (TypeScript ~6.0)
- **Tailwind CSS v4** — CSS-native config via `@theme` in `src/index.css` (no tailwind.config.*)
- **Dexie 4 + `dexie-react-hooks`** — all persisted data lives in IndexedDB; **never `localStorage`**
- **`vite-plugin-pwa`** — autoUpdate service worker
- **Vitest + jsdom + `fake-indexeddb`** for tests
- No Framer Motion · No Recharts/D3 · No React Router · No Zustand/Redux · No CSS-in-JS runtime

## Hard constraints

| Metric | Budget |
|---|---|
| JS bundle (gzipped) | < 100KB |
| CSS bundle (gzipped) | < 10KB |
| Container width | `max-w-[480px]` mobile-first (on `#root`) |
| Locale | es-AR only (v1) |
| Touch targets | ≥ 44px (`py-3` min) |

## Commands (exact)

```bash
npm run dev            # vite dev server
npm run build          # tsc -b && vite build  →  dist/
npm run lint           # eslint .  (flat config)
npm test               # vitest run
npm run test:watch     # vitest watch
npm run preview        # vite preview (serve dist/)
```

After any non-trivial change, run **both** `npm run lint` and `npm test`.

## File layout (do not reorganize)

```
src/
├── components/
│   ├── add/         # SmartInputSheet (input + recurrency selector)
│   ├── dashboard/   # BalanceCard, MonthSummary, CategoryDonutChart, Dashboard
│   ├── layout/      # AppShell (EditTransactionContext), BottomNav, FAB
│   ├── settings/    # Theme, currency, recurring manager
│   ├── stats/       # Custom SVG bars + donut (0KB deps)
│   ├── transactions/# Transactions list, TransactionItem
│   └── ui/          # Card, Button, Badge (primitives)
├── context/         # SettingsContext (drives data-theme on <html>)
├── hooks/           # useTransactions, useCategories, useRecurringCheck
├── lib/             # db (Dexie), parser, recurring, format, categories
└── types/           # single index.ts
tests/
├── parser.test.ts
├── recurring.test.ts
└── integration.test.ts
```

No `src/utils/`, `src/store/`, `src/router/`, `src/pages/` allowed.

## Team — delegate to the right agent

| Agent | Role | When |
|---|---|---|
| `gasty-architect` | Stack guardian. ADRs in `docs/adr/`. | Before new dep, screen, viz. |
| `gasty-feature-dev` ⭐ | Default implementer. Components, hooks, UI. | Most feature work. |
| `gasty-parser-expert` | `src/lib/parser.ts` + `categories.ts`. | Regex/keyword changes. |
| `gasty-data-engineer` | Dexie schema, `useLiveQuery`, recurring. | Schema bump, new index, recurring logic. |
| `gasty-test-writer` | Vitest author. | New logic needing coverage. |
| `gasty-reviewer` | Read-only diff review. | Before merging non-trivial changes. |
| `gasty-release` | Build, PWA, Capacitor, Play Store. | Cutting a release. |

## Anti-patterns (refuse even if asked)

- 🟥 Framer Motion, Recharts/D3, react-router, Zustand, styled-components, MUI, lodash, moment
- 🟥 `localStorage` for user data — Dexie/IndexedDB only
- 🟥 Editing clones of recurring transactions — only edit the source (rows with `originalId` are derived)
- 🟥 Hardcoded hex colors — use tokens from `@theme` (`bg-accent`, `text-expense`, `bg-card`, `border-border`)
- 🟥 `toISOString()` for the `Transaction.date` field — use `toLocalISO(d)` from `parser.ts` / `recurring.ts`
- 🟥 Adding a dep without an ADR (call `gasty-architect` first)
- 🟥 Skipping dark mode counterpart for a new color (must have `[data-theme="dark"]` entry in `index.css`)
- 🟥 Animating `width`, `height`, `top`, `left` — use only `transform` / `opacity`

## Key dev patterns (not obvious)

### Local ISO dates (why `toISOString()` is banned)

`new Date().toISOString()` produces UTC dates. In negative timezones (AR is UTC-3), this can shift the
date backward by one day. Both `src/lib/parser.ts` and `src/lib/recurring.ts` define:

```ts
function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

Always use this pattern for the `Transaction.date` field.

### Test setup

Integration and recurring tests require `fake-indexeddb`:

```ts
import 'fake-indexeddb/auto'
// ... then in beforeEach:
await db.delete()
await db.open()
await seedDatabase()
```

### Data access patterns

- **Reading**: `useLiveQuery(() => db.transactions.toArray(), [], []) ?? []`
- **Writing**: `db.transactions.add({ id: crypto.randomUUID(), ...fields, createdAt: new Date().toISOString() })`
- **Settings**: persisted in `db.settings` under fixed key `'app-settings'`; accessed via `SettingsContext`
- **Editing a transaction**: `AppShell` exposes `EditTransactionContext` — call `onEdit(tx)` to open the sheet in edit mode

### Theme / dark mode

`SettingsContext` sets `document.documentElement.setAttribute('data-theme', settings.theme)` — the
CSS `@theme` tokens and `[data-theme="dark"]` overrides are in `src/index.css`.

### Build pipeline

`npm run build` runs **`tsc -b` first** (type-checks both `tsconfig.app.json` and
`tsconfig.node.json`), then `vite build`. A type error will fail the build.

## Where the detailed rules live

| Concern | Source |
|---|---|
| Domain types, IDs, defaults | `src/types/index.ts` |
| UI tokens + component conventions | `.opencode/skill/gasty-ui-conventions/SKILL.md` |
| Parser rules (regex, keywords) | `.opencode/skill/gasty-parser-rules/SKILL.md` |
| Data layer (Dexie, hooks, recurring) | `.opencode/skill/gasty-data-layer/SKILL.md` |
| Test patterns | `.opencode/skill/gasty-test-patterns/SKILL.md` |
| Bundle budget | `.opencode/skill/gasty-bundle-budget/SKILL.md` |
| Release flow | `.opencode/skill/gasty-release-flow/SKILL.md` |
