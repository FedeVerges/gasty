---
name: gasty-core
description: Project-wide always-on constraints for every Gasty agent. No banned libs, no localStorage, design tokens, dark mode, touch targets, safe area, local ISO dates, recurring clone rules.
---

Gasty is a mobile-first PWA for personal expense tracking in es-AR. This skill captures the shared project rules that every agent must obey.

## Always-on constraints

- **No banned libraries without ADR.** → ver `gasty` (Canon §2) y `gasty-bundle-budget` para la lista completa. Framer Motion y Zustand requieren ADR con justificación de bundle impacto. Prohibidas sin excepción: Recharts/D3, react-router, styled-components, MUI, moment, lodash, react-icons/lucide.
- **No localStorage for user data.** Persist transactions and settings via Dexie/IndexedDB only. → detalle en `gasty-data-layer` / `gasty` (Canon §6).
- **Use design tokens, not hex literals.** → ver `gasty` (Canon §1) y `gasty-ui-conventions` para el modelo canónico (verde `#9fe870`, no púrpura). Legacy aliases (`bg-accent`, `bg-card`, `text-expense`) siguen funcionando pero preferí los canónicos.
- **Dark mode parity required.** Every new theme color must also exist in `[data-theme="dark"]`. → ver `gasty` (Canon §1).
- **Touch targets ≥ 44px.** Buttons, tabs, and tappable controls should use at least `py-3`.
- **Respect safe-area-inset-bottom.** Bottom sheets, FABs, and fixed bottom controls must include `env(safe-area-inset-bottom)`.
- **Animate only transform and opacity.** → ver `gasty` (Canon §4): `transition-colors`/`transition-transform`/`transition-opacity`, nunca `transition-all` (ni en SVG).
- **Local ISO dates only.** Use `toLocalISO(d)` for `Transaction.date` and recurring clones; never `toISOString()` for local dates. → ver `gasty` (Canon §3).
- **Recurring clones are derived.** Do not mutate or edit transactions where `originalId` is set; edit the source only. → detalle en `gasty-data-layer` / `gasty` (Canon §5).
- **Schema changes go through `db.version(N)`.** Add an `.upgrade()` callback for backfills; do not silently change indexes.
- **Use helpers for formatting.** Use `formatMoney`, `formatDate`, `formatDateFull`, `formatMonth` from `src/lib/format.ts`; avoid `toLocaleString()` directly.
- **Strings in es-AR only.** User-facing text must be Spanish, no i18n library.
- **Stable keys in lists.** Use stable IDs in `.map()`, not array indices.
- **`100dvh` for mobile sheet maxHeight.** Never use `100vh` — it doesn't shrink when the keyboard opens on Android. Use `CSS.supports?.('height', '100dvh')` with `100vh` fallback.
- **No `position: fixed` on `<body>`.** Use `overflow: hidden` to lock scroll — `position: fixed` breaks `scrollIntoView` on Android.

## Re-render (React 19 — aplicable a esta PWA client-side)

Estas reglas viven en `gasty` (Canon §7); se listan acá porque `gasty-core` es el skill always-on.
Las reglas de RSC/Server Actions/SWR **no** aplican (Gasty es 100% client-side).

- **Derivá estado durante el render.** No uses `useState` + `useEffect` para lo que se deduce de props/state (evita renders extra y state drift).
- **No definas componentes dentro de componentes.** Crea un nuevo tipo cada render → remonta y pierde estado/foco. Pasá props.
- **`functional setState`** para updates basados en el valor previo (evita stale closures, callbacks estables).
- **`useMemo` solo para trabajo caro**, no para expresiones primitivas simples (el hook cuesta más que la expresión).
- **`useDeferredValue` / `useTransition`** para búsquedas/filtros grandes (ej. lista de transacciones) — mantiene el input responsivo.
- **`useRef` para valores transitorios** frecuentes (scroll, mouse) que no deben re-renderizar.
- **Listeners globales estables:** `useEffectEvent` o handler en ref para no re-suscribir en cada render.
- **Init-once por app load** (no en `useEffect([])` de un componente que puede remontar — ya aplicado en `useRecurringCheck`).
- **Condicional explícita con ternario**, no `&&` cuando el valor puede ser `0`/`NaN`.
- **Inmutabilidad:** `toSorted()` en vez de `sort()` sobre props/state.
- **`Set`/`Map` para lookups repetidos**; hoist de `RegExp` fuera del render; `flatMap` para map+filter.

## Layout

- **Mobile-first**: `#root` has `max-width: 480px` + `margin: 0 auto` (defined in `index.css`). Do not wrap again.
- **Desktop (≥768px)**: `#root` switches to `flex-direction: row` with `max-width: none`. A `Sidebar` component renders laterally. Sheets use `.sheet-desktop` class for centered modal style.

## Token Reference (`src/index.css`)

El modelo de tokens completo (canónicos, proyector y legacy aliases, con valores light/dark) vive en
**`gasty` (Canon §1)**. No lo redefinas acá. Resumen: accent = verde `#9fe870` (`bg-primary`),
canónicos `bg-canvas`/`text-ink`/`text-body`/`text-mute`/`text-positive`/`text-negative`/`text-warning`;
legacy `bg-accent`/`bg-card`/`text-expense`/`text-income`/`text-recurring` siguen funcionando.

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
- [ ] Bundle size <250KB JS / < 15KB CSS gzipped
- [ ] Stable keys in `.map()`, not array indices
- [ ] Mobile sheets use `100dvh`, not `100vh`
