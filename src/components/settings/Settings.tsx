import { useEffect, useState, useRef } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useSettings } from '../../context/SettingsContext'
import { getRecurringSources, deleteRecurringSource } from '../../lib/recurring'
import { importCsv, type CsvImportResult } from '../../lib/csv'
import { useCategories } from '../../hooks/useCategories'
import { formatMoney, formatDate } from '../../lib/format'
import type { Transaction } from '../../types'

export function Settings() {
  const { settings, setTheme, setCurrency } = useSettings()
  const categories = useCategories()
  const [recurring, setRecurring] = useState<Transaction[]>([])
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getRecurringSources().then(setRecurring)
  }, [])

  const refresh = () => getRecurringSources().then(setRecurring)

  const handleDeleteRecurring = async (id: string) => {
    if (confirm('¿Eliminar este gasto recurrente y todos sus movimientos generados?')) {
      await deleteRecurringSource(id)
      await refresh()
    }
  }

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvLoading(true)
    setCsvResult(null)
    try {
      const text = await file.text()
      const result = await importCsv(text)
      setCsvResult(result)
    } catch {
      setCsvResult({ imported: 0, errors: 1, errorLines: [] })
    }
    setCsvLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
      </header>

      <Card>
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium block mb-3">
          Apariencia
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`
              p-4 rounded-2xl border-2 transition-colors text-left
              ${settings.theme === 'light' ? 'border-accent bg-accent-soft' : 'border-border bg-card'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">☀️</span>
              <span className="font-semibold">Claro</span>
            </div>
            <p className="text-xs text-text-muted">Fondo claro y suave</p>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`
              p-4 rounded-2xl border-2 transition-colors text-left
              ${settings.theme === 'dark' ? 'border-accent bg-accent-soft' : 'border-border bg-card'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌙</span>
              <span className="font-semibold">Oscuro</span>
            </div>
            <p className="text-xs text-text-muted">No tan oscuro</p>
          </button>
        </div>
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium block mb-3">
          Moneda
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCurrency('ARS')}
            className={`
              p-3 rounded-2xl border-2 transition-colors font-semibold
              ${settings.currency === 'ARS' ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted'}
            `}
          >
            $ ARS
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`
              p-3 rounded-2xl border-2 transition-colors font-semibold
              ${settings.currency === 'USD' ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted'}
            `}
          >
            US$ USD
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Gastos recurrentes
          </span>
          <span className="text-xs text-text-muted">
            {recurring.length} activos
          </span>
        </div>

        {recurring.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-muted">No tenés gastos recurrentes</p>
            <p className="text-xs text-text-muted mt-1">
              Al crear un gasto, marcá la opción 🔄
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recurring.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId)
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-bg"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${cat?.color ?? '#888'}25` }}
                  >
                    {cat?.emoji ?? '🔁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-text-muted">
                      {cat?.name} · {formatDate(tx.date)}
                      {tx.recurring.kind === 'fixed_temporary' &&
                        ` · ${tx.recurring.currentMonth}/${tx.recurring.totalMonths}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-sm">
                      {formatMoney(tx.amount, settings.currency)}
                    </span>
                    <button
                      onClick={() => handleDeleteRecurring(tx.id)}
                      className="text-xs text-expense"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium block mb-3">
          Importar CSV
        </span>
        <p className="text-sm text-text-muted mb-3">
          Seleccioná un archivo CSV con columnas: descripción, monto, fecha (opcional).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvFile}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={csvLoading}
          fullWidth
        >
          {csvLoading ? 'Importando…' : 'Seleccionar archivo CSV'}
        </Button>
        {csvResult && (
          <div className="mt-3 text-sm">
            {csvResult.errors === 0 ? (
              <p className="text-income font-medium">
                ✓ Se importaron {csvResult.imported} transacciones
              </p>
            ) : (
              <div>
                <p className="text-income font-medium">
                  ✓ {csvResult.imported} importadas
                </p>
                <p className="text-expense font-medium">
                  ✗ {csvResult.errors} errores
                  {csvResult.errorLines.length > 0 &&
                    ` (líneas: ${csvResult.errorLines.join(', ')})`}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium block mb-3">
          Sobre Gasty
        </span>
        <p className="text-sm text-text-muted">
          Tu app de gastos personal. Tus datos quedan en tu dispositivo.
        </p>
        <p className="text-xs text-text-subtle mt-2">v0.1.0</p>
      </Card>
    </div>
  )
}
