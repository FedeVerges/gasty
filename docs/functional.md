# Documentación Funcional — Gasty

## 1. Visión General

**Gasty** es una PWA mobile-first con soporte desktop responsive para seguimiento personal de gastos (locale es-AR), lista para Capacitor → Play Store. Entrada inteligente en lenguaje natural ("alquiler 45000", "cuota auto 25000 4/24"), auto-clonado de transacciones recurrentes, Gasty Flash (sugerencias contextuales de pago rápido), proyección de gastos a meses futuros, importación CSV con auto-creación de categorías, personalización de emojis por categoría, módulo de Inversiones (proyección de ahorros), detalle del balance y edición inline de movimientos, dark mode, sin backend.

---

## 2. Flujo Principal de Usuario

### 2.1 Agregar Transacción (Smart Input)
1. Usuario toca **FAB (+)** → se abre `SmartInputSheet` (bottom sheet)
2. **Gasty Flash**: si el input está vacío y no es edición, aparecen `FlashChips` — chips horizontales con sugerencias contextuales (ej: "café 1500" a la mañana, "super 8000" fin de mes). Tap en chip → inyecta texto en el input
3. Escribe en lenguaje natural: `"birra 1500"`, `"sueldo 150000"`, `"cuota auto 25000 4/24"`
4. Parser (`parseInput`) extrae:
   - **Tipo**: gasto/ingreso (keywords)
   - **Monto**: regex `$`, miles, decimales
   - **Fecha**: hoy/ayer/mañana, `DD-MM`, `DD/MM/YYYY`, `DD mes`, `mes`
   - **Categoría**: 234 keywords → 23 categorías
   - **Recurrencia**: `X/Y` (cuotas) o keywords (`alquiler`, `expensas`, `cuota`, `suscripción`...)
5. Preview en tiempo real: emoji, color, categoría, monto formateado, fecha
6. **Selector de categoría inline**: pills horizontales con emoji filtrados por tipo de transacción
7. Selector recurrencia: **No** / **🔄 Todos los meses** / **⏱️ Por un tiempo** (con input meses 1-240)
8. **Confirmar** → `createTransactionFromParsed` → `db.transactions.add()`

> **Safari / iOS**: `SmartInputSheet` usa `useKeyboardHeight` (visualViewport API) para evitar que el teclado virtual tape el input. El sheet también fija `body position` para evitar scroll detrás del modal.

### 2.2 Editar Transacción
- Tap en cualquier `TransactionItem` → `EditTransactionContext` → `SmartInputSheet` en modo edición (`editTransaction` prop)
- Mantiene `id` y `createdAt` original
- Edición inline de los campos: monto, fecha, categoría, descripción y recurrencia; el emoji se hereda de la categoría (no es editable por transacción)
- Si la transacción es un **source recurrente**, la edición propaga vía `editRecurringSource()` (crea/elimina clones sobrantes) — nunca se edita un clon (`originalId` definido)

### 2.3 Eliminar Transacción
- Botón 🗑️ en `TransactionItem` → confirm → `db.transactions.delete(id)`

---

## 3. Pantallas (Tabs)

| Tab | Ruta | Componentes Clave | Funcionalidad |
|-----|------|-------------------|---------------|
| **🏠 Inicio** | `Dashboard` | Tabs internas `Resumen`/`Inversiones`, `BalanceCard`, `MonthSelector`, `CategoryDonutChart`, `BalanceDetailSheet`, lista tx mes actual | Resumen financiero + proyección a futuro + detalle de balance (tap en BalanceCard) + módulo Inversiones + botón scroll-to-top |
| **📋 Movimientos** | `Transactions` | `MonthSelector` sticky, barra de búsqueda, balance mes clicable (`BalanceDetailSheet`), top categoría clicable → Stats, filtros fecha (`este_mes`/`mes_pasado`/`trimestre`/`este_anio`), group headers por día, top categorías con barra horizontal, lista completa | Historial con búsqueda + filtros rápidos + agrupación por fecha + navegación a detalle |
| **📊 Stats** | `Stats` | `MonthSelector`, barras SVG 6 meses, Donut SVG categorías mes actual con toggle `%/monto`, sección Ahorros del mes, Top categoría, filtro por categoría desde Movimientos | Visualización sin deps externas, navegable por mes |
| **⚙️ Ajustes** | `Settings` | Theme slider (claro/oscuro), Currency (ARS/USD), Formato CSV, CategoryManager (CRUD categorías + keywords + emoji), Lista recurrentes con búsqueda + edición + delete cascada, Botón Importar CSV | Configuración + gestión categorías, recurrencias e importación |

