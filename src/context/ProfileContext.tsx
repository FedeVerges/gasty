/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../types'
import { createProfile, db, deleteProfile, getAppSettings, setActiveProfile, updateProfile } from '../lib/db'

interface ProfileContextValue {
  profile: Profile | null
  profiles: Profile[]
  loading: boolean
  selectProfile: (id: string) => Promise<void>
  addProfile: (input: Pick<Profile, 'name' | 'emoji' | 'color'>) => Promise<void>
  editProfile: (id: string, input: Pick<Profile, 'name' | 'emoji' | 'color'>) => Promise<void>
  removeProfile: (id: string) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)
const EMPTY_PROFILES: Profile[] = []

export function ProfileProvider({ children }: { children: ReactNode }) {
  const snapshot = useLiveQuery(async () => {
    const [settings, profiles] = await Promise.all([
      getAppSettings(),
      db.profiles.orderBy('lastUsedAt').reverse().toArray(),
    ])
    return { activeId: settings.activeProfileId, profiles }
  }, [])
  const profiles = snapshot?.profiles ?? EMPTY_PROFILES
  const activeId = snapshot?.activeId ?? null

  const selectProfile = useCallback(async (id: string) => {
    await setActiveProfile(id)
  }, [])

  const addProfile = useCallback(async (input: Pick<Profile, 'name' | 'emoji' | 'color'>) => {
    const created = await createProfile(input)
    await selectProfile(created.id)
  }, [selectProfile])

  const editProfile = useCallback(async (id: string, input: Pick<Profile, 'name' | 'emoji' | 'color'>) => {
    await updateProfile(id, input)
  }, [])

  const removeProfile = useCallback(async (id: string) => {
    const remaining = profiles.filter((profile) => profile.id !== id)
    const fallback = remaining.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))[0]
    if (activeId === id && fallback) await setActiveProfile(fallback.id)
    await deleteProfile(id)
  }, [activeId, profiles])

  const profile = profiles.find((item) => item.id === activeId) ?? null

  return (
    <ProfileContext.Provider value={{ profile, profiles, loading: !snapshot, selectProfile, addProfile, editProfile, removeProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile must be used within ProfileProvider')
  return value
}
