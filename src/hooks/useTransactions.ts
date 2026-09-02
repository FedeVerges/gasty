import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Transaction } from '../types'
import { useProfile } from '../context/ProfileContext'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useAllTransactions(): Transaction[] {
  const { profile } = useProfile()
  return (
    useLiveQuery(() => profile ? db.transactions.where('profileId').equals(profile.id).toArray() : [], [profile?.id], []) ?? []
  )
}

export function useTransactionsForMonth(year: number, month: number): Transaction[] {
  const { profile } = useProfile()
  return (
    useLiveQuery(
      async () => {
        const start = toLocalISO(new Date(year, month, 1))
        const end = toLocalISO(new Date(year, month + 1, 0))
        if (!profile) return []
        return db.transactions.where('[profileId+date]').between([profile.id, start], [profile.id, end], true, true).toArray()
      },
      [year, month, profile?.id],
      [],
    ) ?? []
  )
}

export function useRecentTransactions(limit: number = 5): Transaction[] {
  const { profile } = useProfile()
  return (
    useLiveQuery(
      async () => {
        if (!profile) return []
        const all = await db.transactions.where('profileId').equals(profile.id).toArray()
        return all
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit)
      },
      [limit, profile?.id],
      [],
    ) ?? []
  )
}
