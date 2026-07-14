# Documentación de Arquitectura — Gasty (v2)

## 1. Principios Arquitecturales

| Principio | Implementación |
|-----------|----------------|
| **Mobile-first PWA + Desktop responsive** | `max-w-[480px]` estricto en `#root` para emular entorno nativo móvil. En pantallas grandes (≥768px), el layout conmuta a `flex-row` expandiendo el área de trabajo hasta `max-w-[960px]` mediante un Sidebar lateral adaptativo. |
| **Offline-first** | IndexedDB (gestionado a través de **Dexie 4**) como única fuente de verdad absoluta. La aplicación carece por diseño de sincronización síncrona con backend, garantizando operatividad total sin conectividad. |
| **Zero-runtime CSS** | Compilación nativa mediante **Tailwind v4**. Uso estricto de directivas `@theme` y variables CSS nativas para evitar sobrecostos de procesamiento en hilos de renderizado de dispositivos móviles de gama baja. |
| **Reactive data** | Enlace reactivo mediante `dexie-react-hooks` (`useLiveQuery`). El ciclo de vida de los componentes se suscribe automáticamente a las mutaciones de las tablas de la base de datos local, eliminando estados redundantes. |
| **Bundle budget** | JS <250KB gzipped, CSS < 15KB gzipped. Framer Motion y Zustand requieren ADR; el resto de dependencias pesadas (Recharts, react-router, moment, lodash) está prohibido. |
| **Single-source types** | Centralización estricta de todos los modelos de dominio y contratos en un único punto de verdad: `src/types/index.ts`. |

---

## 2. Capas de la Aplicación

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  components/  (React 19, funcionales, basados en hooks)       │
│  ├── layout/      AppShell, BottomNav, Sidebar, FAB           │
│  ├── add/         SmartInputSheet, CsvImportSheet,           │
│  │                 FlashChips (Interfaz Gasty Flash)         │
│  ├── dashboard/   Dashboard, BalanceCard, CategoryDonutChart,│
│  │                 MonthSelector, BalanceDetailPage,          │
│  │                 Inversiones                               │
│  ├── transactions/ Transactions, TransactionItem             │
│  ├── stats/       Stats (Manejo de SVG puros responsivos)     │
│  ├── settings/    Settings, CategoryManager                   │
│  └── ui/          Button, Card, Badge (Primitivas atómicas)  │
├─────────────────────────────────────────────────────────────┤
│                      STATE / CONTEXT                         │
│  context/SettingsContext.tsx    (Temas, divisas, formato)    │
│  context/EditTransactionContext (Puente AppShell ↔ Sheet)    │
│  context/CsvImportContext       (Orquestador de importación) │
│  context/BalanceDetailContext   (Apertura de BalanceDetail)  │
├─────────────────────────────────────────────────────────────┤
│                         HOOKS                                │
│  hooks/useTransactions.ts    (useLiveQuery → Historial real) │
│  hooks/useProjections.ts     (Simulador reactivo en memoria) │
│  hooks/useCategories.ts      (useLiveQuery → Categorías DB)  │
│  hooks/useInvestments.ts     (useLiveQuery → Inversiones DB) │
│  hooks/useHashRouter.ts      (Hash routing sin dependencias) │
│  hooks/useKeyboardHeight.ts  (Cálculo vía visualViewport API)│
│  hooks/useViewport.ts        (MediaQueries de entorno)       │
├─────────────────────────────────────────────────────────────┤
│                        DOMAIN LOGIC                          │
│  lib/parser.ts       Pipeline puro de procesamiento NLP      │
│  lib/flash.ts        getFlashSuggestions() (Lógica pura)     │
│  lib/recurring.ts    createFutureClones(), edit/deleteRecurring │
│  lib/categories.ts   Detección e inyección dinámica de cats  │
│  lib/format.ts       Formateadores es-AR monetarios/fechas   │
│  lib/csv.ts          Estrategias de mapeo y lectura de lotes │
│  lib/db.ts           Instanciación de Dexie, esquemas y seed │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│  Dexie 4 (IndexedDB)                                         │
│  Tablas locales: transactions, categories, settings,         │
│                 investments                                   │
│  Índices clave: type, date, categoryId, originalId           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Flujo de Datos (Data Flow)

### 3.1 Ruta de Lectura (Read Path)

