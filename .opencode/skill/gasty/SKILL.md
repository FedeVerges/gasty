---
name: gasty
description: Orchestrator/router for all Gasty skills. Load this first to route to the right specialized skill and to read the shared Canon (design tokens, banned libs, date/animation rules, bundle budget). Triggers on any Gasty work — 'gasty', 'skill', 'cuál skill', 'router', or when unsure which specialized skill applies.
---

# Gasty — Skill Orchestrator

Gasty tiene 8 skills especializados. Este skill es el **router**: leé la tabla de enrutamiento para
saber cuál cargar, y el **Canon compartido** para las reglas que se repetían en varios skills
(ahora vive en un solo lugar para evitar deriva).

## Tabla de enrutamiento

| Si el trabajo toca… | Cargá | Fuente de verdad de ese concern |
|---|---|---|
| Reglas siempre-encendidas, re-render React 19, checklist pre-commit | `gasty-core` | constraints globales |
| Tokens de diseño, dark mode, componentes, sheets, FAB, charts SVG | `gasty-ui-conventions` | UI/visual |
| Tipos del dominio (`Transaction`, `Category`, `RecurringConfig`), flujo e2e | `gasty-domain` | **tipos** (única fuente) |
| Dexie schema, `useLiveQuery`, hooks, algoritmo de auto-clonado | `gasty-data-layer` | **persistencia** (única fuente) |
| `parseInput`, keywords, regex de monto/fecha/recurrente | `gasty-parser-rules` | parser |
| Presupuesto de bundle, libs permitidas/prohibidas, tree-shaking | `gasty-bundle-budget` | **budget** (única fuente) |
| Tests Vitest/fake-indexeddb, naming, cobertura | `gasty-test-patterns` | tests |
| Build PWA, Capacitor, Play Store, versioning | `gasty-release-flow` | release |

> Regla de oro: **una sola fuente por concern**. Si necesitás la lista de libs prohibidas,
> el modelo de tokens o la regla de fechas, leé el **Canon** abajo — no las redefinas en el
> skill especializado. Los skills especializados referencian este Canon con `→ ver gasty (Canon)`.

---

## Canon compartido (única copia — los demás skills lo referencian)

### 1. Design tokens (`src/index.css`)

Canonical (preferí estos nombres):

| Categoría | Token | Light | Dark |
|---|---|---|---|
| Surface | `bg-canvas` | #ffffff | #1a1e17 |
| | `bg-canvas-soft` | #f5f5f4 | #22261f |
| | `bg-card-hover` | #ececeb | #262b23 |
| Brand | `bg-primary` | #9fe870 | #9fe870 |
| | `bg-primary-pale` | #e2f6d5 | #2a3324 |
| | `bg-primary-active` | #cdffad | #cdffad |
| | `text-on-primary` | #0e0f0c | #0e0f0c |
| Text | `text-ink` | #0e0f0c | #eef0ea |
| | `text-body` | #454745 | #abada7 |
| | `text-mute` | #5c5e59 | #8f918b |
| Semantic | `text-positive` | #1a7a35 | #4ade80 |
| | `text-negative` | #d03238 | #f87171 |
| | `text-warning` | #ffd11a | #fbbf24 |
| | `bg-expense-soft` | #fbe4e4 | #3b1a1a |
| | `bg-income-soft` | #e4f3e4 | #1a2e1a |
| | `bg-recurring-soft` | #fef3c7 | #3a2f1a |
| Border | `border-border` | #d6d9d3 | #2d322a |
| | `border-border-strong` | #c1c4be | #3d4339 |

**Legacy aliases** (siguen funcionando vía CSS var forwarding, pero preferí los canónicos):
`bg-accent`→`bg-primary`, `bg-card`→`bg-canvas`, `text-expense`→`text-negative`,
`text-income`→`text-positive`, `text-recurring`→`text-warning`, `bg-accent-soft`→`bg-primary-pale`.

⚠️ **Nunca** uséis los valores púrpura antiguos (`#7c3aed`). El accent de Gasty es verde `#9fe870`.
Cualquier color nuevo debe tener su contraparte en `[data-theme="dark"]`.

### 2. Libs prohibidas (presupuesto <250KB JS / <15KB CSS)

**Requieren ADR** (evaluar bundle impact): `framer-motion`/`motion`, `zustand`/`redux`/`jotai`.

**Prohibidas sin excepción**: `recharts`/`chart.js`/`d3`/`visx`, `react-router`/`wouter`/`@tanstack/router`, `styled-components`/`emotion`, `@mui/*`/`@chakra-ui/*`/`antd`, `moment`, `lodash` (full barrel), `react-icons`/`lucide-react` (todo), `i18next`, `react-hot-toast`/`sonner`, `react-modal`/`@headlessui` (para modals).
→ detalle y alternativas en `gasty-bundle-budget`.

### 3. Fechas locales

`Transaction.date` y clones de recurrencia usan `toLocalISO(d)` (define local en `parser.ts`/`recurring.ts`).
**Nunca** `new Date().toISOString()` para fechas locales (UTC trap en zonas negativas). `createdAt` SÍ usa
`new Date().toISOString()` (timestamp completo, no es fecha-local).

### 4. Animación

Solo `transform` y `opacity`. Usad `transition-colors`, `transition-transform`, `transition-opacity`.
**Nunca** `transition-all` (incluye width/height). Para SVG usad `transition-[stroke-dashoffset]` /
`transition-[stroke]`, no `transition-all`.

### 5. Recurring

Los clones (`originalId` set) son derivados: no se editan ni borran directo — solo la fuente.
`checkAndCloneRecurring()` es idempotente por mes. → detalle en `gasty-data-layer`.

### 6. Persistencia

Sin `localStorage` para datos de usuario. Dexie/IndexedDB vía `useLiveQuery` (reactividad gratis).
Schema: `db.version(N)` + `.upgrade()` para backfills. → detalle en `gasty-data-layer`.

### 7. Re-render (React 19, aplicable a esta PWA client-side)

- Derivá estado durante el render; no `useState`+`useEffect` para lo que se deduce de props/state.
- No definas componentes dentro de componentes (remonta y pierde estado).
- `functional setState` para updates basados en el valor previo.
- `useMemo` solo para trabajo caro; no para expresiones primitivas simples.
- `useDeferredValue` / `useTransition` para búsquedas/filtros grandes (ej. lista de transacciones).
- `useRef` para valores transitorios frecuentes (scroll, mouse) que no deben re-renderizar.
- Listeners globales: `useEffectEvent` o handler en ref para no re-suscribir en cada render.
- Init-once por app load (no en `useEffect([])` de un componente que puede remontar).
- Condicional explícita con ternario, no `&&` cuando el valor puede ser `0`/`NaN`.
- Inmutabilidad: `toSorted()` en vez de `sort()` sobre props/state.
- `Set`/`Map` para lookups repetidos; hoist de `RegExp` fuera del render; `flatMap` para map+filter.

> Reglas que **no** aplican a Gasty (PWA sin server): RSC, `React.cache()`, `after()`, Server Actions,
> SWR, hydration SSR, resource hints de RSC. Ver `react-best-practices` (Vercel) para el catálogo completo.

### 8. Verificación (toda modificación no trivial)

1. `npm run lint` 2. `npm test` 3. `npm run build` (tsc -b + vite) 4. UI-breaking → `npm run test:e2e`.
