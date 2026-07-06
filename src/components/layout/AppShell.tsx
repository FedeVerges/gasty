import { useState, type ReactNode } from 'react'
import type { Tab, Transaction } from '../../types'
import { BottomNav } from './BottomNav'
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

  return (
    <CsvImportContext.Provider value={() => setCsvOpen(true)}>
      <EditTransactionContext.Provider value={handleEdit}>
        <main className="flex-1 pb-20 overflow-y-auto">
          <div className="px-5 pt-6 pb-4">
            {children}
          </div>
        </main>
        <FAB onClick={() => {
          setEditTransaction(null)
          setSheetKey(k => k + 1)
          setInputOpen(true)
        }} />
        <BottomNav active={active} onChange={onTabChange} />
        <SmartInputSheet key={sheetKey} open={inputOpen} onClose={handleClose} editTransaction={editTransaction} />
        <CsvImportSheet open={csvOpen} onClose={() => setCsvOpen(false)} />
      </EditTransactionContext.Provider>
    </CsvImportContext.Provider>
  )
}
