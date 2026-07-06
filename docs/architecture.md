# Documentación de Arquitectura — Gasty

## 1. Principios Arquitecturales

| Principio | Implementación |
|-----------|----------------|
| **Mobile-first PWA** | `max-w-[480px]` en `#root`, touch targets ≥ 44px, bottom nav, sheets |
| **Offline-first** | IndexedDB (Dexie) como única fuente de verdad, sin backend |
| **Zero-runtime CSS** | Tailwind v4 `@theme` → CSS variables nativas, sin CSS-in-JS |
| **Reactive data** | `dexie-react-hooks` `useLiveQuery` → auto-subscription` → UI siempre sincronizada |
| **Bundle budget** | JS < 100KB gz, CSS < 10KB gz → sin deps pesadas, tree-shaking estricto |
| **Single-source types** | `src/types/index.ts` único para domain models |

---

## 2. Capas de la Aplicación

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  components/  (React 19, functional, hooks-only)             │
│  ├── layout/      AppShell, BottomNav, FAB                   │
│  ├── add/         SmartInputSheet                            │
│  ├── dashboard/   Dashboard, BalanceCard, MonthSummary,      │
│  │                 CategoryDonutChart                        │
│  ├── transactions/ Transactions, TransactionItem             │
│  ├── stats/       Stats (SVG bars + donut)                   │
│  ├── settings/    Settings                                   │
│  └── ui/          Button, Card, Badge (primitives)           │
├─────────────────────────────────────────────────────────────┤
│                      STATE / CONTEXT                         │
│  context/SettingsContext.tsx  (theme, currency, persisted)   │
│  context/EditTransactionContext (AppShell → SmartInputSheet) │
├─────────────────────────────────────────────────────────────┤
│                         HOOKS                                │
│  hooks/useTransactions.ts    (useLiveQuery → Transaction[])  │
│  hooks/useCategories.ts      (useLiveQuery → Category[])     │
│  hooks/useRecurringCheck.ts  (side effect on mount)          │
│  hooks/useKeyboardHeight.ts  (visualViewport API)            │
├─────────────────────────────────────────────────────────────┤
│                        DOMAIN LOGIC                          │
│  lib/parser.ts       parseInput() → ParsedTransaction        │
│  lib/recurring.ts    checkAndCloneRecurring(), CRUD sources  │
│  lib/categories.ts   DEFAULT_CATEGORIES, KEYWORDS, maps      │
│  lib/format.ts       formatMoney, formatDate, MONTHS_ES      │
│  lib/csv.ts          importCsv() → reusa parseInput()        │
│  lib/db.ts           Dexie schema, seed, settings CRUD       │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│  Dexie 4 (IndexedDB)                                         │
│  Tables: transactions, categories, settings                  │
│  Indices: transactions(type, date, categoryId, originalId)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Flujo de Datos (Data Flow)

### 3.1 Lectura (Read Path)
```
User Action / Mount
       │
       ▼
useLiveQuery(() => db.table.toArray())
       │
       ▼
React Re-render (subscripción reactiva Dexie)
       │
       ▼
UI Components consumen Transaction[] / Category[]
```

### 3.2 Escritura (Write Path)
```
User Input (SmartInputSheet)
       │
       ▼
parseInput() → ParsedTransaction
       │
       ▼
createTransactionFromParsed() → Transaction (con UUID, createdAt)
       │
       ▼
db.transactions.add(tx)  // o .put() para edit
       │
       ▼
Dexie notifica a useLiveQuery → Re-render automático
```

### 3.3 Recurring Engine (Background)
```
useRecurringCheck (mount App)
       │
       ▼
checkAndCloneRecurring()
       │
       ├── Lee all tx → sources (recurring + !originalId)
       ├── Agrupa clones por originalId + mes
       ├── Para cada source sin clon mes actual:
       │   ├── Valida fixed_temporary currentMonth ≤ totalMonths
       │   ├── Crea clon con date = invoiceDay mes actual
       │   ├── currentMonth + 1 en clon
       │   └── originalId = source.id
       └── db.transactions.add(clon) × N
            │
            ▼
       useLiveQuery notifica → UI actualizada