---

## 4. Motor de Recurrencia (Auto-clonado Mensual)

### 4.1 Tipos Soportados
| Tipo | Config | Caso de Uso |
|------|--------|-------------|
| `fixed` | `{kind: 'fixed'}` | Alquiler, expensas, servicios, suscripciones — indefinido |
| `fixed_temporary` | `{kind: 'fixed_temporary', currentMonth, totalMonths, invoiceDay}` | Cuotas: auto, préstamos, planes — N meses |
| `none` | `{kind: 'none'}` | Transacciones únicas |

### 4.2 Algoritmo (`createFutureClones` en `SmartInputSheet`)
1. Ejecutado al confirmar una transacción recurrente en `SmartInputSheet.tsx`
2. `createFutureClones(source, existingClones?)` genera clones desde la fecha de la fuente:
   - Fuente `fixed`: crea clones para los próximos 12 meses (horizonte fijo)
   - Fuente `fixed_temporary`: crea clones solo para los meses restantes según `totalMonths` y `currentMonth`
3. Clones existentes (mismo `originalId` + mes) son detectados y skipeados (idempotencia)
4. Los clones toman el `invoiceDay` de la fuente; si no está seteado, usa día 1
5. `editRecurringSource()` maneja edición de fuentes existentes (actualiza + crea/elimina clones sobrantes)
6. `deleteRecurringSource()` convierte la fuente a `kind: 'none'` y elimina solo clones futuros (preserva históricos)

### 4.3 Eliminación Inteligente
`deleteRecurringSource(id)` → convierte la fuente a `kind: 'none'` + elimina **solo clones futuros** (`date >= hoy`). Los clones históricos se preservan para mantener el registro financiero. Para `editRecurringSource()`: actualiza datos de la fuente, crea clones faltantes y elimina excedentes si se redujo `totalMonths`, todo en una transacción Dexie.

---

## 5. Parser de Lenguaje Natural (`src/lib/parser.ts`)

### 5.1 Pipeline
```
input string
    │
    ▼
detectRecurring()  ──► { recurring, remaining }
    │
    ▼
parseDate()        ──► { date, remaining }
    │
    ▼
parseAmount()      ──► { amount, remaining }
    │
    ▼
detectType()       ──► 'income' | 'expense'
    │
    ▼
detectCategory()   ──► categoryId
    │
    ▼
cleanDescription() ──► description
    │
    ▼
ParsedTransaction
```

### 5.2 Keywords Principales

**Ingresos**: `sueldo`, `salario`, `sueldo básico`, `sueldo neto`, `aguinaldo`, `bonificación`, `bono`, `honorarios`, `venta`, `cobro`, `cobré`, `freelance`, `facturé`, `recibí`, `ingreso`, `pago recibido`, `devolución`, `devolucion`, `transferencia recibida`, `comisión`, `comision`, `propina`, `dividendo`, `interés cobrado`, `ganancia`, `alquiler cobrado`, `alquiler recibido`

**Recurrentes**: `alquiler`, `expensas`, `cuota`, `crédito`, `credito`, `servicio`, `suscripcion`, `suscripción`, `patente`, `seguro`, `impuesto`, `sueldo`, `salario`

