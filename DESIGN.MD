# Design System: Gasty (v2.0 — Powered by Maguito UI)

## 1. Visual Theme & Atmosphere

A warm, mobile-first personal finance tool that feels like a playful, cozy hand-drawn notebook rather than a cold spreadsheet. Following the integration of **Maguito UI** (Pastel Pixie theme), the visual direction embraces a **Cozy Neo-Brutalist** aesthetic: thick `3px` solid strokes, rigid flat shadows with zero blur, and a friendly dual-font typographic stack.

The atmosphere is **warm canvas** — an off-white eggshell (`#F5F5F5`) with sage green accents and graphite ink outlines. Density is moderate (5/10) — information-dense enough for daily driver utility but airy enough that numbers don't feel oppressive. Variance is medium-high (6/10): asymmetric internal layouts, mixed border radii, and emoji-driven category badges break the monotony of rows. Motion is restrained (4/10): CSS-only, no choreography, but sheets slide up with a premium cubic-bezier curve.

The design language leans into its Argentinian locale (es-AR) with natural-language smart input, informal category naming ("Salidas", "Comida"), and a friendly "Tocá el botón +" empty state voice. It is unapologetically utilitarian but finessed — generous rounding, flat shadows, and a singular green accent prevent it from feeling generic.

---

## 2. Color Palette & Roles

### Brand / Accent — Sage Green (Pastel Pixie Primary)
- **Sage Green** (`#A2D149`) — Primary accent. CTAs, FAB, active states, focus rings, check marks. Derived from Maguito `--maguito-primary`.
- **Sage Green Active** (`#cdffad`) — Hover/active tint of the accent, used for pressed button states.
- **Sage Green Neutral** (`#c5edab`) — Low-contrast variant for secondary accent applications.
- **Sage Green Pale** (`#e2f6d5` light / `#2a3324` dark) — Soft tint fills for progress bars, selected state backgrounds, and card variants.
- **On Primary** (`#0e0f0c`) — Text on sage green backgrounds. Near-black with warm undertone.

### Surface & Background
- **Canvas** (`#F5F5F5`) — Primary background. Warm off-white from Maguito `--maguito-bg`.
- **Canvas Soft** (`#ececeb` light / `#22261f` dark) — Secondary surface tint. Barely-there warm white for secondary card variants and button fills.
- **Ink** (`#2C2C2C`) — Primary text, structural borders, and flat shadows. Warm graphite from Maguito `--maguito-text`.
- **Ink Deep** (`#1a1a1a` light / `#c8ead0` dark) — Maximum-contrast semantic text.

### Dark Mode Surfaces
- **Canvas Dark** (`#1A1E17`) — Deep olive-green background. Not pure black. From Maguito dark override.
- **Canvas Soft Dark** (`#22261f`) — Dark card surface. Slightly lighter olive.
- **Ink Dark** (`#EEF0EA`) — Primary text in dark mode. Warm off-white. From Maguito dark override.
- **Ink Deep Dark** (`#c8ead0`) — Green tint for standout text in dark mode.

### Body & Muted Text
- **Body** (`#5a5a5a` light / `#abada7` dark) — Secondary text, descriptions, metadata. Warm medium gray.
- **Mute** (`#8a8a8a` light / `#8f918b` dark) — Subtle text, timestamps, tertiary info.

### Semantic Colors
- **Positive / Income** (`#A2D149` light / `#4ade80` dark) — Income amounts, positive balance, green semantic states. From Maguito `--maguito-success`.
- **Positive Deep** (`#6b9a2e` light / `#22c55e` dark) — Deeper green for high-contrast positive text.
- **Negative / Expense** (`#E95B6F` light / `#f87171` dark) — Expense amounts, negative balance, danger actions. From Maguito `--maguito-danger`.
- **Negative Deep** (`#c4394e` light / `#ef4444` dark) — High-contrast expense text.
- **Warning / Recurring** (`#FBBF24` light / `#fbbf24` dark) — Recurring indicators, amber badges. From Maguito `--maguito-warning`.
- **Warning Deep** (`#b86700`) — Text on warning backgrounds.

