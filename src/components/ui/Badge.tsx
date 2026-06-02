import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  color?: 'default' | 'recurring' | 'income' | 'expense' | 'accent'
  className?: string
}

const COLORS: Record<string, string> = {
  default: 'bg-gray-100 text-text-muted',
  recurring: 'bg-recurring-soft text-recurring',
  income: 'bg-income-soft text-income',
  expense: 'bg-expense-soft text-expense',
  accent: 'bg-accent-soft text-accent',
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
