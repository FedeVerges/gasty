# Design System: Gasty

## 1. Visual Theme & Atmosphere

A warm, mobile-first personal finance tool that feels like a clean, focused notebook rather than a cold spreadsheet. The visual direction embraces a **Warm Minimalist** aesthetic: crisp 1px strokes, subtle elevation via soft shadows, and a restrained single-font typographic stack.

The atmosphere is **warm canvas** — a pure white (`#ffffff`) with sage green accents and graphite ink outlines. Density is moderate (5/10) — information-dense enough for daily driver utility but airy enough that numbers don't feel oppressive. Variance is medium-high (6/10): asymmetric internal layouts, mixed border radii, and emoji-driven category badges break the monotony of rows. Motion is restrained (4/10): CSS-only, no choreography, but sheets slide up with a premium cubic-bezier curve.

The design language leans into its Argentinian locale (es-AR) with natural-language smart input, informal category naming ("Salidas", "Comida"), and a friendly "Tocá el botón +" empty state voice. It is unapologetically utilitarian but finessed — generous rounding, a single green accent, and subtle elevation prevent it from feeling generic.

---

## 2. Color Palette & Roles

### Brand / Accent — Sage Green
- **Primary** (`#9fe870`) — Primary accent. CTAs, FAB, active states, focus rings, check marks.
- **Primary Active** (`#cdffad`) — Hover/active tint of the accent, used for pressed button states.
- **Primary Neutral** (`#c5edab`) — Low-contrast variant for secondary accent applications.
- **Primary Pale** (`#e2f6d5` light / `#2a3324` dark) — Soft tint fills for progress bars, selected state backgrounds, and card variants.
- **On Primary** (`#0e0f0c`) — Text on sage green backgrounds. Near-black with warm undertone.

### Surface & Background
- **Canvas** (`#ffffff`) — Primary background. Pure white.
- **Canvas Soft** (`#f5f5f4` light / `#22261f` dark) — Secondary surface tint. Barely-there warm white for secondary card variants and button fills.
- **Ink** (`#0e0f0c`) — Primary text, structural borders. Warm graphite.
- **Ink Deep** (`#163300` light / `#b4e89a` dark) — Maximum-contrast semantic text.

### Dark Mode Surfaces
- **Canvas Dark** (`#1a1e17`) — Deep olive-green background. Not pure black.
- **Canvas Soft Dark** (`#22261f`) — Dark card surface. Slightly lighter olive.
- **Ink Dark** (`#eef0ea`) — Primary text in dark mode. Warm off-white.
- **Ink Deep Dark** (`#b4e89a`) — Green tint for standout text in dark mode.

### Body & Muted Text
- **Body** (`#454745` light / `#abada7` dark) — Secondary text, descriptions, metadata. Warm medium gray.
- **Mute** (`#5c5e59` light / `#8f918b` dark) — Subtle text, timestamps, tertiary info.

### Semantic Colors
- **Positive / Income** (`#1a7a35` light / `#4ade80` dark) — Income amounts, positive balance, green semantic states.
- **Positive Deep** (`#054d28` light / `#22c55e` dark) — Deeper green for high-contrast positive text.
- **Positive Soft** (`#e4f3e4` light / `#1a2e1a` dark) — Soft green tint for backgrounds.
- **Negative / Expense** (`#d03238` light / `#f87171` dark) — Expense amounts, negative balance, danger actions.
- **Negative Deep** (`#a72027` light / `#ef4444` dark) — High-contrast expense text.
- **Negative Soft** (`#fbe4e4` light / `#3b1a1a` dark) — Soft red tint for backgrounds.
- **Warning / Recurring** (`#ffd11a` light / `#fbbf24` dark) — Recurring indicators, amber badges.
- **Warning Deep** (`#b86700` light / `#f59e0b` dark) — Text on warning backgrounds.
- **Warning Content** (`#4a3b1c` light / `#fef3c7` dark) — Text on warning backgrounds.

### Tertiary Accents
- **Accent Orange** (`#ffc091`) — Secondary accent for interactive widgets and highlights.
- **Accent Cyan** (`#38c8ff`) — Future projected estimates and simulation banners.

### Borders & Structure
- **Border** (`#d6d9d3` light / `#2d322a` dark) — Default 1px structural lines.
- **Border Strong** (`#c1c4be` light / `#3d4339` dark) — Emphasized dividers, active border states.
- **Border Soft** (`#e2e5df` light / `#2e352b` dark) — Subtle 1px dividers in dense lists (anti-clutter rule).

