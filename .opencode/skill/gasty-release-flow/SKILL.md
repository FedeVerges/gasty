---
name: gasty-release-flow
description: Use ONLY when building for production, packaging the PWA, wiring Capacitor for Android, or deploying to the Play Store. Triggers on: 'build', 'release', 'PWA', 'Capacitor', 'Play Store', 'Android', 'manifest', 'icon-192', 'icon-512', 'service worker', 'deploy'.
---

# Release Flow — PWA + Capacitor Android

Gasty se distribuye en dos formatos:
1. **PWA** (objetivo principal): se sirve desde la web, instalable, offline-ready.
2. **Capacitor Android wrapper** (futuro): se sube a Play Store. La lógica es 100% la misma; el wrapper es un WebView que carga `dist/index.html`.

Este skill cubre el runbook de build y empaquetado.

## Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

⚠️ `build` corre `tsc -b && vite build`. **No** quitar el `tsc -b` (vite no chequea tipos por sí solo).

## Build de PWA

```bash
# 1. Limpiar
rm -rf dist

# 2. Type-check + bundle
npm run build

# 3. Verificar tamaños
du -sh dist/
gzip -c dist/assets/*.js | wc -c    # < 102400 (100KB)
gzip -c dist/assets/*.css | wc -c   # < 10240 (10KB)

# 4. Verificar que el manifest está embebido
cat dist/manifest.webmanifest | head -20

# 5. Smoke test
npm run preview                     # abre el dist en :4173
# → abrir en Chrome DevTools, simular mobile, verificar:
#   - la app carga offline (con SW registrado)
#   - la paleta es correcta (light + dark)
#   - el input inteligente parsea "alquiler 45000" correctamente
#   - el FAB navega al SmartInputSheet
#   - los tabs cambian sin reload
```

## PWA Manifest — `vite.config.ts` (líneas 14-41)

```ts
manifest: {
  name: 'Gasty',
  short_name: 'Gasty',
  description: 'Tu app de gastos, simple y rápida',
  theme_color: '#7c3aed',           // DEBE matchear --color-accent en index.css
  background_color: '#f9fafb',
  display: 'standalone',
  orientation: 'portrait',
  start_url: '/',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}
```

⚠️ **No inventar campos nuevos** sin coordinación. El test E2E del manifest (Chrome DevTools → Application → Manifest) valida que Chrome pueda instalarla.

## Iconos

Archivos requeridos (en `public/`):
- `favicon.svg`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-512-maskable.png` (opcional; podés usar el mismo 512 con `purpose: 'any maskable'`)

Si falta alguno:

```bash
# Generar desde el SVG con sharp (ya está en devDependencies)
node -e "
  const sharp = require('sharp');
  const fs = require('fs');
  const svg = fs.readFileSync('public/favicon.svg');
  sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
  sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');
  sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512-maskable.png');
"
```

## Service Worker — `vite-plugin-pwa`

`vite.config.ts` usa `VitePWA({ registerType: 'autoUpdate', ... })`. El SW se genera automáticamente con Workbox. El comportamiento es:

- En cada build, se genera un nuevo SW con un nuevo `self.skipWaiting()` y `clients.claim()`.
- La próxima vez que el usuario abre la app, se descarga el nuevo SW y se activa.
- El viejo SW se desactiva y limpia sus cachés.

**No** escribir un SW custom. El plugin hace todo lo que necesitamos (precaching de assets del build).

⚠️ Si querés cambiar la estrategia de caching (ej. agregar runtime caching para una API), editá la sección `workbox: { ... }` de `VitePWA`. **No** crees un `src/service-worker.ts` separado; el plugin no lo va a usar a menos que cambies `strategies: 'injectManifest'`.

## Capacitor — setup one-time

```bash
# 1. Instalar (solo devDependencies; no se envía a la app)
npm install -D @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar (responde interactivamente o con flags)
npx cap init Gasty com.gasty.app --web-dir=dist

# 3. Crear el proyecto Android nativo
npx cap add android