**Categorías (234 keywords → 23 cats)**:
| Cat ID | Nombre | Emoji | Keywords Ejemplo |
|--------|--------|-------|------------------|
| `food` | Comida | 🍔 | lomito, hamburguesa, pancho, sushi, pollo, carne, pescado, ensalada, verdulería, carnicería |
| `home` | Vivienda | 🏠 | alquiler, expensas, hipoteca, crédito hipotecario |
| `services` | Servicios | 💡 | luz, gas, internet, agua, cable, celular, teléfono |
| `transport` | Transporte | 🚗 | nafta, taxi, uber, sube, peaje, colectivo, subte, estacionamiento, cuota auto, patente |
| `leisure` | Salidas | 🎉 | birra, pizza, restaurant, café, bar, delivery, pedidosya, netflix, spotify |
| `repair` | Reparaciones | 🛠️ | arreglo, reparación, instalación, termotanque, plomero, electricista, mecánico |
| `health` | Salud | 💊 | farmacia, remedio, médico, consulta, dentista, obra social, prepaga, psicólogo |
| `education` | Educación | 📚 | curso, libro, universidad, colegio, matrícula |
| `supermarket` | Supermercado | 🛒 | super, carrefour, disco, día, coto, jumbo, chino, almacén |
| `food_exp` | Alimentación | 🍽️ | alimentación, carne, parrilla, verdulería |
| `deportes` | Deporte | ⚽ | deporte, gimnasio, tenis, club, fútbol, running |
| `subscriptions` | Suscripciones | 📱 | suscripción, youtube, netflix, spotify, streaming, disney |
| `entertainment` | Entretenimiento | 🎭 | entretenimiento, recital, cine, teatro, boliche, salida, regalo |
| `savings` | Ahorros | 🐖 | ahorro, ahorros, reserva |
| `debts` | Finanzas y Deudas | 💳 | tarjeta, deuda, galicia, naranja, visa, mastercard |
| `household` | Hogar | 🏡 | hogar, mueble, electrodoméstico, heladera, lavarropa |
| `trips` | Viajes | ✈️ | viaje, vacaciones, pasaje, hotel, vuelo |
| `insurance` | Seguros | 🛡️ | seguro auto, seguro viaje, seguro médico |
| `car_maint` | Mantenimiento | 🔧 | mantenimiento, service, aceite, neumático |
| `clothing` | Vestimenta | 👕 | ropa, zapatillas, indumentaria |
| `other_exp` | Otros | 📦 | otros (fallback gasto) |
| `salary` | Sueldo | 💼 | sueldo, salario, aguinaldo, bonificación, bono |
| `other_inc` | Otros ingresos | 💰 | honorarios, venta, freelance, devolución, comisión, propina, ganancia, alquiler cobrado |

### 5.3 Formatos de Fecha Soportados
| Input | Ejemplo | Resultado |
|-------|---------|-----------|
| Hoy | (por defecto) | `YYYY-MM-DD` |
| Ayer | `ayer` | `YYYY-MM-DD` |
| Mañana | `mañana` | `YYYY-MM-DD` |
| Día-Mes | `20-5` | `2026-05-20` (o 2027 si mes ya pasó) |
| Día/Mes | `20/7` | `2026-07-20` |
| Día Mes | `15 junio` | `2026-06-15` |
| Mes | `junio` | `2026-06-01` |
| DD/MM/YYYY | `20/05/2024` | `2024-05-20` |

---

## 6. Categorías

### 6.1 Modelo
```typescript
interface Category {
  id: string
  name: string
  emoji: string
  color: string  // hex (ej: #f59e0b)
  type: 'expense' | 'income' | 'both'
  keywords: string[]  // palabras clave para detección automática
}
```

### 6.2 Defaults (23 categorías)
- **Gastos (21)**: food, home, services, transport, leisure, repair, health, education, supermarket, food_exp, deportes, subscriptions, entertainment, savings, debts, household, trips, insurance, car_maint, clothing, other_exp
- **Ingresos (2)**: salary, other_inc

### 6.3 Persistencia
- Seed automático en `db.ts:seedDatabase()` si tabla vacía
- `useCategories()` / `useCategory(id)` → `useLiveQuery` reactivo
- Keywords persistidas en DB y sincronizadas vía `syncKeywordMaps()`

