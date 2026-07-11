---
name: gasty-data-layer
description: Use ONLY when modifying Dexie schema, hooks that use useLiveQuery, or the recurring transaction auto-clone algorithm. Triggers on: 'Dexie', 'IndexedDB', 'useLiveQuery', 'recurring', 'clonar', 'db.version', 'db.transactions', 'seed', 'migración', 'schema'.
---

# Data Layer — Dexie + useLiveQuery + Recurring

Toda la persistencia de Gasty vive en IndexedDB a través de Dexie 4. No hay backend, no hay `localStorage` para datos de usuario, no hay estado de servidor. La reactividad es local: cualquier cambio en la DB dispara la re-renderización de los hooks `useLiveQuery`.

> **Fuente de tipos:** `Transaction`, `Category`, `RecurringConfig`, `Settings` se definen una sola vez
> en **`gasty-domain`** (y en `src/types/index.ts`). Este skill describe el *schema Dexie* y los hooks,
> no redefinas los tipos acá. Reglas de fecha/recurrencia también en `gasty` (Canon §3/§5).

## Schema (v1) — `src/lib/db.ts`

```ts
export const db = new Dexie('gasty') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>
  categories:   EntityTable<Category, 'id'>
  settings:     EntityTable<Settings & { id: string }, 'id'>
}

db.version(1).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories:   'id, type',
  settings:     'id',
})
```

Convenciones de índice:
- **`id`** es la primary key (UUIDs en transactions, snake_case en categories, constante `'app-settings'` en settings).
- Los índices secundarios siguen orden de importancia para queries: `type` y `date` son los más consultados.
- `originalId` existe para que `db.transactions.where('originalId').notEqual('')` sea O(index lookup).
- **Los índices son aditivos** (Dexie no permite borrar uno en una misma versión; hay que bumpear).

## Bootstrap — `seedDatabase()`

```ts
export async function seedDatabase() {
  const catCount = await db.categories.count()
  if (catCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  }

  const existing = await db.settings.get(SETTINGS_ID)
  if (!existing) {
    await db.settings.put({
      id: SETTINGS_ID,
      theme: 'light',
      currency: 'ARS',
    })
  }
}
```

- Idempotente: corre en cada mount, no duplica categorías, no pisa settings existentes.
- `SETTINGS_ID = 'app-settings'` (constante en `db.ts`).
- Si necesitás bumpear el seed (ej. agregar una categoría nueva), **no** modifiques esta función; dejá que coexistan las 12 viejas y agregá un upgrade en `db.version(2).upgrade()` que las inserte solo si no existen.

## Settings — `getSettings` / `saveSettings`

```ts
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? { theme: 'light', currency: 'ARS' }
}

export async function saveSettings(partial: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ id: SETTINGS_ID, ...current, ...partial })
}
```

⚠️ `saveSettings` hace un `get + put` (read-modify-write) porque Dexie `put` con clave existente reemplaza toda la fila. Si guardás `{ theme }` directamente, perderías `currency`.

## Hooks (`src/hooks/`)

### `useTransactions.ts`

| Hook | Query | Index usado |
|---|---|---|
| `useAllTransactions()` | `db.transactions.toArray()` | ninguno |
| `useTransactionsForMonth(year, month)` | `where('date').between(startISO, endISO, true, true)` | `date` |
| `useRecentTransactions(limit)` | `toArray().sort().slice(0, limit)` | ninguno (es OK si <500 rows) |

Patrón:
```ts
export function useAllTransactions(): Transaction[] {
  return useLiveQuery(() => db.transactions.toArray(), [], []) ?? []
}
```

- El `[]` final es el `defaultResult` (lo que se devuelve mientras la query está pendiente).
- El array de dependencias del medio (`[]` o `[year, month]`) DEBE incluir todas las variables que la query usa — si no, la query no se re-ejecuta al cambiar.
- Devolver `?? []` para tipos: `useLiveQuery` puede devolver `undefined` la primera vez.

### `useCategories.ts`

| Hook | Query |
|---|---|
| `useCategories()` | `db.categories.toArray()` |
| `useCategory(id)` | `db.categories.get(id)` |

### `useRecurringCheck.ts`

```ts
export function useRecurringCheck() {
  useEffect(() => {
    checkAndCloneRecurring().catch(console.error)
  }, [])
}
```

- Corre **una vez** por mount (deps array `[]`).
- Si falla, loguea — no rompe la app. El usuario puede seguir registrando gastos normales; los clones no aparecen este mes pero se generan el próximo.

