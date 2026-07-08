# Documentación Funcional — Gasty

## 1. Visión General

**Gasty** es una PWA mobile-first con soporte desktop responsive para seguimiento personal de gastos (locale es-AR), lista para Capacitor → Play Store. Entrada inteligente en lenguaje natural ("alquiler 45000", "cuota auto 25000 4/24"), auto-clonado de transacciones recurrentes, importación CSV con configuración de formato, dark mode, sin backend.

---

## 2. Flujo Principal de Usuario

### 2.1 Agregar Transacción (Smart Input)
1. Usuario toca **FAB (+)** → se abre `SmartInputSheet` (bottom sheet)
2. Escribe en lenguaje natural: `"birra 1500"`, `"sueldo 150000"`, `"cuota auto 25000 4/24"`
3. Parser (`parseInput`) extrae:
   - **Tipo**: gasto/ingreso (keywords)
   - **Monto**: regex `$`, miles, decimales
   - **Fecha**: hoy/ayer/mañana, `DD-MM`, `DD/MM/YYYY`, `DD mes`, `mes`
   - **Categoría**: ~120 keywords → 13 categorías
   - **Recurrencia**: `X/Y` (cuotas) o keywords (`alquiler`, `expensas`, `cuota`, `suscripción`...)
4. Preview en tiempo real: emoji, color, categoría, monto formateado, fecha
5. Selector recurrencia: **No** / **🔄 Todos los meses** / **⏱️ Por un tiempo** (con input meses 1-240)
6. **Confirmar** → `createTransactionFromParsed` → `db.transactions.add()`

> **Safari / iOS**: `SmartInputSheet` usa `useKeyboardHeight` (visualViewport API) para evitar que el teclado virtual tape el input. El sheet también fija `body position` para evitar scroll detrás del modal.

### 2.2 Editar Transacción
- Tap en cualquier `TransactionItem` → `EditTransactionContext` → `SmartInputSheet` en modo edición (`editTransaction` prop)
- Mantiene `id` y `createdAt` original

### 2.3 Eliminar Transacción
- Botón 🗑️ en `TransactionItem` → confirm → `db.transactions.delete(id)`

---

## 3. Pantallas (Tabs)

| Tab | Ruta | Componentes Clave | Funcionalidad |
|-----|------|-------------------|---------------|
| **🏠 Inicio** | `Dashboard` | `BalanceCard`, `MonthSummary`, filtros categoría, lista tx mes actual | Resumen financiero + lista filtrada (responsive) |
| **📋 Movimientos** | `Transactions` | Selector mes, filtros fecha (`this_month`/`last_7d`/`last_month`/`this_year`), group headers por día, filtro categoría, balance mes, lista completa | Historial con filtros rápidos + agrupación por fecha |
| **📊 Stats** | `Stats` | Barras SVG 6 meses, Donut SVG categorías mes actual, Top categoría (responsive) | Visualización sin deps externas |
| **⚙️ Ajustes** | `Settings` | Theme toggle, Currency (ARS/USD), Configuración formato CSV, CategoryManager (CRUD categorías + keywords), Lista recurrentes con delete cascada | Configuración + gestión categorías y recurrencias |

---

## 4. Motor de Recurrencia (Auto-clonado Mensual)

### 4.1 Tipos Soportados
| Tipo | Config | Caso de Uso |
|------|--------|-------------|
| `fixed` | `{kind: 'fixed'}` | Alquiler, expensas, servicios, suscripciones — indefinido |
| `fixed_temporary` | `{kind: 'fixed_temporary', currentMonth, totalMonths, invoiceDay}` | Cuotas: auto, préstamos, planes — N meses |
| `none` | `{kind: 'none'}` | Transacciones únicas |

### 4.2 Algoritmo (`checkAndCloneRecurring`)
1. Ejecutado en `useRecurringCheck` (mount de `App`)
2. Lee **todas** tx → filtra `sources`: `recurring.kind !== 'none' && !originalId`
3. Agrupa clones existentes por `originalId` + mes (`date.slice(0,7)`)
4. Para cada source sin clon del mes actual:
   - Si `fixed_temporary` y `currentMonth > totalMonths` → **skip**
   - Crea clon: `date = primer día mes actual + invoiceDay`
   - `recurring.currentMonth = source.currentMonth + 1`
   - `originalId = source.id`
5. Retorna cantidad clonados

### 4.3 Eliminación en Cascada
`deleteRecurringSource(id)` → borra source + **todos** clones (`originalId === id`) en una transacción Dexie.

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

