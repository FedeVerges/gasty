import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'sage' | 'green' | 'dark'
  /** For proyector mode (future month projection) */
  isProjection?: boolean
}

const variants: Record<string, string> = {
  default: 'bg-canvas border border-border',
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
  const base = 'rounded-3xl p-5 transition-colors'
  const interactive = onClick
    ? 'cursor-pointer active:scale-[0.98] hover:bg-card-hover'
    : ''

  const projectionStyle: React.CSSProperties = isProjection
    ? {
        background: 'var(--color-proyector-card)',
        color: 'var(--color-proyector-text)',
        borderColor: 'var(--color-proyector-accent)',
      }
    : {}

  return (
    <div
      onClick={onClick}
      className={`${base} ${variants[variant]} ${interactive} ${className}`}
      style={variant === 'dark' ? variantStyles.dark : isProjection ? projectionStyle : undefined}
    >
      {children}
    </div>
  )
}
