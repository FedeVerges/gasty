import { useMemo } from 'react'
import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { useProjections } from '../../hooks/useProjections'
import { useCategories } from '../../hooks/useCategories'
import { formatMoney } from '../../lib/format'

interface BalanceDetailSheetProps {
  open: boolean
  month: string
  monthLabel: string
  onClose: () => void
}

export function BalanceDetailSheet({ open, month, monthLabel, onClose }: BalanceDetailSheetProps) {
  const { settings } = useSettings()
  const categories = useCategories()
  const { transactions, isProjection } = useProjections(month)

  const data = useMemo(() => {
    let income = 0
    let expense = 0
    const byCategory = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type === 'income') {
        income += tx.amount
      } else {
        expense += tx.amount
        byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount)
      }
    }
    const top = Array.from(byCategory.entries())
      .map(([id, total]) => ({ cat: categories.find((c) => c.id === id), total }))
      .filter((d) => d.cat)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
    return { income, expense, available: income - expense, top }
  }, [transactions, categories])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ background: 'var(--color-overlay)' }}
    >
      <div
        className="w-full max-w-[480px] bg-canvas rounded-t-3xl animate-slide-up overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '90vh' }}
      >
        <div className="sticky top-0 bg-canvas px-5 pt-4 pb-2 z-10">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Detalle del balance</h2>
            <button
              onClick={onClose}
              className="text-body p-1 active:scale-95"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-body">{monthLabel}{isProjection ? ' · proyección' : ''}</p>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <Card variant="dark" isProjection={isProjection}>
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-primary-neutral)' }}>
              Disponible
            </span>
            <span className="block text-4xl font-bold tracking-tight text-primary mt-1">
              {formatMoney(data.available, settings.currency)}
            </span>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <span className="text-sm text-body">Ingresos</span>
              <span className="block text-2xl font-bold text-positive mt-1">
                {formatMoney(data.income, settings.currency)}
              </span>
            </Card>
            <Card>
              <span className="text-sm text-body">Gastado</span>
              <span className="block text-2xl font-bold text-negative mt-1">
                {formatMoney(data.expense, settings.currency)}
              </span>
            </Card>
          </div>

          <Card>
            <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
              Composición del gasto
            </span>
            {data.top.length === 0 ? (
              <p className="text-sm text-body">Sin gastos este mes.</p>
            ) : (
              <div className="space-y-2">
                {data.top.map(({ cat, total }) => {
                  const pct = data.expense > 0 ? (total / data.expense) * 100 : 0
                  return (
                    <div key={cat!.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{cat!.emoji}</span>
                        <span className="flex-1 text-sm text-ink truncate">{cat!.name}</span>
                        <span className="text-sm font-medium text-body">
                          {formatMoney(total, settings.currency)}
                        </span>
                        <span className="text-xs text-mute w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-canvas-soft overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: cat!.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
