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
    <Card className="bg-gradient-to-br from-accent to-accent-2 border-0 text-white">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-white/70 font-medium">
          Disponible
        </span>
        <span className="text-5xl font-bold tracking-tight">
          {formatMoney(balance, settings.currency)}
        </span>
        <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
          {prevMonthExpense > 0 ? (
            <>
              <span
                className={`
                  inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium
                  ${isLower ? 'bg-white/20' : 'bg-white/20'}
                `}
              >
                {isLower ? '↓' : '↑'} {Math.abs(diffPct).toFixed(0)}%
              </span>
              <span>vs mes pasado</span>
            </>
          ) : (
            <span className="text-white/60">Empezá a registrar gastos</span>
          )}
        </div>
      </div>
    </Card>
  )
}