### 6.4 Category Manager (Settings)
- **`CategoryManager`** en pantalla Ajustes — CRUD completo de categorías:
  - Crear categoría (nombre, emoji, tipo, color aleatorio)
  - Agregar/quitar keywords por categoría
  - Eliminar categorías (no modifica tx existentes)
  - Las categorías default (`food`, `home`, etc.) no se pueden eliminar
- `syncKeywordMaps()` reconstruye los mapas de keywords desde DB tras cada cambio
- El parser consume keywords desde los mapas dinámicos, no desde constantes estáticas

---

## 7. Formato & Localización (es-AR)

| Función | Librería | Config |
|---------|----------|--------|
| Moneda ARS | `Intl.NumberFormat` | `es-AR`, currency: ARS, min/maxFractionDigits: 0/2 |
| Moneda USD | `Intl.NumberFormat` | `es-AR`, currency: USD, min/maxFractionDigits: 2 |
| Fechas relativas | Custom | `Hoy`, `Ayer`, `Hace N días`, `En N días`, `DD MMM` |
| Meses | Array const | `['ene','feb',...]` / `['enero','febrero',...]` |

---

## 8. Importación CSV (`src/lib/csv.ts`)

### 8.1 Flujo de Importación
1. Usuario toca botón de importar (vía `CsvImportContext` desde cualquier pantalla)
2. Se abre `CsvImportSheet` (bottom sheet modal) con 3 pasos:
   - **Seleccionar**: selector de archivo `.csv`
   - **Vista previa**: tabla con filas parseadas, errores resaltados
   - **Resultado**: resumen de importadas/errores
3. Motor de parsing (`parseCsvContent`):
   - Detecta headers automáticamente (`descripción`, `monto`, `fecha`, `categoría` y variantes)
   - Reutiliza `parseInput()` → mismo motor de categorización
   - Asigna categoría vía columna explícita o por detección desde descripción
   - `executeImport()` → `db.transactions.add()` por fila

### 8.2 Detección de Columnas
| Columna | Headers Reconocidos |
|---------|---------------------|
| Descripción | `desc`, `description`, `descripción`, `concepto`, `detalle` |
| Monto | `monto`, `amount`, `importe`, `valor` |
| Fecha | `fecha`, `date`, `día`, `dia` |
| Categoría | `categoría`, `categoria`, `cat`, `category` |

### 8.3 Parámetros de Formato Configurables (`CsvFormatSettings`)
- **Separador de miles** (`thousandsSeparator`): `,` / `.` / `auto`
- **Separador decimal** (`decimalSeparator`): `,` / `.` / `auto`
- **Strip prefijo moneda** (`stripCurrencyPrefix`): elimina `$`, `ARS`, `USD`, `US$` automáticamente
- Configuración persistida en `db.settings` y accesible desde Ajustes

### 8.4 Mapeo de Categorías
- Aliases para apps financieras/bancos: `hogar` → home, `finanzas` → other_exp, `deporte` → leisure, etc.
- Fallback a detección por descripción vía `parseInput()` si no hay columna categoría

### 8.5 Output
```typescript
interface CsvImportResult {
  imported: number    // filas importadas exitosamente
  errors: number      // filas con error
  errorLines: number[]  // números de línea con error
}
```

---

## 9. Acciones de Usuario por Pantalla

### Dashboard (Inicio)
- Tabs internas: **Resumen** (balance + lista) e **Inversiones** (módulo de ahorros)
- Ver balance histórico (ingresos - gastos totales) en `BalanceCard` dark
- Ver diff % vs mes anterior con indicador verde/rojo
- **BalanceCard** es clicable → abre `BalanceDetailSheet` (disponible, ingresos, gastado y composición del gasto por categoría, top 5)
- **MonthSelector**: navegar meses prev/next, badge "Proy." para meses futuros
- **Modo proyección**: banner indicando que los datos son estimaciones en meses futuros
- Filtrar lista por categoría (chips horizontales)
- Tap tx → editar | Botón 🗑️ → eliminar
- Botón flotante **scroll-to-top** (aparece al hacer scroll)
- Layout responsive: se adapta a desktop

