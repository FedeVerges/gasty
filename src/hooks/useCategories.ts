import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Category } from '../types'
import { useProfile } from '../context/ProfileContext'

export function useCategories(): Category[] {
  const { profile } = useProfile()
  return (
    useLiveQuery(() => profile ? db.profileCategories.where('profileId').equals(profile.id).toArray() : [], [profile?.id], []) ?? []
  )
}

export function useCategory(id: string | undefined): Category | undefined {
  const { profile } = useProfile()
  return useLiveQuery(
    () => (id && profile ? db.profileCategories.get([profile.id, id]) : undefined),
    [id, profile?.id],
  )
}
