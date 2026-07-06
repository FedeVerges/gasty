# Design System: Gasty

## 1. Visual Theme & Atmosphere

A warm, grounded, mobile-first personal finance tool that feels more like a cozy notebook than a cold spreadsheet. The atmosphere is **clean-white** — a pure white canvas with warm charcoal text and a singular green pulse. Density is moderate (5/10) — information-dense enough for daily driver utility but airy enough that numbers don't feel oppressive. Variance is medium-high (6/10): asymmetric internal layouts, mixed border radii, and emoji-driven category badges break the monotony of rows. Motion is restrained (4/10): CSS-only, no choreography, but sheets slide up with a premium cubic-bezier curve.

The design language leans into its Argentinian locale (es-AR) with natural-language smart input, informal category naming ("Salidas", "Comida"), and a friendly "Tocá el botón +" empty state voice. It is unapologetically utilitarian but finessed — large typography, generous rounding, and a singular accent color prevent it from feeling generic.

---

## 2. Color Palette & Roles

### Brand / Accent — Single Green
- **Sage Green** (`#9fe870`) — Primary accent. CTAs, FAB, active states, focus rings, check marks. Saturation ~72%. Not neon. Earthy.
- **Sage Green Active** (`#cdffad`) — Hover/active tint of the accent, used for pressed button states.
- **Sage Green Neutral** (`#c5edab`) — Low-contrast variant for secondary accent applications.
- **Sage Green Pale** (`#e2f6d5` light / `#2a3324` dark) — Soft tint fills for progress bars, selected state backgrounds, and card variants.
- **On Primary** (`#0e0f0c`) — Text on sage green backgrounds. Almost-black with warm undertone.

### Surface & Background
- **Canvas White** (`#ffffff`) — Primary card, sheet surface, and app background in light mode. Clean white, no tint.
- **Canvas Soft** (`#f5f5f4`) — Secondary surface tint. Barely-there warm white for secondary card variants and button fills. Near-white, not gray.
- **Ink** (`#0e0f0c`) — Primary text. Near-black with warm chlorophyll undertone.
- **Ink Deep** (`#163300`) — Deep green-black for maximum-contrast semantic text.

### Dark Mode Surfaces
- **Canvas Dark** (`#1a1e17`) — Deep olive-green card surface. Not pure black.
- **Canvas Soft Dark** (`#22261f`) — Dark app background. Slightly lighter olive.
- **Ink Dark** (`#eef0ea`) — Primary text in dark mode. Warm off-white.
- **Ink Deep Dark** (`#b4e89a`) — Bright green tint for standout text in dark mode.

### Body & Muted Text
- **Body** (`#454745` light / `#abada7` dark) — Secondary text, descriptions, metadata. Warm medium gray.
- **Mute** (`#5c5e59` light / `#8f918b` dark) — Subtle text, timestamps, tertiary info.

### Semantic Colors
- **Positive / Income** (`#1a7a35` light / `#4ade80` dark) — Income amounts, positive balance, green semantic states.
- **Positive Deep** (`#054d28` light / `#22c55e` dark) — Deeper green for high-contrast positive text.
- **Negative / Expense** (`#d03238` light / `#f87171` dark) — Expense amounts, negative balance, danger actions. Muted red — not alarming.
- **Negative Deep** (`#a72027` light / `#ef4444` dark) — High-contrast expense text.
- **Warning / Recurring** (`#ffd11a` light / `#fbbf24` dark) — Recurring indicators, amber badges.
- **Warning Deep** (`#b86700`) — Text on warning backgrounds.

### Borders & Structure
- **Border** (`#d6d9d3` light / `#2d322a` dark) — Default 1px structural lines. Warm gray-green.
- **Border Strong** (`#c1c4be` light / `#3d4339` dark) — Emphasized dividers, active border states.

### Tertiary Accents (for category badges, charts)
- **Accent Orange** (`#ffc091`) — Warm orange for specific category markers.
- **Accent Cyan** (`#38c8ff`) — Cyan for specific category markers.

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
- Maximum 1 accent color (Sage Green). Saturation below 80%.
- No purple/blue neon. No AI-purple aesthetic.
- No pure black (`#000000`). Always use warm off-black (`#0e0f0c`) or olive-charcoal.
- Dark mode uses olive/charcoal bases, not cold grays.
- Category colors are deliberately varied for chart readability.

---

## 3. Typography Rules

### Stack
- **Primary Font:** `Inter` — Used for all display, body, and UI text. System-ui fallback.
- **Weights in use:** `400` (body), `600` (semibold labels), `900` (display headlines, "Gasty" brand, page titles).
- **Monospace:** None currently used. Numbers are proportional.

