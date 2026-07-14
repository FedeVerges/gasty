import { useMemo } from 'react'
import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { useProjections } from '../../hooks/useProjections'
import { useCategories } from '../../hooks/useCategories'
import { formatMoney, formatDateGroupHeader } from '../../lib/format'
import type { Transaction } from '../../types'

interface BalanceDetailPageProps {
  month: string
  monthLabel: string
  onBack: () => void
}

interface TxEntry {
  tx: Transaction
  emoji: string
  color: string
  isIncome: boolean
}

interface DayEntry {
  date: string
  label: string
  transactions: TxEntry[]
  dayIncome: number
  dayExpense: number
  balance: number
}

export function BalanceDetailPage({ month, monthLabel, onBack }: BalanceDetailPageProps) {
  const { settings } = useSettings()
  const categories = useCategories()
  const { transactions, isProjection } = useProjections(month)

  const data = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount
      else expense += tx.amount
    }
    return { income, expense, available: income - expense }
  }, [transactions])

  const timeline = useMemo<DayEntry[]>(() => {
    if (transactions.length === 0) return []

    // Group transactions by day
    const dayMap = new Map<string, Transaction[]>()
    for (const tx of transactions) {
      const day = tx.date.split('T')[0]
      const existing = dayMap.get(day)
      if (existing) existing.push(tx)
      else dayMap.set(day, [tx])
    }

    // Sort days chronologically ascending for balance calculation
    const sortedDays = Array.from(dayMap.keys()).sort()

    let runningBalance = 0
    const chronological = sortedDays.map((day) => {
      const dayTxs = dayMap.get(day)!.sort((a, b) => {
        // Income first, then expenses
        if (a.type === 'income' && b.type !== 'income') return -1
        if (a.type !== 'income' && b.type === 'income') return 1
        return 0
      })

      let dayIncome = 0
      let dayExpense = 0

      const entries: TxEntry[] = dayTxs.map((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId)
        const isIncome = tx.type === 'income'
        if (isIncome) dayIncome += tx.amount
        else dayExpense += tx.amount
        return {
          tx,
          emoji: tx.emoji ?? cat?.emoji ?? '💸',
          color: cat?.color ?? 'var(--color-mute)',
          isIncome,
        }
      })

      runningBalance += dayIncome - dayExpense

      return {
        date: day,
        label: formatDateGroupHeader(day),
        transactions: entries,
        dayIncome,
        dayExpense,
        balance: runningBalance,
      }
    })

    // Display most recent first
    return chronological.reverse()
  }, [transactions, categories])

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
        <span className="block text-4xl font-bold tracking-tight mt-1 text-primary">
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

      {/* Balance trajectory timeline */}
      <div>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3 px-1">
          Cómo llegás a tu disponible
        </span>

        {timeline.length === 0 ? (
          <Card>
            <p className="text-sm text-body text-center py-6">Sin movimientos este mes.</p>
          </Card>
        ) : (
          <div className="relative pl-5">
            {/* Vertical line */}
            <div
              className="absolute left-[7px] top-1 bottom-1 w-0.5"
              style={{ background: 'var(--color-border)' }}
            />

            <div className="space-y-1">
              {timeline.map((day) => {
                const net = day.dayIncome - day.dayExpense
                const dotColor = net >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'

                return (
                  <div key={day.date} className="relative rounded-2xl px-3 py-2.5 bg-primary-pale border-l-4 border-primary">
                    {/* Dot on the timeline */}
                    <div
                      className="absolute -left-[13px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-canvas"
                      style={{ background: dotColor }}
                    />

                    {/* Day header */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-ink">{day.label}</span>
                      <span className="text-xs text-mute">
                        {day.dayIncome > 0 && (
                          <span className="text-positive">+{formatMoney(day.dayIncome, settings.currency)}</span>
                        )}
                        {day.dayIncome > 0 && day.dayExpense > 0 && ' / '}
                        {day.dayExpense > 0 && (
                          <span className="text-negative">−{formatMoney(day.dayExpense, settings.currency)}</span>
                        )}
                      </span>
                    </div>

                    {/* Transactions */}
                    <div className="space-y-0.5">
                      {day.transactions.map((entry) => (
                        <div key={entry.tx.id} className="flex items-center gap-2 text-xs">
                          <span className="shrink-0">{entry.emoji}</span>
                          <span className="flex-1 truncate text-body">{entry.tx.description}</span>
                          <span
                            className="shrink-0 font-medium"
                            style={{ color: entry.isIncome ? 'var(--color-positive)' : 'var(--color-negative)' }}
                          >
                            {entry.isIncome ? '+' : '−'}{formatMoney(entry.tx.amount, settings.currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Balance at end of day — always prominent */}
                    <div className="mt-2 pt-2 border-t border-primary/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-primary-neutral)' }}>
                          Balance a esta fecha
                        </span>
                        <span className={`text-lg font-bold ${day.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {formatMoney(day.balance, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
