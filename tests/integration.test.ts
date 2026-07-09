import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db, seedDatabase } from '../src/lib/db'
import { parseInput, createTransactionFromParsed } from '../src/lib/parser'

describe('integration: db + parser', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('seed crea 12 categorías', async () => {
    const count = await db.categories.count()
    expect(count).toBe(12)
  })

  it('seed crea configuración por defecto', async () => {
    const settings = await db.settings.get('app-settings')
    expect(settings?.theme).toBe('light')
    expect(settings?.currency).toBe('ARS')
  })

  it('flujo completo: parsear y guardar un gasto', async () => {
    const parsed = parseInput('birra 1500')
    expect(parsed).not.toBeNull()

    const tx = createTransactionFromParsed(parsed!)
    await db.transactions.add(tx)

    const all = await db.transactions.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].amount).toBe(1500)
    expect(all[0].categoryId).toBe('leisure')
    expect(all[0].type).toBe('expense')
  })

})
