import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { parseCsvContent, executeImport, type CsvRow, type CsvPendingCategory } from '../../lib/csv'
import { useCategories } from '../../hooks/useCategories'
import { formatMoney } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'
import { useViewport } from '../../hooks/useViewport'

interface CsvImportSheetProps {
  open: boolean
  onClose: () => void
}

type Step = 'select' | 'preview' | 'result'

export function CsvImportSheet({ open, onClose }: CsvImportSheetProps) {
  const { settings } = useSettings()
  const { isDesktop } = useViewport()
  const categories = useCategories()
  const [step, setStep] = useState<Step>('select')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [parseErrors, setParseErrors] = useState<number[]>([])
  const [pendingCategories, setPendingCategories] = useState<CsvPendingCategory[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [open])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const { rows: parsed, errors, pendingCategories: pending } = parseCsvContent(content, settings.csvFormat, categories)
      setRows(parsed)
      setParseErrors(errors)
      setPendingCategories(pending)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    setImporting(true)
    const result = await executeImport(rows, pendingCategories)
    setImportResult({ imported: result.imported, errors: result.errors })
    setStep('result')
    setImporting(false)
  }

  const handleClose = () => {
    setStep('select')
    setRows([])
    setParseErrors([])
    setImportResult(null)
    setImporting(false)
    onClose()
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center animate-fade-in ${isDesktop ? 'items-center sheet-desktop' : 'items-end'}`}
      onClick={handleBackdrop}
      style={{ background: 'var(--color-overlay)' }}
    >
      <div
        className={`
          w-full max-w-[480px]
          bg-canvas
          overflow-y-auto
          ${isDesktop ? 'rounded-3xl' : 'rounded-t-3xl animate-slide-up'}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: isDesktop ? '85vh' : '90vh',
        }}
      >
        <div className="sticky top-0 bg-canvas px-5 pt-4 pb-2 z-10">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">
              {step === 'select' && 'Importar CSV'}
              {step === 'preview' && `Vista previa (${rows.length} filas)`}
              {step === 'result' && 'Resultado'}
            </h2>
            <button
              onClick={handleClose}
              className="text-body p-1 active:scale-95"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {step === 'select' && (
            <>
              <p className="text-sm text-body">
                Subí un archivo CSV con las columnas: <strong>nombre</strong>, <strong>importe</strong>, <strong>fecha</strong> y <strong>categoría</strong>.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                size="lg"
              >
                Seleccionar archivo CSV
              </Button>

              <div className="rounded-2xl border border-border p-4 bg-canvas-soft">
                <p className="text-xs text-body font-medium mb-2">Formato esperado:</p>
                <pre className="text-xs text-mute font-mono overflow-x-auto">
{`nombre,importe,fecha,categoría
Alquiler,45000,2026-06-01,Vivienda
Supermercado,15000,2026-06-05,Supermercado
Birra,2500,15/6,Salidas`}
                </pre>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              {parseErrors.length > 0 && (
                <div className="rounded-2xl border border-negative/30 bg-negative/5 p-3">
                  <p className="text-xs text-negative font-medium">
                    {parseErrors.length} fila(s) con errores (líneas: {parseErrors.join(', ')})
                  </p>
                </div>
              )}

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {rows.map((row) => {
                  const isPending = pendingCategories.some(
                    (p) => p.name.toLowerCase() === row.categoryName.toLowerCase()
                  )
                  const cat = !isPending ? categories.find((c) => c.id === row.categoryId) : undefined
                  return (
                    <div
                      key={row.rawLine}
                      className="rounded-2xl border border-border p-3 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                            style={{ background: `${cat?.color ?? '#888'}25` }}
                          >
                            {isPending ? '🆕' : (cat?.emoji ?? '📦')}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {row.description}
                          </span>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ml-2 ${row.type === 'income' ? 'text-income' : 'text-negative'}`}>
                          {row.type === 'income' ? '+ ' : '− '}{formatMoney(row.amount, settings.currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-10">
                        <span className="text-xs text-mute">{row.date}</span>
                        <span className="text-xs text-mute">·</span>
                        <span className={`text-xs ${isPending ? 'text-accent font-medium' : 'text-body'}`}>
                          {row.categoryName}{isPending ? ' (nueva)' : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setStep('select')}
                  variant="secondary"
                  size="md"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={rows.length === 0 || importing}
                  fullWidth
                  size="md"
                >
                  {importing ? 'Importando...' : `Importar ${rows.length} filas`}
                </Button>
              </div>
            </>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-6 text-center">
                <span className="text-5xl mb-3 block">
                  {importResult.imported > 0 ? '✅' : '⚠️'}
                </span>
                <p className="text-2xl font-bold mb-1">
                  {importResult.imported} {importResult.imported === 1 ? 'gasto importado' : 'gastos importados'}
                </p>
                {importResult.errors > 0 && (
                  <p className="text-sm text-body">
                    {importResult.errors} fila(s) fallaron
                  </p>
                )}
              </div>

              <Button
                onClick={handleClose}
                fullWidth
                size="lg"
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
