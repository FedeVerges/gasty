import { parseInput, createTransactionFromParsed, parseAmountFromText } from './parser'
import { db } from './db'
import { DEFAULT_CATEGORIES } from './categories'
import type { CsvFormatSettings } from '../types'

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
    // ── Core category names ──
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
    'servicios públicos': 'services',
    'servicios publicos': 'services',
    alimentación: 'food',
    alimentacion: 'food',
    'entretenimiento y salidas a comer': 'leisure',
    entretenimiento: 'leisure',
    suscripciones: 'services',
    suscripción: 'services',
    ocio: 'leisure',
    'salud y bienestar': 'health',
    'belleza y cuidado personal': 'health',
    'educación y formación': 'education',
    'compras y retail': 'other_exp',
    compras: 'other_exp',
    'impuestos y tasas': 'other_exp',
    impuestos: 'other_exp',
    'seguros': 'other_exp',
    'transferencias': 'other_exp',
    'cuotas': 'other_exp',
    'préstamos': 'other_exp',
    prestamos: 'other_exp',
    'créditos': 'other_exp',
    creditos: 'other_exp',
    'inversiones': 'other_exp',
    'donaciones': 'other_exp',
    'mascotas': 'other_exp',
    'regalos': 'other_exp',
    'baby': 'other_exp',
    'tecnología': 'other_exp',
    tecnologia: 'other_exp',
    'hogar y muebles': 'home',
    'electrodomésticos': 'home',
    electrodomesticos: 'home',
    'ropa y calzado': 'other_exp',
    'farmacia': 'health',
    'gimnasio': 'leisure',
    'streaming': 'services',
    'combustible': 'transport',
    'estacionamiento': 'transport',
    'peaje': 'transport',
    'taxi / uber': 'transport',
    'delivery': 'food',
    'supermercado / mercado': 'supermarket',
    'restaurante': 'leisure',
    'café': 'leisure',
    cafe: 'leisure',
    'bar': 'leisure',
    'cine': 'leisure',
    'teatro': 'leisure',
    'viaje': 'leisure',
    'hotel': 'leisure',
    'alojamiento': 'leisure',
    'farmacia / medicamentos': 'health',
    'médico': 'health',
    medico: 'health',
    'dentista': 'health',
    'hospital': 'health',
    'análisis': 'health',
    analisis: 'health',
    'colegio': 'education',
    'universidad': 'education',
    'curso': 'education',
    'libro': 'education',
    'matrícula': 'education',
    matricula: 'education',
    'útiles': 'education',
    utiles: 'education',
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

export function parseCsvContent(
  content: string,
  csvFormat?: CsvFormatSettings,
): { rows: CsvRow[]; errors: number[] } {
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

    const date = map.dateIdx >= 0 ? cols[map.dateIdx]?.trim() : ''
    // Build text for parseInput: "description AMOUNT DATE"
    const amountStr = String(amount)
    let text = `${desc} ${amountStr}`
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
