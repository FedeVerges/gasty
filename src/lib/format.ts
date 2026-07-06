import type { Currency } from '../types'

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }),
  USD: new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
}

export function formatMoney(amount: number, currency: Currency = 'ARS'): string {
  return FORMATTERS[currency].format(amount)
}

export function formatCompact(amount: number, currency: Currency = 'ARS'): string {
  const formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  return formatter.format(amount)
}

const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const MONTHS_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function formatDate(iso: string): string {
  const datePart = iso.split('T')[0]
  const timePart = iso.split('T')[1]
  const [y, m, d] = datePart.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  let result: string
  if (diff === 0) {
    result = 'Hoy'
  } else if (diff === 1) {
    result = 'Ayer'
  } else if (diff === -1) {
    result = 'Mañana'
  } else if (diff > 1 && diff < 7) {
    result = `Hace ${diff} días`
  } else if (diff < 0 && diff > -7) {
    result = `En ${-diff} días`
  } else {
    result = `${d} ${MONTHS_ES[m - 1]}`
  }

  if (timePart) {
    const [h, min] = timePart.split(':')
    result += ` ${h}:${min}`
  }

  return result
}

export function formatDateFull(iso: string): string {
  const datePart = iso.split('T')[0]
  const timePart = iso.split('T')[1]
  const [, m, d] = datePart.split('-').map(Number)
  let result = `${d} de ${MONTHS_FULL[m - 1]}`
  if (timePart) {
    const [h, min] = timePart.split(':')
    result += ` ${h}:${min}`
  }
  return result
}

export function formatMonth(date: Date = new Date()): string {
  return `${MONTHS_FULL[date.getMonth()].charAt(0).toUpperCase() + MONTHS_FULL[date.getMonth()].slice(1)} ${date.getFullYear()}`
}

export { MONTHS_FULL, MONTHS_ES }
