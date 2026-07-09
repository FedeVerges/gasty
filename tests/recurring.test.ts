import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { db, seedDatabase } from '../src/lib/db'
import { parseInput, createTransactionFromParsed } from '../src/lib/parser'
import { checkAndCloneRecurring } from '../src/lib/recurring'

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
