import Dexie, { type EntityTable, type Table } from 'dexie'
import type { AppSettings, Transaction, Category, CsvFormatSettings, Investment, Profile, RecurringRule, Theme } from '../types'
import { DEFAULT_CATEGORIES, syncKeywordMaps, getPaletteColor } from './categories'

export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
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
  profileCategories: Table<Category & { profileId: string }, [string, string]>
  settings: EntityTable<AppSettings & { id: string }, 'id'>
  profiles: EntityTable<Profile, 'id'>
  investments: EntityTable<Investment, 'id'>
  recurringRules: EntityTable<RecurringRule, 'id'>
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

db.version(3).stores({}).upgrade(async (tx) => {
  // Backfill keywords for existing categories
  await tx.table('categories').toCollection().modify((row) => {
    if (!row.keywords) {
      const defaults = DEFAULT_CATEGORIES.find(c => c.id === row.id)
      row.keywords = defaults?.keywords ?? []
    }
  })
})

db.version(4).stores({}).upgrade(async (tx) => {
  // Deduplicate category colors — ensure every category has a unique color
  // from the CHART_COLORS palette for consistent chart rendering.
  const seen = new Set<string>()
  let colorIndex = 0
  await tx.table('categories').toCollection().sortBy('id').then(async (rows: Array<{ id: string; color: string }>) => {
    for (const row of rows) {
      if (seen.has(row.color)) {
        // Find the next unused palette color
        let newColor: string
        do {
          newColor = getPaletteColor(colorIndex++)
        } while (seen.has(newColor))
        seen.add(newColor)
        await tx.table('categories').update(row.id, { color: newColor })
      } else {
        seen.add(row.color)
      }
    }
  })
})

db.version(5).stores({}).upgrade(async (tx) => {
  // Insert any missing default categories for existing users.
  // New categories added to DEFAULT_CATEGORIES won't be in old DBs
  // because seedDatabase() only inserts when catCount === 0.
  const existingIds = new Set<string>()
  await tx.table('categories').toCollection().each((row: { id: string }) => {
    existingIds.add(row.id)
  })

  for (const cat of DEFAULT_CATEGORIES) {
    if (!existingIds.has(cat.id)) {
      await tx.table('categories').add(cat)
    }
  }
})

db.version(6).stores({
  transactions: 'id, type, date, categoryId, originalId',
  categories: 'id, type',
  settings: 'id',
  investments: 'id',
}).upgrade(async () => {
  // v6 introduces the investments table (no backfill needed — starts empty)
})

db.version(7).stores({
  transactions: 'id, type, date, categoryId, originalId, recurringRuleId',
  categories: 'id, type',
  settings: 'id',
  investments: 'id',
  recurringRules: 'id, startDate',
})

const PERSONAL_PROFILE_ID = 'personal'

db.version(8).stores({
  transactions: 'id, profileId, [profileId+date], type, date, categoryId, originalId, recurringRuleId',
  categories: 'id, type',
  profileCategories: '[profileId+id], profileId, type',
  settings: 'id',
  profiles: 'id, lastUsedAt',
  investments: 'id, profileId',
  recurringRules: 'id, profileId, startDate',
}).upgrade(async (tx) => {
  const now = new Date().toISOString()
  const settings = await tx.table('settings').get(SETTINGS_ID) as { theme?: Theme, currency?: 'ARS' | 'USD', csvFormat?: CsvFormatSettings } | undefined
  const profile = {
    id: PERSONAL_PROFILE_ID,
    name: 'Personal',
    emoji: '👤',
    color: 'var(--color-primary)',
    currency: settings?.currency ?? 'ARS',
    csvFormat: settings?.csvFormat ?? DEFAULT_CSV_FORMAT,
    lastUsedAt: now,
    createdAt: now,
  }

  await tx.table('profiles').put(profile)
  await tx.table('profileCategories').bulkPut(
    (await tx.table('categories').toArray()).map((category) => ({ ...category, profileId: PERSONAL_PROFILE_ID })),
  )
  await tx.table('transactions').toCollection().modify({ profileId: PERSONAL_PROFILE_ID })
  await tx.table('investments').toCollection().modify({ profileId: PERSONAL_PROFILE_ID })
  await tx.table('recurringRules').toCollection().modify({ profileId: PERSONAL_PROFILE_ID })
  await tx.table('settings').put({
    id: SETTINGS_ID,
    theme: settings?.theme ?? 'light',
    activeProfileId: PERSONAL_PROFILE_ID,
  })
})

