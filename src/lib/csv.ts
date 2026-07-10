import { createTransactionFromParsed, parseAmountFromText, toLocalISO, normalizeCategory, parseInput } from './parser'
import { db } from './db'
import { DEFAULT_CATEGORIES, getPaletteColor } from './categories'
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
  type: 'expense' | 'income'
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
  descriptions: string[]
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

    // ── Run through the same parser the manual input uses ──
    // Reconstruct a natural-language-style string from CSV columns
    // (description + amount only — no date, because the ISO date format
    // YYYY-MM-DDTHH:mm confuses the parser's DD/MM date detection).
    // Same engine as SmartInputSheet: detectRecurring → parseAmount →
    // detectType → detectCategory → cleanDescription.
    const parserInput = `${desc} ${Math.round(amount)}`
    const parsed = parseInput(parserInput)

    // Parser-derived fields (fallback to CSV-extracted values if parser returns null)
    let type: 'expense' | 'income' = parsed?.type ?? 'expense'
    let categoryId = parsed?.categoryId ?? 'other_exp'

    // ── Category override from CSV column ──
    // If the CSV has an explicit category column, match it against existing
    // categories. This takes priority over the parser's keyword detection
    // because the CSV carries explicit user-provided classification.
    let categoryName = ''

    if (map.catIdx >= 0) {
      const catRaw = cols[map.catIdx]?.trim()
      if (catRaw) {
        const normalizedCat = normalizeCategory(catRaw)
        const matched = cats.find((c) => normalizeCategory(c.name) === normalizedCat)

        categoryName = catRaw
        if (matched) {
          // CSV category matches an existing one — override parser result
          categoryId = matched.id
          if (matched.type === 'income' || matched.type === 'both') {
            type = 'income'
          } else {
            type = 'expense'
          }
        } else {
          // Unknown category from CSV — queue for auto-creation
          const existingPending = pendingCategories.find(
            (p) => p.name.toLowerCase() === catRaw.toLowerCase()
          )
          if (existingPending) {
            if (!existingPending.descriptions.includes(desc)) {
              existingPending.descriptions.push(desc)
            }
          } else {
            pendingCategories.push({
              name: catRaw.trim(),
              categoryName: catRaw.trim(),
              type: 'expense',
              descriptions: [desc],
            })
          }
        }
      }
    }

    if (!categoryName) {
      const cat = cats.find((c) => c.id === categoryId)
      categoryName = cat?.name ?? categoryId
    }

    rows.push({
      description: desc || (type === 'income' ? 'Ingreso' : 'Gasto'),
      amount,
      date,
      categoryId,
      categoryName,
      type,
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

    let colorIndex = existingCats.length
    for (const pending of pendingCategories) {
      const cleanName = pending.name.trim()

      // Normalize: remove accents for id generation
      const idBase = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
      const id = `csv_${idBase}`

      if (existingIds.has(id) || existingNames.has(cleanName.toLowerCase())) continue

      const color = getPaletteColor(colorIndex++)

      // Build keywords: category name + all unique descriptions from rows
      const descriptionKeywords = pending.descriptions
        .map((d) => d.toLowerCase().trim())
        .filter((k) => k.length > 0)

      await db.categories.add({
        id,
        name: cleanName,
        emoji: '📂',
        color,
        type: pending.type === 'income' ? 'income' : 'expense',
        keywords: [cleanName.toLowerCase(), ...descriptionKeywords],
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
        type: row.type,
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