### Scale
- **Display/Logo:** `text-4xl` (`2.25rem` / 36px) — `font-black` + `tracking-tight` + `leading-none`. Used for app title and page headings.
- **Primary Amounts:** `text-5xl` (`3rem` / 48px) — `font-bold` for balance display on the BalanceCard dark card.
- **Section Amounts:** `text-2xl` (`1.5rem` / 24px) — `font-bold` for monthly summary numbers.
- **Body:** `text-sm` (`0.875rem` / 14px) — Default body, descriptions, metadata.
- **Caption:** `text-xs` (`0.75rem` / 12px) — Uppercase section labels, timestamps, badges.
- **Input:** `text-xl` (`1.25rem` / 20px) — Smart input field text.

### Hierarchy Principles
- Page titles use extreme weight (`font-black`) rather than extreme size to dominate hierarchy.
- Section labels are `text-xs uppercase tracking-widest font-medium` — quiet, restrained.
- Money amounts always use `font-bold` with semantic color (green for income, red for expense).
- Never use pure size escalation for hierarchy — weight and color do the work.

### Banned
- No serif fonts (this is a dashboard/utility app — serif is inappropriate).
- No font-size below `0.75rem` (12px) for accessibility.
- No `text-justify` — text remains left-aligned.

### Critical Note
- `Inter` is the locked font for this project; it is not treated as a "premium creative" context where Inter would feel generic. Gasty is a pragmatic daily tool — Inter's readability at small sizes and extensive weight range serve the utility purpose.

---

## 4. Component Stylings

### Buttons
- **Primary:** `bg-primary text-on-primary` — Filled sage green, white text. No outer glow. No neon.
- **Secondary:** `bg-canvas-soft text-ink` — Tinted surface fill, ink text.
- **Tertiary:** `bg-canvas text-ink border border-ink` — Outlined, transparent fill.
- **Danger:** `bg-negative text-white` — Red fill for destructive actions.
- **Shape:** `rounded-3xl` (1.5rem / 24px) for `md`/`lg` sizes. `rounded-xl` for `sm`.
- **Active state:** `active:brightness-90` (primary) / `active:brightness-95` (secondary) — tactile brightness dim. No translate-y.
- **Disabled:** `opacity-50 cursor-not-allowed`.
- **Touch targets:** Minimum `py-3` (12px vertical padding) for `md` size, `py-4` for `lg`.
- **Full-width variant** available via `fullWidth` prop.

### Cards
- **Shape:** `rounded-3xl` (2rem / 32px) generous rounding.
- **Fill:** `bg-canvas` (white) — cards sit on the white body, so they get a `border border-border` for visual separation.
- **Shadow:** None. Cards separate from the canvas via a subtle 1px border (`var(--color-border)` / `#d6d9d3`).
- **Variants:**
  - `default` — `bg-canvas border border-border`, for standard content containers.
  - `sage` — `bg-canvas-soft`, for subtle elevation via warm fill. No border needed.
  - `green` — `bg-primary-pale`, for green-accented callout cards. No border needed.
  - `dark` — `bg-ink text-primary`, for high-emphasis balance display (inverted card). No border needed.
- **Interactive:** `active:scale-[0.98] hover:bg-card-hover` when `onClick` is provided.
- **Padding:** `p-5` (1.25rem) consistently.
- **When to use:** Only for elevation/section hierarchy. In dense lists, use a bordered container with `divide-y` dividers instead of multiple cards.

### Badges
- **Shape:** `rounded-full` pill shape.
- **Sizing:** `px-2 py-0.5 text-xs` — compact, inline.
- **Colors mapped to semantics:**
  - `default` — `bg-canvas-soft text-body` (neutral chip)
  - `recurring` — `bg-recurring-soft text-recurring` (amber tint for recurring indicators)
  - `income` — `bg-income-soft text-income` (green tint)
  - `expense` — `bg-expense-soft text-expense` (red tint)
  - `accent` — `bg-primary-pale text-on-primary` (green accent)
  - `positive` — `bg-primary-pale text-positive-deep` (dark green text)
  - `negative` — `bg-negative-bg text-white` (dark red bg, white text)

### Inputs
- **Smart Input Field:** `text-xl p-4 rounded-2xl bg-canvas border-2 border-border focus:border-primary` — Large, prominent, with a 2px border that transitions to accent green on focus.
- **Number Inputs (recurring months):** `w-20 px-3 py-2 rounded-xl bg-canvas border border-border text-center` — Compact, centered text.
- **Pattern:** Label above input, helper text below (small, `text-xs text-body`). No floating labels. Error text below when applicable.
- **Placeholder:** `placeholder:text-mute` — muted gray.

### Category Filter Pills
- **Shape:** `rounded-full` pill.
- **Sizing:** `px-3 py-1.5 text-xs font-medium` — compact horizontal scroll row.
- **Active state:** Filled with category's own color (`background: c.color`), white text.
- **Inactive state:** `bg-card border border-border text-body` — transparent with border.
- **"All" active state:** `bg-ink text-canvas` — solid dark pill.

