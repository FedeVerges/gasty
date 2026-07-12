import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { useViewport } from '../../hooks/useViewport'
import { formatMoney } from '../../lib/format'
import type { Category } from '../../types'

interface CategoryTotal {
  category: Category
  total: number
}

interface CategoryDonutChartProps {
  data: CategoryTotal[]
  total: number
  title?: string
  mode?: 'pct' | 'amount'
}

function DonutChartSVG({ data, total }: { data: CategoryTotal[]; total: number }) {
  const { isDesktop } = useViewport()
  const { settings } = useSettings()
  const SIZE = isDesktop ? 260 : 180
  const STROKE = isDesktop ? 36 : 28
  const RADIUS = (SIZE - STROKE) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  const segments = data.reduce<Array<CategoryTotal & { fraction: number; length: number; offset: number }>>(
    (acc, d) => {
      const fraction = d.total / total
      const length = fraction * CIRCUMFERENCE
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0
      acc.push({ ...d, fraction, length, offset })
      return acc
    },
    []
  )

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="transform -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />
        {segments.map((s) => (
          <circle
            key={s.category.id}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={s.category.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-body">Total</span>
        <span className="text-lg font-bold text-ink">
          {formatMoney(total, settings.currency)}
        </span>
      </div>
    </div>
  )
}

export function CategoryDonutChart({ data, total, title, mode = 'pct' }: CategoryDonutChartProps) {

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <span className="text-xs uppercase tracking-widest text-body font-medium block mb-4">
          Por categoría
        </span>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="text-4xl mb-2">📊</span>
          <p className="text-sm text-body">
            Sin gastos este mes todavía
          </p>
        </div>
      </Card>
    )
  }

  const segments = data
    .map((d) => ({ ...d, fraction: d.total / total }))
    .sort((a, b) => b.fraction - a.fraction)

  return (
    <Card>
      <span className="text-xs uppercase tracking-widest text-body font-medium block mb-4">
        {title ?? 'Por categoría'}
      </span>

      <div className="flex flex-col items-center gap-5">
        <DonutChartSVG data={data} total={total} />

        <div className="w-full space-y-2">
          {segments.slice(0, 5).map((s) => (
            <div key={s.category.id} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: s.category.color }}
              />
              <span className="text-lg">{s.category.emoji}</span>
              <span className="flex-1 text-sm text-ink truncate">
                {s.category.name}
              </span>
              <span className="text-sm font-medium text-body">
                {mode === 'amount'
                  ? formatMoney(s.total, undefined)
                  : `${(s.fraction * 100).toFixed(0)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
