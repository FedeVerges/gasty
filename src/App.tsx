import { useState, useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { Transactions } from './components/transactions/Transactions'
import { Stats } from './components/stats/Stats'
import { Settings } from './components/settings/Settings'
import { BalanceDetailPage } from './components/dashboard/BalanceDetailPage'
import type { Tab } from './types'

interface BalanceDetailPageState {
  month: string
  monthLabel: string
}

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [statsCategory, setStatsCategory] = useState<string | null>(null)
  const [balanceDetailPage, setBalanceDetailPage] = useState<BalanceDetailPageState | null>(null)

  const handlePickCategory = (categoryId: string) => {
    setStatsCategory(categoryId)
    setTab('stats')
  }

  const handleOpenBalanceDetail = useCallback((month: string, monthLabel: string) => {
    setBalanceDetailPage({ month, monthLabel })
  }, [])

  const handleBackFromBalanceDetail = useCallback(() => {
    setBalanceDetailPage(null)
    setTab('dashboard')
  }, [])

  if (balanceDetailPage) {
    return (
      <AppShell active="dashboard" onTabChange={setTab}>
        <BalanceDetailPage
          month={balanceDetailPage.month}
          monthLabel={balanceDetailPage.monthLabel}
          onBack={handleBackFromBalanceDetail}
        />
      </AppShell>
    )
  }

  return (
    <AppShell active={tab} onTabChange={setTab}>
      {tab === 'dashboard' && (
        <Dashboard onOpenBalanceDetail={handleOpenBalanceDetail} />
      )}
      {tab === 'transactions' && (
        <Transactions onPickCategory={handlePickCategory} onOpenBalanceDetail={handleOpenBalanceDetail} />
      )}
      {tab === 'stats' && <Stats categoryFilter={statsCategory} />}
      {tab === 'settings' && <Settings />}
    </AppShell>
  )
}

export default App
