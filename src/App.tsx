import { useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { Transactions } from './components/transactions/Transactions'
import { Stats } from './components/stats/Stats'
import { Settings } from './components/settings/Settings'
import { BalanceDetailPage } from './components/dashboard/BalanceDetailPage'
import { useHashRouter } from './hooks/useHashRouter'
import type { Tab } from './types'

function App() {
  const { route, params, navigate } = useHashRouter()

  // Map sub-routes to their parent tab for BottomNav/Sidebar highlighting
  const activeTab: Tab = route === 'balance' ? 'dashboard' : (route as Tab)

  const handleOpenBalanceDetail = useCallback((month: string, monthLabel: string) => {
    navigate(`#/balance?month=${month}&label=${encodeURIComponent(monthLabel)}`)
  }, [navigate])

  if (route === 'balance') {
    return (
      <AppShell active={activeTab} navigate={navigate}>
        <BalanceDetailPage
          month={params.month ?? ''}
          monthLabel={decodeURIComponent(params.label ?? '')}
          onBack={() => history.back()}
        />
      </AppShell>
    )
  }

  return (
    <AppShell active={activeTab} navigate={navigate}>
      {route === 'dashboard' && (
        <Dashboard onOpenBalanceDetail={handleOpenBalanceDetail} />
      )}
      {route === 'transactions' && (
        <Transactions
          onPickCategory={(id) => navigate(`#/stats?category=${id}`)}
          onOpenBalanceDetail={handleOpenBalanceDetail}
        />
      )}
      {route === 'stats' && <Stats categoryFilter={params.category ?? null} />}
      {route === 'settings' && <Settings />}
    </AppShell>
  )
}

export default App