### Transaction Item (list row)
- **Container:** `bg-card border border-border rounded-2xl divide-y divide-border` — transaction rows live inside a single bordered container, separated by horizontal dividers.
- **Row layout:** 3-column flex: emoji icon (44px square with tinted background) | description + badge + date | amount + edit/delete buttons.
- **Row styling:** `px-4 py-3` — no individual rounding or borders. Rows are flat within the container.
- **Active state:** `active:bg-card-hover` — subtle tint feedback on tap.
- **Divider:** `divide-y divide-border` — 1px separators between rows. Last row has no trailing divider.

### Loading States
- No explicit skeleton loaders yet. Data loads via `useLiveQuery` which is synchronous from cache — typically instant.
- Future: skeletal shimmer matching card/donut layout dimensions. No circular spinners.

### Empty States
- Composed compositions with a large emoji (5xl), bold "Sin [nombre]" heading, and helper text in body/muted colors. Example: "Sin movimientos" + "Tocá el botón + para registrar uno".
- Centered vertically with `py-16`.

### Navigation (BottomNav)
- Fixed bottom bar, 4-column grid (`grid-cols-4 h-16`), glass effect (`bg-canvas/80 backdrop-blur-lg`).
- Each tab: SVG icon (24px) + text label (11px).
- Active: `text-ink`, Inactive: `text-mute`.
- `border-t border-border` top separator.
- Wrapped in `max-w-[480px]` centered within viewport.

### FAB (Floating Action Button)
- Fixed bottom center, `bottom-20` (above BottomNav), `-translate-x-1/2` centered.
- `w-14 h-14 rounded-full bg-primary text-on-primary shadow-xl`.
- Active: `active:scale-95`.
- Plus icon via inline SVG (24px, 2.5px stroke).

### Sheet/SmartInputSheet
- Full-screen fixed overlay with scrim (`var(--color-overlay)`).
- Bottom-anchored sheet (`items-end`), `w-full max-w-[480px]`, `bg-canvas rounded-t-3xl`.
- Entry animation: `animate-slide-up` (0.3s cubic-bezier(0.16, 1, 0.3, 1)).
- Exit: overlay tap-to-dismiss via `animate-fade-in`.
- Drag handle: `w-10 h-1 bg-border rounded-full mx-auto mb-4`.
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`.
- Max height: `max-h-[90vh] overflow-y-auto` with sticky header.

### Progress Bar (MonthSummary)
- `h-2.5 bg-primary-pale rounded-full` track.
- `h-full rounded-full` fill with `bg-positive` (green) or `bg-negative` (red) when over budget.
- Width driven by inline `style={{ width: '%' }}`, transition `transition-all duration-500`.

### SVG Bar Chart (Stats)
- Custom SVG bars: `rect` with `rx="6"` rounding, `fill="var(--color-positive)"`.
- No chart library. Hand-drawn data bounds. 6-month view.
- Bar labels: `font-size="10" fill="var(--color-mute)"` text elements.

### SVG Donut Chart (Stats/Dashboard)
- Custom SVG donut: `circle` elements with `strokeDasharray` and `strokeDashoffset` for segments.
- `SIZE=180`, `STROKE=28`, `RADIUS=76`.
- Center label: Total formatted amount.
- Segment colors from category definitions.
- Legend shows top 5 categories with colored dot + emoji + name + percentage.

---

## 5. Layout Principles

### Container
- **Max width:** 480px (`max-w-[480px]` on `#root`). Centered. No exceptions.
- **Body background:** `var(--color-bg)` (= `var(--color-canvas)` = pure white `#ffffff`). No tint.
- **Card/canvas surfaces:** `var(--color-card)` (= `var(--color-canvas)`).

### Page Structure
- Each tab page is a vertical stack with `space-y-4` gap.
- Page header: `pt-2 pb-1` containing `h1.text-4xl.font-black.tracking-tight.leading-none`.
- Content follows below in Card-wrapped sections.

### Grid & Columns
- **2-column grids** used sparingly for toggle/selection cards (theme picker, currency picker, month summary numbers).
- **4-column grid** for bottom navigation only.
- **No 3-column equal card layouts** anywhere.
- Charts use custom SVG, not CSS grid.

### Overflow & Scroll
- Horizontal scroll for filter pills: `overflow-x-auto scrollbar-hide -mx-5 px-5` — negative margin overrides parent padding.
- Vertical scroll on main content area: `overflow-y-auto` within `flex-1` main.
- No horizontal overflow on body — ever.

