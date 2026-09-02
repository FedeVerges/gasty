# Gasty

App mobile-first para controlar gastos con un diseño Lemon-inspired. Web app (PWA) lista para empaquetar con Capacitor y llevar a Play Store.

## Stack

- **Vite 6** + **React 19** + **TypeScript**
- **Tailwind CSS v4** con tokens de tema via `@theme`
- **Dexie.js 4** (IndexedDB) con `useLiveQuery` para reactividad
- **vite-plugin-pwa** (Service Worker + manifest)
- **Vitest** para tests
- Sin router, sin state manager global, sin Framer Motion, sin Recharts
- Bundle final: **~105KB gzipped JS** + 5KB CSS

## Scripts

```bash
npm install        # instala deps
npm run dev        # dev server
npm run build      # build producción
npm run preview    # preview del build
npm test           # corre tests
npm run test:watch # tests en watch mode
npm run lint       # eslint
```

## Smart Input

El input interpreta lenguaje natural y clasifica automáticamente:

| Input | Resultado |
|-------|-----------|
| `birra 1500` | Gasto · $1.500 · Salidas · hoy |
| `lomito 3000 20-5` | Gasto · $3.000 · Comida · 20 may |
| `internet 8500` | Gasto · $8.500 · Servicios · hoy · 🔄 recurrente |
| `sueldo 150000 junio` | Ingreso · $150.000 · Sueldo · 1 jun |
| `cuota auto 25000 4/24` | Gasto · $25.000 · Transporte · ⏱️ 4/24 |
| `arreglo termotanque 35000` | Gasto · $35.000 · Reparaciones · hoy |

Reglas de detección:
- **Tipo**: keywords como "sueldo", "venta", "cobré" → ingreso
- **Monto**: números solos, con `$`, con `pesos`, con separador de miles
- **Fecha**: `DD-MM`, `DD/MM`, "15 junio", "ayer", "hoy", "mañana"
- **Categoría**: match por keyword contra diccionario de 80+ palabras
- **Recurrente**: `cuota X/Y` (temporal), o keywords como "alquiler" (fijo)

## Recurrentes

- **fixed**: se clona todos los meses (alquiler, internet, expensas)
- **fixed_temporary**: se clona hasta completar `currentMonth/totalMonths` (cuota auto 4/24)
- **none**: gasto único

El hook `useRecurringCheck` corre al montar la app y clona los recurrentes del mes actual si no existen.

## Datos

- Persistencia: IndexedDB via Dexie (no se borra como localStorage)
- Settings: IndexedDB (theme, currency)
- Categorías: 12 predefinidas (no editables en v1)

## Empaquetar para Play Store (futuro)

```bash
npm install -D @capacitor/core @capacitor/android
npx cap init Gasty com.gasty.app --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android
```

## Decisiones de diseño

- **No Framer Motion**: animaciones con CSS transitions (más liviano)
- **No Recharts**: SVG custom para donut y barras (0KB extra)
- **No React Router**: `useState` para tabs (más rápido)
- **No Zustand**: `useLiveQuery` de Dexie + Context para settings
- **Tailwind v4**: motor Rust, integración nativa con Vite
- **Sin virtualización**: <500 transacciones se manejan bien sin `react-virtuoso`

## v2 (próximamente)

- Editar/crear categorías custom
- Presupuestos mensuales por categoría
- Sincronización opcional con backend
- Recordatorios de pagos recurrentes
- Exportar CSV
- Soporte i18n
