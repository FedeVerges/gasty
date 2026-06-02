import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...rest
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-br from-accent to-accent-2 text-white shadow-md active:scale-95',
    secondary:
      'bg-card border border-border text-text active:bg-card-hover',
    ghost: 'text-text-muted active:bg-card-hover',
    danger: 'bg-expense text-white active:scale-95',
  }

  const sizes: Record<string, string> = {
    sm: 'px-3 py-2 text-sm rounded-xl',
    md: 'px-4 py-3 text-base rounded-2xl',
    lg: 'px-5 py-4 text-lg rounded-2xl',
  }

  return (
    <button
      className={`
        font-semibold transition-all
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  )
}
