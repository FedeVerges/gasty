import { createTransactionFromParsed, parseAmountFromText, toLocalISO, normalizeCategory } from './parser'
import { db } from './db'
import { DEFAULT_CATEGORIES } from './categories'
import type { CsvFormatSettings, Category } from '../types'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      // A comma between two digits is ambiguous: it could be a thousands
      // separator (e.g. "590,000.00") or a field delimiter followed by a
      // date (e.g. "...000.00,01/07/2026").  Look ahead: if the next token
      // looks like a DD/MM/YYYY date it's a field delimiter.
      const prev = i > 0 ? line[i - 1] : ''
      const next = i < line.length - 1 ? line[i + 1] : ''
      if (/\d/.test(prev) && /\d/.test(next)) {
        const remaining = line.slice(i + 1)
        const isDate = /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(remaining)
        if (!isDate) {
          current += ch
        } else {
          result.push(current.trim())
          current = ''
        }
      } else {
        result.push(current.trim())
        current = ''
      }
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

const HEADER_PATTERN = /^(desc|description|monto|amount|importe|nombre|fecha|date|categor)/i

function isHeaderRow(cols: string[]): boolean {
  return cols.length > 0 && HEADER_PATTERN.test(cols[0])
}

/**
 * Simple Levenshtein distance for fuzzy category matching.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Alias map for CSV category names → canonical category IDs.
 * Keys are lowercase, NFKD-normalized (no diacritics).
 */
const CATEGORY_ALIASES: Record<string, string> = {
  // ── Core category names ──
  comida: 'food',
  vivienda: 'home',
  servicios: 'services',
  transporte: 'transport',
  salidas: 'leisure',
  reparaciones: 'repair',
  salud: 'health',
  educacion: 'education',
  supermercado: 'supermarket',
  otros: 'other_exp',
  sueldo: 'salary',
  'otros ingresos': 'other_inc',

  // ── Common sub-aliases ──
  alquiler: 'home',
  luz: 'services',
  gas: 'services',
  internet: 'services',
  celular: 'services',
  super: 'supermarket',
  nafta: 'transport',
  taxi: 'transport',
  uber: 'transport',

  // ── Real CSV export categories (bancos, apps financieras) ──
  hogar: 'home',
  'vivienda y hogar': 'home',
  'finanzas y deudas': 'other_exp',
  finanzas: 'other_exp',
  deudas: 'other_exp',
  ahorros: 'other_exp',
  ahorro: 'other_exp',
  deporte: 'leisure',
  deportes: 'leisure',
  'servicios publicos': 'services',
  alimentacion: 'food',
  'entretenimiento y salidas a comer': 'leisure',
  entretenimiento: 'leisure',
  suscripciones: 'services',
  suscripcion: 'services',
  ocio: 'leisure',
  'salud y bienestar': 'health',
  'belleza y cuidado personal': 'health',
  'educacion y formacion': 'education',
  'compras y retail': 'other_exp',
  compras: 'other_exp',
  'impuestos y tasas': 'other_exp',
  impuestos: 'other_exp',
  seguros: 'other_exp',
  transferencias: 'other_exp',
  cuotas: 'other_exp',
  prestamos: 'other_exp',
  creditos: 'other_exp',
  inversiones: 'other_exp',
  donaciones: 'other_exp',
  mascotas: 'other_exp',
  regalos: 'other_exp',
  baby: 'other_exp',
  tecnologia: 'other_exp',
  'hogar y muebles': 'home',
  electrodomesticos: 'home',
  'ropa y calzado': 'other_exp',
  farmacia: 'health',
  gimnasio: 'leisure',
  streaming: 'services',
  combustible: 'transport',
  estacionamiento: 'transport',
  peaje: 'transport',
  'taxi / uber': 'transport',
  delivery: 'food',
  'supermercado / mercado': 'supermarket',
  restaurante: 'leisure',
  cafe: 'leisure',
  bar: 'leisure',
  cine: 'leisure',
  teatro: 'leisure',
  viaje: 'leisure',
  hotel: 'leisure',
  alojamiento: 'leisure',
  'farmacia / medicamentos': 'health',
  medico: 'health',
  dentista: 'health',
  hospital: 'health',
  analisis: 'health',
  colegio: 'education',
  universidad: 'education',
  curso: 'education',
  libro: 'education',
  matricula: 'education',
  utiles: 'education',
}