### Overlay
- **Overlay** (`rgba(0,0,0,0.4)` light / `rgba(0,0,0,0.6)` dark) — Scrim behind modal sheets.

### Projection Tokens (future month projection)
- **Projection BG** (`#0c4a6e`) — Deep blue background for projection banners.
- **Projection Text** (`#e0f2fe`) — Light text on projection backgrounds.
- **Projection Accent** (`#22d3ee`) — Accent color for projection highlights.
- **Projection Card** (`#0e3a5c`) — Card background for projection content.

### Category Colors (12 distinct hues for chart slices + filter pills)
| Color | Hex | Usage |
|---|---|---|
| Amber | `#f59e0b` | Comida |
| Purple | `#8b5cf6` | Vivienda |
| Cyan | `#06b6d4` | Servicios |
| Blue | `#3b82f6` | Transporte |
| Pink | `#ec4899` | Salidas |
| Orange | `#f97316` | Reparaciones |
| Emerald | `#10b981` | Salud / Otros Ingresos |
| Indigo | `#6366f1` | Educación |
| Green | `#22c55e` | Supermercado / Sueldo |
| Slate | `#64748b` | Otros Gastos |
| Warm Gray | (from category dot in chart) | Unclassified |

### Constraints
- Maximum 1 accent color (Sage Green `#9fe870`).
- No pure black (`#000000`). Use `#0e0f0c` (Ink) or olive-charcoal.
- Dark mode uses olive/charcoal bases, not cold grays.
- Category colors are deliberately varied for chart readability.

---

## 3. Typography Rules

### Stack
Gasty uses a **single-font** typographic stack:
- **Display / Body / Data UI:** **Inter** (`font-display`, `font-body`, `font-sans`) — Clean, highly legible geometric sans-serif. Used for all text: app title, section headings, transaction descriptions, form inputs, configuration descriptions, and small metadata.
- **Fallback:** System UI stack (`system-ui, -apple-system, sans-serif`).

### Scale
- **Display/Logo:** `text-4xl` (`2.25rem` / 36px) — `font-black` + `tracking-tight` + `leading-none`. Used for app title and page headings.
- **Primary Amounts:** `text-5xl` (`3rem` / 48px) — `font-bold` for balance display on the BalanceCard dark card.
- **Section Amounts:** `text-2xl` (`1.5rem` / 24px) — `font-bold` for monthly summary numbers.
- **Body:** `text-sm` (`0.875rem` / 14px) — Default body, descriptions, metadata.
- **Caption:** `text-xs` (`0.75rem` / 12px) — Uppercase section labels, timestamps, badges.
- **Input:** `text-xl` (`1.25rem` / 20px) — Smart input field text.

### Hierarchy Principles
- Page titles use extreme weight (`font-black`) and display size rather than color alone.
- Section labels are `text-xs uppercase tracking-widest font-medium` — quiet, restrained.
- Money amounts always use `font-bold` with semantic color (green for income, red for expense).
- Never use pure size escalation for hierarchy — weight and color do the work.

### Banned
- No serif fonts.
- No font-size below `0.75rem` (12px) for accessibility.
- No `text-justify`.

---

## 4. Component Stylings

### Buttons (`<Button />`)
- **Primary:** `bg-primary text-on-primary border border-border rounded-3xl` — Filled sage green, graphite border. Press state: `active:scale-95 transition-transform`.
- **Secondary:** `bg-canvas-soft text-ink border border-border rounded-3xl`.
- **Tertiary:** `bg-canvas text-ink border border-border rounded-3xl` — Outlined, no shadow.
- **Danger:** `bg-negative text-white border border-border rounded-3xl`.
- **Dimensions:** Minimum vertical padding must ensure an interaction target of at least **`44px`** for mobile comfort (`py-3` min).
- **Full-width variant** available via `fullWidth` prop.

### Cards (`<Card />`)
- **Default:** `bg-canvas border border-border rounded-3xl p-5` — Standard card with 1px border.
- **Sage:** `bg-canvas-soft` — Subtle elevation via warm fill. No border.
- **Green:** `bg-primary-pale` — Green-accented callout card.
- **Dark:** `bg-card-dark text-primary` — High-emphasis balance display (inverted card).
- **Interactive:** `active:scale-[0.98] hover:bg-card-hover` when `onClick` is provided.
- **When to use:** Only for elevation/section hierarchy. In dense lists, use the anti-clutter rule (see below).

