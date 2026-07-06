import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney } from '../../lib/format'

interface BalanceCardProps {
  totalIncome: number
  totalExpense: number
  prevMonthExpense: number
}

export function BalanceCard({ totalIncome, totalExpense, prevMonthExpense }: BalanceCardProps) {
  const { settings } = useSettings()
  const balance = totalIncome - totalExpense
  const diff = totalExpense - prevMonthExpense
  const diffPct = prevMonthExpense > 0 ? (diff / prevMonthExpense) * 100 : 0
  const isLower = diff < 0

  return (
    <Card variant="dark">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-primary-neutral font-medium">
          Disponible
        </span>
        <span className="text-5xl font-bold tracking-tight text-primary">
          {formatMoney(balance, settings.currency)}
        </span>
        <div className="mt-2 flex items-center gap-2 text-sm text-primary-pale">
          {prevMonthExpense > 0 ? (
            <>
              <span
                className={`
                  inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium
                  ${isLower ? 'bg-primary-pale/20 text-primary-pale' : 'bg-primary-pale/20 text-primary-pale'}
                `}
              >
                {isLower ? '↓' : '↑'} {Math.abs(diffPct).toFixed(0)}%
              </span>
              <span>vs mes pasado</span>
            </>
          ) : (
            <span className="text-primary-neutral">Empezá a registrar gastos</span>
          )}
        </div>
      </div>
    </Card>
  )
}
