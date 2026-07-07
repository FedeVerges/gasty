import { useState, useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { TransactionItem } from './TransactionItem'
import { MONTHS_FULL, formatMoney, formatDateGroupHeader } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

type DateFilter = 'this_month' | 'last_7d' | 'last_month' | 'this_year' | string

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function matchesDateFilter(dateStr: string, filter: DateFilter): boolean {
  const date = dateStr.slice(0, 10)
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (filter) {
    case 'this_month': {
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const end = toLocalISO(new Date(y, m + 1, 0))
      return date >= start && date <= end
    }
    case 'last_7d': {
      const start = new Date(y, m, now.getDate() - 6)
      return date >= toLocalISO(start) && date <= toLocalISO(now)
    }
    case 'last_month': {
      const sm = m === 0 ? 11 : m - 1
      const sy = m === 0 ? y - 1 : y
      const start = `${sy}-${String(sm + 1).padStart(2, '0')}-01`
      const end = toLocalISO(new Date(sy, sm + 1, 0))
      return date >= start && date <= end
    }
    case 'this_year': {
      return date >= `${y}-01-01` && date <= `${y}-12-31`
    }
    default: {
      return date.startsWith(filter)
    }
  }
}

function filterLabel(filter: DateFilter): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (filter) {
    case 'this_month':
      return `${MONTHS_FULL[m].charAt(0).toUpperCase() + MONTHS_FULL[m].slice(1)} ${y}`
    case 'last_7d':
      return 'Últimos 7d'
    case 'last_month': {
      const sm = m === 0 ? 11 : m - 1
      const sy = m === 0 ? y - 1 : y
      return `${MONTHS_FULL[sm].charAt(0).toUpperCase() + MONTHS_FULL[sm].slice(1)} ${sy}`
    }
    case 'this_year':
      return `Este año ${y}`
    default: {
      const [fy, fm] = filter.split('-').map(Number)
      return `${MONTHS_FULL[fm - 1].charAt(0).toUpperCase() + MONTHS_FULL[fm - 1].slice(1)} ${fy}`
    }
  }
}

interface CategorySummary {
  id: string
  name: string
  emoji: string
  color: string
  total: number
  count: number
}

