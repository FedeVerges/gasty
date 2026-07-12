import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Investment } from '../types'

export function useInvestments(): Investment[] {
  return useLiveQuery(() => db.investments.toArray(), [], []) ?? []
}

/**
 * Total amount saved across the whole app (sum of all transactions in the
 * `savings` category, regardless of month). This is the pool that the
 * Inversiones module distributes among investment destinations.
 */
export function useSavingsTotal(): number {
  return (
    useLiveQuery(async () => {
      const all = await db.transactions.toArray()
      return all
        .filter((t) => t.type === 'expense' && t.categoryId === 'savings')
        .reduce((acc, t) => acc + t.amount, 0)
    }, [], 0) ?? 0
  )
}
