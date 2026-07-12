import { createContext, useContext } from 'react'

interface BalanceDetailContextValue {
  open: (month: string, monthLabel: string) => void
}

export const BalanceDetailContext = createContext<BalanceDetailContextValue | null>(null)

export function useBalanceDetail(): BalanceDetailContextValue {
  const ctx = useContext(BalanceDetailContext)
  if (!ctx) throw new Error('useBalanceDetail must be used within BalanceDetailContext.Provider')
  return ctx
}
