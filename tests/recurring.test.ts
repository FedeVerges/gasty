import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { db, seedDatabase } from '../src/lib/db'
import { parseInput, createTransactionFromParsed } from '../src/lib/parser'
import { checkAndCloneRecurring, deleteRecurringSource } from '../src/lib/recurring'
import type { Transaction } from '../src/types'

describe('recurring: auto-clonado', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clona un gasto recurrente fijo para el mes actual', async () => {
    const parsed = parseInput('alquiler 45000')
    const tx = createTransactionFromParsed(parsed!)
    await db.transactions.add(tx)

    const cloned = await checkAndCloneRecurring()
    expect(cloned).toBe(1)

    const all = await db.transactions.toArray()
    expect(all.length).toBe(2)

    const clones = all.filter((t) => t.originalId)
    expect(clones.length).toBe(1)
    expect(clones[0].recurring.kind).toBe('fixed')
  })

  it('no clona dos veces en el mismo mes', async () => {
    const parsed = parseInput('alquiler 45000')
    const tx = createTransactionFromParsed(parsed!)
    await db.transactions.add(tx)

    await checkAndCloneRecurring()
    const clonedAgain = await checkAndCloneRecurring()
    expect(clonedAgain).toBe(0)
  })

  it('clona cuota temporal e incrementa currentMonth', async () => {
    const parsed = parseInput('cuota auto 25000 1/24')
    const tx = createTransactionFromParsed(parsed!)
    await db.transactions.add(tx)

    await checkAndCloneRecurring()
    const all = await db.transactions.toArray()
    const clone = all.find((t) => t.originalId)
    expect(clone).toBeDefined()
    expect(clone?.recurring.currentMonth).toBe(2)
  })

  it('clona cuota temporal con currentMonth incrementado en mes siguiente', async () => {
    const sourceDate = new Date(2026, 5, 15, 10, 0)

    const parsed = parseInput('cuota auto 25000 1/24')
    const tx = createTransactionFromParsed(parsed!)
    await db.transactions.add(tx)

    const firstCloned = await checkAndCloneRecurring(sourceDate)
    expect(firstCloned).toBe(1)

    const secondCloned = await checkAndCloneRecurring(new Date(2026, 6, 15, 10, 0))
    expect(secondCloned).toBe(1)

    const clones = (await db.transactions.where('originalId').equals(tx.id).toArray()).sort((a, b) => a.date.localeCompare(b.date))
    expect(clones).toHaveLength(2)
    expect(clones[0]?.recurring.currentMonth).toBe(2)
    expect(clones[1]?.recurring.currentMonth).toBe(3)
  })

  it('no clona cuando currentMonth supera totalMonths', async () => {
    const parsed = parseInput('cuota auto 25000 24/24')
    const tx = createTransactionFromParsed(parsed!)
    tx.recurring.currentMonth = 25
    await db.transactions.add(tx)

    const cloned = await checkAndCloneRecurring()
    expect(cloned).toBe(0)
  })

  it('gasto no recurrente no se clona', async () => {
    const parsed = parseInput('birra 1500')
    const tx = createTransactionFromParsed(parsed!)
    await db.transactions.add(tx)

    const cloned = await checkAndCloneRecurring()
    expect(cloned).toBe(0)
  })
})

describe('recurring: ingresos recurrentes', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clona un ingreso recurrente fijo para el mes actual', async () => {
    const incomeTx: Transaction = {
      id: crypto.randomUUID(),
      type: 'income',
      amount: 500000,
      description: 'Sueldo',
      categoryId: 'salary',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(incomeTx)

    const cloned = await checkAndCloneRecurring()
    expect(cloned).toBe(1)

    const all = await db.transactions.toArray()
    const clones = all.filter((t) => t.originalId === incomeTx.id)
    expect(clones.length).toBe(1)
    expect(clones[0].type).toBe('income')
    expect(clones[0].amount).toBe(500000)
    expect(clones[0].description).toBe('Sueldo')
  })

  it('no clona dos veces un ingreso recurrente en el mismo mes', async () => {
    const incomeTx: Transaction = {
      id: crypto.randomUUID(),
      type: 'income',
      amount: 500000,
      description: 'Sueldo',
      categoryId: 'salary',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(incomeTx)

    await checkAndCloneRecurring()
    const second = await checkAndCloneRecurring()
    expect(second).toBe(0)
  })
})

describe('recurring: borrado protegido', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('preserva clones pasados y solo borra futuros', async () => {
    // Create source in June
    const source: Transaction = {
      id: 'src-001',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-06-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: '2026-06-01T10:00',
    }
    await db.transactions.add(source)

    // Create a past clone (June)
    const pastClone: Transaction = {
      id: 'clone-past',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-06-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      originalId: 'src-001',
      createdAt: '2026-06-01T10:00',
    }
    await db.transactions.add(pastClone)

    // Create a future clone (August — beyond today July 2026)
    const futureClone: Transaction = {
      id: 'clone-future',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-08-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      originalId: 'src-001',
      createdAt: '2026-07-01T10:00',
    }
    await db.transactions.add(futureClone)

    // Delete the recurring source
    await deleteRecurringSource('src-001')

    const all = await db.transactions.toArray()

    // Source should still exist as a normal transaction
    const srcStill = all.find((t) => t.id === 'src-001')
    expect(srcStill).toBeDefined()
    expect(srcStill!.recurring.kind).toBe('none')

    // Past clone should be preserved
    const pastStill = all.find((t) => t.id === 'clone-past')
    expect(pastStill).toBeDefined()

    // Future clone should be deleted
    const futureGone = all.find((t) => t.id === 'clone-future')
    expect(futureGone).toBeUndefined()
  })

  it('la fuente queda como transacción normal después de borrar', async () => {
    const source: Transaction = {
      id: 'src-002',
      type: 'income',
      amount: 500000,
      description: 'Sueldo',
      categoryId: 'salary',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: '2026-07-01T10:00',
    }
    await db.transactions.add(source)

    await deleteRecurringSource('src-002')

    const updated = await db.transactions.get('src-002')
    expect(updated).toBeDefined()
    expect(updated!.recurring.kind).toBe('none')
    expect(updated!.type).toBe('income')
    expect(updated!.amount).toBe(500000)
  })

  it('no rompe si la fuente no existe', async () => {
    await expect(deleteRecurringSource('nonexistent')).resolves.toBeUndefined()
  })
})
