import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'sage' | 'green' | 'dark'
}

const variants: Record<string, string> = {
  default: 'bg-canvas border border-border',
  sage: 'bg-canvas-soft',
  green: 'bg-primary-pale',
  dark: 'bg-ink text-primary',
}

export function Card({ children, variant = 'default', className = '', onClick }: CardProps) {
  const base = 'rounded-3xl p-5 transition-colors'
  const interactive = onClick
    ? 'cursor-pointer active:scale-[0.98] hover:bg-card-hover'
    : ''

  return (
    <div
      onClick={onClick}
      className={`${base} ${variants[variant]} ${interactive} ${className}`}
    >
      {children}
    </div>
  )
}
