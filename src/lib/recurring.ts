import { db, generateId } from './db'
import type { Transaction, RecurringConfig } from '../types'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Max months to generate for indefinite ('fixed') recurring sources.
 * Fixed_temporary uses its own totalMonths.
 * @todo v2: consider "generate on demand" for multi-year recurring expenses
 */
const FIXED_HORIZON_MONTHS = 12

/**
 * Shared logic: compute which clone rows need to be created for a recurring
 * source, skipping months that already have a clone (preserving manual edits).
 *
 * Clones start from the source's own date (not from today), so a recurring
 * expense dated March 2026 will generate clones starting in March 2026
 * regardless of the current date.
 *
 * NOTE: For 'fixed', clones include the source's own month (i=0). This means
 * both the source row and a clone will exist for the same month. The Dashboard
 * sums all rows for a month, so this is effectively double-counted. This is
 * intentional — the source is the "master" record and the clone is the
 * "generated" record. The clone can be edited independently (e.g., if the
 * amount changes for a specific month).
 *
 * This is the single source of truth for month iteration, day clamping,
 * and year rollover — used by both createFutureClones and editRecurringSource.
 */
function buildCloneRows(
  source: Transaction,
  existingMonths: Set<string>,
): Transaction[] {
  const recurring = source.recurring
  if (recurring.kind === 'none') return []

  // Anchor: start from the source's own date
  const [srcYear, srcMonth] = source.date.split('-').map(Number)
  const startYear = srcYear
  const startMonthIdx = srcMonth - 1 // 0-indexed

  const invoiceDay = recurring.invoiceDay ?? 1
  const clones: Transaction[] = []

  if (recurring.kind === 'fixed_temporary') {
    const total = recurring.totalMonths ?? 0
    const sourceCurrentMonth = recurring.currentMonth ?? 1
    const remaining = total - sourceCurrentMonth + 1

    for (let i = 0; i < remaining; i++) {
      const targetMonthIdx = startMonthIdx + i
      const targetYear = startYear + Math.floor(targetMonthIdx / 12)
      const m = targetMonthIdx % 12
      const clampedDay = Math.min(invoiceDay, new Date(targetYear, m + 1, 0).getDate())
      const date = toLocalISO(new Date(targetYear, m, clampedDay))
      const monthKey = date.slice(0, 7)

      if (existingMonths.has(monthKey)) continue

      clones.push({
        id: generateId(),
        type: source.type,
        amount: source.amount,
        description: source.description,
        categoryId: source.categoryId,
        emoji: source.emoji,
        date,
        recurring: { ...recurring, currentMonth: sourceCurrentMonth + i },
        originalId: source.id,
        createdAt: new Date().toISOString(),
      })
    }
  } else {
    // 'fixed' — create for source month + next 11
    for (let i = 0; i < FIXED_HORIZON_MONTHS; i++) {
      const targetMonthIdx = startMonthIdx + i
      const targetYear = startYear + Math.floor(targetMonthIdx / 12)
      const m = targetMonthIdx % 12
      const clampedDay = Math.min(invoiceDay, new Date(targetYear, m + 1, 0).getDate())
      const date = toLocalISO(new Date(targetYear, m, clampedDay))
      const monthKey = date.slice(0, 7)

      if (existingMonths.has(monthKey)) continue

      clones.push({
        id: generateId(),
        type: source.type,
        amount: source.amount,
        description: source.description,
        categoryId: source.categoryId,
        emoji: source.emoji,
        date,
        recurring: { ...recurring },
        originalId: source.id,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return clones
}

/**
 * Build a Set of month-keys ("YYYY-MM") from an array of transactions.
 */
function monthsOf(txs: Transaction[]): Set<string> {
  const s = new Set<string>()
  for (const tx of txs) s.add(tx.date.slice(0, 7))
  return s
}

/**
 * Create all future clone rows for a recurring source in one go.
 * Called when the user confirms a new recurring transaction.
 *
 * Clones start from the source's date and extend forward:
 * - `fixed`: 12 months from the source date
 * - `fixed_temporary`: all remaining months from the source date
 *
 * The source itself is NOT modified. Clones are real DB rows.
 *
 * @param source - The recurring source transaction
 * @param existingClones - Clones already in DB; months with an existing clone are skipped
 */
export async function createFutureClones(
  source: Transaction,
  existingClones?: Transaction[],
): Promise<Transaction[]> {
  const existingMonths = existingClones ? monthsOf(existingClones) : new Set<string>()
  const clones = buildCloneRows(source, existingMonths)

  if (clones.length > 0) {
    await db.transactions.bulkAdd(clones)
  }

  return clones
}

/**
 * Edit an existing recurring source: update its data, delete excess clones
 * (for fixed_temporary if totalMonths was reduced), and create clones only
 * for months that don't already exist. Existing future clones with manual
 * edits are preserved.
 *
 * Handles conversion from normal → recurring (source had kind: 'none').
 *
 * Everything runs in a single Dexie transaction to avoid stale reads.
 */
export async function editRecurringSource(
  sourceId: string,
  updatedSource: Partial<Transaction> & Pick<Transaction, 'id'>,
  newRecurring?: RecurringConfig,
): Promise<void> {
  const recurring = newRecurring ?? updatedSource.recurring

  await db.transaction('rw', db.transactions, async () => {
    const source = await db.transactions.get(sourceId)
    if (!source) return

    // 1. Update the source
    await db.transactions.update(sourceId, {
      ...updatedSource,
      recurring,
    })

    // 2. For fixed_temporary: if totalMonths was reduced, delete excess clones
    if (recurring?.kind === 'fixed_temporary') {
      const newTotal = recurring.totalMonths ?? 0
      const clones = await db.transactions
        .where('originalId')
        .equals(sourceId)
        .toArray()

      const excess = clones.filter((c) => (c.recurring.currentMonth ?? 0) > newTotal)
      if (excess.length > 0) {
        await db.transactions.bulkDelete(excess.map((c) => c.id))
      }
    }

    // 3. Create only missing months (same transaction, using shared helper)
    if (recurring && recurring.kind !== 'none') {
      const allExisting = await db.transactions
        .where('originalId')
        .equals(sourceId)
        .toArray()

      // Build the full source from updated params (avoids stale re-read)
      const fullSource: Transaction = {
        id: sourceId,
        type: updatedSource.type ?? source.type,
        amount: updatedSource.amount ?? source.amount,
        description: updatedSource.description ?? source.description,
        categoryId: updatedSource.categoryId ?? source.categoryId,
        date: updatedSource.date ?? source.date,
        recurring,
        createdAt: source.createdAt,
        ...(updatedSource.emoji ? { emoji: updatedSource.emoji } : {}),
      }

      const newClones = buildCloneRows(fullSource, monthsOf(allExisting))
      if (newClones.length > 0) {
        await db.transactions.bulkAdd(newClones)
      }
    }
  })
}

/**
 * Return all source transactions (those with recurring.kind !== 'none' and no originalId).
 */
export async function getRecurringSources(): Promise<Transaction[]> {
  const all = await db.transactions.toArray()
  return all.filter((t) => t.recurring.kind !== 'none' && !t.originalId)
}

/**
 * Stop a recurring series: convert source to 'kind: 'none'' and delete only
 * FUTURE clones (date >= today). Past clones are preserved.
 */
export async function deleteRecurringSource(id: string): Promise<void> {
  const today = toLocalISO(new Date())

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