**Flujo Convencional (Pasado/Presente Real):**
Los componentes consumen las transacciones físicas persistidas en la base de datos suscribiéndose a través de consultas reactivas directas que se re-evalúan ante cualquier inserción o mutación.

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

**Flujo del Proyector de Gastos (Viaje en el Tiempo):**
Cuando el usuario avanza a un mes posterior al real en el `MonthSelector`, entra en juego un pipeline paralelo en memoria para evitar escrituras espurias en el disco local:

```
MonthSelector cambia selectedMonth (ej: '2026-09' > mesActual)
│
▼
useProjections(targetMonthStr) invoca consultas concurrentes
├── 1. Trae transacciones físicas planificadas para ese mes futuro.
└── 2. Trae la totalidad de 'sources' recurrentes activos (!originalId).
│
▼
Procesamiento Algorítmico en Memoria
├── Calcula el delta exacto de meses.
├── Evalúa el ciclo de vida de cuotas transitorias (fixed_temporary).
└── Genera clones virtuales agregando un flag identificador único.
│
▼
Emisión Reactiva (Suscripción sin mutación física de IndexedDB)
│
▼
UI renderiza componentes usando tokens de color del Proyector
```

### 3.2 Ruta de Escritura (Write Path)

**Gasty Flash (Express):**
Para garantizar un registro instantáneo con fricción cero, la arquitectura intercepta los eventos del sistema nativo reduciendo los ciclos de renderizado:

```
FAB (+) Tap ──► Apertura de SmartInputSheet con foco imperativo
│
▼
Teclado Nativo Levantado
│
▼
FlashChips calcula contexto temporal de forma síncrona
│
▼
Tap en Chip Contextual ──► Inyección directa en cadena
│
▼
Inserción manual de monto + Tecla Enter/Ir
│
▼
Invocación de parser.ts
│
▼
db.transactions.add()
│
▼
Dexie propaga cambio ──► Cierre automático de Sheet
```

**Flujo General (Edición / Importación CSV):**

```
User Input (SmartInputSheet) / CSV Import
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
SmartInputSheet confirma tx recurrente
       │
       ▼
createFutureClones(source)
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

El almacenamiento se estructura en torno a cuatro almacenes optimizados con índices específicos para evitar penalizaciones de búsqueda durante los escaneos secuenciales. El schema ha evolucionado a través de 6 versiones:

```typescript
// src/lib/db.ts — Versión actual: 6

// v1: Esquema base
db.version(1).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories:   'id, type',
  settings:     'id',
})

// v2: Agrega csvFormat a settings (backfill con defaults)
db.version(2).stores({ }).upgrade(async (tx) => { /* backfill csvFormat */ })

// v3: Agrega keywords a categories (backfill desde DEFAULT_CATEGORIES)
db.version(3).stores({ }).upgrade(async (tx) => { /* backfill keywords */ })

// v4: Deduplica colores de categorías (asegura paleta única)
db.version(4).stores({ }).upgrade(async (tx) => { /* deduplicate colors */ })

// v5: Inserta categorías default faltantes para usuarios existentes
db.version(5).stores({ }).upgrade(async (tx) => { /* add missing default categories */ })

// v6: Agrega la tabla investments (módulo Inversiones) — sin backfill (inicia vacía)
db.version(6).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories:   'id, type',
  settings:     'id',
  investments:  'id',
}).upgrade(async () => { /* no-op: nueva tabla vacía */ })
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

## 5. Sistema de Temas & Overrides Semánticos

### 5.1 Implementación (Dark Mode)

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

### 5.2 Mecanismo de Inyección de Estado Temporal (Proyector)

La aplicación no muta el tema de la aplicación al proyectar el futuro; en su lugar, se superpone una capa semántica condicional basada en variables de CSS de Tailwind v4:

```typescript
// En componentes de presentación (ej: BalanceCard.tsx)
const isFuture = selectedMonth > currentMonth;
const componentStyles = isFuture 
  ? "bg-[--color-proyector-bg] text-[--color-proyector-text] border-[--color-proyector-accent]" 
  : "bg-[--color-card] text-[--color-text] border-[--color-border]";
```

### 5.3 Tabla de Equivalencias de Tokens

