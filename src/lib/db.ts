import Dexie, { type EntityTable } from 'dexie'
import type { Transaction, Category, Settings, CsvFormatSettings } from '../types'
import { DEFAULT_CATEGORIES } from './categories'

export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

const DEFAULT_CSV_FORMAT: CsvFormatSettings = {
  thousandsSeparator: 'auto',
  decimalSeparator: 'auto',
  stripCurrencyPrefix: true,
}

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

db.version(2).stores({}).upgrade(async (tx) => {
  // Backfill csvFormat for existing settings rows
  await tx.table('settings').toCollection().modify((row) => {
    if (!row.csvFormat) {
      row.csvFormat = DEFAULT_CSV_FORMAT
    }
  })
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
      csvFormat: DEFAULT_CSV_FORMAT,
    })
  }
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? { theme: 'light', currency: 'ARS', csvFormat: DEFAULT_CSV_FORMAT }
}

export async function saveSettings(partial: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ id: SETTINGS_ID, ...current, ...partial })
}
