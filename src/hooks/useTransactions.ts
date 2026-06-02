import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Transaction } from '../types'

export function useAllTransactions(): Transaction[] {
  return (
    useLiveQuery(() => db.transactions.toArray(), [], []) ?? []
  )
}

export function useTransactionsForMonth(year: number, month: number): Transaction[] {
  return (
    useLiveQuery(
      async () => {
        const start = new Date(year, month, 1).toISOString().slice(0, 10)
        const end = new Date(year, month + 1, 0).toISOString().slice(0, 10)
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
