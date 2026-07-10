---
description: Analiza cambios recientes en el codebase y actualiza AGENTS.md, docs/functional.md y docs/architecture.md
agent: build
---

# Update Documentation

Ejecutá `bash scripts/docs-report.sh` para obtener el reporte de cambios.

Después, leé estos archivos:
- `AGENTS.md`
- `docs/functional.md`
- `docs/architecture.md`

Y también leé los archivos fuente que el reporte menciona como cambiados o nuevos en `src/`.

## Tu tarea

Compará el estado actual del codebase (lo que dice el reporte y los archivos fuente) contra lo que dicen los 3 documentos. Actualizá los documentos para que reflejen la realidad del código.

### Cosas específicas a verificar y actualizar:

**AGENTS.md:**
- File layout: que todos los componentes, hooks, libs, tests y e2e specs estén listados
- Commands: que los comandos npm estén actualizados
- toLocalISO: que el snippet de código coincida con lo que retorna realmente
- Descripción "What is Gasty": que mencione features nuevas

**docs/functional.md:**
- §1 Visión General: mencionar features nuevas (Flash, proyecciones, CSV, emoji editor)
- §2.1 Agregar Transacción: FlashChips, selector de categoría inline
- §2.2 Editar Transacción: EmojiEditor
- §3 Tabla de pantallas: componentes clave por tab
- §5.2 Keywords: count actualizado
- §6.2 Categorías: count actualizado
- §9 Acciones por pantalla: funcionalidad real de cada tab
- §11 Gasty Flash: documentar si existe
- §12 Proyección de Gastos: documentar si existe

**docs/architecture.md:**
- §2 Diagrama de capas: todos los componentes, hooks, libs
- §4 DB schema: versión actual y migraciones
- §5.3 Tokens CSS: tokens nuevos (proyector-*, card-dark, etc.)
- §7 Parsing: funciones exportadas por archivo
- §9 Comandos: incluir e2e
- §11 Testing: paths correctos (tests/ no src/lib/), conteo de tests
- §12 Migraciones: última versión
- §13 Checklist: paths actualizados
- §14 E2E: specs listados

## Reglas

- Mantené el formato existente de cada doc (tablas, listas, código)
- No agregues secciones que no correspondan al código actual
- Si algo ya está documentado correctamente, no lo modifiques
- Reportá al final qué cambios hiciste en cada archivo
