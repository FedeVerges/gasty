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
  const isPositive = balance >= 0
  const hasIncome = monthIncome > 0
  const progress = hasIncome ? Math.min(monthSpent / monthIncome, 1) : 0
  const overBudget = hasIncome && monthSpent > monthIncome

  const diff = monthSpent - prevMonthExpense
  const diffPct = prevMonthExpense > 0 ? (diff / prevMonthExpense) * 100 : 0
  const isLower = diff < 0

  const barColor = isPositive ? 'var(--color-positive)' : 'var(--color-negative)'

  return (
    <Card
      variant="dark"
      isProjection={isProjection}
      className={isWide ? 'flex-1' : undefined}
    >
      {/* Available balance */}
      <div className="flex flex-col gap-1 mb-5">
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: isProjection ? 'var(--color-proyector-accent)' : 'var(--color-primary-neutral)' }}
        >
          {isProjection ? 'Proyección · ' : ''}Disponible
        </span>
        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
          {formatMoney(balance, settings.currency)}
        </span>
      </div>

      {/* Expense bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-primary-neutral)' }}>
          <span>
            {overBudget ? '¡Excediste el presupuesto!' : `Gastado ${formatMoney(monthSpent, settings.currency)}`}
          </span>
          {hasIncome && <span>{formatMoney(monthIncome, settings.currency)}</span>}
        </div>
        <div className="w-full h-2.5 bg-primary-pale rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progress * 100, 100)}%`,
              background: overBudget ? 'var(--color-negative)' : barColor,
            }}
          />
        </div>
        {hasIncome && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-primary-neutral)' }}>
            {(progress * 100).toFixed(0)}% de los ingresos
          </p>
        )}
      </div>

      {/* Diff vs previous month + Ver detalles */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {prevMonthExpense > 0 ? (
            <>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${isLower ? 'bg-positive/20' : 'bg-negative/20'
                  }`}
                style={{ color: isLower ? 'var(--color-positive)' : 'var(--color-negative)' }}
              >
                {isLower ? '↓' : '↑'} {Math.abs(diffPct).toFixed(0)}%
              </span>
              <span style={{ color: 'var(--color-primary-neutral)' }}>vs mes pasado</span>
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-primary-neutral)' }}>
              Sin datos del mes anterior para comparar
            </span>
          )}
        </div>

        {onOpenDetail && (
          <button
            onClick={onOpenDetail}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors active:scale-[0.98]"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            aria-label="Ver detalles del balance"
          >
            Ver detalles
          </button>
        )}
      </div>
    </Card>
  )
}