### Badges (`<Badge />`)
- **Shape:** `rounded-full` pill shape.
- **Sizing:** `px-2.5 py-0.5 text-xs` — compact, inline.
- **Colors mapped to semantics:** default, recurring, income, expense, accent, positive, negative.

### Inputs
- **Smart Input Field:** `text-xl p-4 rounded-2xl bg-canvas border-2 border-border focus:border-primary` — Large, prominent, with 2px border that transitions to green on focus.
- **Number Inputs:** `w-20 px-3 py-2 rounded-xl bg-canvas border-2 border-border text-center`.
- **Pattern:** Label above input, helper text below (small, `text-xs text-body`). No floating labels.
- **Placeholder:** `placeholder:text-mute` — muted gray.

### Category Filter Pills
- **Shape:** `rounded-full` pill.
- **Sizing:** `px-3 py-1.5 text-xs font-medium` — compact horizontal scroll row.
- **Active state:** Filled with category's own color, white text.
- **Inactive state:** `bg-card border border-border text-body`.

### Transaction Item — Anti-Clutter Rule
**Critical:** Individual transaction rows do NOT get `border-border` or `shadow-xl`. Instead:
- **List container:** Single `bg-card border border-border rounded-lg` wrapper for all rows in a day group.
- **Row separators:** Individual rows use `border-b border-border-soft last:border-b-0` — subtle 1px dividers.
- **Row layout:** 3-column flex: emoji icon (44px square with tinted background) | description + badge + date | amount + edit/delete buttons.
- **Row styling:** `px-1 py-3` — no individual rounding or borders. Rows are flat within the container.
- **Active state:** `active:bg-card-hover` — subtle tint feedback on tap.

### Loading States
- No explicit skeleton loaders. Data loads via `useLiveQuery` which is synchronous from cache.

### Empty States
- Composed compositions with a large emoji (5xl), bold "Sin [nombre]" heading, and helper text in body/muted colors. Example: "Sin movimientos" + "Tocá el botón + para registrar uno".

### Navigation (BottomNav)
- Fixed bottom bar, 4-column grid (`grid-cols-4 h-16`), glass effect (`bg-canvas/80 backdrop-blur-lg`).
- Each tab: SVG icon (24px) + text label (11px).
- Active: `text-ink`, Inactive: `text-mute`.
- `border-t border-border` top separator.
- Wrapped in `max-w-[480px]` centered within viewport.

### FAB (Floating Action Button)
- Fixed bottom center, `bottom-20` (above BottomNav), `-translate-x-1/2` centered.
- `w-14 h-14 rounded-full bg-primary text-on-primary shadow-xl`.
- Active: `active:scale-95 transition-transform`.
- Plus icon via inline SVG (24px, 2.5px stroke).

### Sheet / SmartInputSheet
- Full-screen fixed overlay with scrim (`var(--color-overlay)`).
- Bottom-anchored sheet (`items-end`), `w-full max-w-[480px]`.
- Mobile: `bg-canvas border-t border-x border-ink rounded-t-3xl`.
- Desktop: `bg-canvas rounded-3xl`.
- Entry animation: `animate-slide-up` (0.3s cubic-bezier(0.16, 1, 0.3, 1)).
- Exit: overlay tap-to-dismiss via `animate-fade-in`.
- Drag handle: `w-10 h-1 bg-border rounded-full mx-auto mb-4`.
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`.
- Max height: `max-h-[90dvh]` with keyboard-aware fallback.

### Progress Bar (MonthSummary)
- `h-2.5 bg-primary-pale rounded-full` track.
- `h-full rounded-full` fill with `bg-positive` (green) or `bg-negative` (red) when over budget.
- Width driven by inline `style={{ width: '%' }}`, transition `transition-all duration-500`.

### SVG Bar Chart (Stats)
- Custom SVG bars: `rect` with `rx="6"` rounding, `fill="var(--color-positive)"`.
- No chart library. Hand-drawn data bounds. 6-month view.

### SVG Donut Chart (Stats/Dashboard)
- Custom SVG donut: `circle` elements with `strokeDasharray` and `strokeDashoffset`.
- `SIZE=180`, `STROKE=28`, `RADIUS=76`.
- Center label: Total formatted amount.

---

## 5. Layout Principles

### Container
- **Max width:** 480px (`max-w-[480px]` on `#root`). Centered. No exceptions.
- **Body background:** `var(--color-bg)` = `var(--color-canvas)` = `#ffffff` (pure white).

