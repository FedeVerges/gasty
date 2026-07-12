import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { useViewport } from '../../hooks/useViewport'
import { formatMoney } from '../../lib/format'

interface BalanceCardProps {
  /** Total income (current month) */
  totalIncome: number
  /** Total expense (current month) */
  totalExpense: number
  /** Expenses in the current selected month */
  monthSpent: number
  /** Income in the current selected month */
  monthIncome: number
  /** Previous month expense */
  prevMonthExpense: number
  /** Label for the selected month (e.g. "Junio 2026") */
  monthLabel: string
  /** Whether we're in projection mode (future month) */
  isProjection?: boolean
  /** Opens the detailed balance breakdown */
  onOpenDetail?: () => void
}

export function BalanceCard({
  totalIncome,
  totalExpense,
  monthSpent,
  monthIncome,
  prevMonthExpense,
  isProjection = false,
  onOpenDetail,
}: BalanceCardProps) {
  const { settings } = useSettings()
  const { isWide } = useViewport()

  const balance = totalIncome - totalExpense
  const hasIncome = monthIncome > 0
  const progress = hasIncome ? Math.min(monthSpent / monthIncome, 1) : 0
  const overBudget = hasIncome && monthSpent > monthIncome

  const diff = monthSpent - prevMonthExpense
  const diffPct = prevMonthExpense > 0 ? (diff / prevMonthExpense) * 100 : 0
  const isLower = diff < 0

  return (
    <div className={`gap-4 ${isWide ? 'flex flex-row' : 'flex flex-col'}`}>
      <Card
        variant="dark"
        isProjection={isProjection}
        className={isWide ? 'flex-1' : undefined}
        onClick={onOpenDetail}
      >
        {/* Available balance */}
        <div className="flex flex-col gap-1 ">
          <span className="text-xs uppercase tracking-widest "
            style={{ color: isProjection ? 'var(--color-proyector-accent)' : 'var(--color-primary-neutral)' }}
          >
            {isProjection ? 'Proyección · ' : ''}Disponible
          </span>
          <span className="text-4xl sm:text-5xl font-bold tracking-tight text-primary"
          >
            {formatMoney(balance, settings.currency)}
          </span>
        </div>
      </Card>

      <Card
        className={isWide ? 'flex-1' : undefined}
        onClick={onOpenDetail}
      >
        {/* Spent amount */}
        <div className="mb-4">
          <span className="block text-sm text-body">
            Gastado
          </span>
          <span className="block text-3xl sm:text-3xl font-bold tracking-tight"
            style={{ color: 'var(--color-negative)' }}
          >
            {formatMoney(monthSpent, settings.currency)}
          </span>
        </div>

        {/* Progress bar */}
        {hasIncome && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-body mb-1.5">
              <span>{overBudget ? '¡Excediste el presupuesto!' : `${(progress * 100).toFixed(0)}% de los ingresos`}</span>
              <span>{formatMoney(monthIncome, settings.currency)}</span>
            </div>
            <div className="w-full h-2.5 bg-primary-pale rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(progress * 100, 100)}%`,
                  background: overBudget ? 'var(--color-negative)' : 'var(--color-positive)',
                }}
              />
            </div>
          </div>
        )}

        {/* Diff vs previous month */}
        {prevMonthExpense > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${isLower ? 'bg-positive/20' : 'bg-negative/20'
                }`}
              style={{ color: isLower ? 'var(--color-positive)' : 'var(--color-negative)' }}
            >
              {isLower ? '↓' : '↑'} {Math.abs(diffPct).toFixed(0)}%
            </span>
            <span>vs mes pasado</span>
          </div>
        )}

        {prevMonthExpense === 0 && (
          <p className="text-xs">
            Sin datos del mes anterior para comparar
          </p>
        )}
      </Card>
    </div>
  )
}