# Esto crea:
# ├── android/                          # proyecto Android Studio
# ├── capacitor.config.ts               # generado
# └── .gitignore debe incluir android/app/build/
```

Resultado en `capacitor.config.ts`:
```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gasty.app',
  appName: 'Gasty',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
```

## Capacitor — sync antes de cada release

```bash
# 1. Build fresco
rm -rf dist
npm run build

# 2. Sync (copia dist/ a android/app/src/main/assets/public/)
npx cap sync android

# 3. Abrir Android Studio para review
npx cap open android
```

Dentro de Android Studio:
- Verificar que `android/app/src/main/AndroidManifest.xml` no tiene permisos innecesarios (Gasty no usa cámara, GPS, ni nada nativo).
- Cambiar versionCode / versionName en `android/app/build.gradle`.
- Build → Generate Signed Bundle / APK → elegí "Android App Bundle" para Play Store.

## Versioning

| Tipo | Cuándo | Ejemplo |
|---|---|---|
| Patch | Bug fixes, copy fixes, deps patch | 0.1.0 → 0.1.1 |
| Minor | Nuevas features, nuevas categorías, schema compatible | 0.1.x → 0.2.0 |
| Major | Breaking changes en schema, rediseño de UI, cambio de licencia | 0.x → 1.0.0 |

⚠️ Schema Dexie bump NO requiere major version (los datos del usuario se preservan con `.upgrade()`).

## Play Store checklist

Antes de subir a Play Store por primera vez:

- [ ] `android/app/build.gradle`: `applicationId` = `com.gasty.app`, `versionCode` y `versionName` actualizados.
- [ ] `android/app/src/main/res/values/strings.xml`: `app_name` = "Gasty".
- [ ] Icono de app en `android/app/src/main/res/mipmap-*/` (todos los densities).
- [ ] Splash: Capacitor genera uno blanco por defecto; reemplazalo con un splash morado de Gasty (Android 12+ usa el `windowSplashScreen`).
- [ ] Firma: generá un keystore (`keytool -genkey -v -keystore gasty-release.keystore -alias gasty -keyalg RSA -keysize 2048 -validity 10000`), guardalo en lugar seguro, configurá `signingConfigs` en `build.gradle`.
- [ ] Permisos: Gasty no necesita ninguno declarado. Si agregás una feature nativa que sí, justificalo en la descripción de Play Store.
- [ ] Privacy policy: Gasty no envía datos a ningún servidor. Declaralo en la ficha de Play Store.
- [ ] Target SDK: 34 (Android 14) o el que pida Google al momento del upload.
- [ ] App Bundle (AAB) generado en modo "release", firmado con el keystore.

## CHANGELOG

Si decidís mantener un `CHANGELOG.md`, el formato Keep a Changelog es razonable:

```markdown
# Changelog

## [0.2.0] - 2026-06-XX
### Added
- Soporte para editar transacciones desde el sheet
- Categoría custom: Mascotas 🐶

### Fixed
- Parser no detectaba "sueldo 1.500,50" como decimal

## [0.1.0] - 2026-05-XX
### Added
- MVP: smart input, dashboard, transactions, stats, settings
- 12 categorías predefinidas
- Recurrentes fijos y temporales
- Dark mode
```

## Anti-patterns

- 🟥 Handwritear un service worker custom (el plugin lo genera).
- 🟥 Switchear a `registerType: 'prompt'` (UX regression: los usuarios nunca aceptan).
- 🟥 Quitar `tsc -b` del build script (vite no chequea tipos).
- 🟥 Olvidar `cap sync` después de un cambio de `dist/`.
- 🟥 `versionCode` sin bumpear entre releases (Play Store rechaza).
- 🟥 Subir el keystore al repo (está en `.gitignore` por defecto, verificar).
- 🟥 Declarar permisos en el `AndroidManifest.xml` que la app no usa (Play Store puede rechazar).
- 🟥 Hardcodear el path de assets en `index.html` (vite resuelve los imports).
- 🟥 Bypassear el budget de bundle con un hack en build (`.vsignore`, externals) — el budget es la fuente de verdad.