/**
 * Match a CSV category name to a Category.
 *
 * Strategy (in order):
 * 1. Exact match on normalized name or id (user categories first, then defaults)
 * 2. Alias map lookup (normalized)
 * 3. Partial match — all normalized words in input appear in category name
 * 4. Contains match — one normalized string contains the other
 * 5. Levenshtein distance ≤ 2
 */
function matchCategory(
  name: string,
  existingCategories?: Category[],
): Category | null {
  const normalized = normalizeCategory(name)
  const cats = existingCategories ?? DEFAULT_CATEGORIES

  // 1. Exact match on normalized name or id
  for (const cat of cats) {
    if (normalizeCategory(cat.name) === normalized || cat.id === normalized) {
      return cat
    }
  }

  // 2. Alias map
  const aliasId = CATEGORY_ALIASES[normalized]
  if (aliasId) {
    const cat = cats.find((c) => c.id === aliasId)
    if (cat) return cat
  }

  // 3. Partial match — all normalized words in input appear in category name
  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    for (const cat of cats) {
      const catNorm = normalizeCategory(cat.name)
      if (words.every((w) => catNorm.includes(w))) {
        return cat
      }
    }
  }

  // 4. Contains match (one contains the other)
  for (const cat of cats) {
    const catNorm = normalizeCategory(cat.name)
    if ((catNorm.includes(normalized) || normalized.includes(catNorm)) && normalized.length > 2) {
      return cat
    }
  }

  // 5. Levenshtein distance ≤ 2
  for (const cat of cats) {
    const catNorm = normalizeCategory(cat.name)
    if (levenshtein(normalized, catNorm) <= 2) {
      return cat
    }
  }

  return null
}

interface CsvColumnMap {
  descIdx: number
  amountIdx: number
  dateIdx: number
  catIdx: number
}

function determineCols(cols: string[]): CsvColumnMap {
  const lower = cols.map((c) => c.toLowerCase().trim())
  const descIdx = lower.findIndex(
    (c) => c === 'desc' || c === 'description' || c === 'concepto' || c === 'detalle' || c === 'nombre' || c === 'descripción' || c === 'descripcion' || c === 'detalle' || c === 'concepto',
  )
  const amountIdx = lower.findIndex(
    (c) => c === 'monto' || c === 'amount' || c === 'importe' || c === 'valor' || c === 'importe bruto' || c === 'debito' || c === 'crédito' || c === 'credito',
  )
  const dateIdx = lower.findIndex(
    (c) => c === 'fecha' || c === 'date' || c === 'dia' || c === 'día' || c === 'fecha de operación' || c === 'fecha de transacción',
  )
  const catIdx = lower.findIndex(
    (c) => c.startsWith('categor'),
  )

  return {
    descIdx: descIdx >= 0 ? descIdx : 0,
    amountIdx: amountIdx >= 0 ? amountIdx : 1,
    dateIdx: dateIdx >= 0 ? dateIdx : -1,
    catIdx: catIdx >= 0 ? catIdx : -1,
  }
}

export interface CsvRow {
  description: string
  amount: number
  date: string
  categoryId: string
  categoryName: string
  rawLine: number
}

export interface CsvImportResult {
  imported: number
  errors: number
  errorLines: number[]
}

export interface CsvPendingCategory {
  name: string
  categoryName: string
  type: 'expense' | 'income'
}

/**
 * Parse a date string from CSV into YYYY-MM-DD (local ISO).
 * Supports: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, YYYY-MM-DD
 */
function parseCsvDate(dateStr: string): string | null {
  const trimmed = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Already YYYY-MM-DD
    return trimmed
  }
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (match) {
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    let year = new Date().getFullYear()
    if (match[3]) {
      year = match[3].length === 2 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10)
    }
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return toLocalISO(new Date(year, month, day))
    }
  }
  return null
}

