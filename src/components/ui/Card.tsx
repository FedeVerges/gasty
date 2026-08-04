import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'dark'
  /** For proyector mode (future month projection) */
  isProjection?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  dark: {
    background: 'var(--color-card-dark)',
    color: 'var(--color-card-dark-text)',
  },
}

export function Card({ children, variant = 'default', isProjection = false, className = '', onClick }: CardProps) {
  const base = 'rounded-3xl p-5 bg-canvas border border-border transition-colors'
  const interactive = onClick
    ? 'cursor-pointer active:scale-[0.98] hover:bg-card-hover'
    : ''

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
    <div
      onClick={onClick}
      className={`${base} ${interactive} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
