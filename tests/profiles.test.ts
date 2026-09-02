import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { clearProfileData, createProfile, db, seedDatabase, setActiveProfile } from '../src/lib/db'
import type { Investment, Transaction } from '../src/types'

describe('perfiles', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await seedDatabase()
  })

  it('crea un perfil vacío con sus propias categorías predeterminadas', async () => {
    const business = await createProfile({ name: 'Negocio', emoji: '💼', color: 'var(--color-accent-cyan)' })

    expect(await db.profileCategories.where('profileId').equals(business.id).count()).toBe(23)
    expect(await db.transactions.where('profileId').equals(business.id).count()).toBe(0)
    expect((await db.profiles.get(business.id))?.currency).toBe('ARS')
  })

  it('mantiene los movimientos aislados por perfil', async () => {
    const business = await createProfile({ name: 'Negocio', emoji: '💼', color: 'var(--color-accent-cyan)' })
    const personalTransaction: Transaction = {
      id: 'personal-tx', profileId: 'personal', type: 'expense', amount: 1000, description: 'Pan', categoryId: 'food', date: '2026-09-01', recurring: { kind: 'none' }, createdAt: '2026-09-01T12:00:00.000Z',
    }
    const businessTransaction: Transaction = { ...personalTransaction, id: 'business-tx', profileId: business.id, description: 'Insumos' }
    await db.transactions.bulkAdd([personalTransaction, businessTransaction])

    expect(await db.transactions.where('profileId').equals('personal').count()).toBe(1)
    expect(await db.transactions.where('profileId').equals(business.id).count()).toBe(1)
  })

  it('borrar datos limpia solo la información financiera del perfil actual', async () => {
    const business = await createProfile({ name: 'Negocio', emoji: '💼', color: 'var(--color-accent-cyan)' })
    const transaction: Transaction = {
      id: 'personal-tx', profileId: 'personal', type: 'expense', amount: 1000, description: 'Pan', categoryId: 'food', date: '2026-09-01', recurring: { kind: 'none' }, createdAt: '2026-09-01T12:00:00.000Z',
    }
    const investment: Investment = { id: 'personal-investment', profileId: 'personal', name: 'FCI', emoji: '📈', allocationPct: 100, monthlyReturnPct: 1 }
    await db.transactions.add(transaction)
    await db.investments.add(investment)
    await db.transactions.add({ ...transaction, id: 'business-tx', profileId: business.id })

    await clearProfileData('personal')

    expect(await db.transactions.where('profileId').equals('personal').count()).toBe(0)
    expect(await db.investments.where('profileId').equals('personal').count()).toBe(0)
    expect(await db.profileCategories.where('profileId').equals('personal').count()).toBe(23)
    expect(await db.transactions.where('profileId').equals(business.id).count()).toBe(1)
  })

  it('recuerda el último perfil seleccionado', async () => {
    const business = await createProfile({ name: 'Negocio', emoji: '💼', color: 'var(--color-accent-cyan)' })
    await setActiveProfile(business.id)

    expect((await db.settings.get('app-settings'))?.activeProfileId).toBe(business.id)
  })

  it('migra los datos existentes al perfil Personal', async () => {
    await db.close()
    await db.delete()

    const legacy = new Dexie('gasty')
    legacy.version(7).stores({
      transactions: 'id, type, date, categoryId, originalId, recurringRuleId',
      categories: 'id, type',
      settings: 'id',
      investments: 'id',
      recurringRules: 'id, startDate',
    })
    await legacy.open()
    await legacy.table('settings').put({ id: 'app-settings', theme: 'dark', currency: 'USD', csvFormat: { thousandsSeparator: ',', decimalSeparator: '.', stripCurrencyPrefix: false } })
    await legacy.table('categories').put({ id: 'food', name: 'Comida', emoji: '🍔', color: '#fff', type: 'expense', keywords: [] })
    await legacy.table('transactions').put({ id: 'legacy-tx', type: 'expense', amount: 1000, description: 'Almuerzo', categoryId: 'food', date: '2026-09-01', recurring: { kind: 'none' }, createdAt: '2026-09-01T12:00:00.000Z' })
    await legacy.close()

    await db.open()
    await seedDatabase()

    expect((await db.profiles.get('personal'))?.currency).toBe('USD')
    expect((await db.settings.get('app-settings'))?.theme).toBe('dark')
    expect(await db.profileCategories.get(['personal', 'food'])).toMatchObject({ name: 'Comida' })
    expect(await db.transactions.get('legacy-tx')).toMatchObject({ profileId: 'personal' })
  })
})
