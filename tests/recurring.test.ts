import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { db, seedDatabase } from '../src/lib/db'
import { createFutureClones, editRecurringSource, deleteRecurringSource } from '../src/lib/recurring'
import type { Transaction } from '../src/types'

describe('recurring: createFutureClones', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('crea 12 clones desde la fecha de la fuente (fixed)', async () => {
    const source: Transaction = {
      id: 'src-fixed',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(12)

    // Primer clone debe ser julio 2026 (mes de la fuente)
    const sorted = clones.sort((a, b) => a.date.localeCompare(b.date))
    expect(sorted[0].date).toBe('2026-07-01')
    // Último clone debe ser junio 2027
    expect(sorted[11].date).toBe('2027-06-01')
  })

  it('crea clones desde una fecha pasada (ej: marzo 2026)', async () => {
    const source: Transaction = {
      id: 'src-past',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-03-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(12)

    const sorted = clones.sort((a, b) => a.date.localeCompare(b.date))
    // Primer clone: marzo 2026
    expect(sorted[0].date).toBe('2026-03-01')
    // Último clone: febrero 2027
    expect(sorted[11].date).toBe('2027-02-01')
  })

  it('crea clones con fechas correctas (invoiceDay clamp)', async () => {
    const source: Transaction = {
      id: 'src-clamp',
      type: 'expense',
      amount: 10000,
      description: 'Expensas',
      categoryId: 'home',
      date: '2026-01-31',
      recurring: { kind: 'fixed', invoiceDay: 31 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)

    // Febrero 2026 tiene 28 días (2026 no es bisiesto), clamp a 28
    const febClone = clones.find((c) => c.date.startsWith('2026-02'))
    expect(febClone).toBeDefined()
    expect(febClone!.date).toBe('2026-02-28')

    // Marzo 2026 tiene 31 días, invoiceDay 31 se mantiene
    const marClone = clones.find((c) => c.date.startsWith('2026-03'))
    expect(marClone).toBeDefined()
    expect(marClone!.date).toBe('2026-03-31')
  })

  it('crea clones con originalId apuntando a la fuente', async () => {
    const source: Transaction = {
      id: 'src-origin',
      type: 'expense',
      amount: 5000,
      description: 'Internet',
      categoryId: 'services',
      date: '2026-07-15',
      recurring: { kind: 'fixed', invoiceDay: 15 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    await createFutureClones(source)

    const all = await db.transactions.toArray()
    const clones = all.filter((t) => t.originalId === 'src-origin')
    for (const clone of clones) {
      expect(clone.originalId).toBe('src-origin')
    }
  })

  it('no crea clones para recurring kind none', async () => {
    const source: Transaction = {
      id: 'src-none',
      type: 'expense',
      amount: 1500,
      description: 'Birra',
      categoryId: 'leisure',
      date: '2026-07-11',
      recurring: { kind: 'none' },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(0)
  })

  it('clona un ingreso recurrente fijo', async () => {
    const source: Transaction = {
      id: 'src-income',
      type: 'income',
      amount: 500000,
      description: 'Sueldo',
      categoryId: 'salary',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(12)
    expect(clones[0].type).toBe('income')
    expect(clones[0].amount).toBe(500000)
    expect(clones[0].description).toBe('Sueldo')
  })

  it('preserva clones existentes y solo crea faltantes', async () => {
    const source: Transaction = {
      id: 'src-preserve',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Manually create a clone for August with a custom amount
    const manualClone: Transaction = {
      id: 'clone-aug-manual',
      type: 'expense',
      amount: 60000,
      description: 'Alquiler agosto',
      categoryId: 'home',
      date: '2026-08-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      originalId: 'src-preserve',
      createdAt: '2026-07-01T10:00',
    }
    await db.transactions.add(manualClone)

    // Create clones — should skip August (already exists)
    const created = await createFutureClones(source, [manualClone])

    // August should NOT be in the created list
    const augCreated = created.find((c) => c.date.startsWith('2026-08'))
    expect(augCreated).toBeUndefined()

    // But August should still exist in DB with its manual amount
    const all = await db.transactions.toArray()
    const augInDb = all.find((t) => t.id === 'clone-aug-manual')
    expect(augInDb).toBeDefined()
    expect(augInDb!.amount).toBe(60000)

    // Other months should be created with source values
    const septCreated = created.find((c) => c.date.startsWith('2026-09'))
    expect(septCreated).toBeDefined()
    expect(septCreated!.amount).toBe(45000)
  })
})

describe('recurring: createFutureClones — fixed_temporary', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('crea clones para todas las cuotas restantes desde la fecha de la fuente', async () => {
    const source: Transaction = {
      id: 'src-temp',
      type: 'expense',
      amount: 25000,
      description: 'Cuota auto',
      categoryId: 'transport',
      date: '2026-07-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 1,
        totalMonths: 12,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(12)
  })

  it('crea clones desde una fecha pasada', async () => {
    const source: Transaction = {
      id: 'src-temp-past',
      type: 'expense',
      amount: 25000,
      description: 'Cuota auto',
      categoryId: 'transport',
      date: '2026-03-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 1,
        totalMonths: 6,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(6)

    const sorted = clones.sort((a, b) => a.date.localeCompare(b.date))
    expect(sorted[0].date).toBe('2026-03-15')
    expect(sorted[5].date).toBe('2026-08-15')
  })

  it('clones tienen currentMonth correcto', async () => {
    const source: Transaction = {
      id: 'src-cm',
      type: 'expense',
      amount: 25000,
      description: 'Cuota auto',
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

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(6)

    const sorted = clones.sort((a, b) => a.date.localeCompare(b.date))
    expect(sorted[0].recurring.currentMonth).toBe(1)
    expect(sorted[1].recurring.currentMonth).toBe(2)
    expect(sorted[5].recurring.currentMonth).toBe(6)
  })

  it('no crea clones cuando currentMonth > totalMonths', async () => {
    const source: Transaction = {
      id: 'src-expired',
      type: 'expense',
      amount: 25000,
      description: 'Cuota auto',
      categoryId: 'transport',
      date: '2026-07-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 13,
        totalMonths: 12,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    expect(clones).toHaveLength(0)
  })

  it('crea solo las cuotas restantes cuando currentMonth > 1', async () => {
    const source: Transaction = {
      id: 'src-partial',
      type: 'expense',
      amount: 25000,
      description: 'Cuota auto',
      categoryId: 'transport',
      date: '2026-07-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 3,
        totalMonths: 12,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    const clones = await createFutureClones(source)
    // 12 - 3 + 1 = 10 cuotas restantes
    expect(clones).toHaveLength(10)

    const sorted = clones.sort((a, b) => a.date.localeCompare(b.date))
    expect(sorted[0].recurring.currentMonth).toBe(3)
    expect(sorted[9].recurring.currentMonth).toBe(12)
  })
})

describe('recurring: editRecurringSource', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('preserva clones existentes y solo crea faltantes', async () => {
    const source: Transaction = {
      id: 'src-edit',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Create clones for only 2 months (July + August)
    const julClone: Transaction = {
      id: 'clone-jul',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-07-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      originalId: 'src-edit',
      createdAt: '2026-07-01T10:00',
    }
    const augClone: Transaction = {
      id: 'clone-aug',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-08-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      originalId: 'src-edit',
      createdAt: '2026-07-01T10:00',
    }
    await db.transactions.bulkAdd([julClone, augClone])

    // Manually edit the August clone to have a different amount
    await db.transactions.update('clone-aug', {
      amount: 60000,
      description: 'Alquiler agosto (aumento)',
    })

    // Create a past clone manually (should be preserved)
    const pastClone: Transaction = {
      id: 'clone-past',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-06-01',
      recurring: { kind: 'fixed', invoiceDay: 1 },
      originalId: 'src-edit',
      createdAt: '2026-06-01T10:00',
    }
    await db.transactions.add(pastClone)

    // Edit the source
    await editRecurringSource(
      'src-edit',
      {
        id: 'src-edit',
        type: 'expense',
        amount: 50000,
        description: 'Alquiler actualizado',
        categoryId: 'home',
        date: '2026-07-01',
      },
      { kind: 'fixed', invoiceDay: 1 },
    )

    const all = await db.transactions.toArray()

    // Past clone should be preserved
    const past = all.find((t) => t.id === 'clone-past')
    expect(past).toBeDefined()
    expect(past!.amount).toBe(45000)

    // Source should be updated
    const src = all.find((t) => t.id === 'src-edit')
    expect(src).toBeDefined()
    expect(src!.amount).toBe(50000)
    expect(src!.description).toBe('Alquiler actualizado')

    // August clone should PRESERVE its manual amount (60000, not 50000)
    const augAfter = all.find((t) => t.id === 'clone-aug')
    expect(augAfter).toBeDefined()
    expect(augAfter!.amount).toBe(60000)
    expect(augAfter!.description).toBe('Alquiler agosto (aumento)')

    // July clone should PRESERVE its original amount (45000, not overwritten)
    const julAfter = all.find((t) => t.id === 'clone-jul')
    expect(julAfter).toBeDefined()
    expect(julAfter!.amount).toBe(45000)

    // September (not existing before) should be CREATED with new source values
    const septClone = all.find(
      (t) => t.originalId === 'src-edit' && t.date.startsWith('2026-09'),
    )
    expect(septClone).toBeDefined()
    expect(septClone!.amount).toBe(50000)
    expect(septClone!.description).toBe('Alquiler actualizado')
  })

  it('convierte una transacción normal a recurrente creando clones', async () => {
    // Start with a normal (non-recurring) transaction
    const source: Transaction = {
      id: 'src-convert',
      type: 'expense',
      amount: 45000,
      description: 'Alquiler',
      categoryId: 'home',
      date: '2026-07-01',
      recurring: { kind: 'none' },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Edit: convert to recurring fixed
    await editRecurringSource(
      'src-convert',
      {
        id: 'src-convert',
        type: 'expense',
        amount: 45000,
        description: 'Alquiler',
        categoryId: 'home',
        date: '2026-07-01',
      },
      { kind: 'fixed', invoiceDay: 1 },
    )

    const all = await db.transactions.toArray()

    // Source should now be recurring
    const src = all.find((t) => t.id === 'src-convert')
    expect(src).toBeDefined()
    expect(src!.recurring.kind).toBe('fixed')

    // Should have 12 clones
    const clones = all.filter((t) => t.originalId === 'src-convert')
    expect(clones).toHaveLength(12)
  })

  it('elimina clones que exceden totalMonths al reducir', async () => {
    const source: Transaction = {
      id: 'src-reduce',
      type: 'expense',
      amount: 25000,
      description: 'Cuota auto',
      categoryId: 'transport',
      date: '2026-07-15',
      recurring: {
        kind: 'fixed_temporary',
        currentMonth: 1,
        totalMonths: 12,
        invoiceDay: 15,
      },
      createdAt: new Date().toISOString(),
    }
    await db.transactions.add(source)

    // Create all 12 clones
    await createFutureClones(source)

    const before = await db.transactions.toArray()
    const clonesBefore = before.filter((t) => t.originalId === 'src-reduce')
    expect(clonesBefore).toHaveLength(12)

    // Reduce to 6 months
    await editRecurringSource(
      'src-reduce',
      {
        id: 'src-reduce',
        type: 'expense',
        amount: 25000,
        description: 'Cuota auto',
        categoryId: 'transport',
        date: '2026-07-15',
      },
      {
        kind: 'fixed_temporary',
        currentMonth: 1,
        totalMonths: 6,
        invoiceDay: 15,
      },
    )

    const after = await db.transactions.toArray()
    const clonesAfter = after.filter((t) => t.originalId === 'src-reduce')
    // Should only have 6 clones (months 1-6)
    expect(clonesAfter).toHaveLength(6)
    for (const clone of clonesAfter) {
      expect((clone.recurring.currentMonth ?? 0)).toBeLessThanOrEqual(6)
    }
  })

  it('no rompe si la fuente no existe', async () => {
    await expect(
      editRecurringSource('nonexistent', { id: 'nonexistent' }),
    ).resolves.toBeUndefined()
  })
})

describe('recurring: deleteRecurringSource', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('preserva clones pasados y solo borra futuros', async () => {
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

    // Past clone (June)
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

    // Future clone (August)
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
