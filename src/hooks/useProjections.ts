import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Transaction, RecurringConfig } from '../types'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isCurrentOrPastMonth(monthStr: string): boolean {
  const now = new Date()
  return monthStr <= monthKey(now)
}

/**
 * Generate a virtual clone for a recurring source, calculated for a given target month.
 * Does NOT write to DB — returns a virtual Transaction with a deterministic id.
 */
function buildVirtualClone(
  source: Transaction,
  targetYear: number,
  targetMonth: number,
  deltaMonths: number,
): Transaction {
  const invoiceDay = source.recurring.invoiceDay ?? 1
  const clampedDay = Math.min(invoiceDay, new Date(targetYear, targetMonth + 1, 0).getDate())
  const newDate = toLocalISO(new Date(targetYear, targetMonth, clampedDay))
  const sourceCurrentMonth = source.recurring.currentMonth ?? 1

  const virtualRecurring: RecurringConfig = {
    ...source.recurring,
    currentMonth: sourceCurrentMonth + deltaMonths,
  }

  return {
    id: `virtual-${source.id}-${targetYear}-${targetMonth}`,
    type: source.type,
    amount: source.amount,
    description: source.description,
    categoryId: source.categoryId,
    date: newDate,
    recurring: virtualRecurring,
    originalId: source.id,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Hook that returns transactions for a given month (YYYY-MM).
 * - For current/past months: reads from DB (real data).
 * - For future months: returns real planned transactions + virtual clones
 *   generated in-memory from active recurring sources. NEVER writes to DB.
 */
export function useProjections(month: string): {
  transactions: Transaction[]
  isProjection: boolean
  /** Only for projection mode: how many virtual clones were generated */
  virtualCount: number
} {
  const allTransactions = useLiveQuery(
    () => db.transactions.toArray(),
    [],
    [],
  )

  const data = useMemo(() => {
    const txs = allTransactions ?? []

    // For current or past months, return real data
    if (isCurrentOrPastMonth(month)) {
      const filtered = txs.filter((tx) => tx.date.startsWith(month))
      return { transactions: filtered, isProjection: false, virtualCount: 0 }
    }

    // For future months: projection mode
    const [targetYearStr, targetMonthStr] = month.split('-')
    const targetYear = parseInt(targetYearStr, 10)
    const targetMonth = parseInt(targetMonthStr, 10) - 1

    // 1. Real transactions already planned/dated in that future month
    const realPlanned = txs.filter((tx) => tx.date.startsWith(month))

    // 2. Find all active recurring sources (not clones)
    const sources = txs.filter(
      (tx) => tx.recurring.kind !== 'none' && !tx.originalId,
    )

    // 3. Generate virtual clones for each source that should apply
    const virtualClones: Transaction[] = []

    for (const source of sources) {
      const sourceDate = new Date(source.date.slice(0, 10))

      // Calculate how many months between source date and target
      const deltaMonths =
        (targetYear - sourceDate.getFullYear()) * 12 +
        (targetMonth - sourceDate.getMonth())

      // Source starts from its first occurrence month
      if (deltaMonths < 0) continue // target is before source started

      // For fixed_temporary, check lifecycle
      if (source.recurring.kind === 'fixed_temporary') {
        const total = source.recurring.totalMonths ?? 0
        const sourceFirstMonth = source.recurring.currentMonth ?? 1
        const projectedCurrentMonth = sourceFirstMonth + deltaMonths

        if (total > 0 && projectedCurrentMonth > total) continue // expired

        virtualClones.push(
          buildVirtualClone(source, targetYear, targetMonth, deltaMonths),
        )
      } else {
        // 'fixed' — indefinite recurring, always generates a virtual clone
        virtualClones.push(
          buildVirtualClone(source, targetYear, targetMonth, deltaMonths),
        )
      }
    }

    // 4. Merge real + virtual, deduplicate by source id
    const virtualBySource = new Map<string, Transaction>()
    for (const vc of virtualClones) {
      if (vc.originalId) {
        virtualBySource.set(vc.originalId, vc)
      }
    }

    // Real planned transactions may already include manually entered clones
    for (const real of realPlanned) {
      if (real.originalId) {
        virtualBySource.delete(real.originalId)
      }
    }

    const merged = [...realPlanned, ...Array.from(virtualBySource.values())]

    return {
      transactions: merged,
      isProjection: true,
      virtualCount: virtualBySource.size,
    }
  }, [allTransactions, month])

  return data
}
