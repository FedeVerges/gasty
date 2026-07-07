import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Transaction } from '../types'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useAllTransactions(): Transaction[] {
  return (
    useLiveQuery(() => db.transactions.toArray(), [], []) ?? []
  )
}

export function useTransactionsForMonth(year: number, month: number): Transaction[] {
  return (
    useLiveQuery(
      async () => {
        const start = toLocalISO(new Date(year, month, 1))
        const end = toLocalISO(new Date(year, month + 1, 0))
        return db.transactions
          .where('date')
          .between(start, end, true, true)
          .toArray()
      },
      [year, month],
      [],
    ) ?? []
  )
}

export function useRecentTransactions(limit: number = 5): Transaction[] {
  return (
    useLiveQuery(
      async () => {
        const all = await db.transactions.toArray()
        return all
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit)
      },
      [limit],
      [],
    ) ?? []
  )
}
