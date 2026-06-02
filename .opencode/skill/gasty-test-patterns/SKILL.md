---
name: gasty-test-patterns
description: Use ONLY when writing or modifying tests in tests/ directory. Triggers on: 'test', 'vitest', 'spec', 'fake-indexeddb', 'beforeEach', 'toBeNull', 'describe', 'it(', 'expect('.
---

# Test Patterns — Gasty

Tests con **Vitest** + **jsdom** + **fake-indexeddb**. Tres archivos canónicos en `tests/`. Esta skill es la fuente de verdad de cómo se escriben y organizan.

## Setup

- `vitest.config.ts` (raíz): `globals: true`, `environment: 'jsdom'`, sin `setupFiles` (cada test hace su propio setup de `fake-indexeddb`).
- Dependencias clave (en `package.json` devDependencies): `vitest@^2.1.9`, `@vitest/ui@^2.1.9`, `jsdom@^25.0.0`, `fake-indexeddb@^6.2.5`.
- `npm test` corre en CI mode (`vitest run`); `npm run test:watch` es local.

## Estructura de `tests/`

```
tests/
├── parser.test.ts        # parseInput, createTransactionFromParsed (sin DB)
├── recurring.test.ts     # checkAndCloneRecurring, getRecurringSources, deleteRecurringSource (con DB)
└── integration.test.ts   # flujos completos: parse → save → query, seed
```

Regla: **un archivo por concern**. Tests de `format.ts` van en `tests/format.test.ts`; tests de hooks van en `tests/hooks/useTransactions.test.ts`.

## Imports base

```ts
// Parser-only (sin DB)
import { describe, it, expect } from 'vitest'
import { parseInput, createTransactionFromParsed } from '../src/lib/parser'

// DB-backed
import 'fake-indexeddb/auto'                    // 1° import, antes de cualquier db
import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedDatabase } from '../src/lib/db'
```

⚠️ `import 'fake-indexeddb/auto'` debe ser **el primer import** del archivo. Si Dexie ve `indexedDB` ya polyfillado, no entra en fallback. Si lo importás tarde, los tests de DB fallan con `ReferenceError: indexedDB is not defined`.

## Patrón canónico de `beforeEach` (DB tests)

```ts
describe('<concern>', () => {
  beforeEach(async () => {
    await db.delete()        // wipe
    await db.open()          // reopen (delete() lo cierra)
    await seedDatabase()     // restaura categorías y settings
  })

  it('<comportamiento>', async () => {
    // arrange, act, assert
  })
})
```

⚠️ No usar `beforeAll` con `db.delete()` adentro. Cada test necesita su propio estado limpio. `beforeAll` es solo para setup de módulos (mock de un módulo, registrar un handler global).

## Patrones de test

### Parser — happy path

```ts
it('detecta alquiler como recurrente fijo', () => {
  const result = parseInput('alquiler 45000')
  expect(result?.recurring.kind).toBe('fixed')
})
```

### Parser — fecha relativa

```ts
it('parsea ayer', () => {
  const result = parseInput('birra 1000 ayer')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const y = yesterday.getFullYear()
  const m = String(yesterday.getMonth() + 1).padStart(2, '0')
  const d = String(yesterday.getDate()).padStart(2, '0')
  expect(result?.date).toBe(`${y}-${m}-${d}`)
})
```

⚠️ Construí la fecha esperada con `getFullYear/Month/Date`, NUNCA con `toISOString()`. Si no, generás un sesgo por zona horaria.

### Parser — caso inválido

```ts
it('parsea gasto sin monto (devuelve null)', () => {
  const result = parseInput('internet')
  expect(result).toBeNull()
})
```

### DB — read after write

```ts
it('clona un gasto recurrente fijo para el mes actual', async () => {
  const parsed = parseInput('alquiler 45000')
  const tx = createTransactionFromParsed(parsed!)
  await db.transactions.add(tx)

  const cloned = await checkAndCloneRecurring()
  expect(cloned).toBe(1)

  const all = await db.transactions.toArray()
  expect(all.length).toBe(2)
  expect(all.filter((t) => t.originalId).length).toBe(1)
})
```

