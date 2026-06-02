import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  const base = 'bg-card border border-border rounded-3xl p-5 transition-colors'
  const interactive = onClick
    ? 'cursor-pointer active:scale-[0.98] hover:bg-card-hover'
    : ''

  return (
    <div
      onClick={onClick}
      className={`${base} ${interactive} ${className}`}
    >
      {children}
    </div>
  )
}
