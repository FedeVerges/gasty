import { useState, useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { BalanceCard } from './BalanceCard'
import { MonthSummary } from './MonthSummary'
import { TransactionItem } from '../transactions/TransactionItem'
import { formatMoney, formatMonth, MONTHS_FULL } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

export function Dashboard() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  const { settings } = useSettings()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [selectedMonth, setSelectedMonth] = useState(() =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  )
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

  const months = useMemo(() => {
    const set = new Set<string>()
    set.add(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
    for (const tx of transactions) {
      set.add(tx.date.slice(0, 7))
    }
    return Array.from(set).sort().reverse().slice(0, 12)
  }, [transactions, currentYear, currentMonth])

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.date.startsWith(selectedMonth))
      .filter((t) => filterCategory === 'all' || t.categoryId === filterCategory)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, selectedMonth, filterCategory])

  const monthTotal = useMemo(
    () => filtered.reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : -t.amount), 0),
    [filtered],
  )

  const formatMonthKey = (key: string) => {
    const [y, m] = key.split('-')
    const idx = parseInt(m, 10)
    return `${MONTHS_FULL[idx].charAt(0).toUpperCase() + MONTHS_FULL[idx].slice(1)} ${y}`
  }

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
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`
              shrink-0 px-4 py-2 rounded-full text-sm font-medium
              transition-colors whitespace-nowrap
              ${selectedMonth === m
                ? 'bg-accent text-white'
                : 'bg-card border border-border text-text-muted active:bg-card-hover'}
            `}
          >
            {formatMonthKey(m)}
          </button>
        ))}
      </div>

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
        <>
          <div className="bg-card border border-border rounded-2xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-text-muted">Balance del mes</span>
            <span
              className={`font-bold ${
                monthTotal >= 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {monthTotal >= 0 ? '+' : '−'} {formatMoney(Math.abs(monthTotal), settings.currency)}
            </span>
          </div>

          <div className="space-y-1">
            {filtered.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