### Page Structure
- Each tab page is a vertical stack with `space-y-4` gap.
- Page header: `pt-2 pb-1` containing `h1.text-4xl.font-black.tracking-tight.leading-none`.

### Spacing System
- Page padding: `px-5` (1.25rem) horizontal, `pt-6 pb-4` vertical.
- Card padding: `p-5` (1.25rem).
- List spacing: Transaction rows use `border-b border-border-soft` inside a `border border-border` container.
- Section gaps: `space-y-4` (16px) between cards.

### Dark Mode Strategy
- `data-theme` attribute on `<html>` drives CSS custom property overrides.
- Olive-green dark surfaces (`#1a1e17`, `#22261f`) instead of slate/navy.
- CSS custom properties are overridden in `[data-theme="dark"]` to shift all `--color-*` tokens simultaneously.
- Green accent stays sage green — maintains brand consistency across modes.

---

## 6. Motion & Interaction

### Animation Engine
- CSS-only. No JavaScript animation libraries.
- Entry animations: `animate-slide-up` (0.3s, `cubic-bezier(0.16, 1, 0.3, 1)`).
- Fade overlay: `animate-fade-in` (0.2s, `ease-out`).
- Only `transform` and `opacity` are animated — never `width`, `height`, `top`, `left`.

### Interactive Feedback
- Buttons: `active:scale-95 transition-transform` — clear press feedback via scale.
- Cards: `active:scale-[0.98]` — subtle press-down.
- FAB: `active:scale-95 transition-transform` — clear press feedback.
- List rows: `active:bg-card-hover` — background tint on tap.
- Interactive elements use `transition-transform` or `transition-colors` (never `transition-all` on shadow-xl).

### Sheet Animation
- Bottom sheet: slides up from below viewport using `cubic-bezier(0.16, 1, 0.3, 1)`.
- Overlay: fades in simultaneously at 0.2s.
- Close: instant removal (no exit animation). Component unmounts on `open=false`.

### No Perpetual Motion
- No infinite loops, shimmer, pulse, or typewriter effects.
- No parallax, no scroll-triggered animation.
- No stagger or cascade on list mount — items appear instantly.

### Performance Constraints
- Only `transform` and `opacity` animated.
- SVG chart transitions use `transition-all duration-500` on stroke properties — GPU-accelerated.

---

## 7. Anti-Patterns (Banned)

### Color & Style
- No pure black (`#000000`). Use `#0e0f0c` (Ink) or olive-charcoal instead.
- No 3px borders. All borders are 1px (`border`, `border-t`, `border-b`, etc.).
- No hardcoded hex colors in components — all colors through CSS custom properties.
- No soft box-shadows on cards or buttons. `shadow-xl` is used only for the FAB. `shadow-lg` is forbidden.

### Typography
- No serif fonts anywhere.
- No font-size below 0.75rem.
- No `text-justify`.

### Layout
- No 3-column equal card layouts.
- No `h-screen` — use `min-h-[100dvh]` for full-height sections.
- No overlapping elements — every element occupies its own spatial zone.

### Content & Copy
- No fake data, invented statistics, or fabricated metrics.
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash".
- No filler UI text: "Scroll to explore", "Swipe down".

### Implementation
- No JavaScript animation libraries (Framer Motion, react-spring, GSAP).
- No chart libraries (Recharts, D3, Chart.js, Victory).
- No React Router (tab-based navigation via state).
- No state management libraries (Zustand, Redux, Jotai).
- No CSS-in-JS (styled-components, Emotion).
- No localStorage for user data (IndexedDB via Dexie only).
- No `toISOString()` for Transaction.date — use `toLocalISO()` instead.

### Accessibility
- No emoji as the sole signifier of state — pair with text or color.
- No interactive element without an accessible label.
- No touch targets smaller than 44px.

### Motion
- No animation of `width`, `height`, `top`, `left` — use `transform` and `opacity` only.
- No `transition-all` on elements with `shadow-xl` — use `transition-transform` instead. Shadows snap instantly; only transform benefits from smooth interpolation.