### Spacing System
- Page padding: `px-5` (1.25rem) horizontal, `pt-6 pb-4` vertical.
- Card padding: `p-5` (1.25rem).
- List spacing: Transaction rows use `divide-y divide-border` inside a bordered container. Row internal spacing: `gap-3` (12px).
- Section gaps: `space-y-4` (16px) between cards.
- Filter row bottom padding: `pb-1`.

### Responsive
- Mobile-first single column. Always. The 480px container ensures this.
- No multi-column layouts at any breakpoint (this is a phone-only app).
- Charts adapt via SVG `viewBox` + `w-full h-auto`.
- Touch targets: minimum 44px height for interactive items (`py-3`).

### Dark Mode Strategy
- Data-theme attribute on `<html>` drives CSS custom property overrides.
- Olive-green dark surfaces (`#1a1e17`, `#22261f`) instead of slate/navy.
- Body background (`--color-bg`) uses `--color-canvas-soft` (`#22261f`) — slightly lighter olive than cards (`--color-card` = `--color-canvas` = `#1a1e17`). The relationship inverts from light mode: in dark, cards are darker than the body.
- Green accent stays the same `#9fe870` — maintains brand consistency across modes.
- Semantic colors shift to brighter variants for contrast (`#f87171` red, `#4ade80` green).
- Text inverts: near-white `#eef0ea` on dark, `#0e0f0c` on light.

---

## 6. Motion & Interaction

### Animation Engine
- CSS-only. No JavaScript animation libraries.
- Entry animations: `animate-slide-up` (`slide-up` keyframe, 0.3s, `cubic-bezier(0.16, 1, 0.3, 1)` — an "emphasized ease-out" curve).
- Fade overlay: `animate-fade-in` (`fade-in` keyframe, 0.2s, `ease-out`).
- Only `transform` and `opacity` are animated — never `width`, `height`, `top`, `left`.

### Interactive Feedback
- Buttons: `active:brightness-90` (primary), `active:brightness-95` (secondary) — 90ms response.
- Cards: `active:scale-[0.98]` — subtle press-down.
- FAB: `active:scale-95` — clear press feedback.
- List rows: `active:bg-card-hover` — background tint on tap.
- Interactive elements use `transition-colors` or `transition-all` (0.15s default).

### Sheet Animation
- Bottom sheet: slides up from below viewport (`translateY(100%)` → `translateY(0)`) using `cubic-bezier(0.16, 1, 0.3, 1)` — spring-like overshoot feel.
- Overlay: fades in simultaneously at 0.2s.
- Close: instant removal (no exit animation). Component unmounts on `open=false`.

### No Perpetual Motion
- No infinite loops, shimmer, pulse, or typewriter effects.
- No parallax, no scroll-triggered animation.
- No stagger or cascade on list mount — items appear instantly.

### Performance Constraints
- Only `transform` and `opacity` animated.
- SVG chart transitions use `transition-all duration-500` on stroke properties — GPU-accelerated.
- No `requestAnimationFrame` loops, no canvas, no WebGL.

### Future Rule
- If perpetual micro-interactions are added (e.g., pulse on active recurring badge), use only CSS `@keyframes` with `animation` property.

---

## 7. Anti-Patterns (Banned)

### Color & Style
- No pure black (`#000000`). Use `#0e0f0c` (Ink) or olive-charcoal instead.
- No neon or outer glow shadows on buttons or cards.
- No oversaturated accents (accent green is deliberately earthy, not electric).
- No purple-blue neon gradients or AI-startup aesthetic.
- No warm/cool gray fluctuation — stick to sage-warm gray family.
- No hardcoded hex colors in components — all colors through CSS custom properties (`var(--color-*)`).

### Typography
- No serif fonts anywhere (dashboard/utility app — serif is inappropriate).
- No `Inter` considered generic in this context (it is the locked project font for a utilitarian tool).
- No font-size below 0.75rem.
- No `text-justify`.

### Layout
- No 3-column equal card layouts.
- No `h-screen` — use `min-h-[100dvh]` for full-height sections.
- No `calc()` percentage hacks for layout — use CSS Grid.
- No overlapping elements — every element occupies its own spatial zone.
- No centered Hero sections (this app has no hero; if one is added, keep it left-aligned or asymmetric).
- No "LABEL // YEAR" formatting convention.

### Content & Copy
- No fake data, invented statistics, or fabricated metrics ("99.98% UPTIME", "124ms RESPONSE").
- No "SYSTEM PERFORMANCE METRICS" dashboard cards with fake data.
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen".
- No filler UI text: "Scroll to explore", "Swipe down", bouncing chevrons.
- No generic placeholder names ("John Doe", "Acme Inc.").

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
- No interactive element without an accessible label (`aria-label` or visible text).
- No touch targets smaller than 44px.

### Motion
- No animation of `width`, `height`, `top`, `left` — use `transform` and `opacity` only.
- No linear easing — use `cubic-bezier(0.16, 1, 0.3, 1)` for sheets.
