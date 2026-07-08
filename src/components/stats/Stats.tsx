import { useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useViewport } from '../../hooks/useViewport'
import { useSettings } from '../../context/SettingsContext'
import { Card } from '../ui/Card'
import { CategoryDonutChart } from '../dashboard/CategoryDonutChart'
import { formatMoney, MONTHS_ES } from '../../lib/format'

export function Stats() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  const { settings } = useSettings()
  const { isDesktop } = useViewport()

  const now = new Date()
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const data = useMemo(() => {
    const months: Array<{
      year: number
      month: number
      key: string
      label: string
      total: number
    }> = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

    const byCategory: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith(currentKey)) {
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
  }, [transactions, categories, currentKey])

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith(currentKey)) {
        totals[tx.categoryId] = (totals[tx.categoryId] || 0) + tx.amount
      }
    }
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    const [id, total] = sorted[0]
    return { category: categories.find((c) => c.id === id), total }
  }, [transactions, categories, currentKey])

  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <header className="pt-2 pb-1">
          <h1 className="text-4xl font-black tracking-tight leading-none">Stats</h1>
        </header>
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-5xl mb-3">📈</span>
            <p className="text-ink font-medium">Sin datos todavía</p>
            <p className="text-sm text-body mt-1">
              Empezá a registrar gastos para ver estadísticas
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const WIDTH = isDesktop ? 600 : 320
  const HEIGHT = isDesktop ? 180 : 160
  const PADDING = 8
  const BAR_WIDTH = (WIDTH - PADDING * 2) / data.months.length - 8

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h1 className="text-4xl font-black tracking-tight leading-none">Stats</h1>
      </header>

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

        <div className={isDesktop ? 'max-w-lg mx-auto' : ''}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT + 20}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
          {data.months.map((m, i) => {
            const h = (m.total / data.maxTotal) * HEIGHT
            const x = PADDING + i * (BAR_WIDTH + 8)
            const y = HEIGHT - h
            return (
              <g key={m.key}>
                <rect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={h}
                  rx="6"
                  fill="var(--color-positive)"
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
      />

      {topCategory && topCategory.category && (
        <Card>
          <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
            Top categoría del mes
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
