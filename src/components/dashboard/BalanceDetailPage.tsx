import { useMemo } from 'react'
import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { useProjections } from '../../hooks/useProjections'
import { useCategories } from '../../hooks/useCategories'
import { formatMoney } from '../../lib/format'

interface BalanceDetailPageProps {
  month: string
  monthLabel: string
  onBack: () => void
}

export function BalanceDetailPage({ month, monthLabel, onBack }: BalanceDetailPageProps) {
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

  const isPositive = data.available >= 0
  const balanceColor = isPositive ? 'var(--color-positive)' : 'var(--color-negative)'

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform"
          aria-label="Volver al dashboard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold">Detalle del balance</h2>
          <p className="text-sm text-body">{monthLabel}{isProjection ? ' · proyección' : ''}</p>
        </div>
      </div>

      {/* Available balance */}
      <Card variant="dark" isProjection={isProjection}>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-primary-neutral)' }}>
          Disponible
        </span>
        <span className="block text-4xl font-bold tracking-tight mt-1" style={{ color: balanceColor }}>
          {formatMoney(data.available, settings.currency)}
        </span>
      </Card>

      {/* Income / Expense grid */}
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

      {/* Category breakdown */}
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
  )
}
