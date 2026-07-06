# Documentación Funcional — Gasty

## 1. Visión General

**Gasty** es una PWA mobile-first para seguimiento personal de gastos (locale es-AR), lista para Capacitor → Play Store. Entrada inteligente en lenguaje natural ("alquiler 45000", "cuota auto 25000 4/24"), auto-clonado de transacciones recurrentes, dark mode, sin backend.

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

### 2.2 Editar Transacción
- Tap en cualquier `TransactionItem` → `EditTransactionContext` → `SmartInputSheet` en modo edición (`editTransaction` prop)
- Mantiene `id` y `createdAt` original

### 2.3 Eliminar Transacción
- Botón 🗑️ en `TransactionItem` → confirm → `db.transactions.delete(id)`

---

## 3. Pantallas (Tabs)

| Tab | Ruta | Componentes Clave | Funcionalidad |
|-----|------|-------------------|---------------|
| **🏠 Inicio** | `Dashboard` | `BalanceCard`, `MonthSummary`, filtros categoría, lista tx mes actual | Resumen financiero + lista filtrada |
| **📋 Movimientos** | `Transactions` | Selector mes (12 últimos), filtro categoría, balance mes, lista completa | Historial paginado por mes |
| **📊 Stats** | `Stats` | Barras SVG 6 meses, Donut SVG categorías mes actual, Top categoría | Visualización sin deps externas |
| **⚙️ Ajustes** | `Settings` | Theme toggle, Currency (ARS/USD), Lista recurrentes con delete cascada | Configuración + gestión recurrencias |

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

**Ingresos**: `sueldo`, `salario`, `honorarios`, `venta`, `cobro`, `cobré`, `freelance`, `facturé`, `recibí`, `ingreso`, `pago recibido`, `devolución`, `transferencia recibida`

**Recurrentes**: `alquiler`, `expensas`, `cuota`, `crédito`, `credito`, `servicio`, `suscripcion`, `suscripción`, `patente`, `seguro`, `impuesto`

**Categorías (120+ keywords → 13 cats)**:
| Cat ID | Nombre | Emoji | Keywords Ejemplo |
|--------|--------|-------|------------------|
| `food` | Comida | 🍔 | almuerzo, cena, hamburguesa, sushi, verdulería |
| `home` | Vivienda | 🏠 | alquiler, expensas, hipoteca, crédito hipotecario |
| `services` | Servicios | 💡 | luz, gas, internet, agua, cable, celular |
| `transport` | Transporte | 🚗 | nafta, taxi, uber, sube, peaje, cuota auto, patente |
| `leisure` | Salidas | 🎉 | birra, pizza, restaurant, café, cine, viaje, fiesta |
| `repair` | Reparaciones | 🛠️ | arreglo, reparación, plomero, electricista, mecánico |
| `health` | Salud | 💊 | farmacia, médico, dentista, óptica, análisis |
| `education` | Educación | 📚 | curso, libro, universidad, matrícula |
| `supermarket` | Supermercado | 🛒 | super, carrefour, disco, coto, jumbo |
| `other_exp` | Otros | 📦 | (fallback gasto) |
| `salary` | Sueldo | 💼 | sueldo, salario |
| `other_inc` | Otros ingresos | 💰 | honorarios, venta, freelance, devolución |

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
}
```

### 6.2 Defaults (12 categorías)
- **Gastos (9)**: food, home, services, transport, leisure, repair, health, education, supermarket, other_exp
- **Ingresos (2)**: salary, other_inc

### 6.3 Persistencia
- Seed automático en `db.ts:seedDatabase()` si tabla vacía
- `useCategories()` / `useCategory(id)` → `useLiveQuery` reactivo

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

- Parser CSV simple (soporta comillas, headers)
- Detecta columnas: descripción/concepto/detalle, monto/amount/importe/valor, fecha/date/día
- Reutiliza `parseInput()` → mismo motor de categorización/recurrencia
- Retorna `{ imported, errors, errorLines[] }`

---

## 9. Acciones de Usuario por Pantalla

### Dashboard (Inicio)
- Ver balance histórico (ingresos - gastos totales)
- Ver diff % vs mes anterior
- Ver gastado/ingresado/restante mes actual + barra progreso
- Filtrar lista por categoría (chips horizontales)
- Tap tx → editar | Botón 🗑️ → eliminar

### Movimientos
- Selector mes (últimos 12 con datos)
- Filtro categoría
- Balance del mes (ingresos - gastos)
- Lista completa con edit/delete

### Stats
- Barras SVG: últimos 6 meses (gastos)
- Donut SVG: categorías mes actual
- Top categoría del mes

### Ajustes
- Theme: Light / Dark (persiste en `db.settings` + `data-theme` en `<html>`)
- Currency: ARS / USD
- Lista recurrentes activos con delete cascada
- Version info

---

## 10. Reglas de Negocio Críticas

1. **Nunca editar clones recurrentes** — solo editar el source (`originalId` undefined). Los clones tienen `originalId` y son derivados.
2. **Fechas siempre local** — `toLocalISO(d)` (YYYY-MM-DD en timezone local), **nunca** `toISOString()` (UTC shift en AR = -3h → día anterior).
3. **Moneda en enteros** — ARS sin decimales, USD 2 decimales. `formatMoney` maneja presentación.
4. **Touch targets ≥ 44px** — `py-3` mínimo en botones/inputs.
5. **Container max-w-[480px]** — mobile-first, centrado en `#root`.
6. **Bundle budgets** — JS < 100KB gz, CSS < 10KB gz. Sin deps pesadas.