**Categorías (160+ keywords → 12 cats)**:
| Cat ID | Nombre | Emoji | Keywords Ejemplo |
|--------|--------|-------|------------------|
| `food` | Comida | 🍔 | lomito, hamburguesa, pancho, choripan, helado, sushi, pollo, carne, pescado, ensalada, fruta, verdura, kiosco, almuerzo, cena, desayuno, merienda, verdulería, carnicería, panadería |
| `home` | Vivienda | 🏠 | alquiler, expensas, hipoteca, crédito hipotecario |
| `services` | Servicios | 💡 | luz, gas, internet, agua, cable, celular, teléfono |
| `transport` | Transporte | 🚗 | nafta, taxi, uber, sube, peaje, colectivo, subte, estacionamiento, cuota auto, patente, seguro auto |
| `leisure` | Salidas | 🎉 | birra, cerveza, pizza, empanada, restaurant, café, bar, recital, cine, teatro, boliche, viaje, salida, fiesta, delivery, pedidosya, rappi, uber eats, netflix, spotify, disney, hbomax, prime |
| `repair` | Reparaciones | 🛠️ | arreglo, reparación, instalación, termotanque, plomero, electricista, mecánico |
| `health` | Salud | 💊 | farmacia, remedio, medicamento, médico, consulta, análisis, dentista, óptica, obra social, prepaga, mutual, seguro medico, oftalmólogo, psicólogo, kinesiólogo |
| `education` | Educación | 📚 | curso, libro, universidad, colegio, matrícula |
| `supermarket` | Supermercado | 🛒 | super, supermercado, carrefour, disco, día, coto, jumbo, chino, almacén |
| `other_exp` | Otros | 📦 | ropa, zapatillas, indumentaria (fallback gasto) |
| `salary` | Sueldo | 💼 | sueldo, salario, sueldo básico, aguinaldo, bonificación, bono |
| `other_inc` | Otros ingresos | 💰 | honorarios, venta, freelance, devolución, comisión, propina, dividendo, ganancia, alquiler cobrado |

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

### 6.2 Defaults (12 categorías)
- **Gastos (9)**: food, home, services, transport, leisure, repair, health, education, supermarket, other_exp
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
- Ver balance histórico (ingresos - gastos totales)
- Ver diff % vs mes anterior
- Ver gastado/ingresado/restante mes actual + barra progreso
- Filtrar lista por categoría (chips horizontales)
- Tap tx → editar | Botón 🗑️ → eliminar
- Layout responsive: se adapta a desktop

### Movimientos
- Filtros rápidos de fecha: **Este mes** / **Últimos 7d** / **Mes pasado** / **Este año** / selector mes específico
- Group headers por día: `Hoy`, `Ayer`, `Hace N días`, `DD de mes`
- Filtro categoría (chips)
- Balance del mes (ingresos - gastos)
- Lista completa con edit/delete
- Layout responsive

### Stats
- Barras SVG: últimos 6 meses (gastos) — dimensiones responsivas
- Donut SVG: categorías mes actual — responsivo
- Top categoría del mes

### Ajustes
- Theme: Light / Dark (persiste en `db.settings` + `data-theme` en `<html>`)
- Currency: ARS / USD
- **Formato CSV**: configuración de separadores de miles, decimales y prefijo moneda
- **CategoryManager**: CRUD completo de categorías + keywords
- Lista recurrentes activos con delete cascada
- Botón **Importar CSV** (abre `CsvImportSheet`)
- Version info

---

## 10. Reglas de Negocio Críticas

1. **Nunca editar clones recurrentes** — solo editar el source (`originalId` undefined). Los clones tienen `originalId` y son derivados.
2. **Fechas siempre local** — `toLocalISO(d)` (YYYY-MM-DD en timezone local), **nunca** `toISOString()` (UTC shift en AR = -3h → día anterior).
3. **Moneda en enteros** — ARS sin decimales, USD 2 decimales. `formatMoney` maneja presentación.
4. **Touch targets ≥ 44px** — `py-3` mínimo en botones/inputs.
5. **Container max-w-[480px] (mobile)** — mobile-first, centrado en `#root`. En desktop (≥768px) `#root` pasa a `flex-row` sin límite de ancho y el contenido usa `max-w-[960px]`.
6. **Bundle budgets** — JS < 100KB gz, CSS < 10KB gz. Sin deps pesadas.