### DB — seed

```ts
it('seed crea 12 categorías', async () => {
  const count = await db.categories.count()
  expect(count).toBe(12)
})
```

### Integración — flujo completo

```ts
it('flujo completo: parsear y guardar un gasto', async () => {
  const parsed = parseInput('birra 1500')
  expect(parsed).not.toBeNull()

  const tx = createTransactionFromParsed(parsed!)
  await db.transactions.add(tx)

  const all = await db.transactions.toArray()
  expect(all).toHaveLength(1)
  expect(all[0].amount).toBe(1500)
  expect(all[0].categoryId).toBe('leisure')
  expect(all[0].type).toBe('expense')
})
```

## Estilo y naming

- **Nombres que leen como frases en español**:
  - ✅ `'detecta alquiler como recurrente fijo'`
  - ✅ `'no clona dos veces en el mismo mes'`
  - ❌ `'test 1'`, `'works'`
- **Agrupar con `describe`** por concern: `'parser: gastos básicos'`, `'parser: fechas'`, `'parser: categorías'`, `'parser: recurrentes'`, `'recurring: auto-clonado'`, `'integration: db + parser'`.
- **Usar `it`, no `test`**: stay consistent con los archivos existentes.
- **Un `expect` por comportamiento**, no 10 expects encadenados que prueban cosas distintas.
- Si un test necesita varios `expect`, está bien — pero si el primero falla, el resto no corre. Usá `expect.soft(...)` solo si querés ver todos los fallos a la vez (no abuse).

## Comparación de fechas

- ✅ `expect(result?.date).toBe(\`${y}-${m}-${d}\`)` (construido desde `new Date()`).
- ✅ `expect(result?.date).toMatch(/^\d{4}-06-15$/)` (regex para mes-día sin año, evita dependencia del año actual).
- ❌ `expect(result?.date).toBe('2026-06-15')` (frágil, se rompe cuando el año cambia en CI).

## Lo que NO se testea

- Implementación interna (qué funciones llama, en qué orden).
- Estilos inline o clases de Tailwind específicas.
- Librerías de terceros (confiar en que Vitest, jsdom y fake-indexeddb funcionan).
- Componentes UI directamente (no hay React Testing Library instalado; los tests actuales son todos de lógica). Si querés agregar tests de componentes, instalá `@testing-library/react` y `@testing-library/jest-dom` y pedí un ADR.

## Cobertura objetivo

- Todo archivo en `src/lib/` debe tener tests para sus exports públicos.
- Todo hook en `src/hooks/` debe tener al menos un test de su caso de uso principal (idealmente con un wrapper con `renderHook` de RTL — requiere instalar la dep).
- `src/lib/parser.ts` y `src/lib/recurring.ts` son los más críticos;覆盖率 debe ser cercana al 100% (todas las branches de los regex, todos los kinds de recurring).

## Comandos

```bash
npm test                       # full run, CI mode
npm run test:watch             # watch mode
npx vitest run tests/parser    # un archivo
npx vitest run --coverage      # coverage (requiere @vitest/coverage-v8, no instalado aún)
```

## Anti-patterns

- 🟥 `import 'fake-indexeddb/auto'` después de cualquier otro import.
- 🟥 `await new Promise(setTimeout, 100)` para esperar a la DB (las queries de Dexie son awaitables directamente).
- 🟥 `expect(value).toBeTruthy()` (sé específico).
- 🟥 Hardcodear fechas absolutas (`'2026-06-15'`) — el test se rompe cuando el año cambia.
- 🟥 Compartir estado entre tests (module-level `let db = ...`).
- 🟥 `it.skip` / `describe.skip` sin un TODO explícito.
- 🟥 `console.log` dejado en el test.
- 🟥 Tests que dependen del orden de ejecución (e.g., asumir que un test anterior dejó datos).
- 🟥 `vi.mock('../src/lib/db')` para tests de recurring (testeá la cosa real con `fake-indexeddb`).
- 🟥 Mutar la fecha del sistema con `vi.useFakeTimers()` sin restaurar (`vi.useRealTimers()` en `afterEach`).
