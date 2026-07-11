import { useMemo, useState } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useProjections } from '../../hooks/useProjections'
import { useViewport } from '../../hooks/useViewport'
import { useSettings } from '../../context/SettingsContext'
import { Card } from '../ui/Card'
import { CategoryDonutChart } from '../dashboard/CategoryDonutChart'
import { MonthSelector } from '../dashboard/MonthSelector'
import { formatMoney, MONTHS_ES, formatMonth } from '../../lib/format'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Stats() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  const { settings } = useSettings()
  const { isDesktop, isWide } = useViewport()

  const now = useMemo(() => new Date(), [])
  const currentKey = monthKey(now)
  const [selectedMonth, setSelectedMonth] = useState(currentKey)

  const { transactions: monthTransactions, isProjection } = useProjections(selectedMonth)

  const selectedDate = new Date(parseInt(selectedMonth.slice(0, 4)), parseInt(selectedMonth.slice(5, 7)) - 1)
  const monthLabel = formatMonth(selectedDate)

  const data = useMemo(() => {
    const months: Array<{
      year: number
      month: number
      key: string
      label: string
      total: number
    }> = []

    // For the 6-month bar chart, use real data + projections for future months
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonthNum = today.getMonth()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthNum - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const total = transactions
        .filter(
          (t) =>
            t.type === 'expense' && t.date.startsWith(key),
        )
        .reduce((acc, t) => acc + t.amount, 0)
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        key,
        label: MONTHS_ES[d.getMonth()],
        total,
      })
    }

    const totalLast6 = months.reduce((acc, m) => acc + m.total, 0)
    const maxTotal = Math.max(...months.map((m) => m.total), 1)
    const avg = totalLast6 / months.length

    // For the donut chart, use projected/real data for the selected month
    const byCategory: Record<string, number> = {}
    for (const tx of monthTransactions) {
      if (tx.type === 'expense') {
        byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) + tx.amount
      }
    }
    const categoryData = Object.entries(byCategory)
      .map(([id, total]) => {
        const cat = categories.find((c) => c.id === id)
        return cat ? { category: cat, total } : null
      })
      .filter((d): d is { category: import('../../types').Category; total: number } => d !== null)
      .sort((a, b) => b.total - a.total)

    const monthTotal = categoryData.reduce((acc, d) => acc + d.total, 0)

    return { months, maxTotal, avg, totalLast6, categoryData, monthTotal }
  }, [transactions, monthTransactions, categories])

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const tx of monthTransactions) {
      if (tx.type === 'expense') {
        totals[tx.categoryId] = (totals[tx.categoryId] || 0) + tx.amount
      }
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    const [id, total] = sorted[0]
    return { category: categories.find((c) => c.id === id), total }
  }, [monthTransactions, categories])

  const WIDTH = isWide ? 800 : isDesktop ? 600 : 320
  const HEIGHT = isWide ? 200 : isDesktop ? 180 : 160
  const PADDING = 8
  const BAR_WIDTH = (WIDTH - PADDING * 2) / data.months.length - 8

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h1 className="text-4xl font-black tracking-tight leading-none">Stats</h1>
      </header>

      {/* Month selector */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
      />

      {isProjection && (
        <div
          className="rounded-2xl px-4 py-2 text-sm font-medium text-center"
          style={{
            background: 'var(--color-proyector-card)',
            color: 'var(--color-proyector-text)',
            border: '1px solid var(--color-proyector-accent)',
          }}
        >
          🚀 Proyección — stats basados en gastos estimados
        </div>
      )}

      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-1">
          Últimos 6 meses
        </span>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">
            {formatMoney(data.totalLast6, settings.currency)}
          </span>
          <span className="text-sm text-body">
            · promedio {formatMoney(data.avg, settings.currency)}
          </span>
        </div>

        <div className={isWide ? 'max-w-2xl mx-auto' : isDesktop ? 'max-w-lg mx-auto' : ''}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT + 20}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
          {data.months.map((m, i) => {
            const h = (m.total / data.maxTotal) * HEIGHT
            const x = PADDING + i * (BAR_WIDTH + 8)
            const y = HEIGHT - h
            const isSelectedMonth = m.key === selectedMonth
            return (
              <g key={m.key}>
                <rect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={h}
                  rx="6"
                  fill={isSelectedMonth ? 'var(--color-accent-cyan)' : 'var(--color-positive)'}
                  opacity={m.total > 0 ? 1 : 0.2}
                />
                <text
                  x={x + BAR_WIDTH / 2}
                  y={HEIGHT + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-mute)"
                >
                  {m.label}
                </text>
              </g>
            )
          })}
        </svg>
        </div>
      </Card>

      <CategoryDonutChart
        data={data.categoryData}
        total={data.monthTotal}
        title={`Por categoría · ${monthLabel}`}
      />

      {topCategory && topCategory.category && (
        <Card isProjection={isProjection}>
          <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
            Top categoría {isProjection ? '(proyectado)' : 'del mes'}
          </span>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: `${topCategory.category.color}25` }}
            >
              {topCategory.category.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-ink truncate">
                {topCategory.category.name}
              </p>
              <p className="text-2xl font-bold text-ink">
                {formatMoney(topCategory.total, settings.currency)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
