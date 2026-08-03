# Dashboard Redesign - Plan de Migración

**Fecha:** 20 de julio de 2026
**Estado:** Pendiente de implementación
**Alcance:** Reestructura del módulo Dashboard

---

## Objetivo

Rediseñar el dashboard principal para:
1. Eliminar tabs (Resumen/Inversiones) y ganar espacio vertical
2. Reemplazar el FAB + SmartInputSheet por un input inteligente inline
3. Habilitar edición inline de transacciones (expand/edit)
4. Mejorar la visual de los items de transacción con badge de categoría

---

## Cambios confirmados

| # | Cambio | Archivos afectados | Estado |
|---|--------|-------------------|--------|
| 1 | Quitar tabs Resumen/Inversiones | `Dashboard.tsx` | ✅ Completado |
| 2 | Input inteligente inline (reemplaza FAB + sheet) | **Nuevo** `InlineSmartInput.tsx`, `Dashboard.tsx`, `AppShell.tsx` | ✅ Completado |
| 3 | Quitar FAB y SmartInputSheet del AppShell | `AppShell.tsx` | ✅ Completado |
| 4 | TransactionItem: expand/edit inline + badge categoría | `TransactionItem.tsx` | ✅ Completado |
| 5 | Inversiones al final del dashboard | `Dashboard.tsx` | ✅ Completado |
| 6 | EditTransactionContext se adapta al inline edit | `EditTransactionContext.tsx`, `AppShell.tsx` | ✅ Completado |

**Nota:** MonthSelector NO es parte del dashboard. El dashboard siempre muestra el mes actual.

---

## Layout nuevo del Dashboard

```
Header: "Gasty" + "Tus gastos, simples."
[Projection banner si aplica]
BalanceCard                               ← Sin cambios
InlineSmartInput                          ← Nuevo componente, debajo de BalanceCard
Transacciones agrupadas por día
  └─ TransactionItem (con expand/edit)
Inversiones (al final)
Scroll-to-top button
```

---

## Detalle por archivo

### 1. `TransactionItem.tsx`

#### Modo colapsado (normal)

```
[🫧 fondo color] [Descripción]            [+ $15.000]
                 [ Badge: 🍕 Comida ]     [19 jul]
                                          [🗑️]
```

- **Emoji:** fondo `category.color + 20` opacity
- **Badge:** fondo del color de categoría + nombre
- **Monto:** color verde (ingreso) / rojo (gasto)
- **Fecha:** debajo del monto
- **Eliminar:** botón visible

#### Modo expandido (edit)

```
[🫧 fondo] [input descripción]           [✓]
           [input monto]                 [✕]
           [input fecha]
           [selector categoría vertical]
```

- **Selector vertical:** lista de categorías con color + nombre, la seleccionada resaltada
- **✓:** reemplaza al 🗑️ (confirmar edición)
- **✕:** cancelar y volver a colapsado

#### Transición

- `max-height` + `opacity` con `transition-all duration-200`
- Solo se anima lo permitido por las reglas del proyecto (sin animar `width`, `height`, `top`, `left`)

#### Estado implementado ✅

- [x] Modo colapsado con badge de categoría (color + nombre)
- [x] Modo expandido con campos editables (descripción, monto, fecha)
- [x] Selector vertical de categorías
- [x] Botones confirmar (✓) y cancelar (✕)
- [x] Botón eliminar en modo colapsado
- [x] Transición animada con `max-height`
- [x] Lógica de guardado en Dexie (`db.transactions.update`)

---

### 2. `InlineSmartInput.tsx` (Nuevo componente)

#### Estado vacío

```
┌──────────────────────────────────────┐
│  [Input: "Ej: birra 1500"]           │
│  [−] [+]          [→]                │
│  [☕ Café] [🍕 Cena] [🛒 Super] ...  │
└──────────────────────────────────────┘
```

#### Con texto (preview aparece)

```
┌──────────────────────────────────────┐
│  [birra 1500]                        │
│  [−] [+]          [→]                │
│  [🍺 Birra · $1.500 · Hoy]          │  ← preview en vivo
│  [☕ Café] [🍕 Cena] [🛒 Super] ...  │
└──────────────────────────────────────┘
```

#### Flujo

1. Usuario tipea → parser detecta en tiempo real
2. Preview muestra: emoji + descripción + monto + fecha (propiedades aparecen a medida que se detectan)
3. Al enviar → el preview se transforma en un TransactionItem real en la lista
4. Input se limpia, vuelve al estado vacío

#### Lógica

- Misma de SmartInputSheet (`parseInput`, `createTransactionFromParsed`, `createFutureClones`)
- Se extrae la lógica de parseo del sheet
- FlashChips se muestran como chips scrollables debajo del input
- Rediseño visual de FlashChips queda pendiente (primero ver espacios con el nuevo layout)