```

---

## 4. Esquema de Base de Datos (Dexie)

```typescript
// src/lib/db.ts
db.version(1).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories:   'id, type',
  settings:     'id',  // single row: {id: 'app-settings', theme, currency}
})
```

### Índices y Consultas Típicas
| Query | Índice Usado |
|-------|--------------|
| `where('type').equals('expense')` | `type` |
| `where('date').between(start, end)` | `date` |
| `where('categoryId').equals(catId)` | `categoryId` |
| `where('originalId').equals(sourceId)` | `originalId` |
| `where('originalId').notEqual('')` | `originalId` (para listar todos los clones) |

---

## 5. Sistema de Temas (Dark Mode)

### 5.1 Implementación
```typescript
// SettingsContext.tsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', settings.theme)
}, [settings.theme])
```

```css
/* index.css */
@theme { --color-primary: #9fe870; ... }  /* light defaults */

[data-theme="dark"] {
  --color-canvas: #1a1e17;
  --color-ink: #eef0ea;
  --color-primary: #9fe870;  /* same brand green */
  ...
}
```

### 5.2 Tokens Semánticos (usar siempre estos, no hex)
| Uso | Token Light | Token Dark |
|-----|-------------|------------|
| Fondo app | `--color-bg` (`canvas`) | `--color-bg` (`canvas-soft`) |
| Cards | `--color-card` | `--color-card` |
| Texto principal | `--color-text` (`ink`) | `--color-text` (`ink`) |
| Texto muted | `--color-text-muted` (`body`) | `--color-text-muted` (`body`) |
| Bordes | `--color-border` | `--color-border` |
| Gasto | `--color-expense` (`negative`) | `--color-expense` (`negative`) |
| Ingreso | `--color-income` (`positive`) | `--color-income` (`positive`) |
| Recurrente | `--color-recurring` (`warning`) | `--color-recurring` (`warning`) |
| Primary brand | `--color-primary` | `--color-primary` |

---

## 6. Convenciones de Componentes

### 6.1 Estructura Estándar
```tsx
// ComponentName.tsx
import { useSomething } from '../../hooks/useSomething'
import { formatMoney } from '../../lib/format'
import { Card } from '../ui/Card'
import type { Transaction } from '../../types'

interface ComponentNameProps {
  transaction: Transaction
}

export function ComponentName({ transaction }: ComponentNameProps) {
  const { settings } = useSettings()
  const category = useCategory(transaction.categoryId)
  
  // render
}
```

### 6.2 Reglas de Estilo (Hard Constraints)
- **Touch targets**: `py-3` mínimo (`min-h-[44px]`)
- **Contenedor**: `max-w-[480px]` en `#root` (ya en CSS)
- **Animaciones**: Solo `transform` / `opacity` — **nunca** `width`, `height`, `top`, `left`
- **Clases**: Tailwind utilities + CSS variables (`bg-primary`, `text-negative`, `border-border`)
- **Dark mode**: Cada nuevo color **debe** tener override en `[data-theme="dark"]`

### 6.3 Patrones de Composición
- `AppShell` provee `EditTransactionContext` → consumido por `TransactionItem`
- `SmartInputSheet` controlado por `AppShell` (open/close/editTransaction)
- `BottomNav` + `FAB` fijos en `AppShell`, contenido en `<main className="flex-1 pb-20">`

---

## 7. Parsing Architecture

### 7.1 Separación de Responsabilidades
| Archivo | Responsabilidad |
|---------|-----------------|
| `parser.ts` | `parseInput()` — pipeline puro, sin side effects, testable |
| `categories.ts` | Data: `DEFAULT_CATEGORIES`, `KEYWORDS[]`, `INCOME_KEYWORDS[]`, `RECURRING_KEYWORDS[]` |
| `recurring.ts` | Side effects: DB reads/writes, clonación, eliminación cascada |

### 7.2 Testing Strategy
- `parser.test.ts` — unit tests puros (135 tests), sin DB
- `recurring.test.ts` — integration con `fake-indexeddb`, testa motor clonación
- `integration.test.ts` — DB + parser flujo completo

---

## 8. Build & Release Pipeline

### 8.1 Comandos Exactos
```bash
npm run dev        # vite dev server
npm run build      # tsc -b && vite build → dist/
npm run lint       # eslint . (flat config)
npm test           # vitest run
npm run preview    # vite preview (serve dist/)
```

### 8.2 Build Order (Crítico)
1. `tsc -b` → type-checka **ambos** `tsconfig.app.json` + `tsconfig.node.json`
2. `vite build` → bundlea, minifica, genera PWA manifest + SW

### 8.3 PWA Config (`vite.config.ts`)
```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Gasty',
    short_name: 'Gasty',
    theme_color: '#9fe870',
    background_color: '#e8ebe6',
    display: 'standalone',
    orientation: 'portrait',
    icons: [192, 512, 512-maskable]
  }
})
```

### 8.4 Capacitor / Play Store (futuro)
- `npm run build` → `dist/`
- `npx cap copy` → sincroniza `dist/` a `android/app/src/main/assets/public/`
- `npx cap open android` → Android Studio → signed bundle → Play Console

---

## 9. Dependencias — Justificación y Budget

| Dep | Tamaño (gz) | Justificación |
|-----|-------------|---------------|
| `react` + `react-dom` | ~45KB | Core framework |
| `dexie` | ~18KB | IndexedDB wrapper, reactive hooks |
| `dexie-react-hooks` | ~3KB | `useLiveQuery` integration |
| `tailwindcss` (v4) | ~0KB (CSS-only) | Styling via `@theme` |
| `@fontsource/inter` | ~15KB (woff2 subset) | Tipografía system |
| `vite-plugin-pwa` | build-time only | SW + manifest generation |
| **Total est. JS** | **~81KB** | **< 100KB budget** |

### Prohibidas (ADR requerido para agregar)
- Framer Motion (+15KB), Recharts/D3 (+50KB+), react-router (+12KB), Zustand (+2KB), lodash (+25KB), moment (+20KB), date-fns (+15KB)

---

## 10. Testing Architecture

### 10.1 Stack
- **Vitest** + **jsdom** + **fake-indexeddb**
- `fake-indexeddb/auto` import en tests de integración/recurring

### 10.2 Patrones
```typescript
// tests/recurring.test.ts
import 'fake-indexeddb/auto'
import { db, seedDatabase } from '../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedDatabase()
})
```

### 10.3 Cobertura Objetivo
- Parser: 100% (lógica pura, 135 tests)
- Recurring engine: 100% (motor crítico, 6 tests)
- Integración DB+Parser: smoke tests (6 tests)
- UI: sin tests (componentes simples, visual regression manual)

---

## 11. Migraciones Futuras (Schema Versioning)

```typescript
// Cuando se necesite schema bump:
db.version(2).stores({
  transactions: 'id, type, date, categoryId, originalId, newField',
  categories: 'id, type',
  settings: 'id',
}).upgrade(tx => {
  // tx.table('transactions').modify(...)
})
```

**Regla**: Nunca editar `version(1)`. Agregar `version(N)` con `.upgrade()`.

---

## 12. Checklist de Arquitectura (Pre-commit)

- [ ] `npm run lint` pasa
- [ ] `npm test` pasa
- [ ] `npm run build` pasa (type-check + bundle)
- [ ] No nuevas deps sin ADR en `docs/adr/`
- [ ] Dark mode counterpart para nuevos colores
- [ ] Touch targets ≥ 44px
- [ ] Fechas usan `toLocalISO()` no `toISOString()`
- [ ] No edición de clones recurrentes (solo source)
- [ ] Bundle size < 100KB JS / < 10KB CSS (ver `gasty-bundle-budget` skill)