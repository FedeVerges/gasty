/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Theme, Currency, Settings, CsvFormatSettings } from '../types'
import { getAppSettings, saveAppSettings, updateProfile } from '../lib/db'
import { useProfile } from './ProfileContext'

interface SettingsContextValue {
  settings: Settings
  setTheme: (theme: Theme) => void
  setCurrency: (currency: Currency) => void
  setCsvFormat: (csvFormat: Partial<CsvFormatSettings>) => void
  loading: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { profile, loading: profileLoading } = useProfile()
  const [settings, setSettings] = useState<Settings>({ theme: 'light', currency: 'ARS', csvFormat: { thousandsSeparator: 'auto', decimalSeparator: 'auto', stripCurrencyPrefix: true } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileLoading || !profile) return
    getAppSettings().then((appSettings) => {
      setSettings({ theme: appSettings.theme, currency: profile.currency, csvFormat: profile.csvFormat })
      setLoading(false)
    })
  }, [profile, profileLoading])

  useEffect(() => {
    if (loading) return
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme, loading])

  const setTheme = (theme: Theme) => {
    setSettings((s) => ({ ...s, theme }))
    saveAppSettings({ theme })
  }

  const setCurrency = (currency: Currency) => {
    setSettings((s) => ({ ...s, currency }))
    if (profile) void updateProfile(profile.id, { currency })
  }

  const setCsvFormat = (csvFormat: Partial<CsvFormatSettings>) => {
    setSettings((s) => {
      const next = { ...s, csvFormat: { ...s.csvFormat, ...csvFormat } }
      if (profile) void updateProfile(profile.id, { csvFormat: next.csvFormat })
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setCurrency, setCsvFormat, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