#### Estado implementado ✅

- [x] Input field con placeholder
- [x] Type toggle (− gasto / + ingreso)
- [x] Live preview con emoji + descripción + categoría + monto + fecha
- [x] Flash chips de sugerencias contextuales
- [x] Submit button (flecha +)
- [x] Lógica de parseo extraída de SmartInputSheet
- [x] Integración con Dexie para crear transacciones

---

### 3. `Dashboard.tsx`

#### State nuevo

- `expandedTxId: string | null` — qué item está en modo edición
- Se elimina `tab` / `DashboardTab`
- `selectedMonth` se mantiene como `monthKey(now)` (siempre mes actual)

#### Cambios

- Se agrega `InlineSmartInput` debajo de BalanceCard (lo primero que ve el usuario después del balance)
- Se elimina el selector de tabs y la lógica condicional
- Inversiones se mueve al final de la lista de transacciones
- El `expandedTxId` se pasa a cada TransactionItem
- Al expandir un item, los demás se colapsan automáticamente

#### Estado implementado ✅

- [x] Eliminación de tabs (Resumen/Inversiones)
- [x] State `expandedTxId` para controlar item expandido
- [x] Inversiones al final del dashboard
- [x] TransactionItem recibe props `isExpanded` y `onToggle`
- [x] InlineSmartInput debajo de BalanceCard

---

### 4. `AppShell.tsx`

#### Eliminar

- `FAB` + import
- `SmartInputSheet` + import
- States: `inputOpen`, `editTransaction`, `sheetKey`
- Funciones: `openInput`, `handleClose`
- pushState/popState para el sheet

#### Mantener

- `CsvImportSheet` + state `csvOpen`
- `CsvImportProvider`
- `EditTransactionContext.Provider` — ahora conecta con inline editing

#### `EditTransactionContext`

- El contexto ahora notifica al Dashboard para expandir el item
- Dashboard maneja `expandedTxId`
- Ya no se abre ningún sheet

#### Estado implementado ✅

- [x] Eliminación de FAB y SmartInputSheet
- [x] Eliminación de states relacionados (inputOpen, editTransaction, sheetKey)
- [x] Eliminación de funciones (openInput, handleClose, handleEdit)
- [x] Eliminación de pushState/popState para el sheet
- [x] Mantenimiento de CsvImportSheet y CsvImportProvider
- [x] EditTransactionContext como no-op (compatible con inline editing)

---

### 5. `EditTransactionContext.tsx`

- Misma interfaz `(tx: Transaction) => void`
- El handler en Dashboard setea `expandedTxId` en lugar de abrir sheet

---

### 6. `Transactions.tsx` (actualizado para compatibilidad)

- Se agregó state `expandedTxId` para soportar el nuevo interface de TransactionItem
- Se agregó función `handleToggleExpand` para manejar la expansión de items
- TransactionItem recibe props `isExpanded` y `onToggle`
- Se cambió el contenedor de `bg-card border-maguito shadow-maguito rounded-lg` a `space-y-2` para mejor compatibilidad con items expandidos

#### Estado implementado ✅

- [x] Soporte para TransactionItem expandido
- [x] Compatibilidad con nuevo interface de props

---

## Orden de ejecución

| Paso | Archivo | Tarea | Estado |
|------|---------|-------|--------|
| 1 | `TransactionItem.tsx` | Modo expandido + badge de categoría + selector vertical | ✅ Completado |
| 2 | `Dashboard.tsx` | Reestructurar (sin tabs, expandedId, Inversiones al final) | ✅ Completado |
| 3 | `Transactions.tsx` | Actualizar para compatibilidad con nuevo TransactionItem | ✅ Completado |
| 4 | `InlineSmartInput.tsx` | Crear componente nuevo (input + preview + submit) | ✅ Completado |
| 5 | `AppShell.tsx` | Quitar FAB + SmartInputSheet, adaptar context | ✅ Completado |
| 6 | — | `npm run lint && npm test` | ✅ Completado |

---

## Restricciones del proyecto

- ✅ Sin animar `width`, `height`, `top`, `left` — usamos `max-height` + `opacity`
- ✅ Touch targets ≥ 44px
- ✅ Sin `localStorage` — todo Dexie/IndexedDB
- ✅ Local ISO dates (sin `toISOString()`)
- ✅ CSS tokens del `@theme` (sin hex hardcoded)
- ✅ Dark mode: cada color tiene counterpart en `[data-theme="dark"]`
- ✅ Bundle: no se agregan dependencias nuevas

---

## Decisiones pendientes

- [ ] Rediseño visual de FlashChips (post-implementación, ver espacios con el nuevo layout)
