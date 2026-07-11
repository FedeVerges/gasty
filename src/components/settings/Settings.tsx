import { useContext, useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { getRecurringSources, deleteRecurringSource } from '../../lib/recurring'
import { useCategories } from '../../hooks/useCategories'
import { formatMoney, formatDate } from '../../lib/format'
import { clearDatabase } from '../../lib/db'
import { CsvImportContext } from '../../context/CsvImportContext'
import { CategoryManager } from './CategoryManager'
import type { Transaction } from '../../types'
import { version } from '../../../package.json'

type SettingsView = 'main' | 'categories'

export function Settings() {
  const { settings, setTheme, setCurrency, setCsvFormat } = useSettings()
  const categories = useCategories()
  const csvImport = useContext(CsvImportContext)
  const [recurring, setRecurring] = useState<Transaction[]>([])
  const [view, setView] = useState<SettingsView>('main')
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    getRecurringSources().then(setRecurring)
  }, [])

  const refresh = () => getRecurringSources().then(setRecurring)

  const handleDeleteRecurring = async (id: string) => {
    if (confirm('¿Eliminar este movimiento recurrente? Se cancelarán las repeticiones futuras, pero el historial se mantiene.')) {
      await deleteRecurringSource(id)
      await refresh()
    }
  }

  const handleClearDatabase = async () => {
    if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
      setClearing(true)
      try {
        await clearDatabase()
        await refresh()
      } finally {
        setClearing(false)
      }
    }
  }

  if (view === 'categories') {
    return (
      <div className="space-y-4">
        <header className="pt-2 pb-1 flex items-center gap-3">
          <button
            onClick={() => setView('main')}
            className="w-9 h-9 rounded-xl bg-canvas-soft flex items-center justify-center text-lg active:scale-[0.95] transition-transform shrink-0"
            aria-label="Volver"
          >
            ←
          </button>
          <h1 className="text-4xl font-black tracking-tight leading-none">Categorías</h1>
        </header>
        <CategoryManager />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h1 className="text-4xl font-black tracking-tight leading-none">Ajustes</h1>
      </header>

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
          Apariencia
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`
              p-4 rounded-2xl border-2 transition-colors text-left
              ${settings.theme === 'light' ? 'border-primary bg-primary-pale' : 'border-border bg-card'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">☀️</span>
              <span className="font-semibold">Claro</span>
            </div>
            <p className="text-xs text-body">Fondo blanco</p>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`
              p-4 rounded-2xl border-2 transition-colors text-left
              ${settings.theme === 'dark' ? 'border-primary bg-primary-pale' : 'border-border bg-card'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌙</span>
              <span className="font-semibold">Oscuro</span>
            </div>
            <p className="text-xs text-body">No tan oscuro</p>
          </button>
        </div>
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
          Moneda
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCurrency('ARS')}
            className={`
              p-3 rounded-2xl border-2 transition-colors font-semibold
              ${settings.currency === 'ARS' ? 'border-primary bg-primary-pale text-on-primary' : 'border-border text-body'}
            `}
          >
            $ ARS
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`
              p-3 rounded-2xl border-2 transition-colors font-semibold
              ${settings.currency === 'USD' ? 'border-primary bg-primary-pale text-on-primary' : 'border-border text-body'}
            `}
          >
            US$ USD
          </button>
        </div>
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
          Formato de CSV
        </span>
        <p className="text-xs text-body mb-3">
          Configurá cómo se leen los montos en archivos CSV importados.
        </p>

        {/* Thousands separator */}
        <div className="mb-3">
          <label className="text-xs text-mute block mb-1">Separador de miles</label>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'auto' as const, label: 'Auto' },
              { value: ',' as const, label: 'Coma (1,000)' },
              { value: '.' as const, label: 'Punto (1.000)' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCsvFormat({ thousandsSeparator: opt.value })}
                className={`
                  py-3 px-2 rounded-xl text-xs font-medium transition-colors
                  ${settings.csvFormat.thousandsSeparator === opt.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-canvas-soft text-body'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Decimal separator */}
        <div className="mb-3">
          <label className="text-xs text-mute block mb-1">Separador decimal</label>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'auto' as const, label: 'Auto' },
              { value: '.' as const, label: 'Punto (10.50)' },
              { value: ',' as const, label: 'Coma (10,50)' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCsvFormat({ decimalSeparator: opt.value })}
                className={`
                  py-3 px-2 rounded-xl text-xs font-medium transition-colors
                  ${settings.csvFormat.decimalSeparator === opt.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-canvas-soft text-body'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Strip currency prefix */}
        <div className="flex items-center justify-between py-3">
          <div>
            <span className="text-sm text-body">Quitar prefijo de moneda</span>
            <p className="text-xs text-mute">Ej: "ARS 590.000" → "590.000"</p>
          </div>
          <button
            onClick={() => setCsvFormat({ stripCurrencyPrefix: !settings.csvFormat.stripCurrencyPrefix })}
            className={`
              relative w-11 h-8 rounded-full transition-colors
              ${settings.csvFormat.stripCurrencyPrefix ? 'bg-primary' : 'bg-canvas-soft border border-border'}
            `}
            role="switch"
            aria-checked={settings.csvFormat.stripCurrencyPrefix}
            aria-label="Quitar prefijo de moneda"
          >
            <span
              className={`
                absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform
                ${settings.csvFormat.stripCurrencyPrefix ? 'translate-x-3' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
          Categorías
        </span>
        <p className="text-xs text-body mb-3">
          Administrá las categorías y las palabras clave para detección automática al cargar gastos.
        </p>
        <button
          onClick={() => setView('categories')}
          className="
            w-full py-3 px-4 rounded-2xl
            bg-primary text-on-primary font-semibold
            active:scale-[0.98] transition-transform
          "
        >
          Editar
        </button>
      </Card>

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
          Importar datos
        </span>
        <p className="text-sm text-body mb-3">
          Cargá gastos desde un archivo CSV (nombre, importe, fecha, categoría).
        </p>
        <button
          onClick={csvImport?.openCsvImport}
          className="
            w-full py-3 px-4 rounded-2xl
            bg-primary text-on-primary font-semibold
            active:scale-[0.98] transition-transform
          "
        >
          Importar CSV
        </button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-body font-medium">
            Movimientos recurrentes
          </span>
          <span className="text-xs text-body">
            {recurring.length} activos
          </span>
        </div>

        {recurring.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-body">No tenés movimientos recurrentes</p>
            <p className="text-xs text-body mt-1">
              Al crear un movimiento, marcá la opción 🔄
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recurring.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId)
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-soft"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${cat?.color ?? '#888'}25` }}
                  >
                    {cat?.emoji ?? '🔁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-body">
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
                      className="text-xs text-negative"
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

      <div className="border-2 border-negative rounded-2xl p-4">
        <span className="text-xs uppercase tracking-widest text-negative font-medium block mb-3">
          Zona de peligro
        </span>
        <p className="text-sm text-body mb-3">
          Borrar todos los datos de la aplicación. Esta acción no se puede deshacer.
        </p>
        <button
          onClick={handleClearDatabase}
          disabled={clearing}
          className="
            w-full py-3 px-4 rounded-2xl
            bg-negative text-white font-semibold
            active:scale-[0.98] transition-transform
            disabled:opacity-50 disabled:pointer-events-none
          "
        >
          {clearing ? 'Borrando...' : 'Borrar todos los datos'}
        </button>
      </div>

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
          Sobre Gasty
        </span>
        <p className="text-sm text-body">
          Tu app de gastos personal. Tus datos quedan en tu dispositivo.
        </p>
        <p className="text-xs text-mute mt-2">{version}</p>
      </Card>
    </div>
  )
}
