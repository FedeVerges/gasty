import { useState, type ReactNode } from 'react'
import type { Tab, Transaction } from '../../types'
import { useViewport } from '../../hooks/useViewport'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { FAB } from './FAB'
import { SmartInputSheet } from '../add/SmartInputSheet'
import { CsvImportSheet } from '../add/CsvImportSheet'
import { CsvImportProvider } from '../../context/CsvImportContext'
import { EditTransactionContext } from '../../context/EditTransactionContext'
import { BalanceDetailContext } from '../../context/BalanceDetailContext'
import { BalanceDetailSheet } from '../dashboard/BalanceDetailSheet'

interface AppShellProps {
  active: Tab
  onTabChange: (tab: Tab) => void
  children: ReactNode
}

export function AppShell({ active, onTabChange, children }: AppShellProps) {
  const { isDesktop, isWide } = useViewport()
  const [inputOpen, setInputOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [sheetKey, setSheetKey] = useState(0)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceMonth, setBalanceMonth] = useState('')
  const [balanceMonthLabel, setBalanceMonthLabel] = useState('')

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

  const openBalanceDetail = (month: string, monthLabel: string) => {
    setBalanceMonth(month)
    setBalanceMonthLabel(monthLabel)
    setBalanceOpen(true)
  }

  return (
    <CsvImportProvider onOpenCsvImport={() => setCsvOpen(true)}>
      <EditTransactionContext.Provider value={handleEdit}>
        <BalanceDetailContext.Provider value={{ open: openBalanceDetail }}>
          <div className={`${isDesktop ? 'flex h-full' : 'flex flex-col h-full'} w-full`}>
            {/* Sidebar (desktop only) */}
            {isDesktop && (
              <Sidebar active={active} onChange={onTabChange} isWide={isWide} />
            )}

            {/* Main content */}
            <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pb-20 md:pb-6">
              <div className={`pt-6 ${isDesktop ? `pb-6 mx-auto w-full ${isWide ? 'px-12 max-w-5xl' : 'px-8 max-w-3xl'}` : 'px-5 pb-4 mx-auto max-w-[480px]'}`}>
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
          <BalanceDetailSheet
            open={balanceOpen}
            month={balanceMonth}
            monthLabel={balanceMonthLabel}
            onClose={() => setBalanceOpen(false)}
          />
        </BalanceDetailContext.Provider>
      </EditTransactionContext.Provider>
    </CsvImportProvider>
  )
}
