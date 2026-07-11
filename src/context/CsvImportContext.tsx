import { createContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { parseCsvContent, executeImport, type CsvRow, type CsvPendingCategory } from '../lib/csv'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from './SettingsContext'

export interface CsvImportValue {
  rows: CsvRow[]
  parseErrors: number[]
  pendingCategories: CsvPendingCategory[]
  isImporting: boolean
  importResult: { imported: number; errors: number } | null
  loadCsvFile: (file: File) => void
  removeRow: (index: number) => void
  toggleRecurring: (index: number) => void
  executeImportFn: () => Promise<void>
  reset: () => void
  openCsvImport: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const CsvImportContext = createContext<CsvImportValue | null>(null)

interface CsvImportProviderProps {
  children: ReactNode
  onOpenCsvImport: () => void
}

export function CsvImportProvider({ children, onOpenCsvImport }: CsvImportProviderProps) {
  const { settings } = useSettings()
  const categories = useCategories()
  const [rows, setRows] = useState<CsvRow[]>([])
  const [parseErrors, setParseErrors] = useState<number[]>([])
  const [pendingCategories, setPendingCategories] = useState<CsvPendingCategory[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null)

  const loadCsvFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const result = parseCsvContent(content, settings.csvFormat, categories)
      setRows(result.rows)
      setParseErrors(result.errors)
      setPendingCategories(result.pendingCategories)
      setImportResult(null)
    }
    reader.readAsText(file)
  }, [settings.csvFormat, categories])

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const toggleRecurring = useCallback((index: number) => {
    setRows((prev) => {
      const updated = [...prev]
      const row = { ...updated[index] }
      row.recurring = row.recurring.kind === 'none'
        ? { kind: 'fixed' as const }
        : { kind: 'none' as const }
      updated[index] = row
      return updated
    })
  }, [])

  const executeImportFn = useCallback(async () => {
    setIsImporting(true)
    try {
      const result = await executeImport(rows, pendingCategories)
      setImportResult({ imported: result.imported, errors: result.errors })
    } finally {
      setIsImporting(false)
    }
  }, [rows, pendingCategories])

  const reset = useCallback(() => {
    setRows([])
    setParseErrors([])
    setPendingCategories([])
    setIsImporting(false)
    setImportResult(null)
  }, [])

  const value = useMemo(() => ({
    rows,
    parseErrors,
    pendingCategories,
    isImporting,
    importResult,
    loadCsvFile,
    removeRow,
    toggleRecurring,
    executeImportFn,
    reset,
    openCsvImport: onOpenCsvImport,
  }), [
    rows, parseErrors, pendingCategories, isImporting, importResult,
    loadCsvFile, removeRow, toggleRecurring, executeImportFn, reset,
    onOpenCsvImport,
  ])

  return (
    <CsvImportContext.Provider value={value}>
      {children}
    </CsvImportContext.Provider>
  )
}
