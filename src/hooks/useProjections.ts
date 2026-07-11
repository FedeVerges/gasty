import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Hook that returns real transactions for a given month (YYYY-MM).
 * All data comes from the DB — no virtual clones, no in-memory generation.
 * `isProjection` is a visual flag: true when the selected month is in the future.
 */
export function useProjections(month: string): {
  transactions: import('../types').Transaction[]
  isProjection: boolean
} {
  const allTransactions = useLiveQuery(
    () => db.transactions.toArray(),
    [],
    [],
  )

  const data = useMemo(() => {
    const txs = allTransactions ?? []
    const filtered = txs.filter((tx) => tx.date.startsWith(month))
    const isProjection = month > monthKey(new Date())
    return { transactions: filtered, isProjection }
  }, [allTransactions, month])

  return data
}
