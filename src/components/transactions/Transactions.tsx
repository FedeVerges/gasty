import { useState, useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { TransactionItem } from './TransactionItem'
import { MONTHS_FULL } from '../../lib/format'
import { formatMoney } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

export function Transactions() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  const { settings } = useSettings()

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const months = useMemo(() => {
    const set = new Set<string>()
    set.add(`${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`)
    for (const tx of transactions) {
      set.add(tx.date.slice(0, 7))
    }
    return Array.from(set)
      .sort()
      .reverse()
      .slice(0, 12)
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesMonth = t.date.startsWith(selectedMonth)
        const matchesCat = filterCategory === 'all' || t.categoryId === filterCategory
        return matchesMonth && matchesCat
      })
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
        <h1 className="text-4xl font-black tracking-tight leading-none">Movimientos</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`
              shrink-0 px-4 py-2 rounded-full text-sm font-medium
              transition-colors whitespace-nowrap
              ${selectedMonth === m
                ? 'bg-ink text-canvas'
                : 'bg-card border border-border text-body active:bg-card-hover'}
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
              ? 'bg-ink text-canvas'
              : 'bg-card border border-border text-body'}
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
                  : 'bg-card border border-border text-body'}
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
          <p className="text-ink font-medium">Sin movimientos</p>
          <p className="text-sm text-body mt-1">
            Tocá el botón + para registrar uno
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-body">Balance del mes</span>
            <span
              className={`font-bold ${
                monthTotal >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {monthTotal >= 0 ? '+' : '−'} {formatMoney(Math.abs(monthTotal), settings.currency)}
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {filtered.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