### Tertiary Accents
- **Sky Blue** (`#79BCE8` light / `#8ccbf5` dark) — Secondary accent for interactive widgets. From Maguito `--maguito-accent`.
- **Cyan / Projections** (`#67E8F9`) — Future projected estimates and simulation banners. From Maguito `--maguito-info`.

### Borders & Structure
- **Border** (`#d6d9d3` light / `#2d322a` dark) — Default 1px structural lines (legacy compat).
- **Border Strong** (`#c1c4be` light / `#3d4339` dark) — Emphasized dividers, active border states.
- **Border Soft** (`#e2e5df` light / `#2e352b` dark) — Subtle 1px dividers in dense lists (anti-clutter rule).

### Overlay
- **Overlay** (`rgba(0,0,0,0.4)` light / `rgba(0,0,0,0.6)` dark) — Scrim behind modal sheets.

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
- Maximum 1 accent color (Sage Green `#A2D149`).
- No pure black (`#000000`). Use `#2C2C2C` (Ink) or olive-charcoal.
- Dark mode uses olive/charcoal bases, not cold grays.
- Category colors are deliberately varied for chart readability.

---

## 3. Typography Rules

### Stack
Gasty uses a **dual-font** typographic stack enforced via Maguito UI tokens:
- **Display / Headings:** **Fredoka** (`font-display`) — Ultra-rounded, friendly, geometric typeface. Used for app title ("Gasty"), section headings, and screen-level announcements.
- **Body / Data UI:** **Plus Jakarta Sans** (`font-sans`) — Warm, highly legible geometric sans-serif. Used for transaction descriptions, form inputs, configuration descriptions, and small metadata.
- **Fallback:** **Inter** (`@fontsource/inter`) — Retained as fallback in the font stack.

### Scale
- **Display/Logo:** `text-4xl` (`2.25rem` / 36px) — `font-black` + `tracking-tight` + `leading-none`. Used for app title and page headings.
- **Primary Amounts:** `text-5xl` (`3rem` / 48px) — `font-bold` for balance display on the BalanceCard dark card.
- **Section Amounts:** `text-2xl` (`1.5rem` / 24px) — `font-bold` for monthly summary numbers.
- **Body:** `text-sm` (`0.875rem` / 14px) — Default body, descriptions, metadata.
- **Caption:** `text-xs` (`0.75rem` / 12px) — Uppercase section labels, timestamps, badges.
- **Input:** `text-xl` (`1.25rem` / 20px) — Smart input field text.

