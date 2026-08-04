import { useState, useEffect, type ReactNode } from 'react'
import { useViewport } from '../../hooks/useViewport'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
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
  const [csvOpen, setCsvOpen] = useState(false)

  // Problem #2: close modals on Android physical back button
  useEffect(() => {
    const handlePopState = () => {
      if (csvOpen) { setCsvOpen(false); return }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [csvOpen])

  const openCsv = () => {
    history.pushState({ modal: 'csv' }, '')
    setCsvOpen(true)
  }

  // EditTransactionContext: no-op for now (inline editing handles expansion via props)
  // The context is kept for compatibility but doesn't open any sheet
  const handleEdit = () => {
    // No-op: inline editing is handled by TransactionItem's isExpanded/onToggle props
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

        {/* BottomNav (mobile only) */}
        {!isDesktop && (
          <BottomNav active={active} navigate={navigate} />
        )}

        <CsvImportSheet open={csvOpen} onClose={() => setCsvOpen(false)} />
      </EditTransactionContext.Provider>
    </CsvImportProvider>
  )
}
