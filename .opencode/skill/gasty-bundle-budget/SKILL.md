---
name: gasty-bundle-budget
description: Use ONLY when evaluating dependency choices, bundle size, or any UI/animation decision that could impact Gasty's <100KB JS / <10KB CSS budget. Triggers on: 'bundle', 'bundle size', 'dependencia', 'Framer', 'Recharts', 'D3', 'react-router', 'Zustand', 'tamaño', 'KB', 'tree-shaking', 'lazy', 'código muerto'.
---

# Bundle Budget — Gasty

Gasty se promociona con un bundle de **~105KB gzipped JS + 5KB CSS** (`README.md`). Este tamaño es una decisión de producto, no un detalle técnico: define el target (smartphones de gama media-baja con 3G), el modelo de monetización (sin paywalls de performance), y el techo de complejidad. Toda decisión de UI o dependencia se mide contra este budget.

## Topes (no negociables)

| Métrica                                       | Tope   | Actual    |
| --------------------------------------------- | ------ | --------- |
| JS gzipped (total, sin contar service worker) | <200KB | ~105KB ⚠️ |
| CSS gzipped                                   | < 10KB | ~5KB ✅   |
| First Meaningful Paint (3G)                   | < 2s   | —         |
| Time to Interactive (4x CPU throttling)       | < 5s   | —         |

⚠️ El README dice "~105KB gzipped" — eso es **JS sin gzippar el service worker**, no el bundle inicial. El budget de **JS de carga inicial** sigue siendo <200KB.

## Prohibidos (lista roja)

Si la propuesta requiere alguna de estas, **rechazala y proponé alternativa**:

| Categoría         | Librería(s)                                                         | Por qué no                               | Alternativa                                    |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Animaciones       | `framer-motion`, `react-spring`, `react-transition-group`, `motion` | ~30-50KB, layout animations matan mobile | CSS transitions, `@keyframes`                  |
| Charts            | `recharts`, `chart.js`, `victory`, `visx`, `d3`                     | Recharts ~95KB, d3 modular pero verboso  | SVG custom (ver `CategoryDonutChart`, `Stats`) |
| Routing           | `react-router`, `wouter`, `@tanstack/router`                        | ~20-40KB innecesario para 4 tabs         | `useState` para tab activo en `App.tsx`        |
| State global      | `zustand`, `redux`, `jotai`, `mobx`                                 | innecesario para un solo contexto        | `useLiveQuery` + Context                       |
| CSS-in-JS runtime | `styled-components`, `emotion`, `stitches`                          | ~12KB + overhead runtime                 | Tailwind v4 (utility classes)                  |
| UI kits           | `@mui/*`, `@chakra-ui/*`, `antd`, `mantine`                         | 30-100KB+                                | Headless primitives custom o propios           |
| Date              | `moment`                                                            | ~70KB, mutable                           | `Intl.DateTimeFormat` (usado en `format.ts`)   |
| Utility           | `lodash` (full)                                                     | ~24KB                                    | `lodash-es` per-function o nativos             |
| Iconografía       | `react-icons`, `lucide-react` (todos), `@heroicons/react`           | paquetes grandes; usás 5-10 íconos       | SVG inline o emojis                            |
| i18n              | `i18next`, `react-intl`, `react-i18next`                            | 10-30KB                                  | hardcoded en es-AR (v1)                        |
| Toasts            | `react-hot-toast`, `sonner`, `react-toastify`                       | 5-15KB                                   | un `<div>` con `animate-slide-up` custom       |
| Modals            | `react-modal`, `@reach/dialog`, `headlessui`                        | 5-20KB                                   | div + `fixed inset-0` (ver `SmartInputSheet`)  |

## Permitidos (lista verde)

| Librería                     | Tamaño                            | Por qué                                                                        |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `react`, `react-dom`         | ~46KB gz                          | foundation, sin alternativa razonable                                          |
| `dexie`, `dexie-react-hooks` | ~8KB gz                           | persistencia oficial, tree-shakeable                                           |
| `@tanstack/react-virtual`    | ~3KB gz                           | virtualización de listas largas (>500 txs); tree-shakeable, solo el hook usado |
| `@vitejs/plugin-react`       | build-time                        | no impacta bundle                                                              |
| `@tailwindcss/vite`          | build-time                        | genera CSS, no JS                                                              |
| `vite-plugin-pwa`            | build-time                        | genera SW, no impacta bundle inicial                                           |
| `date-fns` (selectivo)       | ~2KB per fn                       | solo si necesitás algo que `Intl` no cubre (evitá el barrel import)            |
| `sharp`                      | build-time / runtime en Capacitor | solo para iconos en build                                                      |

