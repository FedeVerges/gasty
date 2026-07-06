import { parseInput, createTransactionFromParsed } from './parser'
import { db } from './db'

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

const HEADER_PATTERN = /^(desc|description|monto|amount|importe|fecha|date)/i

function isHeaderRow(cols: string[]): boolean {
  return cols.length > 0 && HEADER_PATTERN.test(cols[0])
}

function determineCols(cols: string[]): { descIdx: number; amountIdx: number; dateIdx: number } {
  const lower = cols.map((c) => c.toLowerCase().trim())
  const descIdx = lower.findIndex(
    (c) => c === 'desc' || c === 'description' || c === 'concepto' || c === 'detalle'
  )
  const amountIdx = lower.findIndex(
    (c) => c === 'monto' || c === 'amount' || c === 'importe' || c === 'valor'
  )
  const dateIdx = lower.findIndex(
    (c) => c === 'fecha' || c === 'date' || c === 'dia' || c === 'día'
  )

  return {
    descIdx: descIdx >= 0 ? descIdx : 0,
    amountIdx: amountIdx >= 0 ? amountIdx : 1,
    dateIdx: dateIdx >= 0 ? dateIdx : -1,
  }
}

export interface CsvImportResult {
  imported: number
  errors: number
  errorLines: number[]
}

export async function importCsv(content: string): Promise<CsvImportResult> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  let imported = 0
  let errors = 0
  const errorLines: number[] = []
  let startLine = 0

  const firstCols = parseCSVLine(lines[0])
  const hasHeader = isHeaderRow(firstCols)
  let descIdx = 0
  let amountIdx = 1
  let dateIdx = -1

  if (hasHeader) {
    startLine = 1
    const cols = determineCols(firstCols)
    descIdx = cols.descIdx
    amountIdx = cols.amountIdx
    dateIdx = cols.dateIdx
  }

  for (let i = startLine; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const desc = cols[descIdx]?.trim()
    const amountRaw = cols[amountIdx]?.trim().replace(/[$.]/g, '')

    if (!desc || !amountRaw || isNaN(Number(amountRaw))) {
      errors++
      errorLines.push(i + 1)
      continue
    }

    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : ''
    let text = `${desc} ${amountRaw}`
    if (date) text += ` ${date}`

    const parsed = parseInput(text)
    if (!parsed) {
      errors++
      errorLines.push(i + 1)
      continue
    }

    const tx = createTransactionFromParsed(parsed)
    await db.transactions.add(tx)
    imported++
  }

  return { imported, errors, errorLines }
}
