---
name: gasty-ui-conventions
description: Use ONLY when creating or modifying React components, styles, or screens in Gasty. Triggers on: 'componente', 'tailwind', 'token', 'diseño', 'dark mode', 'mobile', 'bottom nav', 'sheet', 'FAB', 'Card', 'Button', 'Badge', 'animación'.
---

# UI Conventions — Gasty

Gasty tiene un sistema de diseño mínimo y disciplinado. Todo color viene de un token, todo radio es consistente, todo toque es thumb-friendly. Esta skill es la fuente de verdad de cómo se ve y se comporta la UI.

## Design tokens — `src/index.css`

Tailwind v4 + `@theme` con CSS custom properties. Todos los tokens viven en un solo lugar.

### Light mode (`@theme`)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#f5f5f7` | Fondo de la app |
| `--color-card` | `#ffffff` | Fondo de cards, sheets, inputs |
| `--color-card-hover` | `#fafafa` | Hover state de cards |
| `--color-text` | `#1a1a2e` | Texto principal |
| `--color-text-muted` | `#6b7280` | Texto secundario |
| `--color-text-subtle` | `#9ca3af` | Texto auxiliar (placeholders, hints) |
| `--color-border` | `#e5e7eb` | Bordes sutiles |
| `--color-border-strong` | `#d1d5db` | Bordes con peso |
| `--color-accent` | `#7c3aed` | Morado principal (CTA, FAB, links) |
| `--color-accent-2` | `#6366f1` | Variante del accent (gradients) |
| `--color-accent-soft` | `#ede9fe` | Fondo suave del accent |
| `--color-expense` | `#ef4444` | Rojo para gastos |
| `--color-expense-soft` | `#fee2e2` | Fondo suave para gastos |
| `--color-income` | `#22c55e` | Verde para ingresos |
| `--color-income-soft` | `#dcfce7` | Fondo suave para ingresos |
| `--color-recurring` | `#f59e0b` | Ámbar para recurrentes |
| `--color-recurring-soft` | `#fef3c7` | Fondo suave para recurrentes |
| `--color-overlay` | `rgba(0, 0, 0, 0.4)` | Backdrop de sheets/modals |
| `--font-sans` | `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif` | Stack tipográfico |

### Dark mode (`[data-theme="dark"]`)

El dark mode se activa con el atributo en `<html>` (vía `SettingsContext`). **Cada token debe tener su contraparte oscura** en el bloque `[data-theme="dark"]`. Ver `src/index.css:27-46` para los valores actuales.

⚠️ **Regla de oro**: si agregás un color nuevo en `@theme`, agregalo también en `[data-theme="dark"]`. Sin excepción.

## Clases de Tailwind para usar

### Containers

```html
<div id="root">                       <!-- ya está wrapeado en index.css con max-w-[480px] mx-auto -->
  <div class="space-y-4">             <!-- gap vertical estándar entre secciones -->
    <div class="px-5">                <!-- padding horizontal estándar -->
      ...
    </div>
  </div>
</div>
```

- El `#root` ya tiene `max-width: 480px` y `margin: 0 auto` (definido en `@layer base` de `index.css`). **No wrappear de nuevo**.
- `space-y-4` es la separación estándar entre bloques.

### Botones / tabs (touch targets)

- `py-3` mínimo para altura de toque (~44px) en mobile.
- `px-4` estándar para padding horizontal.
- Texto `text-sm font-medium` o `text-base font-semibold` para legibilidad.

### Cards

```tsx
import { Card } from '../ui/Card'
<Card>
  {/* contenido */}
</Card>
```

`Card` (en `src/components/ui/Card.tsx`):
- `bg-card border border-border rounded-2xl p-4` (o similar)
- Usalo para agrupar contenido relacionado en Dashboard, Stats, Settings.

### Botones

```tsx
import { Button } from '../ui/Button'
<Button onClick={...} variant="primary" size="lg" fullWidth>
  Confirmar
</Button>
```

`Button` soporta `variant` (`primary | secondary | outline`), `size` (`sm | md | lg`), `fullWidth`. Disabled: `disabled:opacity-50 disabled:pointer-events-none`.

### Badges

```tsx
import { Badge } from '../ui/Badge'
<Badge color="recurring">🔄 Detectado: recurrente</Badge>
```

`Badge` soporta `color` (`accent | expense | income | recurring | neutral`).

### Filtros (patrón de pills)

```tsx
<div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
  <button className={`
    shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
    ${active ? 'bg-accent text-white' : 'bg-card border border-border text-text-muted active:bg-card-hover'}
  `}>
    Junio 2026
  </button>
</div>
```

- `scrollbar-hide` (utility en `index.css`) oculta la scrollbar visual.
- `-mx-5 px-5` rompe el padding del contenedor padre y restaura el padding interno → permite que las pills lleguen al borde.
- `shrink-0` evita que las pills se compriman.

### Sheets (modals bottom-anchored)

Patrón `SmartInputSheet`:

```tsx
<div
  className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
  onClick={(e) => e.target === e.currentTarget && onClose()}
  style={{ background: 'var(--color-overlay)' }}
>
  <div
    className="w-full max-w-[480px] bg-card rounded-t-3xl animate-slide-up
                max-h-[90vh] overflow-y-auto"
    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
  >
    {/* drag handle: <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" /> */}
    {/* contenido */}
  </div>
</div>
```