## Cómo medir el bundle

```bash
rm -rf dist
npm run build

# Tamaño total
du -sh dist/

# JS gzipped total
gzip -c dist/assets/*.js | wc -c

# CSS gzipped total
gzip -c dist/assets/*.css | wc -c

# Top 10 archivos JS por tamaño
ls -lahS dist/assets/*.js | head

# Análisis visual (requiere instalar rollup-plugin-visualizer)
ANALYZE=true npx vite build
```

Si el total JS gzipped > 100KB, el release está **bloqueado**. Identificá al culpable con `ls -lahS`, trazalo al import que lo arrastró, y hand off a `gasty-dev`.

## Tree-shaking — qué lo rompe

- `import { x } from 'lodash'` → trae todo lodash. Usá `import x from 'lodash/x'`.
- Barrel files: `export * from './foo'` hace que bundlers no puedan tree-shake. Evitá `index.ts` que re-exporta de otros módulos.
- Side effects en módulos (e.g., `import './polyfill'` cuando el polyfill no se usa).
- CommonJS en una lib: forza el import completo, no permite tree-shake.
- Estilos: `import 'bootstrap/dist/css/bootstrap.min.css'` trae TODO. Tailwind solo incluye lo que se usa (purga).

## Code splitting — cuándo tiene sentido

- **NO** hacer lazy load de `Dashboard`, `Transactions`, `Stats`, `Settings`. La app es mobile-first, 4 tabs, y todas se usan. El costo de TTI (descargar + parse + ejecutar cada tab al activarse) es peor que el ahorro de bytes.
- **SÍ** hacer lazy load de features que solo algunos usuarios usan (export CSV, sync, settings avanzados — todos son v2+).
- **SÍ** hacer lazy load de assets pesados: si alguna vez agregás un gráfico con >500 puntos, computalo on-demand.

## Decisión de "agregar librería X"

Antes de instalar:

1. **¿Es estrictamente necesario?** Gasty es chico. Muchas features que parecen necesitar una lib se hacen en 20 líneas de código.
2. **¿Cuánto pesa?** Buscá en [bundlephobia.com](https://bundlephobia.com) o en el repo de la lib (sección "Bundle Size" o "Size").
3. **¿Tree-shakeable?** Si la lib tiene barrel imports, el tamaño real es mayor.
4. **¿Hay alternativa interna?** Un SVG inline, un `useState`, un `useMemo` suelen bastar.
5. **¿Pasa el budget?** Si pasa los 4 puntos, documentá la decisión y pedí review a `gasty-review`.

## Performance, además del bundle

- **`will-change`** con moderación: solo en elementos que van a animar. No en el body.
- **`content-visibility: auto`** en listas largas (experimental, ayuda con >100 items).
- **GPU compositing**: `transform: translateZ(0)` solo en elementos que animan.
- **Debounce scroll/resize** handlers.
- **`requestAnimationFrame`** para updates visuales no críticos.
- **No** `framer-motion` en listas >20 items.
- **No** `setTimeout` con valores hardcodeados para animaciones; usá `transition`/`animation` CSS.

## Anti-patterns

- 🟥 Agregar una dep sin ADR.
- 🟥 `import { x } from 'big-lib'` (trae todo).
- 🟥 `import 'big-lib/dist/big-lib.css'` (CSS no tree-shakeable de barrel).
- 🟥 `transition-all` (Tailwind genera `transition-property: all` que incluye `width`/`height`).
- 🟥 Animar `width`, `height`, `top`, `left`, `margin` (causan layout).
- 🟥 Layout shift por imágenes sin `width`/`height`/`aspect-ratio`.
- 🟥 Re-renderizar listas grandes sin `key` o con `key={index}`.
- 🟥 `useEffect` que hace `setState` en cada render (loop).
- 🟥 Componente que devuelve 1000+ nodos sin virtualización (no aplica aún, pero si pasa de 500 txs, virtualizar).
