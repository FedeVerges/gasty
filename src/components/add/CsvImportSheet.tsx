import { useState, useEffect, useRef, useContext } from 'react'
import { Button } from '../ui/Button'
import { CsvImportContext } from '../../context/CsvImportContext'
import { formatMoney } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'
import { useViewport } from '../../hooks/useViewport'
import { useCategories } from '../../hooks/useCategories'
import { useVirtualizer } from '@tanstack/react-virtual'

interface CsvImportSheetProps {
  open: boolean
  onClose: () => void
}

type Step = 'select' | 'preview' | 'result'

const ROW_ESTIMATED_SIZE = 88

export function CsvImportSheet({ open, onClose }: CsvImportSheetProps) {
  const { settings } = useSettings()
  const { isDesktop } = useViewport()
  const csvImport = useContext(CsvImportContext)
  const categories = useCategories()
  const [step, setStep] = useState<Step>('select')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listParentRef = useRef<HTMLDivElement>(null)

  const rows = csvImport?.rows ?? []
  const parseErrors = csvImport?.parseErrors ?? []
  const isImporting = csvImport?.isImporting ?? false
  const importResult = csvImport?.importResult ?? null

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => ROW_ESTIMATED_SIZE,
    overscan: 5,
  })

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

  // Transition to preview when rows are loaded
  useEffect(() => {
    if (csvImport?.rows.length) setStep('preview')
  }, [csvImport?.rows.length])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    csvImport?.loadCsvFile(file)
  }

  const handleImport = async () => {
    await csvImport?.executeImportFn()
    setStep('result')
  }

  const handleClose = () => {
    setStep('select')
    csvImport?.reset()
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

              {/* Virtualized list */}
              <div
                ref={listParentRef}
                className="overflow-y-auto scrollbar-hide"
                style={{ maxHeight: '50vh' }}
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const row = rows[virtualItem.index]
                    if (!row) return null
                    const isRecurring = row.recurring.kind !== 'none'
                    const isPending = csvImport?.pendingCategories.some(
                      (p) => p.name.toLowerCase() === row.categoryName.toLowerCase()
                    ) ?? false
                    const cat = !isPending ? categories.find((c) => c.id === row.categoryId) : undefined

                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <div className="rounded-2xl border border-border p-3 bg-card h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                                style={{ background: `${cat?.color ?? '#888'}25` }}
                              >
                                {cat?.emoji ?? '📦'}
                              </span>
                              <span className="text-sm font-medium truncate">
                                {row.description}
                              </span>
                            </div>
                            <span className={`text-sm font-bold shrink-0 ml-2 ${row.type === 'income' ? 'text-income' : 'text-negative'}`}>
                              {row.type === 'income' ? '+ ' : '− '}{formatMoney(row.amount, settings.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 ml-10">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-mute">{row.date}</span>
                              <span className="text-xs text-mute">·</span>
                              <span className="text-xs truncate">{row.categoryName}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Recurrente toggle */}
                              <button
                                onClick={() => csvImport?.toggleRecurring(virtualItem.index)}
                                className={`
                                  flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                  transition-colors min-h-[28px]
                                  ${isRecurring
                                    ? 'bg-recurring-soft text-recurring'
                                    : 'text-mute hover:text-body'
                                  }
                                `}
                                aria-label={isRecurring ? 'Quitar recurrente' : 'Marcar como recurrente'}
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                                  <path fillRule="evenodd" clipRule="evenodd"
                                    d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39l-.001.001zM4.688 8.576a5.5 5.5 0 019.2-2.466l.312.311h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.75-.75V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 101.449.39z" />
                                </svg>
                                {isRecurring && 'Recurrente'}
                              </button>
                              {/* Delete button */}
                              <button
                                onClick={() => csvImport?.removeRow(virtualItem.index)}
                                className="flex items-center justify-center w-7 h-7 rounded-full text-mute hover:text-negative transition-colors"
                                aria-label="Eliminar fila"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" clipRule="evenodd"
                                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c-.84 0-1.673.025-2.5.075V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.325C11.673 4.025 10.84 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
                  disabled={rows.length === 0 || isImporting}
                  fullWidth
                  size="md"
                >
                  {isImporting ? 'Importando...' : `Importar ${rows.length} filas`}
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
