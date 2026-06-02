import type { ParsedTransaction, RecurringConfig } from '../types'
import { KEYWORDS, INCOME_KEYWORDS, RECURRING_KEYWORDS } from './categories'

function generateId(): string {
  return crypto.randomUUID()
}

function todayISO(): string {
  return toLocalISO(new Date())
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseAmount(text: string): { amount: number; remaining: string } {
  const patterns = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?/,
    /(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:pesos|ars|usd|dolares|dólares)?/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const rawNumber = match[1]
      const decimals = match[2]
      const normalized = rawNumber.replace(/[.,]/g, '')
      const amount = decimals
        ? parseFloat(`${normalized}.${decimals}`)
        : parseFloat(normalized)
      const remaining = text.replace(match[0], ' ').replace(/\s+/g, ' ').trim()
      return { amount, remaining }
    }
  }

  return { amount: 0, remaining: text }
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

  const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/
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

  const cuotasMatch = lower.match(/(\d+)\s*\/\s*(\d+)/)
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
