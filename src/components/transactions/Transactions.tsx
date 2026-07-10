import { useState, useMemo } from 'react'
import { useCategories } from '../../hooks/useCategories'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useProjections } from '../../hooks/useProjections'
import { TransactionItem } from './TransactionItem'
import { MonthSelector } from '../dashboard/MonthSelector'
import { formatMoney, formatDateGroupHeader } from '../../lib/format'
import { useSettings } from '../../context/SettingsContext'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseSearchAmount(text: string): number | null {
  const normalized = text.replace(/[^0-9.,]/g, '').replace(/\./g, '')
  const num = parseFloat(normalized.replace(',', '.'))
  return isNaN(num) ? null : num
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
  const categories = useCategories()
  const allTransactions = useAllTransactions()
  const { settings } = useSettings()

  const now = useMemo(() => new Date(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthKey(now))
  const [searchText, setSearchText] = useState('')

  const { transactions: monthTransactions, isProjection } = useProjections(selectedMonth)

  const filtered = useMemo(() => {
    const search = searchText.toLowerCase().trim()
    const searchAmount = parseSearchAmount(search)

    return monthTransactions
      .filter((t) => {
        if (!search) return true
        const cat = categories.find((c) => c.id === t.categoryId)
        const haystack = `${t.description} ${cat?.name ?? ''} ${cat?.emoji ?? ''}`.toLowerCase()
        if (haystack.includes(search)) return true
        if (searchAmount !== null && t.amount === searchAmount) return true
        return false
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [monthTransactions, searchText, categories])

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

  const prevMonthKey = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [selectedMonth])

  const topCategory = useMemo(() => {
    if (categorySummary.length === 0) return null
    return categorySummary[0]
  }, [categorySummary])

  const growthCategory = useMemo(() => {
    const prevTotals: Record<string, number> = {}
    for (const tx of allTransactions) {
      if (tx.type !== 'expense' || !tx.date.startsWith(prevMonthKey)) continue
      prevTotals[tx.categoryId] = (prevTotals[tx.categoryId] || 0) + tx.amount
    }

    const currentTotals: Record<string, number> = {}
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue
      currentTotals[tx.categoryId] = (currentTotals[tx.categoryId] || 0) + tx.amount
    }

    const allIds = new Set([...Object.keys(currentTotals), ...Object.keys(prevTotals)])
    let best: { category: typeof categories[0]; current: number; previous: number; growth: number } | null = null

    for (const id of allIds) {
      const current = currentTotals[id] || 0
      const previous = prevTotals[id] || 0
      const growth = current - previous
      if (growth <= 0) continue
      const cat = categories.find((c) => c.id === id)
      if (!cat) continue
      if (!best || growth > best.growth) {
        best = { category: cat, current, previous, growth }
      }
    }

    return best
  }, [allTransactions, monthTransactions, prevMonthKey, categories])

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

      {/* Month selector */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
      />

      {/* Category info cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top categoría del mes */}
        {topCategory && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] text-body uppercase tracking-wide font-medium mb-3">
              Top del mes
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${topCategory.color}25` }}
              >
                {topCategory.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink truncate">
                  {formatMoney(topCategory.total, settings.currency)}
                </p>
                <p className="text-[10px] text-body truncate">{topCategory.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Categoría que más creció */}
        {growthCategory ? (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] text-body uppercase tracking-wide font-medium mb-3">
              Mayor crecimiento
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${growthCategory.category.color}25` }}
              >
                {growthCategory.category.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink truncate">
                  +{formatMoney(growthCategory.growth, settings.currency)}
                </p>
                <p className="text-[10px] text-body truncate">{growthCategory.category.name}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] text-body uppercase tracking-wide font-medium mb-3">
              Mayor crecimiento
            </p>
            <p className="text-sm text-mute">Sin variación</p>
          </div>
        )}
      </div>

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

      {isProjection && (
        <div
          className="rounded-2xl px-4 py-2 text-sm font-medium text-center"
          style={{
            background: 'var(--color-proyector-card)',
            color: 'var(--color-proyector-text)',
            border: '1px solid var(--color-proyector-accent)',
          }}
        >
          Modo proyección — los gastos futuros son estimados según tus recurrentes
        </div>
      )}


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
