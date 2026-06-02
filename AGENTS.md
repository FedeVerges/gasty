# AGENTS.md

> Portable project context for AI agents. Picked up by **opencode** (auto-loaded as user context), **GitHub Copilot coding agent**, **Cursor**, and other tools that honor the `AGENTS.md` standard.
> For tool-specific extras see `.opencode/` and `.github/`.

## What is Gasty

A **mobile-first PWA** for personal expense tracking, locale es-AR, ready to be packaged with Capacitor for the Play Store. Smart input in natural Spanish ("alquiler 45000", "cuota auto 25000 4/24"), recurring transaction auto-cloning, dark mode, no backend.

## Stack (locked)

- **Vite 6** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-native config via `@theme` in `src/index.css`)
- **Dexie 4** + `dexie-react-hooks` (IndexedDB; **never `localStorage` for data**)
- **vite-plugin-pwa** (autoUpdate service worker)
- **Vitest** + jsdom + `fake-indexeddb` for tests
- **No** Framer Motion · **No** Recharts/D3 · **No** React Router · **No** Zustand/Redux · **No** CSS-in-JS runtime

## Hard constraints (non-negotiable)

| Metric | Budget | Source |
|---|---|---|
| JS bundle (gzipped) | < 100KB | README |
| CSS bundle (gzipped) | < 10KB | README |
| Container width | `max-w-[480px]` mobile-first | `src/index.css` `#root` |
| Locale | es-AR only (v1) | `src/lib/format.ts` |
| Touch targets | ≥ 44px (`py-3` min) | UX convention |

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

## Team (pick the right agent for the task)

> Each agent is available in **opencode** (via `.opencode/agent/*.md`) and as a **GitHub Copilot chat mode** (via `.github/chatmodes/gasty-*.chatmode.md`).

| Agent | Role | When to invoke |
|---|---|---|
| `gasty-architect` | Stack guardian. Validates against hard constraints, authors ADRs in `docs/adr/`. | Before any new dep, new screen, or new visualization. |
| `gasty-feature-dev` ⭐ | Default implementer. Components, hooks, UI. | Most feature work. |
| `gasty-parser-expert` | Specialist in `src/lib/parser.ts` + `categories.ts`. | Regex/keyword changes. |
| `gasty-data-engineer` | Owner of Dexie schema, `useLiveQuery`, recurring algorithm. | Schema bump, new index, recurring logic. |
| `gasty-test-writer` | Vitest author. | New logic that needs coverage. |
| `gasty-reviewer` | Read-only code review. | Before merging a non-trivial change. |
| `gasty-release` | Build, PWA, Capacitor, Play Store. | Cutting a release, packaging. |

In **opencode**, `gasty-feature-dev` is the default (`default_agent` in `.opencode/opencode.jsonc`). Invoke others with `@gasty-<name>` or by switching mode.
In **GitHub Copilot**, open Copilot Chat and select the chat mode from the dropdown.

## Anti-patterns (refuse even if asked)

- 🟥 Add Framer Motion, Recharts, react-router, Zustand, styled-components, MUI, lodash, moment.
- 🟥 Persist user data in `localStorage`.
- 🟥 Edit clones of recurring transactions directly — only edit the source.
- 🟥 Hardcode hex colors — use tokens (`bg-accent`, `text-expense`, etc.).
- 🟥 Add a dep without an ADR.
- 🟥 Use `toISOString()` for the `Transaction.date` field (UTC trap; use local ISO).
- 🟥 Skip the dark mode counterpart for a new color.
- 🟥 Animate `width`, `height`, `top`, `left` (use only `transform` / `opacity`).

## Detailed conventions

The full per-area rules live in the opencode skills (`.opencode/skill/*/SKILL.md`). When the active tool doesn't have a "skills" concept, the relevant content is inlined in each chat mode under `.github/chatmodes/`.

| Concern | OpenCode skill | GitHub Copilot equivalent |
|---|---|---|
| Domain types, IDs, defaults | `gasty-domain` | inlined in every chat mode |
| Parser rules | `gasty-parser-rules` | inlined in `gasty-parser-expert.chatmode.md` |
| Data layer | `gasty-data-layer` | inlined in `gasty-data-engineer.chatmode.md` |
| UI conventions, tokens | `gasty-ui-conventions` | inlined in `gasty-feature-dev.chatmode.md` |
| Test patterns | `gasty-test-patterns` | inlined in `gasty-test-writer.chatmode.md` |
| Bundle budget | `gasty-bundle-budget` | inlined in `gasty-architect.chatmode.md` |
| Release flow | `gasty-release-flow` | inlined in `gasty-release.chatmode.md` |
