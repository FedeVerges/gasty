import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedDatabase, generateId } from '../src/lib/db'
import { createFutureClones } from '../src/lib/recurring'
import type { Transaction } from '../src/types'

describe('useProjections: data layer', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('current month returns real transactions from DB', async () => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const tx: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 1500,
      description: 'test gasto',
      categoryId: 'food',
      date: `${currentMonth}-15`,
      recurring: { kind: 'none' },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(tx)

    const allTxs = await db.transactions.toArray()
    const currentMonthTxs = allTxs.filter((t) => t.date.startsWith(currentMonth))

    expect(currentMonthTxs).toHaveLength(1)
    expect(currentMonthTxs[0].amount).toBe(1500)
    expect(currentMonthTxs[0].description).toBe('test gasto')
  })

  it('future month has real transactions when created by createFutureClones', async () => {
    const now = new Date()
    const futureMonth = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`

    const source: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 45000,
      description: 'alquiler',
      categoryId: 'home',
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // createFutureClones writes real rows to DB
    await createFutureClones(source)

    const allTxs = await db.transactions.toArray()
    const futureTxs = allTxs.filter((t) => t.date.startsWith(futureMonth))

    expect(futureTxs.length).toBeGreaterThan(0)
    expect(futureTxs[0].amount).toBe(45000)
    expect(futureTxs[0].originalId).toBe(source.id)
  })

  it('recurring source with fixed_temporary creates clones for all remaining months', async () => {
    const source: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 25000,
      description: 'cuota auto',
      categoryId: 'transport',
      date: '2026-07-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 1,
        totalMonths: 6,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    await createFutureClones(source)

    const allTxs = await db.transactions.toArray()
    const clones = allTxs.filter((t) => t.originalId === source.id)
    expect(clones).toHaveLength(6)

    // Each clone should be a real DB row
    for (const clone of clones) {
      expect(clone.id).not.toContain('virtual')
      expect(clone.originalId).toBe(source.id)
    }
  })

  it('deleting recurring source removes future clones from DB', async () => {
    const sourceId = generateId()
    const source: Transaction = {
      id: sourceId,
      type: 'expense',
      amount: 10000,
      description: 'expensas',
      categoryId: 'home',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Create future clones
    await createFutureClones(source)

    // Verify clones exist
    const beforeDelete = await db.transactions.toArray()
    const clonesBefore = beforeDelete.filter((t) => t.originalId === sourceId)
    expect(clonesBefore.length).toBeGreaterThan(0)

    // Simulate deleteRecurringSource by converting source + deleting clones
    await db.transactions.update(sourceId, { recurring: { kind: 'none' } })
    const all = await db.transactions.toArray()
    const toDelete = all.filter((t) => t.originalId === sourceId)
    await db.transactions.bulkDelete(toDelete.map((t) => t.id))

    // Verify clones are gone
    const afterDelete = await db.transactions.toArray()
    const clonesAfter = afterDelete.filter((t) => t.originalId === sourceId)
    expect(clonesAfter).toHaveLength(0)

    // Source should still exist as normal transaction
    const srcAfter = afterDelete.find((t) => t.id === sourceId)
    expect(srcAfter).toBeDefined()
    expect(srcAfter!.recurring.kind).toBe('none')
  })
})
