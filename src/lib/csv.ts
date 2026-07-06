import { parseInput, createTransactionFromParsed } from './parser'
import { db } from './db'
import { DEFAULT_CATEGORIES } from './categories'

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
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

const HEADER_PATTERN = /^(desc|description|monto|amount|importe|fecha|date|categor)/i

function isHeaderRow(cols: string[]): boolean {
  return cols.length > 0 && HEADER_PATTERN.test(cols[0])
}

function matchCategory(name: string): string | null {
  const lower = name.toLowerCase().trim()
  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.name.toLowerCase() === lower || cat.id === lower) {
      return cat.id
    }
  }
  const aliases: Record<string, string> = {
    comida: 'food',
    vivienda: 'home',
    servicios: 'services',
    transporte: 'transport',
    salidas: 'leisure',
    reparaciones: 'repair',
    salud: 'health',
    educacion: 'education',
    educación: 'education',
    supermercado: 'supermarket',
    otros: 'other_exp',
    sueldo: 'salary',
    'otros ingresos': 'other_inc',
    alquiler: 'home',
    luz: 'services',
    gas: 'services',
    internet: 'services',
    celular: 'services',
    super: 'supermarket',
    nafta: 'transport',
    taxi: 'transport',
    uber: 'transport',
  }
  return aliases[lower] ?? null
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
    (c) => c === 'desc' || c === 'description' || c === 'concepto' || c === 'detalle' || c === 'nombre',
  )
  const amountIdx = lower.findIndex(
    (c) => c === 'monto' || c === 'amount' || c === 'importe' || c === 'valor',
  )
  const dateIdx = lower.findIndex(
    (c) => c === 'fecha' || c === 'date' || c === 'dia' || c === 'día',
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

export function parseCsvContent(content: string): { rows: CsvRow[]; errors: number[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: CsvRow[] = []
  const errors: number[] = []
  let startLine = 0

  const firstCols = parseCSVLine(lines[0])
  const hasHeader = isHeaderRow(firstCols)
  let map: CsvColumnMap = { descIdx: 0, amountIdx: 1, dateIdx: -1, catIdx: -1 }

  if (hasHeader) {
    startLine = 1
    map = determineCols(firstCols)
  }

  for (let i = startLine; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const desc = cols[map.descIdx]?.trim()
    const amountRaw = cols[map.amountIdx]?.trim().replace(/[$]/g, '')

    if (!desc || !amountRaw || isNaN(Number(amountRaw))) {
      errors.push(i + 1)
      continue
    }

    const date = map.dateIdx >= 0 ? cols[map.dateIdx]?.trim() : ''
    let text = `${desc} ${amountRaw}`
    if (date) text += ` ${date}`

    const parsed = parseInput(text)
    if (!parsed) {
      errors.push(i + 1)
      continue
    }

    let categoryId = parsed.categoryId
    let categoryName = ''

    if (map.catIdx >= 0) {
      const catRaw = cols[map.catIdx]?.trim()
      if (catRaw) {
        const matched = matchCategory(catRaw)
        categoryName = catRaw
        if (matched) {
          categoryId = matched
        }
      }
    }

    if (!categoryName) {
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === categoryId)
      categoryName = cat?.name ?? categoryId
    }

    rows.push({
      description: parsed.description,
      amount: parsed.amount,
      date: parsed.date,
      categoryId,
      categoryName,
      rawLine: i + 1,
    })
  }

  return { rows, errors }
}

export async function executeImport(rows: CsvRow[]): Promise<CsvImportResult> {
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
