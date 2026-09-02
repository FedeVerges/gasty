import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Investment } from '../types'
import { useProfile } from '../context/ProfileContext'

export function useInvestments(): Investment[] {
  const { profile } = useProfile()
  return useLiveQuery(() => profile ? db.investments.where('profileId').equals(profile.id).toArray() : [], [profile?.id], []) ?? []
}

/**
 * Total amount saved across the whole app (sum of all transactions in the
 * `savings` category, regardless of month). This is the pool that the
 * Inversiones module distributes among investment destinations.
 */
export function useSavingsTotal(): number {
  const { profile } = useProfile()
  return (
    useLiveQuery(async () => {
      if (!profile) return 0
      const all = await db.transactions.where('profileId').equals(profile.id).toArray()
      return all
        .filter((t) => t.type === 'expense' && t.categoryId === 'savings')
        .reduce((acc, t) => acc + t.amount, 0)
    }, [profile?.id], 0) ?? 0
  )
}