export function parseCsvContent(
  content: string,
  csvFormat?: CsvFormatSettings,
  existingCategories?: Category[],
): { rows: CsvRow[]; errors: number[]; pendingCategories: CsvPendingCategory[] } {
  // Strip UTF-8 BOM
  content = content.replace(/^\ufeff/, '')

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: CsvRow[] = []
  const errors: number[] = []
  const pendingCategories: CsvPendingCategory[] = []
  let startLine = 0

  const firstCols = parseCSVLine(lines[0])
  const hasHeader = isHeaderRow(firstCols)
  let map: CsvColumnMap = { descIdx: 0, amountIdx: 1, dateIdx: -1, catIdx: -1 }

  if (hasHeader) {
    startLine = 1
    map = determineCols(firstCols)
  }

  const cats = existingCategories ?? DEFAULT_CATEGORIES

  for (let i = startLine; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const desc = cols[map.descIdx]?.trim()

    // Parse amount using configurable format settings
    const amountRaw = cols[map.amountIdx]?.trim() ?? ''
    const { amount } = parseAmountFromText(amountRaw, {
      thousandsSep: csvFormat?.thousandsSeparator,
      decimalSep: csvFormat?.decimalSeparator,
      stripCurrencyPrefix: csvFormat?.stripCurrencyPrefix ?? true,
    })

    if (!desc || amount <= 0) {
      errors.push(i + 1)
      continue
    }

    // Parse date directly from CSV column (supports DD/MM/YYYY)
    const dateRaw = map.dateIdx >= 0 ? cols[map.dateIdx]?.trim() ?? '' : ''
    const parsedDate = dateRaw ? parseCsvDate(dateRaw) : null
    const date = parsedDate ?? toLocalISO(new Date())

    // Determine type: default to expense, override if matched category is income
    let type: 'expense' | 'income' = 'expense'

    // Match category via enhanced matching (fuzzy, user cats, aliases)
    let categoryId = 'other_exp'
    let categoryName = ''

    if (map.catIdx >= 0) {
      const catRaw = cols[map.catIdx]?.trim()
      if (catRaw) {
        const matched = matchCategory(catRaw, cats)
        categoryName = catRaw
        if (matched) {
          categoryId = matched.id
          if (matched.type === 'income' || matched.type === 'both') {
            type = 'income'
          }
        } else {
          // Unknown category from CSV — queue for auto-creation
          const existingPending = pendingCategories.find(
            (p) => p.name.toLowerCase() === catRaw.toLowerCase()
          )
          if (!existingPending) {
            pendingCategories.push({
              name: catRaw.trim(),
              categoryName: catRaw.trim(),
              type: 'expense',
            })
          }
        }
      }
    }

    if (!categoryName) {
      const cat = cats.find((c) => c.id === categoryId)
      categoryName = cat?.name ?? categoryId
    }

    const description = desc || (type === 'income' ? 'Ingreso' : 'Gasto')

    rows.push({
      description,
      amount,
      date,
      categoryId,
      categoryName,
      rawLine: i + 1,
    })
  }

  return { rows, errors, pendingCategories }
}

export async function executeImport(
  rows: CsvRow[],
  pendingCategories?: CsvPendingCategory[],
): Promise<CsvImportResult> {
  // Auto-create any pending categories before importing
  if (pendingCategories && pendingCategories.length > 0) {
    const existingCats = await db.categories.toArray()
    const existingIds = new Set(existingCats.map((c) => c.id))
    const existingNames = new Set(existingCats.map((c) => c.name.toLowerCase()))

    for (const pending of pendingCategories) {
      const cleanName = pending.name.trim()

      // Normalize: remove accents for id generation
      const idBase = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
      const id = `csv_${idBase}`

      if (existingIds.has(id) || existingNames.has(cleanName.toLowerCase())) continue

      const colors = [
        '#f59e0b', '#8b5cf6', '#06b6d4', '#3b82f6', '#ec4899',
        '#f97316', '#10b981', '#6366f1', '#22c55e', '#64748b',
      ]
      const color = colors[existingCats.length % colors.length]

      await db.categories.add({
        id,
        name: cleanName,
        emoji: '📂',
        color,
        type: pending.type === 'income' ? 'income' : 'expense',
        keywords: [cleanName.toLowerCase()],
      })

      // Update existing rows that reference this category
      for (const row of rows) {
        if (row.categoryName.toLowerCase() === cleanName.toLowerCase()) {
          row.categoryId = id
        }
      }
    }

    // Sync keyword maps after adding categories
    const { syncKeywordMaps } = await import('./categories')
    const allCats = await db.categories.toArray()
    syncKeywordMaps(allCats)
  }
  let imported = 0
  let errors = 0
  const errorLines: number[] = []

  for (const row of rows) {
    try {
      const tx = createTransactionFromParsed({
        type: 'expense',
        amount: row.amount,
        description: row.description,
        categoryId: row.categoryId,
        date: row.date,
        recurring: { kind: 'none' },
      })
      await db.transactions.add(tx)
      imported++
    } catch {
      errors++
      errorLines.push(row.rawLine)
    }
  }

  return { imported, errors, errorLines }
}
