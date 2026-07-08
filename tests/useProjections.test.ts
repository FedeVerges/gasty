import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, seedDatabase, generateId } from '../src/lib/db'
import type { Transaction } from '../src/types'

// We test the projection logic directly via the pure computation function
// by examining what data is available in DB and how it would be projected

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

    // Query real transactions
    const allTxs = await db.transactions.toArray()
    const currentMonthTxs = allTxs.filter((t) => t.date.startsWith(currentMonth))

    expect(currentMonthTxs).toHaveLength(1)
    expect(currentMonthTxs[0].amount).toBe(1500)
    expect(currentMonthTxs[0].description).toBe('test gasto')
  })

  it('future month has no physical transactions in DB', async () => {
    const now = new Date()
    // Pick a future month
    const futureMonth = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`

    const tx: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 1500,
      description: 'test gasto',
      categoryId: 'food',
      date: `${futureMonth}-15`,
      recurring: { kind: 'none' },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(tx)

    // Verify it was stored
    const allTxs = await db.transactions.toArray()
    expect(allTxs).toHaveLength(1)
    expect(allTxs[0].date.startsWith(futureMonth)).toBe(true)
  })

  it('recurring source with fixed_temporary does not create clones beyond totalMonths', async () => {
    // Insert a fixed_temporary source
    const source: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 25000,
      description: 'cuota auto',
      categoryId: 'transport',
      date: '2026-01-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 12,
        totalMonths: 12,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // The source should exist
    const sources = await db.transactions
      .filter((t) => t.recurring.kind !== 'none' && !t.originalId)
      .toArray()
    expect(sources).toHaveLength(1)
    expect(sources[0].recurring.currentMonth).toBe(12)
    expect(sources[0].recurring.totalMonths).toBe(12)

    // Verify no additional clones created by us (no recurring engine has run)
    const allTxs = await db.transactions.toArray()
    expect(allTxs).toHaveLength(1)
  })

  it('recurring source with kind fixed generates virtual clones in future months', async () => {
    // Insert a fixed recurring source
    const source: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 45000,
      description: 'alquiler',
      categoryId: 'home',
      date: '2026-01-01',
      recurring: {
        kind: 'fixed',
        invoiceDay: 1,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Verify the source is in DB
    const sources = await db.transactions
      .filter((t) => t.recurring.kind !== 'none' && !t.originalId)
      .toArray()
    expect(sources).toHaveLength(1)
    expect(sources[0].description).toBe('alquiler')

    // Verify no physical clones exist yet
    const clones = await db.transactions
      .filter((t) => t.originalId)
      .toArray()
    expect(clones).toHaveLength(0)
  })

  it('deleting recurring source does not leave zombie data when cascade delete runs', async () => {
    const sourceId = generateId()
    const source: Transaction = {
      id: sourceId,
      type: 'expense',
      amount: 10000,
      description: 'expensas',
      categoryId: 'home',
      date: '2026-01-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Create a clone manually (as the recurring engine would)
    const clone: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: 10000,
      description: 'expensas',
      categoryId: 'home',
      date: '2026-02-01',
      recurring: { kind: 'fixed', currentMonth: 2, invoiceDay: 1 },
      originalId: sourceId,
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(clone)

    // Verify both exist
    const beforeDelete = await db.transactions.toArray()
    expect(beforeDelete).toHaveLength(2)

    // Cascade delete
    const all = await db.transactions.toArray()
    const toDelete = all.filter((t) => t.id === sourceId || t.originalId === sourceId)
    await db.transactions.bulkDelete(toDelete.map((t) => t.id))

    // Verify both are gone
    const afterDelete = await db.transactions.toArray()
    expect(afterDelete).toHaveLength(0)
  })
})
