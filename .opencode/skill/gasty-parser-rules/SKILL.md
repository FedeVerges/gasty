---
name: gasty-parser-rules
description: Use ONLY when modifying src/lib/parser.ts or src/lib/categories.ts. Triggers on: 'parser', 'parseInput', 'palabra clave', 'keyword', 'regex monto', 'fecha es-AR', 'cuota X/Y', 'detectar categoría', 'mes en español'.
---

# Smart Parser — Reglas y casos borde

El parser convierte lenguaje natural en español ("birra 1500", "alquiler 45000", "cuota auto 25000 4/24") en un `ParsedTransaction` determinístico, sin red, sin librerías, sin NLP. Es la pieza más sensible de Gasty: cada cambio debe venir con tests.

> `ParsedTransaction` y `Transaction` se definen en **`gasty-domain`** (fuente única de tipos). Este skill
> describe solo las reglas de detección; no redefinas los tipos.

## Contrato de `parseInput(input: string): ParsedTransaction | null`

- Devuelve `null` si el input está vacío o si no se detecta monto.
- Devuelve `ParsedTransaction` en otro caso, con `recurring.invoiceDay = new Date(date).getDate()`.
- Es **pura, síncrona y sin estado** — se usa dentro de `useMemo` en `SmartInputSheet`.

## Orden de detección (sagrado)

```
input
  │
  ├── detectRecurring     ← 1° (cuotas X/Y y keywords de recurrente)
  │
  ├── parseDate           ← 2° (hoy/ayer/mañana, "15 junio", "20-5", "20/7")
  │
  ├── parseAmount         ← 3° (1500, $1.500, 1500 pesos, 1.500,50)
  │
  ├── detectType          ← 4° (sobre el input ORIGINAL, no sobre el residual)
  │                         INCOME_KEYWORDS → 'income', else 'expense'
  │
  ├── detectCategory      ← 5° (sobre el input ORIGINAL, KEYWORDS map)
  │                         primer match gana; respeta type (salary/other_inc solo si type==='income')
  │
  └── cleanDescription    ← 6° (lo que queda, o 'Ingreso'/'Gasto' fallback)
```

⚠️ `detectType` y `detectCategory` corren sobre el input ORIGINAL, no sobre el residual. Si el usuario escribió "venta auto 500000" la keyword `venta` debe matchear, aunque el `500000` ya se haya removido.

## Reglas de monto (`parseAmount`)

Dos regex se prueban en orden:

```ts
/\$\s*(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?/
/(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:pesos|ars|usd|dolares|dólares)?/
```

- Captura grupos: `(1)` número principal, `(2)` decimales opcionales.
- Normalización: `rawNumber.replace(/[.,]/g, '')` (saca separadores de miles).
- Si hay decimales, el resultado es `parseFloat(\`${normalized}.${decimals}\`)`.
- El match completo se reemplaza por espacio en el residual.

Casos válidos:

| Input | `amount` |
|---|---|
| `birra 1500` | 1500 |
| `lomito $3000` | 3000 |
| `sueldo $150.000` | 150000 |
| `lomito 3000,50` | 3000.5 |
| `alquiler 45 mil` | 45 (NO matchea — la palabra "mil" no está en el regex) |
| `gasto 1500 pesos` | 1500 |

Casos inválidos (devuelven `null` en `parseInput`):

| Input | Por qué |
|---|---|
| `internet` | sin monto |
| `gasto` | sin monto |
| `0` | `amount <= 0` → null |
| (vacío) | guard al inicio |

## Reglas de fecha (`parseDate`)

Orden de detección:

1. **`\bhoy\b`** → `toLocalISO(new Date())`
2. **`\bayer\b`** → `new Date(now - 1 day)`
3. **`\bmañana\b`** → `new Date(now + 1 day)`
4. **`\b(\d{1,2})\s+(?:de\s+)?<mes>\b`** con mapa de meses (enero..diciembre + abreviaturas ene, feb, ..., dic, sept)
   - `day` y `month` parseados, año es `currentYear` salvo que el mes esté en el pasado, en cuyo caso `currentYear + 1`
5. **`\b<mes>\b`** sin día → primer día de ese mes
6. **`\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b`** → `DD-MM` o `DD/MM` (con año opcional)
   - Sin año, si el mes es menor al mes actual → `currentYear + 1`
   - Año de 2 dígitos → `2000 + N`; 4 dígitos → literal
   - Validación: `1 <= day <= 31 && 0 <= month <= 11` (no valida días por mes, lo acepta)
7. **fallback** → `toLocalISO(new Date())`

El match completo se reemplaza por espacio en el residual.

