# E2E Testing Plan — Playwright

> Flows más importantes de Gasty validados end-to-end.

## Setup

### Archivos a crear

```
e2e/
├── playwright.config.ts          # Config principal
├── fixtures/
│   ├── test.csv                  # CSV de prueba con 10+ filas
│   └── test-helpers.ts           # Seed data + helpers
├── flows/
│   ├── add-transaction.spec.ts   # Flow 1-2-3
│   ├── csv-import.spec.ts        # Flow 4
│   ├── edit-delete.spec.ts       # Flow 5
│   ├── consistency.spec.ts       # Flow 6
│   └── settings.spec.ts          # Flow 7-8
└── global-setup.ts               # Seed DB + reset per suite
```

### Dependencias a agregar

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### playwright.config.ts (borrador)

- `webServer` → vite dev server (puerto 5173)
- Proyecto único: `chromium`, viewport `375x812` (iPhone X)
- `fullyParallel: false`
- `globalSetup` opcional

### Estrategia de datos

La app usa IndexedDB real. Cada suite resetea con:

```ts
await page.evaluate(async () => {
  const { db } = await import('./src/lib/db')
  await db.delete()
  await db.open()
  const { seedDatabase } = await import('./src/lib/db')
  await seedDatabase()
})
```

Usar `test.describe.serial` cuando suites compartan estado.

---

## Flows de prueba

### Flow 1: Gasto simple

```
Input:  "birra 1500"
Output: transacción en Dashboard, Movimientos, Stats
```

**Steps:**
1. Tap FAB (`[aria-label="Agregar transacción"]`)
2. Type `birra 1500` en el input
3. Preview: monto `− $1.500`, emoji 🍺, categoría `Ocio`
4. Tap "Confirmar"
5. **Dashboard**: ver grupo "Hoy" → `Birra · Ocio · − $1.500`
6. **Movimientos**: ver item + balance reflejado
7. **Stats**: barra del mes actual con el monto

---

### Flow 2: Recurrente fijo

```
Input:  "alquiler 45000"
Output: aparece en Ajustes como recurrente
```

**Steps:**
1. FAB → type `alquiler 45000`
2. Preview badge: "🔄 Detectado: recurrente"
3. Confirmar
4. Ir a **Ajustes** → card "Gastos recurrentes" → "1 activos"
5. Ver item `Alquiler · $45.000`

---

### Flow 3: Cuota temporal (fixed_temporary)

```
Input:  "cuota auto 25000 4/24"
Output: proyección en meses futuros
```

**Steps:**
1. FAB → type `cuota auto 25000 4/24`
2. Preview badge: "⏱️ 4/24 cuotas"
3. Confirmar
4. **Dashboard**: ver item con badge `4/24`
5. MonthSelector → avanzar al mes siguiente
6. Ver banner "🚀 Modo proyección"
7. Ver item virtual `Auto` con cuota `5/24`

---

### Flow 4: CSV Import

```
Archivo: e2e/fixtures/test.csv (10 filas)
Output:  10 gastos importados, verificados en Dashboard
```

**Archivo fixture (`test.csv`):**

```csv
nombre,importe,fecha,categoría
Alquiler,45000,01/06/2026,Vivienda
Supermercado,15000,05/06/2026,Supermercado
Birra,2500,10/06/2026,Ocio
Internet,12000,15/06/2026,Servicios
Nafta,8000,18/06/2026,Transporte
Farmacia,3500,20/06/2026,Salud
Curso online,15000,22/06/2026,Educación
Restaurante,6000,25/06/2026,Comida
Mantenimiento,20000,28/06/2026,Reparaciones
Sueldo,200000,30/06/2026,Salario
```

**Steps:**
1. Ir a **Ajustes**
2. Tap "Importar CSV" (botón en card "Importar datos")
3. Paso 1 — Tap "Seleccionar archivo CSV"
4. Playwright: `page.setInputFiles('input[type="file"]', 'e2e/fixtures/test.csv')`
5. Paso 2 — Preview: 10 filas con categorías detectadas
6. Tap "Importar 10 filas"
7. Paso 3 — Ver "10 gastos importados"
8. **Dashboard**: items importados agrupados por fecha
9. **Movimientos**: balance = suma total, verificar primeros 5 items por descripción + monto

---

### Flow 5: Editar y eliminar

**Steps:**
1. Agregar gasto `prueba 5000`
2. Tap en el item → sheet en modo edición
3. Input pre-poblado con "prueba 5000"
4. Cambiar descripción a "prueba editada"
5. Confirmar → item actualizado en Dashboard
6. Tap 🗑️ (`[aria-label="Eliminar transacción"]`)
7. Aceptar `confirm()`
8. Item desaparece de Dashboard y Movimientos

---

### Flow 6: Consistencia cross-screen

**Steps:**
1. Seed: gasto simple + ingreso + recurrente
2. **Dashboard**: balance = income − expenses, progress bar = (spent / income) × 100
3. **Movimientos**: balance coincide con dashboard, top 5 categorías correctas
4. **Stats**: total últimos 6 meses, top categoría coincide
5. Filtro "Trimestre" → datos filtrados correctamente
6. Dashboard → MonthSelector a mes anterior → datos consistentes

---

### Flow 7: Ingreso

```
Input:  "sueldo 150000"
Output: signo + positivo, BalanceCard actualizado
```

**Steps:**
1. FAB → type `sueldo 150000`
2. Preview: `+ $150.000`, emoji 💼, categoría `Salario`
3. Confirmar
4. **Dashboard**: BalanceCard "Disponible" positivo
5. Progress bar refleja income

---

### Flow 8: Theme switch

**Steps:**
1. Ir a **Ajustes**
2. Tap "Oscuro" → `document.documentElement` tiene `data-theme="dark"`
3. Tap "Claro" → `data-theme="light"`

---

## Selectores (sin data-testid)

| Elemento | Selector |
|---|---|
| FAB | `[aria-label="Agregar transacción"]` |
| Input smart | `input[placeholder*="birra"]` |
| Confirmar | `button:has-text("Confirmar")` |
| Cerrar sheet | `[aria-label="Cerrar"]` |
| Tab Inicio | `button:has-text("Inicio")` dentro del nav |
| Tab Movimientos | `button:has-text("Movimientos")` |
| Tab Stats | `button:has-text("Stats")` |
| Tab Ajustes | `button:has-text("Ajustes")` |
| Eliminar | `[aria-label="Eliminar transacción"]` |
| Importar CSV | `button:has-text("Importar CSV")` |
| File input | `input[type="file"]` |
| Eliminar recurrente | `button:has-text("Eliminar")` |
| Volver (cat manager) | `[aria-label="Volver"]` |
| Dark mode | `button:has-text("Oscuro")` |
| Light mode | `button:has-text("Claro")` |

---

## Scripts de npm

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## CI (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test:e2e
```

---

## Resumen

| # | Flow | Archivo |
|---|---|---|
| 1 | Gasto simple | `add-transaction.spec.ts` |
| 2 | Recurrente fijo | `add-transaction.spec.ts` |
| 3 | Cuota temporal | `add-transaction.spec.ts` |
| 4 | CSV Import | `csv-import.spec.ts` |
| 5 | Editar / Eliminar | `edit-delete.spec.ts` |
| 6 | Consistencia cross-screen | `consistency.spec.ts` |
| 7 | Ingreso | `settings.spec.ts` |
| 8 | Theme switch | `settings.spec.ts` |

8 specs, ~400-500 líneas total estimadas.
