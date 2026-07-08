import { useMemo } from 'react'
import { MONTHS_FULL } from '../../lib/format'

interface MonthSelectorProps {
  selectedMonth: string  // YYYY-MM format
  onChange: (month: string) => void
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export function MonthSelector({ selectedMonth, onChange }: MonthSelectorProps) {
  const now = new Date()
  const currentKey = monthKey(now.getFullYear(), now.getMonth())

  const isFuture = selectedMonth > currentKey
  const isPast = selectedMonth < currentKey

  const { prevMonth, nextMonth } = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const date = new Date(y, m - 1)

    const prev = new Date(date)
    prev.setMonth(prev.getMonth() - 1)
    const next = new Date(date)
    next.setMonth(next.getMonth() + 1)

    return {
      prevMonth: monthKey(prev.getFullYear(), prev.getMonth()),
      nextMonth: monthKey(next.getFullYear(), next.getMonth()),
    }
  }, [selectedMonth])

  const canGoNext = nextMonth <= monthKey(now.getFullYear() + 1, now.getMonth())

  const [year, monthNum] = selectedMonth.split('-').map(Number)
  const label = `${MONTHS_FULL[monthNum - 1].charAt(0).toUpperCase() + MONTHS_FULL[monthNum - 1].slice(1)} ${year}`

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <button
        onClick={() => onChange(prevMonth)}
        className="w-11 h-11 rounded-xl flex items-center justify-center
                   bg-card border border-border text-body
                   active:scale-95 transition-transform"
        aria-label="Mes anterior"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className={`text-base font-bold ${isFuture ? 'text-accent-cyan' : 'text-ink'}`}>
          {label}
        </span>
        {isFuture && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--color-proyector-accent)',
              color: 'var(--color-proyector-bg)',
            }}
          >
            Proy.
          </span>
        )}
        {isPast && (
          <span className="text-xs text-mute">· pasado</span>
        )}
      </div>

      <button
        onClick={() => canGoNext && onChange(nextMonth)}
        disabled={!canGoNext}
        className="w-11 h-11 rounded-xl flex items-center justify-center
                   bg-card border border-border text-body
                   active:scale-95 transition-transform
                   disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Mes siguiente"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