⚠️ **Nunca uses `toISOString()`** para el campo `date` (UTC trap). Usá `toLocalISO(d)` que arma `YYYY-MM-DD` con `getFullYear`/`getMonth()+1`/`getDate()`.

## Reglas de tipo (`detectType`)

```ts
INCOME_KEYWORDS.some(kw => lower.includes(kw)) ? 'income' : 'expense'
```

`INCOME_KEYWORDS` actual: `sueldo, salario, honorarios, venta, cobro, cobré, freelance, facturé, recibí, ingreso, pago recibido, devolución, devolucion, transferencia recibida`.

⚠️ Una sola keyword matchea (cualquier posición). No hay prioridad entre keywords; la lista es estable, no la reordenes.

## Reglas de categoría (`detectCategory`)

Itera `KEYWORDS: Array<[string, string]>` (palabra → categoryId) en orden. **Primer match gana**.

- Si `type === 'income'`, solo se aceptan matches cuyo target sea `salary` u `other_inc`.
- Si `type === 'expense'`, se aceptan todos los demás.
- Sin match: `other_inc` (income) o `other_exp` (expense).

Lista actual en `src/lib/categories.ts:18-118`. Para agregar una keyword:
1. Insertar en la posición correcta del array (orden importa por prioridad).
2. Si apunta a una categoría nueva, agregarla a `DEFAULT_CATEGORIES` con id estable, name en español, emoji, color, type.
3. Agregar test de cobertura en `tests/parser.test.ts`.

## Reglas de recurrente (`detectRecurring`)

1. **Cuotas `X/Y`**: regex `(\d+)\s*\/\s*(\d+)`. Valida `1 <= X <= Y` y `Y < 240`. Devuelve `{ kind: 'fixed_temporary', currentMonth: X, totalMonths: Y }`.
2. **Keywords de recurrente**: `RECURRING_KEYWORDS.some(kw => lower.includes(kw))` → `{ kind: 'fixed' }`.
   - Lista: `alquiler, expensas, cuota, crédito, credito, servicio, suscripcion, suscripción, patente, seguro, impuesto`.
3. **Sin match**: `{ kind: 'none' }`.

⚠️ `cuota auto 25000 4/24`: el `detectRecurring` matchea la regex de cuotas ANTES de que `parseDate` vea el texto. El `4/24` no se confunde con fecha porque ya fue consumido.

⚠️ `alquiler 45000`: `detectRecurring` matchea por keyword (`alquiler`). El texto no se altera (no consume caracteres).

## Detección de fecha con mes en pasado

Si estamos en junio 2026 y el usuario escribe `sueldo 150000 abril`:
- mes parseado: 3 (abril)
- mes actual: 5 (junio)
- abril < junio → año = currentYear + 1 = 2027

Esto es por diseño: un gasto "en abril" en junio probablemente es del año que viene si hablamos de algo futuro, pero para gastos pasados debería ser 2026. La heurística actual favorece el caso futuro (sueldo, alquiler que viene). Si esto genera confusión, abrir ADR.

## Casos de prueba canónicos (de `tests/parser.test.ts`)

```
birra 1500              → expense, leisure,  none,         today
lomito $3000            → expense, food,     none,         today
sueldo $150.000         → income,  salary,   none,         today
sueldo 150000           → income,  salary,   none,         today
sueldo 150000 junio     → income,  salary,   none,         2026-06-01
sueldo 150000 15 junio  → income,  salary,   none,         2026-06-15
alquiler 45000          → expense, home,     fixed,        today
expensas 80000          → expense, home,     fixed,        today
cuota auto 25000 4/24   → expense, transport, fixed_temporary (4/24), today
internet 8500           → expense, services, fixed,        today
lomito 3000 20-5        → expense, food,     none,         2026-05-20
lomito 3000 20/7        → expense, food,     none,         2026-07-20
birra 1000 ayer         → expense, leisure,  none,         yesterday
farmacia 3200           → expense, health,   none,         today
super 15000             → expense, supermarket, none,      today
venta auto 500000       → income,  other_inc, none,        today
internet                → null (sin monto)
```

## Anti-patterns

- 🟥 Agregar NLP o LLM al parser.
- 🟥 Renombrar un `categoryId` existente.
- 🟥 Agregar date-fns/dayjs para una sola regex.
- 🟥 Hacer `parseInput` async (se usa en `useMemo` sync).
- 🟥 Cachear resultados de parse.
- 🟥 Cambiar el ORDEN de detección (rompe tests).
- 🟥 Cambiar `parseAmount` para que infiera `15 mil` → 15000 sin cambiar el regex.
