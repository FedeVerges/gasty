import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney } from '../../lib/format'

interface MonthSummaryProps {
  monthSpent: number
  monthIncome: number
  monthLabel: string
}

export function MonthSummary({ monthSpent, monthIncome, monthLabel }: MonthSummaryProps) {
  const { settings } = useSettings()
  const remaining = monthIncome - monthSpent
  const hasIncome = monthIncome > 0
  const progress = hasIncome ? Math.min(monthSpent / monthIncome, 1) : 0
  const overBudget = hasIncome && monthSpent > monthIncome

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-body font-medium">
          {monthLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm text-body">Gastado</span>
          <span className="block text-2xl font-bold text-negative">
            {formatMoney(monthSpent, settings.currency)}
          </span>
        </div>
        <div>
          <span className="block text-sm text-body">
            {hasIncome ? 'Restante' : 'Ingresos'}
          </span>
          <span
            className={`block text-2xl font-bold ${hasIncome ? (remaining >= 0 ? 'text-income' : 'text-negative') : 'text-body'}`}
          >
            {hasIncome ? formatMoney(remaining, settings.currency) : formatMoney(0, settings.currency)}
          </span>
        </div>
      </div>

      {hasIncome && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-body mb-1.5">
            <span>{overBudget ? '¡Excediste el presupuesto!' : `${(progress * 100).toFixed(0)}% de los ingresos`}</span>
            <span>{formatMoney(monthIncome, settings.currency)}</span>
          </div>
          <div className="w-full h-2.5 bg-primary-pale rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-negative' : 'bg-positive'}`}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
