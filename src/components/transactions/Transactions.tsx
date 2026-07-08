import { useState, useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { TransactionItem } from './TransactionItem'
import { formatMoney, formatDateGroupHeader, MONTHS_FULL } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

type DateFilter = 'this_month' | 'last_month' | 'quarter' | 'this_year'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseSearchAmount(text: string): number | null {
  const normalized = text.replace(/[^0-9.,]/g, '').replace(/\./g, '')
  const num = parseFloat(normalized.replace(',', '.'))
  return isNaN(num) ? null : num
}

function computeDateRange(filter: DateFilter): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (filter) {
    case 'this_month':
      return {
        from: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        to: toLocalISO(now),
      }
    case 'last_month': {
      const ly = m === 0 ? y - 1 : y
      const lm = m === 0 ? 11 : m - 1
      const lastDay = new Date(ly, lm + 1, 0).getDate()
      return {
        from: `${ly}-${String(lm + 1).padStart(2, '0')}-01`,
        to: `${ly}-${String(lm + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      }
    }
    case 'quarter': {
      const qStartMonth = Math.floor(m / 3) * 3
      return {
        from: `${y}-${String(qStartMonth + 1).padStart(2, '0')}-01`,
        to: toLocalISO(now),
      }
    }
    case 'this_year':
      return {
        from: `${y}-01-01`,
        to: toLocalISO(now),
      }
  }
}

function filterLabel(filter: DateFilter): string {
  const now = new Date()
  const m = now.getMonth()
  switch (filter) {
    case 'this_month':
      return 'Este mes'
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1
      return `${MONTHS_FULL[lm].charAt(0).toUpperCase() + MONTHS_FULL[lm].slice(1)} pasado`
    }
    case 'quarter':
      return 'Trimestre'
    case 'this_year':
      return 'Este año'
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
  const [searchText, setSearchText] = useState('')

  const dateRange = useMemo(() => computeDateRange(dateFilter), [dateFilter])

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase().trim()
    const searchAmount = parseSearchAmount(search)

    return transactions
      .filter((t) => {
        const day = t.date.slice(0, 10)
        if (day < dateRange.from || day > dateRange.to) return false
        return true
      })
      .filter((t) => {
        if (!search) return true
        const cat = categories.find((c) => c.id === t.categoryId)
        const haystack = `${t.description} ${cat?.name ?? ''} ${cat?.emoji ?? ''}`.toLowerCase()
        if (haystack.includes(search)) return true
        if (searchAmount !== null && t.amount === searchAmount) return true
        return false
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, dateRange, searchText, categories])

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

      {/* Balance */}
      <div className="bg-card border border-border rounded-2xl px-4 py-3 flex justify-between items-center">
        <span className="text-sm text-body">Balance</span>
        <span
          className={`font-bold ${monthTotal >= 0 ? 'text-positive' : 'text-negative'
            }`}
        >
          {monthTotal >= 0 ? '+' : '−'} {formatMoney(Math.abs(monthTotal), settings.currency)}
        </span>
      </div>

      {/* Top Categorías */}
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
          placeholder="Buscar por descripción, categoría o monto..."
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

      {/* Date filter badges */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
        {(['this_month', 'last_month', 'quarter', 'this_year'] as DateFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`
              shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-colors
              ${dateFilter === f
                ? 'bg-ink text-canvas'
                : 'bg-card border border-border text-body'}
            `}
          >
            {filterLabel(f)}
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
              : 'No hay movimientos en este rango'}
          </p>
        </div>
      ) : (
        <>

          {/* Transactions grouped by day */}
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
        </>
      )}
    </div>
  )
}
