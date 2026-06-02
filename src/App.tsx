import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { Transactions } from './components/transactions/Transactions'
import { Stats } from './components/stats/Stats'
import { Settings } from './components/settings/Settings'
import { useRecurringCheck } from './hooks/useRecurringCheck'
import type { Tab } from './types'

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  useRecurringCheck()

  return (
    <AppShell active={tab} onTabChange={setTab}>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'transactions' && <Transactions />}
      {tab === 'stats' && <Stats />}
      {tab === 'settings' && <Settings />}
    </AppShell>
  )
}

export default App
