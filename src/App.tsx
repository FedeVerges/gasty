import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { Transactions } from './components/transactions/Transactions'
import { Stats } from './components/stats/Stats'
import { Settings } from './components/settings/Settings'
import type { Tab } from './types'

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [statsCategory, setStatsCategory] = useState<string | null>(null)

  const handlePickCategory = (categoryId: string) => {
    setStatsCategory(categoryId)
    setTab('stats')
  }

  return (
    <AppShell active={tab} onTabChange={setTab}>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'transactions' && (
        <Transactions onPickCategory={handlePickCategory} />
      )}
      {tab === 'stats' && <Stats categoryFilter={statsCategory} />}
      {tab === 'settings' && <Settings />}
    </AppShell>
  )
}

export default App