### Hierarchy Principles
- Page titles use extreme weight (`font-black`) and display font rather than extreme size.
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
- **Primary:** `bg-primary text-on-primary border-maguito shadow-maguito rounded-xl` — Filled sage green, graphite border, flat shadow. Press state: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform` (tactile snap feedback, no blur animation).
- **Secondary:** `bg-canvas-soft text-ink border-maguito shadow-maguito rounded-xl`.
- **Tertiary:** `bg-canvas text-ink border-maguito rounded-xl` — Outlined, no shadow.
- **Danger:** `bg-negative text-white border-maguito shadow-maguito rounded-xl`.
- **Dimensions:** Minimum vertical padding must ensure an interaction target of at least **`44px`** for mobile comfort (`py-3` min).
- **Full-width variant** available via `fullWidth` prop.

### Cards (`<Card />`)
- **Default:** `bg-canvas border-maguito shadow-maguito rounded-3xl p-5` — Standard card with thick border and flat shadow.
- **Sage:** `bg-canvas-soft` — Subtle elevation via warm fill. No border.
- **Green:** `bg-primary-pale` — Green-accented callout card.
- **Dark:** `bg-card-dark text-primary` — High-emphasis balance display (inverted card).
- **Interactive:** `active:scale-[0.98] hover:bg-card-hover` when `onClick` is provided.
- **When to use:** Only for elevation/section hierarchy. In dense lists, use the anti-clutter rule (see below).

### Badges (`<Badge />`)
- **Shape:** `rounded-full` pill shape.
- **Sizing:** `px-2 py-0.5 text-xs` — compact, inline.
- **Colors mapped to semantics:** default, recurring, income, expense, accent, positive, negative.

### Inputs
- **Smart Input Field:** `text-xl p-4 rounded-2xl bg-canvas border-maguito focus:ring-2 focus:ring-primary` — Large, prominent, with 3px border that transitions to green focus ring.
- **Number Inputs:** `w-20 px-3 py-2 rounded-xl bg-canvas border-maguito text-center`.
- **Pattern:** Label above input, helper text below (small, `text-xs text-body`). No floating labels.
- **Placeholder:** `placeholder:text-mute` — muted gray.

### Category Filter Pills
- **Shape:** `rounded-full` pill.
- **Sizing:** `px-3 py-1.5 text-xs font-medium` — compact horizontal scroll row.
- **Active state:** Filled with category's own color, white text.
- **Inactive state:** `bg-canvas-soft border-maguito text-body`.

### Transaction Item — Anti-Clutter Rule
**Critical:** Individual transaction rows do NOT get `border-maguito`. Instead:
- **List container:** Single `bg-card border-maguito shadow-maguito rounded-lg` wrapper for all rows in a day group.
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
- `w-14 h-14 rounded-full bg-primary text-on-primary border-maguito shadow-maguito`.
- Active: `active:scale-95 active:shadow-none transition-transform`.
- Plus icon via inline SVG (24px, 2.5px stroke).

### Sheet / SmartInputSheet
- Full-screen fixed overlay with scrim (`var(--color-overlay)`).
- Bottom-anchored sheet (`items-end`), `w-full max-w-[480px]`.
- Mobile: `bg-canvas border-t-[3px] border-x-[3px] border-ink rounded-t-3xl`.
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
- **Body background:** `var(--color-bg)` = `var(--color-canvas)` = `#F5F5F5` (warm off-white).

### Page Structure
- Each tab page is a vertical stack with `space-y-4` gap.
- Page header: `pt-2 pb-1` containing `h1.text-4xl.font-black.tracking-tight.leading-none`.

### Spacing System
- Page padding: `px-5` (1.25rem) horizontal, `pt-6 pb-4` vertical.
- Card padding: `p-5` (1.25rem).
- List spacing: Transaction rows use `border-b border-border-soft` inside a `border-maguito` container.
- Section gaps: `space-y-4` (16px) between cards.

### Dark Mode Strategy
- `data-theme` attribute on `<html>` drives CSS custom property overrides.
- Olive-green dark surfaces (`#1A1E17`, `#22261f`) instead of slate/navy.
- Maguito CSS variables are overridden in `[data-theme="dark"]` to shift all `--maguito-*` tokens simultaneously.
- Green accent stays sage green — maintains brand consistency across modes.

---

## 6. Motion & Interaction

### Animation Engine
- CSS-only. No JavaScript animation libraries.
- Entry animations: `animate-slide-up` (0.3s, `cubic-bezier(0.16, 1, 0.3, 1)`).
- Fade overlay: `animate-fade-in` (0.2s, `ease-out`).
- Only `transform` and `opacity` are animated — never `width`, `height`, `top`, `left`.

### Interactive Feedback
- Buttons: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform` — tactile snap press. Shadow disappears instantly (flat shadow = no visual interpolation possible), translate is smooth via compositor.
- Cards: `active:scale-[0.98]` — subtle press-down.
- FAB: `active:scale-95 active:shadow-none` — clear press feedback.
- List rows: `active:bg-card-hover` — background tint on tap.
- Interactive elements use `transition-transform` or `transition-colors` (never `transition-all` for flat shadows).

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
- No pure black (`#000000`). Use `#2C2C2C` (Ink) or olive-charcoal instead.
- No blurred shadows on buttons or cards. All elevation is hard, flat solid offsets via `.shadow-maguito`.
- No hardcoded hex colors in components — all colors through CSS custom properties.
- No soft box-shadows (`shadow-lg`, `shadow-xl`). Forbidden. Only `.shadow-maguito` / `.shadow-maguito-lg`.

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
- No `transition-all` on elements with flat shadows (0px blur) — use `transition-transform` instead. Flat shadows snap instantly; only translate benefits from smooth interpolation.
