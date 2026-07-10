#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# docs-report.sh — Genera un reporte de cambios recientes y
# estado actual del codebase para que el agente actualice docs.
#
# Solo lee información. NO modifica ningún archivo.
# Uso: bash scripts/docs-report.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

echo "═══ REPORTE DE CAMBIOS — $(date +%Y-%m-%d) ═══"
echo ""

# ── 1. Últimos 10 commits ──
echo "## ÚLTIMOS 10 COMMITS"
git log --oneline -10 2>/dev/null || echo "(sin historial git)"
echo ""

# ── 2. Archivos cambiados en src/ (últimos 10 commits) ──
echo "## ARCHIVOS CAMBIADOS EN src/"
git diff --name-only HEAD~10..HEAD -- src/ 2>/dev/null | sort || echo "(sin cambios)"
echo ""

# ── 3. Archivos nuevos en src/ ──
echo "## ARCHIVOS NUEVOS EN src/"
git diff --diff-filter=A --name-only HEAD~10..HEAD -- src/ 2>/dev/null | sort || echo "(ninguno)"
echo ""

# ── 4. Archivos eliminados en src/ ──
echo "## ARCHIVOS ELIMINADOS EN src/"
git diff --diff-filter=D --name-only HEAD~10..HEAD -- src/ 2>/dev/null | sort || echo "(ninguno)"
echo ""

# ── 5. Estado actual del codebase ──
echo "## COMPONENTES ACTUALES (src/components/)"
find src/components -name '*.tsx' 2>/dev/null | sed 's|^src/components/||' | sort
echo ""

echo "## HOOKS ACTUALES (src/hooks/)"
find src/hooks -name '*.ts' 2>/dev/null | sed 's|^src/hooks/||' | sort
echo ""

echo "## LIBS ACTUALES (src/lib/)"
find src/lib -name '*.ts' 2>/dev/null | sed 's|^src/lib/||' | sort
echo ""

echo "## TESTS (tests/)"
find tests -name '*.ts' 2>/dev/null | sed 's|^tests/||' | sort
echo ""

echo "## E2E SPECS (e2e/)"
find e2e -name '*.spec.ts' 2>/dev/null | sed 's|^e2e/||' | sort
echo ""

# ── 6. Métricas clave ──
echo "## DB VERSION"
grep -oE 'db\.version\([0-9]+\)' src/lib/db.ts 2>/dev/null \
  | grep -oE '[0-9]+' | sort -n | tail -1 || echo "1"
echo ""

echo "## TOTAL KEYWORDS EN CATEGORIES"
awk '/keywords: \[/{found=1} found && /\]/{found=0} found && /'\''[a-z]/{count++} END{print count+0}' src/lib/categories.ts 2>/dev/null
echo ""

echo "## TOTAL CATEGORÍAS DEFAULT"
grep -c "id: '" src/lib/categories.ts 2>/dev/null || echo "0"
echo ""

echo "## TESTS: ARCHIVOS Y LÍNEAS"
for f in tests/*.ts; do
  [ -f "$f" ] && echo "  $(basename "$f"): $(wc -l < "$f") líneas"
done
echo ""

echo "## toLocalISO: FORMATO DE RETORNO"
grep -A6 'function toLocalISO' src/lib/parser.ts 2>/dev/null | grep 'return' | head -1
echo ""

echo "═══ FIN DEL REPORTE ═══"
