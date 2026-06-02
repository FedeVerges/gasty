import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Category } from '../types'

export function useCategories(): Category[] {
  return (
    useLiveQuery(() => db.categories.toArray(), [], []) ?? []
  )
}

export function useCategory(id: string | undefined): Category | undefined {
  return useLiveQuery(
    () => (id ? db.categories.get(id) : undefined),
    [id],
  )
}
