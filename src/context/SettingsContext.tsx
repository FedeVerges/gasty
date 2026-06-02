import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Theme, Currency, Settings } from '../types'
import { getSettings, saveSettings } from '../lib/db'

interface SettingsContextValue {
  settings: Settings
  setTheme: (theme: Theme) => void
  setCurrency: (currency: Currency) => void
  loading: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ theme: 'light', currency: 'ARS' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (loading) return
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme, loading])

  const setTheme = (theme: Theme) => {
    setSettings((s) => ({ ...s, theme }))
    saveSettings({ theme })
  }

  const setCurrency = (currency: Currency) => {
    setSettings((s) => ({ ...s, currency }))
    saveSettings({ currency })
  }

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setCurrency, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
