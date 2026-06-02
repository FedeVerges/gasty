import Dexie, { type EntityTable } from 'dexie'
import type { Transaction, Category, Settings } from '../types'
import { DEFAULT_CATEGORIES } from './categories'

export const db = new Dexie('gasty') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>
  categories: EntityTable<Category, 'id'>
  settings: EntityTable<Settings & { id: string }, 'id'>
}

db.version(1).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories: 'id, type',
  settings: 'id',
})

const SETTINGS_ID = 'app-settings'

export async function seedDatabase() {
  const catCount = await db.categories.count()
  if (catCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  }

  const existing = await db.settings.get(SETTINGS_ID)
  if (!existing) {
    await db.settings.put({
      id: SETTINGS_ID,
      theme: 'light',
      currency: 'ARS',
    })
  }
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? { theme: 'light', currency: 'ARS' }
}

export async function saveSettings(partial: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ id: SETTINGS_ID, ...current, ...partial })
}
