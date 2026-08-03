import { Badge as MaguitoBadge } from 'maguitoui'
import type { ReactNode } from 'react'

type GastyColor = 'default' | 'recurring' | 'income' | 'expense' | 'accent' | 'positive' | 'negative'

interface BadgeProps {
  children: ReactNode
  color?: GastyColor
  className?: string
}

/** Maps Gasty color names to Maguito ColorVariant */
const COLOR_MAP: Record<GastyColor, string> = {
  default: 'neutral',
  recurring: 'accent',
  income: 'success',
  expense: 'danger',
  accent: 'primary',
  positive: 'success',
  negative: 'danger',
}

export function Badge({ children, color = 'default', className = '' }: BadgeProps) {
  return (
    <MaguitoBadge
      variant={COLOR_MAP[color] as 'neutral'}
      className={className}
    >
      {children}
    </MaguitoBadge>
  )
}
