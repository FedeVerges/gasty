import type { ParsedTransaction, RecurringConfig } from '../types'
import { KEYWORDS, INCOME_KEYWORDS, RECURRING_KEYWORDS } from './categories'
import { generateId } from './db'

function todayISO(): string {
  return toLocalISO(new Date())
}

export function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

/**
 * Parse a currency string into a number.
 * Handles formats like:
 *   "ARS 590,000.00" → 590000  (comma=thousands, dot=decimal)
 *   "ARS 590.000,00" → 590000  (dot=thousands, comma=decimal)
 *   "$ 45.000"       → 45000   (dot=thousands, no decimals)
 *   "45000"          → 45000
 *
 * @param text - The raw text to parse
 * @param opts - Optional format hints (thousandsSep, decimalSep, stripCurrencyPrefix)
 *   When omitted, auto-detects based on the pattern of separators.
 */
export function parseAmountFromText(
  text: string,
  opts?: { thousandsSep?: string; decimalSep?: string; stripCurrencyPrefix?: boolean },
): { amount: number; remaining: string } {
  // 1. Strip currency prefix if configured or by default
  const stripPrefix = opts?.stripCurrencyPrefix !== false
  let cleaned = text
  if (stripPrefix) {
    // Match common prefixes: "ARS", "USD", "$", "US$", "U$S", "pesos"
    cleaned = cleaned.replace(/\b(ars|usd|u\$s|dolares|dólares|pesos)\b\s*/gi, '')
    cleaned = cleaned.replace(/^\$\s*/, '')
    cleaned = cleaned.replace(/^US\$\s*/, '')
  }

  // 2. Find all number-like tokens (word-boundary delimited)
  const tokenPattern = /\d[\d.,]*/g
  const tokens: Array<{ value: string; start: number; end: number }> = []
  let m: RegExpExecArray | null
  while ((m = tokenPattern.exec(cleaned)) !== null) {
    tokens.push({ value: m[0], start: m.index, end: m.index + m[0].length })
  }

  if (tokens.length === 0) {
    return { amount: 0, remaining: text }
  }

  // Pick the last numeric token (most likely the amount when there are multiple numbers)
  const token = tokens[tokens.length - 1]!
  const raw = token.value

  // 3. Determine format: auto-detect or use hints
  const dotPos = raw.lastIndexOf('.')
  const commaPos = raw.lastIndexOf(',')

  const userThousands = opts?.thousandsSep !== 'auto' ? opts?.thousandsSep : undefined
  const userDecimal = opts?.decimalSep !== 'auto' ? opts?.decimalSep : undefined

  let thousandsSep: string | undefined = userThousands
  let decimalSep: string | undefined = userDecimal

  if (!thousandsSep && !decimalSep) {
    // Both auto — detect from the number itself
    if (dotPos >= 0 && commaPos >= 0) {
      // Both present — the one closer to the end is decimal
      if (commaPos > dotPos) {
        thousandsSep = '.'
        decimalSep = ','
      } else {
        thousandsSep = ','
        decimalSep = '.'
      }
    } else if (dotPos >= 0) {
      // Only dot: "45.000" → thousands, "45.50" → decimal (<=2 digits after = decimal)
      const afterDot = raw.length - dotPos - 1
      if (afterDot <= 2) {
        decimalSep = '.'
      } else {
        thousandsSep = '.'
      }
    } else if (commaPos >= 0) {
      // Only comma: "45,000" → thousands, "45,50" → decimal (<=2 digits after = decimal)
      const afterComma = raw.length - commaPos - 1
      if (afterComma <= 2) {
        decimalSep = ','
      } else {
        thousandsSep = ','
      }
    }
  } else if (thousandsSep && !decimalSep) {
    // User provided thousands — infer decimal as the other separator
    if (thousandsSep === ',' && dotPos >= 0) {
      const afterDot = raw.length - dotPos - 1
      if (afterDot <= 2) decimalSep = '.'
    } else if (thousandsSep === '.' && commaPos >= 0) {
      const afterComma = raw.length - commaPos - 1
      if (afterComma <= 2) decimalSep = ','
    }
  } else if (!thousandsSep && decimalSep) {
    // User provided decimal — infer thousands as the other separator
    if (decimalSep === '.' && commaPos >= 0) {
      thousandsSep = ','
    } else if (decimalSep === ',' && dotPos >= 0) {
      thousandsSep = '.'
    }
  }
  // else: both provided by user — use as-is

  // 4. Strip thousands separator, normalize decimal to dot
  let normalized = raw
  if (thousandsSep) {
    // Remove all occurrences of the thousands separator
    const escaped = thousandsSep === '.' ? '\\.' : thousandsSep === ',' ? ',' : thousandsSep
    normalized = normalized.replace(new RegExp(escaped, 'g'), '')
  }
  if (decimalSep && decimalSep !== '.') {
    // Replace decimal separator with dot for parseFloat
    const escaped = decimalSep === ',' ? ',' : decimalSep
    normalized = normalized.replace(new RegExp(escaped, 'g'), '.')
  }

  const amount = parseFloat(normalized)
  if (isNaN(amount) || amount <= 0) {
    return { amount: 0, remaining: text }
  }

  // 5. Build remaining text (everything before the token)
  const before = cleaned.slice(0, token.start).trim()
  const after = cleaned.slice(token.end).trim()
  const remaining = [before, after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  return { amount, remaining }
}

function parseAmount(text: string): { amount: number; remaining: string } {
  return parseAmountFromText(text)
}

function parseDate(text: string): { date: string; remaining: string } {
  const now = new Date()
  let working = text.toLowerCase()

  if (/\bhoy\b/.test(working)) {
    working = working.replace(/\bhoy\b/, '').trim()
    return { date: todayISO(), remaining: working }
  }

  if (/\bayer\b/.test(working)) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    working = working.replace(/\bayer\b/, '').trim()
    return { date: toLocalISO(d), remaining: working }
  }

  if (/\bmañana\b/.test(working)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    working = working.replace(/\bmañana\b/, '').trim()
    return { date: toLocalISO(d), remaining: working }
  }

  const monthsMap: Record<string, number> = {
    enero: 0, ene: 0,
    febrero: 1, feb: 1,
    marzo: 2, mar: 2,
    abril: 3, abr: 3,
    mayo: 4, may: 4,
    junio: 5, jun: 5,
    julio: 6, jul: 6,
    agosto: 7, ago: 7,
    septiembre: 8, set: 8, sept: 8,
    octubre: 9, oct: 9,
    noviembre: 10, nov: 10,
    diciembre: 11, dic: 11,
  }

  for (const [name, monthIdx] of Object.entries(monthsMap)) {
    const re = new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?${name}\\b`)
    const m = working.match(re)
    if (m) {
      const day = parseInt(m[1], 10)
      const year = monthIdx < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear()
      const d = new Date(year, monthIdx, day)
      working = working.replace(re, '').trim()
      return { date: toLocalISO(d), remaining: working }
    }
    const re2 = new RegExp(`\\b${name}\\b`)
    if (re2.test(working)) {
      const d = new Date(now.getFullYear(), monthIdx, 1)
      working = working.replace(re2, '').trim()
      return { date: toLocalISO(d), remaining: working }
    }
  }

  const datePattern = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/
  const dm = working.match(datePattern)
  if (dm) {
    const day = parseInt(dm[1], 10)
    const month = parseInt(dm[2], 10) - 1
    let year = now.getFullYear()
    if (dm[3]) {
      year = dm[3].length === 2 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10)
    } else if (month < now.getMonth()) {
      year = now.getFullYear() + 1
    }
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(year, month, day)
      working = working.replace(datePattern, '').trim()
      return { date: toLocalISO(d), remaining: working }
    }
  }

  return { date: todayISO(), remaining: working }
}

function detectType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase()
  return INCOME_KEYWORDS.some((kw) => lower.includes(kw)) ? 'income' : 'expense'
}

function detectCategory(text: string, type: 'income' | 'expense'): string {
  const lower = text.toLowerCase()
  for (const [keyword, catId] of KEYWORDS) {
    if (lower.includes(keyword)) {
      if (type === 'income' && (catId === 'salary' || catId === 'other_inc')) {
        return catId
      }
      if (type === 'expense' && catId !== 'salary' && catId !== 'other_inc') {
        return catId
      }
    }
  }
  return type === 'income' ? 'other_inc' : 'other_exp'
}

function detectRecurring(text: string): { recurring: RecurringConfig; remaining: string } {
  const lower = text.toLowerCase()

  const cuotasMatch = lower.match(/(\d+)\s*\/\s*(\d+)(?!\s*\/\s*\d{2,4})/)
  if (cuotasMatch) {
    const current = parseInt(cuotasMatch[1], 10)
    const total = parseInt(cuotasMatch[2], 10)
    if (current >= 1 && current <= total && total < 240) {
      const remaining = text.replace(cuotasMatch[0], '').trim()
      return {
        recurring: {
          kind: 'fixed_temporary',
          currentMonth: current,
          totalMonths: total,
        },
        remaining,
      }
    }
  }

  if (RECURRING_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      recurring: { kind: 'fixed' },
      remaining: text,
    }
  }

  return { recurring: { kind: 'none' }, remaining: text }
}

/**
 * Normaliza un nombre de categoría para matching:
 * lower case, trim, NFKD + remover diacríticos.
 */
export function normalizeCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

function cleanDescription(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim()
}

export function parseInput(input: string): ParsedTransaction | null {
  if (!input || !input.trim()) return null

  let working = input.trim()

  const { recurring, remaining: afterRecurring } = detectRecurring(working)
  working = afterRecurring

  const { date, remaining: afterDate } = parseDate(working)
  working = afterDate

  const { amount, remaining: afterAmount } = parseAmount(working)
  working = afterAmount

  const type = detectType(input)
  const categoryId = detectCategory(input, type)
  const description = cleanDescription(working) || (type === 'income' ? 'Ingreso' : 'Gasto')

  if (amount <= 0) return null

  return {
    type,
    amount,
    description,
    categoryId,
    date,
    recurring: {
      ...recurring,
      invoiceDay: new Date(date).getDate(),
    },
  }
}

export function createTransactionFromParsed(
  parsed: ParsedTransaction,
): import('../types').Transaction {
  return {
    id: generateId(),
    type: parsed.type,
    amount: parsed.amount,
    description: parsed.description,
    categoryId: parsed.categoryId,
    date: parsed.date,
    recurring: parsed.recurring,
    createdAt: new Date().toISOString(),
  }
}