- `animate-fade-in` en el backdrop (200ms).
- `animate-slide-up` en la sheet (300ms cubic-bezier(0.16, 1, 0.3, 1)).
- Backdrop click cierra (`e.target === e.currentTarget`).
- `paddingBottom: env(safe-area-inset-bottom)` para no tapar el home indicator del iPhone.
- `useEffect(() => { document.body.style.overflow = 'hidden'; ... return () => { overflow = '' } }, [open])` para bloquear scroll del body.

### FAB (Floating Action Button)

```tsx
<button
  onClick={onAdd}
  className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-accent text-white shadow-lg
             flex items-center justify-center z-40 active:scale-95 transition-transform"
  aria-label="Nueva transacción"
>
  <svg ...>+</svg>
</button>
```

- `bottom-20` lo posiciona encima del `BottomNav` (que tiene ~64px de alto + safe area).
- `right-5` lo alinea con el padding lateral de la app.
- `w-14 h-14` (56px) es generoso para touch.
- `active:scale-95 transition-transform` para feedback táctil.
- `z-40` (debajo de sheets que son `z-50`).

## Animaciones — solo CSS

Definidas en `index.css`:

```css
@keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }

.animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) }
.animate-fade-in  { animation: fade-in 0.2s ease-out }
```

- **Solo `transform` y `opacity`**. Nunca animar `width`, `height`, `top`, `left` (causan layout).
- Usá `transition-colors` para cambios de color, `transition-transform` para escalas, NUNCA `transition-all`.

## Charts (SVG custom — sin Recharts)

### Donut — `src/components/dashboard/CategoryDonutChart.tsx`

```tsx
const SIZE = 180
const STROKE = 28
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

<svg width={SIZE} height={SIZE} className="transform -rotate-90">
  <circle cx={SIZE/2} cy={SIZE/2} r={RADIUS} fill="none"
          stroke="var(--color-border)" strokeWidth={STROKE} />
  {segments.map((s) => (
    <circle key={s.category.id} cx={SIZE/2} cy={SIZE/2} r={RADIUS} fill="none"
            stroke={s.category.color} strokeWidth={STROKE}
            strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
            strokeDashoffset={-s.offset}
            className="transition-all duration-500" />
  ))}
</svg>
```

- `viewBox` no es necesario porque el SVG es de tamaño fijo.
- Los colores vienen de `category.color` (campo dinámico) — esto SÍ está permitido como `style={{ background: c.color }}` o `stroke={c.color}`.

### Barras — `src/components/stats/Stats.tsx`

```tsx
<svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 20}`} className="w-full h-auto"
     preserveAspectRatio="xMidYMid meet">
  {months.map((m, i) => (
    <rect x={PADDING + i * (BAR_WIDTH + 8)} y={HEIGHT - h}
          width={BAR_WIDTH} height={h} rx="6" fill="var(--color-accent)"
          opacity={m.total > 0 ? 1 : 0.2} />
  ))}
</svg>
```

- `viewBox` + `w-full h-auto` para escalado responsive.
- `preserveAspectRatio="xMidYMid meet"` para que escale centrado.

## Estructura de archivos UI

```
src/components/
├── add/         # input sheets (SmartInputSheet)
├── dashboard/   # BalanceCard, MonthSummary, CategoryDonutChart, Dashboard
├── layout/      # AppShell, BottomNav, FAB
├── settings/    # Settings
├── stats/       # Stats (bars + donut)
├── transactions/# Transactions, TransactionItem
└── ui/          # Card, Button, Badge (primitive)
```

- Cada feature tiene su carpeta. La pantalla principal (Dashboard, Transactions, Stats, Settings) es `<feature>/<Feature>.tsx` y los sub-componentes viven en el mismo directorio.
- `ui/` es exclusivo para primitivos reutilizables (`Card`, `Button`, `Badge`). No agregar `Modal`, `Input`, `Select` aquí a menos que se usen en 2+ lugares.

## Estado vacío / loading

Patrón estándar:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <span className="text-5xl mb-3">🫥</span>
  <p className="text-text font-medium">Sin movimientos</p>
  <p className="text-sm text-text-muted mt-1">
    Tocá el botón + para registrar uno
  </p>
</div>
```

- Emoji grande + texto principal + texto auxiliar en muted.
- Centrado vertical con `py-16` o `py-10`.
- Ver `Dashboard.tsx:156-163` y `Transactions.tsx:114-121`.

## Anti-patterns

- 🟥 Colores hardcodeados: `bg-[#7c3aed]`, `text-red-500`, `style={{ color: '#ef4444' }}`. Usá tokens.
- 🟥 `transition-all`. Usá `transition-colors`, `transition-transform`, `transition-opacity`.
- 🟥 Animar `width`, `height`, `top`, `left`. Solo `transform` y `opacity`.
- 🟥 Olvidar la contraparte oscura en `[data-theme="dark"]` para un color nuevo.
- 🟥 Wrappear la app en un `max-w-[480px]` propio. Ya está en `#root`.
- 🟥 Usar `confirm()` / `alert()` del browser (excepto en `Settings.tsx` para delete-recurring — ya está). Para nuevos flujos usá un sheet de confirmación.
- 🟥 Emoji como único signifier de estado (agregar texto o color siempre).
- 🟥 Buttons sin `aria-label` cuando son icon-only.
- 🟥 `outline: none` global (rompe accesibilidad de teclado).
