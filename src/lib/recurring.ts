import { db, generateId } from './db'
import type { Transaction } from '../types'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export async function checkAndCloneRecurring(now: Date = new Date()): Promise<number> {
  const allTransactions = await db.transactions.toArray()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const recurringSources = new Map<string, Transaction>()

  for (const tx of allTransactions) {
    if (tx.recurring.kind === 'none') continue
    if (tx.originalId) continue
    recurringSources.set(tx.id, tx)
  }

  const existingClones = await db.transactions
    .where('originalId')
    .notEqual('')
    .toArray()

  const cloneMap = new Map<string, Set<string>>()
  for (const clone of existingClones) {
    if (!clone.originalId) continue
    if (!cloneMap.has(clone.originalId)) {
      cloneMap.set(clone.originalId, new Set())
    }
    const monthKey = clone.date.slice(0, 7)
    cloneMap.get(clone.originalId)!.add(monthKey)
  }

  let cloned = 0

  for (const [originalId, source] of recurringSources) {
    const months = cloneMap.get(originalId) ?? new Set<string>()
    const currentMonthKey = toLocalISO(now).slice(0, 7)

    if (months.has(currentMonthKey)) continue

    if (source.recurring.kind === 'fixed_temporary') {
      const total = source.recurring.totalMonths ?? 0
      if (total > 0 && (source.recurring.currentMonth ?? 0) > total) continue
    }

    const day = source.recurring.invoiceDay ?? now.getDate()
    const newDate = toLocalISO(new Date(currentYear, currentMonth, day))

    const currentMonthNum = source.recurring.currentMonth ?? 1
    const cloneCount = months.size
    let recurring = source.recurring

    if (source.recurring.kind === 'fixed_temporary') {
      const nextCurrentMonth = currentMonthNum + cloneCount + 1
      const total = source.recurring.totalMonths ?? 0
      if (total > 0 && nextCurrentMonth > total) continue
      recurring = { ...source.recurring, currentMonth: nextCurrentMonth }
    }

    await db.transactions.add({
      id: generateId(),
      type: source.type,
      amount: source.amount,
      description: source.description,
      categoryId: source.categoryId,
      date: newDate,
      recurring,
      originalId,
      createdAt: new Date().toISOString(),
    })

    cloned++
  }

  return cloned
}

export async function getRecurringSources(): Promise<Transaction[]> {
  const all = await db.transactions.toArray()
  return all.filter((t) => t.recurring.kind !== 'none' && !t.originalId)
}

export async function deleteRecurringSource(id: string): Promise<void> {
  const today = toLocalISO(new Date()).slice(0, 10) // 'YYYY-MM-DD'

  await db.transaction('rw', db.transactions, async () => {
    const source = await db.transactions.get(id)
    if (!source) return

    // Convert source into a normal (non-recurring) transaction
    await db.transactions.update(id, {
      recurring: { kind: 'none' },
    })

    // Delete only FUTURE clones (date >= today), preserve historical data
    const clones = await db.transactions
      .where('originalId')
      .equals(id)
      .toArray()

    const futureClones = clones.filter((c) => c.date >= today)
    if (futureClones.length > 0) {
      await db.transactions.bulkDelete(futureClones.map((c) => c.id))
    }
  })
}