## Algoritmo de auto-clonado — `checkAndCloneRecurring()`

```
const sources = transactions.filter(t => t.recurring.kind !== 'none' && !t.originalId)
const existingClones = transactions.filter(t => t.originalId)
const cloneMap = Map<originalId, Set<'YYYY-MM'>>    // meses donde ya hay un clon

for each source:
  if cloneMap.get(source.id)?.has(currentMonthKey) → skip (idempotencia)
  if source.recurring.kind === 'fixed_temporary'
     && source.recurring.currentMonth > source.recurring.totalMonths → skip (terminó)
  
  const day = source.recurring.invoiceDay ?? new Date().getDate()
  const newDate = toLocalISO(new Date(currentYear, currentMonth, day))
  const nextCurrentMonth = (source.recurring.currentMonth ?? 1) + 1

  db.transactions.add({
    ...source,
    id: crypto.randomUUID(),
    date: newDate,
    originalId: source.id,
    recurring: { ...source.recurring, currentMonth: nextCurrentMonth },
    createdAt: new Date().toISOString(),
  })
```

Propiedades que **no** se pueden romper:
1. **Idempotencia**: dentro del mismo mes, una segunda llamada produce 0 clones.
2. **Terminación**: una fuente `fixed_temporary` deja de clonarse cuando `currentMonth > totalMonths`.
3. **Estabilidad del `originalId`**: si una fuente se elimina (`deleteRecurringSource` cascadea sus clones), no quedan clones huérfanos.
4. **Fecha del clon**: misma día-del-mes que la fuente (`invoiceDay`), en el mes/año actual. Si `invoiceDay` no está seteado, usa el día de "hoy".

## `deleteRecurringSource(id)`

```ts
export async function deleteRecurringSource(id: string): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const all = await db.transactions.toArray()
    const toDelete = all.filter((t) => t.id === id || t.originalId === id)
    await db.transactions.bulkDelete(toDelete.map((t) => t.id))
  })
}
```

Borra la fuente **y todos sus clones** en una sola transacción. El Settings UI usa este para "Eliminar" un recurrente.

## Plantilla de migración (cuando bumpees el schema)

```ts
db.version(1).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories:   'id, type',
  settings:     'id',
})

db.version(2).stores({
  // 1) declarás el schema NUEVO con el campo/índice agregado
  transactions: 'id, type, date, categoryId, originalId, newField',
}).upgrade(async (tx) => {
  // 2) backfill: para cada row existente, completá el nuevo campo
  await tx.table('transactions').toCollection().modify((row) => {
    if (row.newField === undefined) {
      row.newField = defaultValueFor(row)
    }
  })
})
```

⚠️ El `.upgrade` se ejecuta **una vez** por browser al subir de versión. Si fallás en backfillear, los rows viejos quedan con `undefined` y rompen los tipos.

## Testing del data layer

Patrón canónico (`tests/recurring.test.ts`, `tests/integration.test.ts`):

```ts
import 'fake-indexeddb/auto'                    // 1° import, antes de cualquier cosa de db
import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedDatabase } from '../src/lib/db'
import { checkAndCloneRecurring } from '../src/lib/recurring'

describe('recurring: <concern>', () => {
  beforeEach(async () => {
    await db.delete()                            // wipe
    await db.open()                              // reopen
    await seedDatabase()                         // reseed categorías y settings
  })

  it('<comportamiento>', async () => {
    // arrange: insertar transacción fuente
    // act: await checkAndCloneRecurring()
    // assert: db.transactions.toArray() y verificar
  })
})
```

## Anti-patterns

- 🟥 Persistir datos de usuario en `localStorage`.
- 🟥 Editar o borrar clones directamente — siempre la fuente.
- 🟥 Usar `useState` + `useEffect` para leer transacciones — `useLiveQuery` da reactividad gratis.
- 🟥 `db.close()` en cualquier lado — el singleton vive toda la sesión.
- 🟥 Bumpear schema sin `.upgrade()` cuando hay rows existentes.
- 🟥 `Date.now()` o `new Date().toISOString()` para construir `date` o `monthKey` (UTC trap).
- 🟥 Romper la idempotencia de `checkAndCloneRecurring` (crearía duplicados en cada mount).
- 🟥 `db.transactions.toArray().filter()` para queries que un índice podría resolver (escala mal con >5k rows).