const SETTINGS_ID = 'app-settings'

export async function seedDatabase() {
  const existing = await db.settings.get(SETTINGS_ID)
  if (!existing) {
    await db.settings.put({
      id: SETTINGS_ID,
      theme: 'light',
      activeProfileId: PERSONAL_PROFILE_ID,
    })
  }

  if ((await db.profiles.count()) === 0) {
    await createProfile({ name: 'Personal', emoji: '👤', color: 'var(--color-primary)' }, PERSONAL_PROFILE_ID)
  }

  const activeProfileId = (await getAppSettings()).activeProfileId
  await ensureProfileCategories(activeProfileId)
  syncKeywordMaps(await getCategoriesForProfile(activeProfileId))
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = await db.settings.get(SETTINGS_ID)
  return settings ?? { theme: 'light', activeProfileId: PERSONAL_PROFILE_ID }
}

export async function saveAppSettings(partial: Partial<AppSettings>) {
  const current = await getAppSettings()
  await db.settings.put({ id: SETTINGS_ID, ...current, ...partial })
}

export async function getCategoriesForProfile(profileId: string): Promise<Category[]> {
  return db.profileCategories.where('profileId').equals(profileId).toArray()
}

export async function ensureProfileCategories(profileId: string): Promise<void> {
  if (await db.profileCategories.where('profileId').equals(profileId).count()) return
  await db.profileCategories.bulkAdd(DEFAULT_CATEGORIES.map((category) => ({ ...category, profileId })))
}

export async function createProfile(
  input: Pick<Profile, 'name' | 'emoji' | 'color'>,
  id = generateId(),
): Promise<Profile> {
  const now = new Date().toISOString()
  const profile: Profile = {
    id,
    ...input,
    currency: 'ARS',
    csvFormat: DEFAULT_CSV_FORMAT,
    lastUsedAt: now,
    createdAt: now,
  }
  await db.transaction('rw', db.profiles, db.profileCategories, async () => {
    await db.profiles.add(profile)
    await db.profileCategories.bulkAdd(DEFAULT_CATEGORIES.map((category) => ({ ...category, profileId: id })))
  })
  return profile
}

export async function updateProfile(id: string, partial: Partial<Pick<Profile, 'name' | 'emoji' | 'color' | 'currency' | 'csvFormat' | 'lastUsedAt'>>): Promise<void> {
  await db.profiles.update(id, partial)
}

export async function setActiveProfile(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', db.settings, db.profiles, async () => {
    await saveAppSettings({ activeProfileId: id })
    await db.profiles.update(id, { lastUsedAt: now })
  })
  syncKeywordMaps(await getCategoriesForProfile(id))
}

export async function deleteProfile(id: string): Promise<void> {
  if (await db.profiles.count() <= 1) {
    throw new Error('No se puede eliminar el último perfil')
  }
  await db.transaction('rw', [db.profiles, db.profileCategories, db.transactions, db.investments, db.recurringRules], async () => {
    await db.profiles.delete(id)
    await db.profileCategories.where('profileId').equals(id).delete()
    await db.transactions.where('profileId').equals(id).delete()
    await db.investments.where('profileId').equals(id).delete()
    await db.recurringRules.where('profileId').equals(id).delete()
  })
}

/** Clears financial data for one profile while preserving its categories and settings. */
export async function clearProfileData(profileId: string): Promise<void> {
  await db.transaction('rw', db.transactions, db.investments, db.recurringRules, async () => {
    await db.transactions.where('profileId').equals(profileId).delete()
    await db.investments.where('profileId').equals(profileId).delete()
    await db.recurringRules.where('profileId').equals(profileId).delete()
  })
}