| Uso / Elemento UI | Token CSS | Light | Dark | Proyectado (Futuro) |
|---|---|---|---|---|
| Fondo app | `--color-bg` | `var(--color-canvas)` (#ffffff) | `var(--color-canvas-soft)` (#22261f) | Inalterado (mantiene base) |
| Fondo tarjeta | `--color-card` | `var(--color-canvas)` (#ffffff) | `var(--color-canvas)` (#1a1e17) | `--color-proyector-bg` (#0c4a6e) |
| Fondo tarjeta dark | `--color-card-dark` | #0e0f0c | #11140e | — |
| Texto tarjeta dark | `--color-card-dark-text` | `var(--color-primary)` (#9fe870) | `var(--color-primary)` (#9fe870) | — |
| Fondo card proyector | `--color-proyector-card` | #0e3a5c | #0e3a5c | — |
| Texto principal | `--color-text` | `var(--color-ink)` (#0e0f0c) | `var(--color-ink)` (#eef0ea) | `--color-proyector-text` (#e0f2fe) |
| Texto muted | `--color-text-muted` | `var(--color-body)` (#454745) | `var(--color-body)` (#abada7) | — |
| Bordes | `--color-border` | #d6d9d3 | #2d322a | `--color-proyector-accent` (#22d3ee) |
| Gasto | `--color-expense` | `var(--color-negative)` (#d03238) | `var(--color-negative)` (#f87171) | Inalterado |
| Ingreso | `--color-income` | `var(--color-positive)` (#1a7a35) | `var(--color-positive)` (#4ade80) | Inalterado |
| Recurrente | `--color-recurring` | `var(--color-warning)` (#ffd11a) | `var(--color-warning)` (#fbbf24) | Inalterado |
| Resaltado de selección | `--color-accent-cyan` | #38c8ff | #38c8ff | — |
| Fondo primary suave | `--color-primary-pale` | #e2f6d5 | #2a3324 | — |
| Primary brand | `--color-primary` | #9fe870 | #9fe870 | — |

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

- **Touch targets**: `py-3` mínimo (`min-h-[44px]`). Los chips interactivos de Gasty Flash deben cumplir este estándar mínimo dimensional para mitigar falsas pulsaciones accidentales según normativas iOS/Android.
- **Contenedor**: `max-w-[480px]` en `#root` (ya en CSS)
- **Animaciones**: Solo `transform` / `opacity` — **nunca** `width`, `height`, `top`, `left`. La hoja deslizable `<SmartInputSheet />` debe valerse de propiedades aceleradas por hardware GPU (`transform: translateY`).
- **Clases**: Tailwind utilities + CSS variables (`bg-primary`, `text-negative`, `border-border`)
- **Dark mode**: Cada nuevo color **debe** tener override en `[data-theme="dark"]`
- **Mapeo de entrada**: Los formularios de inserción rápida deben capturar obligatoriamente el evento `onKeyDown` para canalizar las pulsaciones de la tecla `Enter`, evitando desviar el foco del usuario a controles externos de confirmación.

### 6.3 Patrones de Composición

- `AppShell` provee `EditTransactionContext` → consumido por `TransactionItem`
- `SmartInputSheet` controlado por `AppShell` (open/close/editTransaction)
- `BottomNav` + `FAB` fijos en `AppShell`, contenido en `<main className="flex-1 pb-20">`

---

## 7. Arquitectura de Parsing

### 7.1 Separación de Responsabilidades

| Archivo | Responsabilidad |
|---------|-----------------|
| `parser.ts` | `parseInput()` — pipeline puro NLP, `parseAmountFromText()`, `toLocalISO()`, `createTransactionFromParsed()`, `normalizeCategory()` |
| `categories.ts` | Data: `DEFAULT_CATEGORIES`, `KEYWORDS[]`, `INCOME_KEYWORDS[]`, `RECURRING_KEYWORDS[]`, `CHART_COLORS[]`, `getPaletteColor()`, `syncKeywordMaps()` |
| `flash.ts` | `getFlashSuggestions()` — sugerencias contextuales por hora/día (pureza total) |
| `csv.ts` | `parseCsvContent()`, `executeImport()` — parsing CSV con auto-creación de categorías |
| `recurring.ts` | Side effects: `createFutureClones()`, `editRecurringSource()`, `getRecurringSources()`, `deleteRecurringSource()` |

### 7.2 Testing Strategy

- `tests/parser.test.ts` — unit tests puros (287 líneas), sin DB
- `tests/recurring.test.ts` — integration con `fake-indexeddb` (631 líneas), motor clonación + edición
- `tests/csv.test.ts` — CSV parsing + importación (613 líneas), format detection, pending categories
- `tests/flash.test.ts` — sugerencias contextuales (138 líneas), todas las franjas horarias
- `tests/integration.test.ts` — DB + parser flujo completo (38 líneas)
- `tests/useProjections.test.ts` — proyecciones con `fake-indexeddb` (136 líneas)

---

## 8. Desacoplamiento Analítico (Separación de Responsabilidades)

| Capa / Módulo | Naturaleza | Responsabilidad Arquitectural |
| --- | --- | --- |
| `parser.ts` | Pureza Total | Evaluación sintáctica y semántica de strings de entrada a través de expresiones regulares nativas. |
| `flash.ts` | Pureza Total | Factoría determinista que infiere intenciones y propone términos de búsqueda contextuales según matrices horarias e hitos de calendario. |
| `useProjections.ts` | Estado Reactivo | Orquestación, fusión y cálculo aritmético de flujos reales y virtuales en memoria reactiva. |
| `recurring.ts` | Efecto con Mutación | Operaciones transaccionales ACID de bloque para la instanciación de clones físicos en periodos corrientes. |

---

## 9. Build & Release Pipeline

### 9.1 Comandos Exactos

```bash
npm run dev            # vite dev server
npm run build          # tsc -b && vite build → dist/
npm run lint           # eslint . (flat config)
npm test               # vitest run
npm run preview        # vite preview (serve dist/)
npm run test:e2e       # playwright test (chromium, 375x812)
npm run test:e2e:ui    # playwright test --ui
npm run test:e2e:debug # playwright test --debug
```

### 9.2 Build Order (Crítico)

1. `tsc -b` → type-checka **ambos** `tsconfig.app.json` + `tsconfig.node.json`
2. `vite build` → bundlea, minifica, genera PWA manifest + SW

### 9.3 PWA Config (`vite.config.ts`)

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

### 9.4 Capacitor / Play Store (futuro)

- `npm run build` → `dist/`
- `npx cap copy` → sincroniza `dist/` a `android/app/src/main/assets/public/`
- `npx cap open android` → Android Studio → signed bundle → Play Console

---

## 10. Presupuesto de Dependencias (Bundle Budget)

Para asegurar la carga instantánea como PWA instalable, el árbol de dependencias en producción queda estrictamente restringido a librerías de infraestructura core:

| Librería / Recurso | Peso Aproximado (gzipped) | Propósito Arquitectural |
| --- | --- | --- |
| `react` + `react-dom` | ~45KB | Motor de ciclo de vida e interfaz (v19) |
| `dexie` | ~18KB | Mecanismo de abstracción indexada sobre IndexedDB |
| `dexie-react-hooks` | ~3KB | Enlace reactivo para flujos asíncronos distribuidos |
| `tailwindcss` (v4) | ~0KB (build-time) | Inyección estática de estilos en tiempo de compilación |
| `@fontsource/inter` | ~189KB raw (3 pesos: 400/600/900) | Tipografía empaquetada localmente para omitir peticiones de red |
| `vite-plugin-pwa` | ~0KB (build-time) | Generación de Service Worker + manifest |
| **Métrica Total (JS)** | **~127KB** | **Cumple con el umbral de <250KB. CSS ~9.4KB (<15KB).** |

### Requieren ADR (evaluar bundle impact)

- Framer Motion, Zustand — permitidos solo con ADR que justifique el impacto en bundle. Evaluar si la funcionalidad se logra con CSS transitions / `useLiveQuery` + Context.

### Prohibidas (sin excepción)

- Recharts/D3 (+50KB+), react-router (+12KB), lodash (+25KB), moment (+20KB), styled-components, MUI/Chakra

---

## 11. Arquitectura de Testing

### 11.1 Stack

- **Vitest** + **jsdom** + **fake-indexeddb**
- `fake-indexeddb/auto` import en tests de integración/recurring
- Pruebas unitarias e integración sin perturbar los registros del navegador durante la ejecución del pipeline de CI.

### 11.2 Patrones

```typescript
// tests/recurring.test.ts (y todos los tests que usan DB)
import 'fake-indexeddb/auto'
import { db, seedDatabase } from '../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedDatabase()
})
```

### 11.3 Cobertura Objetivo

- **Parser** (`tests/parser.test.ts`): 100% — lógica pura, 287 líneas
- **Recurring engine** (`tests/recurring.test.ts`): 100% — motor crítico, 631 líneas
- **CSV** (`tests/csv.test.ts`): 100% — parsing, format detection, pending categories, 613 líneas
- **Flash** (`tests/flash.test.ts`): 100% — todas las franjas horarias, límites de día, 138 líneas
- **Integración DB+Parser** (`tests/integration.test.ts`): smoke tests, 38 líneas
- **Proyector** (`tests/useProjections.test.ts`): 100% — aserciones asíncronas con `fake-indexeddb`, depreciación de cuotas en periodos futuros, 136 líneas
- **UI**: sin tests unitarios (componentes simples, validación visual manual + E2E Playwright)
- **Total**: 6 archivos, ~1843 líneas de tests

---

## 12. Migraciones Futuras (Schema Versioning)

```typescript
// La última versión de schema es 6 (tabla `investments` ya agregada).
// Ejemplo de cómo agregar v7 sin tocar versiones previas:
db.version(7).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories:   'id, type',
  settings:     'id',
  investments:  'id',
  newTable:     'id, foo',
}).upgrade(tx => {
  // tx.table('newTable').modify(record => {
  //   record.foo = defaultValue
  // })
})
```

**Regla**: Nunca editar versiones existentes (`version(N)`). Siempre agregar `version(N+1)` con `.upgrade()` para backfills.

---

## 13. Checklist de Control Pre-Commit

- [ ] `npm run lint` pasa
- [ ] `npm test` pasa (todos los tests en `tests/` finalizan con éxito)
- [ ] `npm run build` pasa (type-check + bundle) sin advertencias de desborde de tamaño de paquete
- [ ] Para cambios UI: `npm run test:e2e` pasa antes de commitear
- [ ] No nuevas deps sin ADR en `docs/adr/`
- [ ] Dark mode counterpart para nuevos colores
- [ ] Se comprueba el contraste cromático de los nuevos tokens semánticos del Proyector de Gastos para entornos claros y oscuros
- [ ] Touch targets ≥ 44px — todos los elementos táctiles interactivos cumplen el estándar
- [ ] Fechas usan `toLocalISO()` no `toISOString()`
- [ ] No edición de clones recurrentes (solo source)
- [ ] Las consultas embebidas en el hook `useProjections` se procesan enteramente de forma reactiva en memoria fuera de disco
- [ ] Bundle size <250KB JS / < 15KB CSS (ver `gasty-bundle-budget` skill)

---

## 14. E2E Testing (Playwright)

### 14.1 Stack

- **Playwright** con Chromium, viewport 375x812 (iPhone-like)
- Locale: `es-AR`, Timezone: `America/Argentina/Buenos_Aires`
- Ejecución secuencial (`workers: 1`, `fullyParallel: false`)
- Timeout: 30s por test, 10s por `expect`

### 14.2 Configuración (`playwright.config.ts`)

```typescript
webServer: {
  command: 'npm run dev -- --host 127.0.0.1 --strictPort',
  url: 'http://127.0.0.1:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
}
```

### 14.3 Spec Files (12)

| Archivo | Cobertura |
|---------|-----------|
| `add-transaction.spec.ts` | Flujo completo de agregar transacción |
| `edit-delete.spec.ts` | Edición y eliminación de transacciones |
| `csv-dates.spec.ts` | Manejo de fechas en importación CSV |
| `csv-import.spec.ts` | Flujo de importación CSV |
| `parser-e2e.spec.ts` | Parser integrado con UI |
| `stats-charts.spec.ts` | Verificación de gráficos Stats |
| `settings.spec.ts` | Pantalla de ajustes |
| `category-manager.spec.ts` | CRUD de categorías |
| `recurring-management.spec.ts` | Gestión de transacciones recurrentes |
| `navigation-filters.spec.ts` | Navegación entre tabs y filtros |
| `dashboard-details.spec.ts` | Detalles del dashboard |
| `consistency.spec.ts` | Verificación de consistencia de datos |

### 14.4 Helpers y Fixtures

- `e2e/helpers.ts` — funciones compartidas (wait for DB, seed, etc.)
- `e2e/fixtures/test.csv` — archivo CSV de prueba

### 14.5 Ejecución

```bash
npm run test:e2e       # Ejecuta todos los specs
npm run test:e2e:ui    # Abre UI interactiva de Playwright
npm run test:e2e:debug # Modo debug con步进
```
