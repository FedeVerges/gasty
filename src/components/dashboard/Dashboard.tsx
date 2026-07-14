import { useMemo, useState, useEffect, useRef } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useProjections } from '../../hooks/useProjections'
import { useViewport } from '../../hooks/useViewport'
import { BalanceCard } from './BalanceCard'
import { TransactionItem } from '../transactions/TransactionItem'
import { Inversiones } from './Inversiones'
import { formatMonth, formatDateGroupHeader } from '../../lib/format'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type DashboardTab = 'resumen' | 'inversiones'

interface DashboardProps {
  onOpenBalanceDetail?: (month: string, monthLabel: string) => void
}

export function Dashboard({ onOpenBalanceDetail }: DashboardProps) {
  const transactions = useAllTransactions()
  const { isWide } = useViewport()
  const [tab, setTab] = useState<DashboardTab>('resumen')
  const [showTop, setShowTop] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const now = useMemo(() => new Date(), [])
  const selectedMonth = monthKey(now)

  const { transactions: monthTransactions, isProjection } = useProjections(selectedMonth)

  const selectedDate = new Date(parseInt(selectedMonth.slice(0, 4)), parseInt(selectedMonth.slice(5, 7)) - 1)
  const monthLabel = formatMonth(selectedDate)

  const summary = useMemo(() => {
    const today = new Date()
    const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
    const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1
    const prevKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`

    let totalIncome = 0
    let totalExpense = 0
    let monthSpent = 0
    let monthIncome = 0
    let prevMonthSpent = 0

    for (const tx of monthTransactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount
      } else {
        totalExpense += tx.amount
      }
    }

    for (const tx of monthTransactions) {
      if (tx.type === 'income') {
        monthIncome += tx.amount
      } else {
        monthSpent += tx.amount
      }
    }

    for (const tx of transactions) {
      if (tx.type !== 'expense') continue
      if (tx.date.startsWith(prevKey)) {
        prevMonthSpent += tx.amount
      }
    }

    return { totalIncome, totalExpense, monthSpent, monthIncome, prevMonthSpent }
  }, [transactions, monthTransactions])

  const sorted = useMemo(() => {
    return [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date))
  }, [monthTransactions])

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, typeof sorted>()
    for (const tx of sorted) {
      const day = tx.date.split('T')[0]
      const existing = groups.get(day)
      if (existing) {
        existing.push(tx)
      } else {
        groups.set(day, [tx])
      }
    }
    return Array.from(groups.entries())
  }, [sorted])

  // Scroll-to-top detection (capture scroll from the main scroll container)
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement
      const y = el?.scrollTop ?? window.scrollY
      setShowTop(y > 400)
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [])

  const scrollToTop = () => {
    const main = rootRef.current?.closest('main') ?? document.querySelector('main')
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-4" ref={rootRef}>
      <header className="pt-2 pb-1 flex items-center justify-between">
        <div>
          <h1 className={`${isWide ? 'text-5xl' : 'text-4xl'} font-black tracking-tight leading-none`}>Gasty</h1>
          <p className="text-sm text-body mt-2">Tus gastos, simples.</p>
        </div>
      </header>

      {/* Internal tabs */}
      <div className="flex gap-2 bg-canvas-soft rounded-2xl p-1">
        <button
          onClick={() => setTab('resumen')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === 'resumen' ? 'bg-primary text-on-primary' : 'text-body'}`}
        >
          Resumen
        </button>
        <button
          onClick={() => setTab('inversiones')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === 'inversiones' ? 'bg-primary text-on-primary' : 'text-body'}`}
        >
          Inversiones
        </button>
      </div>

      {tab === 'inversiones' ? (
        <Inversiones />
      ) : (
        <>
          {isProjection && (
            <div
              className="rounded-2xl px-4 py-2 text-sm font-medium text-center"
              style={{
                background: 'var(--color-proyector-card)',
                color: 'var(--color-proyector-text)',
                border: '1px solid var(--color-proyector-accent)',
              }}
            >
              🚀 Modo proyección — los gastos futuros son estimados según tus recurrentes
            </div>
          )}

          <BalanceCard
            totalIncome={summary.totalIncome}
            totalExpense={summary.totalExpense}
            monthSpent={summary.monthSpent}
            monthIncome={summary.monthIncome}
            prevMonthExpense={summary.prevMonthSpent}
            monthLabel={monthLabel}
            isProjection={isProjection}
            onOpenDetail={() => onOpenBalanceDetail?.(selectedMonth, monthLabel)}
          />

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-3">🫥</span>
              <p className="text-ink font-medium">Sin movimientos</p>
              <p className="text-sm text-body mt-1">
                {isProjection
                  ? 'No hay recurrentes activos para proyectar este mes'
                  : 'Tocá el botón + para registrar uno'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByDay.map(([day, txs]) => (
                <div key={day}>
                  <p className="text-xs font-medium text-mute uppercase tracking-wide px-1 mb-1.5">
                    {formatDateGroupHeader(day)}
                  </p>
                  <div className="bg-card rounded-2xl">
                    {txs.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Scroll to top */}
      {showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-30 w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Volver arriba"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  )
}
