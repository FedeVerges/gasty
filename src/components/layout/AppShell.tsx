import { useState, useEffect, type ReactNode } from 'react'
import type { Transaction } from '../../types'
import { useViewport } from '../../hooks/useViewport'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { FAB } from './FAB'
import { SmartInputSheet } from '../add/SmartInputSheet'
import { CsvImportSheet } from '../add/CsvImportSheet'
import { CsvImportProvider } from '../../context/CsvImportContext'
import { EditTransactionContext } from '../../context/EditTransactionContext'

interface AppShellProps {
  active: string
  navigate: (hash: string) => void
  children: ReactNode
}

export function AppShell({ active, navigate, children }: AppShellProps) {
  const { isDesktop, isWide } = useViewport()
  const [inputOpen, setInputOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [sheetKey, setSheetKey] = useState(0)

  // Problem #2: close modals on Android physical back button
  useEffect(() => {
    const handlePopState = () => {
      if (inputOpen) { setInputOpen(false); return }
      if (csvOpen) { setCsvOpen(false); return }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [inputOpen, csvOpen])

  const handleEdit = (tx: Transaction) => {
    history.pushState({ modal: 'edit' }, '')
    setEditTransaction(tx)
    setSheetKey(k => k + 1)
    setInputOpen(true)
  }

  const handleClose = () => {
    setInputOpen(false)
    setEditTransaction(null)
  }

  const openInput = () => {
    history.pushState({ modal: 'input' }, '')
    setEditTransaction(null)
    setSheetKey(k => k + 1)
    setInputOpen(true)
  }

  const openCsv = () => {
    history.pushState({ modal: 'csv' }, '')
    setCsvOpen(true)
  }

  return (
    <CsvImportProvider onOpenCsvImport={openCsv}>
      <EditTransactionContext.Provider value={handleEdit}>
        <div className={`${isDesktop ? 'flex h-full' : 'flex flex-col h-full'} w-full`}>
          {/* Sidebar (desktop only) */}
          {isDesktop && (
            <Sidebar active={active} navigate={navigate} isWide={isWide} />
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
          <BottomNav active={active} navigate={navigate} />
        )}

        <SmartInputSheet key={sheetKey} open={inputOpen} onClose={handleClose} editTransaction={editTransaction} />
        <CsvImportSheet open={csvOpen} onClose={() => setCsvOpen(false)} />
      </EditTransactionContext.Provider>
    </CsvImportProvider>
  )
}