### Movimientos
- **MonthSelector** sticky en la parte superior (se mantiene visible al hacer scroll)
- **Balance del mes** clicable → `BalanceDetailSheet` (respeta el mes seleccionado)
- **Barra de búsqueda**: buscar por texto, categoría o monto (las tarjetas de resumen se ocultan al buscar — B1)
- **Top categoría del mes** clicable → navega a Stats filtrando esa categoría
- **Tarjetas de resumen**: Top del mes + Mayor crecimiento (ocultas durante la búsqueda)
- Filtros rápidos de fecha: **Este mes** / **Mes pasado** / **Trimestre** / **Este año**
- Group headers por día: `Hoy`, `Ayer`, `Hace N días`, `DD de mes`
- Lista completa con edit/delete
- Layout responsive

### Stats
- **MonthSelector**: navegar meses para ver stats de cualquier período
- **Modo proyección**: banner para meses futuros
- Barras SVG: últimos 6 meses (gastos) — dimensiones responsivas
- Donut SVG: categorías mes actual — responsivo, con toggle **%/monto**
- **Sección Ahorros del mes**: suma de movimientos en la categoría `savings`
- **Filtro por categoría**: al entrar desde Movimientos, muestra el total de la categoría seleccionada
- Top categoría del mes

### Ajustes
- Theme: slider claro/oscuro (persiste en `db.settings` + `data-theme` en `<html>`)
- Currency: ARS / USD
- **Formato CSV**: configuración de separadores de miles, decimales y prefijo moneda
- **CategoryManager**: CRUD completo de categorías + keywords + emoji (sub-vista con navegación)
- **Movimientos recurrentes**: lista con búsqueda, botón Editar (abre `SmartInputSheet` vía `EditTransactionContext`) y Eliminar con delete cascada
- Botón **Importar CSV** (abre `CsvImportSheet` via `CsvImportContext`)
- Version info (v0.1.0)

---

## 10. Reglas de Negocio Críticas

1. **Nunca editar clones recurrentes** — solo editar el source (`originalId` undefined). Los clones tienen `originalId` y son derivados.
2. **Fechas siempre local** — `toLocalISO(d)` (YYYY-MM-DD en timezone local), **nunca** `toISOString()` (UTC shift en AR = -3h → día anterior).
3. **Moneda en enteros** — ARS sin decimales, USD 2 decimales. `formatMoney` maneja presentación.
4. **Touch targets ≥ 44px** — `py-3` mínimo en botones/inputs.
5. **Container max-w-[480px] (mobile)** — mobile-first, centrado en `#root`. En desktop (≥768px) `#root` pasa a `flex-row` sin límite de ancho y el contenido usa `max-w-[960px]`.
6. **Bundle budgets** — JS <200KB gz, CSS < 10KB gz. Sin deps pesadas.

---

## 11. Gasty Flash (Sugerencias Contextuales)

### 11.1 Concepto
Gasty Flash es un motor de sugerencias de pago rápido que aparece cuando el usuario abre el `SmartInputSheet` con el input vacío (y no es modo edición). Propone transacciones frecuentes basándose en la hora del día, el día del mes y el día de la semana.

### 11.2 Motor de Sugerencias (`src/lib/flash.ts`)
- Función pura `getFlashSuggestions(now?)` — determinística (acepta parámetro `now` para testing)
- **Franjas horarias** (7 buckets):
  | Horario | Sugerencias típicas |
  |---------|---------------------|
  | 6-9 AM | café, Bondi |
  | 9-12 PM | café, lunch |
  | 12-2 PM | almuerzo, Mc |
  | 2-5 PM | snacks, café |
  | 5-8 PM | birra, Cena |
  | 8-11 PM | Cena, delivery |
  | 11 PM-6 AM | Taxi, Uber |
