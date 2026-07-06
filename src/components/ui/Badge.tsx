import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'default' | 'recurring' | 'income' | 'expense' | 'accent' | 'positive' | 'negative'
  className?: string
}

const COLORS: Record<string, string> = {
  default: 'bg-canvas-soft text-body',
  recurring: 'bg-recurring-soft text-recurring',
  income: 'bg-income-soft text-income',
  expense: 'bg-expense-soft text-expense',
  accent: 'bg-primary-pale text-on-primary',
  positive: 'bg-primary-pale text-positive-deep',
  negative: 'bg-negative-bg text-white',
}

export function Badge({ children, color = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2 py-0.5 text-xs font-medium
        rounded-full whitespace-nowrap
        ${COLORS[color]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
