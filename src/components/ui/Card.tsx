import { Card as MaguitoCard } from 'maguitoui'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'sage' | 'green' | 'dark'
  /** For proyector mode (future month projection) */
  isProjection?: boolean
}

const variantClasses: Record<string, string> = {
  default: '',
  sage: 'bg-canvas-soft',
  green: 'bg-primary-pale',
  dark: '',
}

const variantStyles: Record<string, React.CSSProperties> = {
  dark: {
    background: 'var(--color-card-dark)',
    color: 'var(--color-card-dark-text)',
  },
}

export function Card({ children, variant = 'default', isProjection = false, className = '', onClick }: CardProps) {
  const interactive = onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-card-hover' : ''

  const projectionStyle: React.CSSProperties = isProjection
    ? {
        background: 'var(--color-projection-card)',
        color: 'var(--color-projection-text)',
        borderColor: 'var(--color-projection-accent)',
      }
    : {}

  const style = variant === 'dark'
    ? variantStyles.dark
    : isProjection
      ? projectionStyle
      : undefined

  return (
    <MaguitoCard
      paddingSize="sm"
      className={`${variantClasses[variant]} ${interactive} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </MaguitoCard>
  )
}