- **Día de mes**: días 1-10 (alquiler, expensas, internet, luz), 11-20 (celular, gas), 21+ (super, nafta)
- **Fines de semana**: "Salida" y almuerzo de domingo
- **Siempre incluye**: "sueldo 150000"

### 11.3 UI — FlashChips (`src/components/add/FlashChips.tsx`)
- Chips horizontales scrollables con emoji + label
- Deduplicados por texto, limitados a `maxChips` (default 6)
- Tap en chip → inyecta texto completo en el input del parser
- Touch target ≥ 44px

### 11.4 Tests
- `tests/flash.test.ts` (138 líneas): cobertura de todas las franjas horarias, límites de día de mes, deduplicación, ingreso siempre incluido

---

## 12. Proyección de Gastos (Future Months)

### 12.1 Concepto
Cuando el usuario navega a un mes futuro con `MonthSelector`, la app entra en "modo proyección". No se escriben transacciones a la DB; en su lugar, se generan **clones virtuales en memoria** que simulan qué transacciones recurrentes ocurrirían en ese mes.

### 12.2 Hook `useProjections` (`src/hooks/useProjections.ts`)
- `useProjections(month: string)` → `{ transactions, isProjection, virtualCount }`
- **Mes actual/pasado**: filtra transacciones reales de DB por prefijo de mes
- **Mes futuro**: genera clones virtuales:
  - ID virtual: `virtual-{sourceId}-{year}-{month}` (nunca persistido)
  - Para `fixed`: crea clon indefinido
  - Para `fixed_temporary`: valida `currentMonth ≤ totalMonths` antes de crear
  - Fusiona transacciones reales planificadas + clones virtuales
  - Deduplica por `originalId`

### 12.3 UI
- **MonthSelector**: badge "Proy." en cyan para meses futuros, label "pasado" para meses anteriores
- **Dashboard**: banner "Modo proyección" cuando `isProjection` es true
- **Stats**: mismo banner + MonthSelector para navegar meses
- Navegación hacia adelante limitada a ~1 año en el futuro
- Los datos de BalanceCard, transacciones y charts se renderizan con tokens del Proyector (`--color-proyector-*`)

### 12.4 Tests
- `tests/useProjections.test.ts` (136 líneas): mes actual con datos reales, mes futuro sin datos físicos, expiración de `fixed_temporary`, verificación de fuentes `fixed`, eliminación en cascada

---

## 13. Inversiones (Módulo de Ahorros)

### 13.1 Concepto
El módulo **Inversiones** (tab interno "Inversiones" en Inicio) permite distribuir el total ahorrado de la app entre distintos destinos y proyectar su crecimiento mensual. El "total ahorrado disponible" es la suma de **todos** los movimientos de tipo gasto en la categoría `savings` (`useSavingsTotal()`), sin importar el mes.

### 13.2 Modelo (`Investment`)
```typescript
interface Investment {
  id: string
  name: string
  emoji: string
  allocationPct: number       // % del total ahorrado asignado a este destino
  monthlyReturnPct: number    // retorno mensual estimado (%)
}
```
Persistido en la nueva tabla Dexie `investments` (schema v6, `src/lib/db.ts`).

### 13.3 UI (`src/components/dashboard/Inversiones.tsx`)
- Card dark con **total ahorrado disponible** y una breve explicación (suma de la categoría Ahorros).
- **Proyección a 12 meses**: area chart SVG que compone, para cada mes, `asignado * (1 + retorno/100)^m`, donde `asignado = totalAhorrado * allocationPct / 100`. Muestra valor final y ganancia.
- Lista de destinos con asignado/proyectado y botón Eliminar (confirm).
- Aviso si la suma de `allocationPct` supera 100%.
- Formulario para agregar destino (emoji, nombre, % asignación, % retorno mensual).

### 13.4 Hook (`src/hooks/useInvestments.ts`)
- `useInvestments()` → `db.investments.toArray()` reactivo
- `useSavingsTotal()` → suma de gastos en categoría `savings` (todo el histórico)
