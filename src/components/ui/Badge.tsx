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
  positive: 'bg-positive-soft text-positive-deep',
  negative: 'bg-negative-soft text-negative-deep',
}

export function Badge({ children, color = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${COLORS[color]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
