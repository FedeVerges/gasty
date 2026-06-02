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

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium">
          {monthLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm text-text-muted">Gastado</span>
          <span className="block text-2xl font-bold text-expense">
            {formatMoney(monthSpent, settings.currency)}
          </span>
        </div>
        <div>
          <span className="block text-sm text-text-muted">
            {hasIncome ? 'Restante' : 'Ingresos'}
          </span>
          <span
            className={`block text-2xl font-bold ${hasIncome ? (remaining >= 0 ? 'text-income' : 'text-expense') : 'text-text-muted'}`}
          >
            {hasIncome ? formatMoney(remaining, settings.currency) : formatMoney(0, settings.currency)}
          </span>
        </div>
      </div>
    </Card>
  )
}
