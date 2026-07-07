import { useState, type ReactNode } from 'react'
import type { Tab, Transaction } from '../../types'
import { useViewport } from '../../hooks/useViewport'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { FAB } from './FAB'
import { SmartInputSheet } from '../add/SmartInputSheet'
import { CsvImportSheet } from '../add/CsvImportSheet'
import { CsvImportContext } from '../../context/CsvImportContext'
import { EditTransactionContext } from '../../context/EditTransactionContext'

interface AppShellProps {
  active: Tab
  onTabChange: (tab: Tab) => void
  children: ReactNode
}

export function AppShell({ active, onTabChange, children }: AppShellProps) {
  const { isDesktop } = useViewport()
  const [inputOpen, setInputOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [sheetKey, setSheetKey] = useState(0)

  const handleEdit = (tx: Transaction) => {
    setEditTransaction(tx)
    setSheetKey(k => k + 1)
    setInputOpen(true)
  }

  const handleClose = () => {
    setInputOpen(false)
    setEditTransaction(null)
  }

  const openInput = () => {
    setEditTransaction(null)
    setSheetKey(k => k + 1)
    setInputOpen(true)
  }

  return (
    <CsvImportContext.Provider value={() => setCsvOpen(true)}>
      <EditTransactionContext.Provider value={handleEdit}>
        <div className={isDesktop ? 'flex h-full' : 'flex flex-col h-full'}>
          {/* Sidebar (desktop only) */}
          {isDesktop && (
            <Sidebar active={active} onChange={onTabChange} />
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-6">
            <div className="px-5 pt-6 pb-4 max-w-[960px] mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* FAB — desktop: top-right, mobile: bottom center */}
        <FAB onClick={openInput} isDesktop={isDesktop} />

        {/* BottomNav (mobile only) */}
        {!isDesktop && (
          <BottomNav active={active} onChange={onTabChange} />
        )}

        <SmartInputSheet key={sheetKey} open={inputOpen} onClose={handleClose} editTransaction={editTransaction} />
        <CsvImportSheet open={csvOpen} onClose={() => setCsvOpen(false)} />
      </EditTransactionContext.Provider>
    </CsvImportContext.Provider>
  )
}
