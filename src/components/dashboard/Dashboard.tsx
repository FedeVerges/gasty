import { useState, useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { BalanceCard } from './BalanceCard'
import { MonthSummary } from './MonthSummary'
import { TransactionItem } from '../transactions/TransactionItem'
import { formatMonth } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

export function Dashboard() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  useSettings()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [filterCategory, setFilterCategory] = useState('all')

  const summary = useMemo(() => {
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1

    let totalIncome = 0
    let totalExpense = 0
    let monthSpent = 0
    let monthIncome = 0
    let prevMonthSpent = 0

    for (const tx of transactions) {
      const [y, m] = tx.date.split('-').map(Number)
      if (tx.type === 'income') {
        totalIncome += tx.amount
        if (y === currentYear && m === currentMonth + 1) {
          monthIncome += tx.amount
        }
      } else {
        totalExpense += tx.amount
        if (y === currentYear && m === currentMonth + 1) {
          monthSpent += tx.amount
        }
        if (y === prevYear && m === prevMonth + 1) {
          prevMonthSpent += tx.amount
        }
      }
    }

    return { totalIncome, totalExpense, monthSpent, monthIncome, prevMonthSpent }
  }, [transactions, currentYear, currentMonth])

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => filterCategory === 'all' || t.categoryId === filterCategory)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, filterCategory])

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h1 className="text-3xl font-bold tracking-tight">Gasty</h1>
        <p className="text-sm text-text-muted mt-1">Tus gastos, simples.</p>
      </header>

      <BalanceCard
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        prevMonthExpense={summary.prevMonthSpent}
      />

      <MonthSummary
        monthSpent={summary.monthSpent}
        monthIncome={summary.monthIncome}
        monthLabel={formatMonth(now)}
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
        <button
          onClick={() => setFilterCategory('all')}
          className={`
            shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
            ${filterCategory === 'all'
              ? 'bg-text text-card'
              : 'bg-card border border-border text-text-muted'}
          `}
        >
          Todas
        </button>
        {categories
          .filter((c) => c.type === 'expense')
          .map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`
                shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                flex items-center gap-1
                ${filterCategory === c.id
                  ? 'text-white'
                  : 'bg-card border border-border text-text-muted'}
              `}
              style={
                filterCategory === c.id
                  ? { background: c.color }
                  : undefined
              }
            >
              <span>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-3">🫥</span>
          <p className="text-text font-medium">Sin movimientos</p>
          <p className="text-sm text-text-muted mt-1">
            Tocá el botón + para registrar uno
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  )
}