export function Transactions() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  const { settings } = useSettings()

  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  const recentMonths = useMemo(() => {
    const set = new Set<string>()
    for (const tx of transactions) {
      set.add(tx.date.slice(0, 7))
    }
    return Array.from(set)
      .sort()
      .reverse()
      .slice(0, 3)
  }, [transactions])

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase().trim()
    return transactions
      .filter((t) => {
        if (!matchesDateFilter(t.date, dateFilter)) return false
        if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false
        if (search) {
          const cat = categories.find((c) => c.id === t.categoryId)
          const haystack = `${t.description} ${cat?.name ?? ''}`.toLowerCase()
          if (!haystack.includes(search)) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, dateFilter, filterCategory, searchText, categories])

  const monthTotal = useMemo(
    () => filtered.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0),
    [filtered],
  )

  const categorySummary = useMemo<CategorySummary[]>(() => {
    const map = new Map<string, CategorySummary>()
    for (const tx of filtered) {
      if (tx.type !== 'expense') continue
      const existing = map.get(tx.categoryId)
      if (existing) {
        existing.total += tx.amount
        existing.count++
      } else {
        const cat = categories.find((c) => c.id === tx.categoryId)
        map.set(tx.categoryId, {
          id: tx.categoryId,
          name: cat?.name ?? 'Sin categoría',
          emoji: cat?.emoji ?? '📦',
          color: cat?.color ?? '#64748b',
          total: tx.amount,
          count: 1,
        })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filtered, categories])

  const maxCategoryTotal = useMemo(
    () => Math.max(...categorySummary.map((c) => c.total), 1),
    [categorySummary],
  )

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const tx of filtered) {
      const day = tx.date.split('T')[0]
      const existing = groups.get(day)
      if (existing) {
        existing.push(tx)
      } else {
        groups.set(day, [tx])
      }
    }
    return Array.from(groups.entries())
  }, [filtered])

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h1 className="text-4xl font-black tracking-tight leading-none">Movimientos</h1>
      </header>

      {/* Top Categorías — gráfico reactivo */}
      {categorySummary.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs text-body uppercase tracking-wide font-medium">
            Top categorías
          </p>
          {categorySummary.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink truncate">{cat.name}</span>
                  <span className="text-sm font-bold text-ink shrink-0 ml-2">
                    {formatMoney(cat.total, settings.currency)}
                  </span>
                </div>
                <div className="h-1.5 bg-canvas-soft rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(cat.total / maxCategoryTotal) * 100}%`,
                      background: cat.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-mute pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar transacción..."
          className="
            w-full pl-10 pr-4 py-2.5
            rounded-2xl
            bg-canvas border border-border
            text-sm text-ink placeholder:text-mute
            focus:border-primary
            transition-colors
          "
        />
        {searchText && (
          <button
            onClick={() => setSearchText('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-mute p-1"
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Unified date filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
        <button
          onClick={() => setDateFilter('this_month')}
          className={`
            shrink-0 px-4 py-2 rounded-full text-sm font-medium
            transition-colors whitespace-nowrap
            ${dateFilter === 'this_month'
              ? 'bg-ink text-canvas'
              : 'bg-card border border-border text-body active:bg-card-hover'}
          `}
        >
          Este mes
        </button>
        <button
          onClick={() => setDateFilter('last_7d')}
          className={`
            shrink-0 px-4 py-2 rounded-full text-sm font-medium
            transition-colors whitespace-nowrap
            ${dateFilter === 'last_7d'
              ? 'bg-ink text-canvas'
              : 'bg-card border border-border text-body active:bg-card-hover'}
          `}
        >
          Últimos 7d
        </button>
        <button
          onClick={() => setDateFilter('last_month')}
          className={`
            shrink-0 px-4 py-2 rounded-full text-sm font-medium
            transition-colors whitespace-nowrap
            ${dateFilter === 'last_month'
              ? 'bg-ink text-canvas'
              : 'bg-card border border-border text-body active:bg-card-hover'}
          `}
        >
          Mes anterior
        </button>
        <button
          onClick={() => setDateFilter('this_year')}
          className={`
            shrink-0 px-4 py-2 rounded-full text-sm font-medium
            transition-colors whitespace-nowrap
            ${dateFilter === 'this_year'
              ? 'bg-ink text-canvas'
              : 'bg-card border border-border text-body active:bg-card-hover'}
          `}
        >
          Este año
        </button>
        {recentMonths.map((m) => {
          const [fy, fm] = m.split('-').map(Number)
          const label = `${MONTHS_FULL[fm - 1].slice(0, 3).toUpperCase()} ${fy}`
          return (
            <button
              key={m}
              onClick={() => setDateFilter(m)}
              className={`
                shrink-0 px-4 py-2 rounded-full text-sm font-medium
                transition-colors whitespace-nowrap
                ${dateFilter === m
                  ? 'bg-ink text-canvas'
                  : 'bg-card border border-border text-body active:bg-card-hover'}
              `}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Category filters */}
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
        {categories.some((c) => c.type === 'income') && (
          <span className="shrink-0 w-px self-center h-4 bg-border" aria-hidden="true" />
        )}
        {categories
          .filter((c) => c.type === 'income')
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
            {searchText
              ? 'No se encontraron resultados'
              : 'Tocá el botón + para registrar uno'}
          </p>
        </div>
      ) : (
        <>
          {/* Balance */}
          <div className="bg-card border border-border rounded-2xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-body">Balance · {filterLabel(dateFilter)}</span>
            <span
              className={`font-bold ${
                monthTotal >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {monthTotal >= 0 ? '+' : '−'} {formatMoney(Math.abs(monthTotal), settings.currency)}
            </span>
          </div>

          {/* Transactions grouped by day */}
          <div className="space-y-3">
            {groupedByDay.map(([day, txs]) => (
              <div key={day}>
                <p className="text-xs font-medium text-mute uppercase tracking-wide px-1 mb-1.5">
                  {formatDateGroupHeader(day)}
                </p>
                <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                  {txs.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
