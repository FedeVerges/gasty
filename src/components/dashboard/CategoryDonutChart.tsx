import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { formatMoney } from '../../lib/format'
import type { Category } from '../../types'

interface CategoryTotal {
  category: Category
  total: number
}

interface CategoryDonutChartProps {
  data: CategoryTotal[]
  total: number
}

const SIZE = 180
const STROKE = 28
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CategoryDonutChart({ data, total }: CategoryDonutChartProps) {
  const { settings } = useSettings()

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium block mb-4">
          Por categoría
        </span>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="text-4xl mb-2">📊</span>
          <p className="text-sm text-text-muted">
            Sin gastos este mes todavía
          </p>
        </div>
      </Card>
    )
  }

  let offset = 0
  const segments = data.map((d) => {
    const fraction = d.total / total
    const length = fraction * CIRCUMFERENCE
    const segment = {
      ...d,
      fraction,
      length,
      offset,
    }
    offset += length
    return segment
  })

  return (
    <Card>
      <span className="text-xs uppercase tracking-widest text-text-muted font-medium block mb-4">
        Por categoría
      </span>

      <div className="flex flex-col items-center gap-5">
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
            <span className="text-xs text-text-muted">Total</span>
            <span className="text-lg font-bold text-text">
              {formatMoney(total, settings.currency)}
            </span>
          </div>
        </div>

        <div className="w-full space-y-2">
          {segments.slice(0, 5).map((s) => (
            <div key={s.category.id} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: s.category.color }}
              />
              <span className="text-lg">{s.category.emoji}</span>
              <span className="flex-1 text-sm text-text truncate">
                {s.category.name}
              </span>
              <span className="text-sm font-medium text-text-muted">
                {(s.fraction * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
