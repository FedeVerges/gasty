import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger'
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
      'bg-primary text-on-primary active:brightness-90',
    secondary:
      'bg-canvas-soft text-ink active:brightness-95',
    tertiary:
      'bg-canvas text-ink border border-ink active:bg-canvas-soft',
    danger:
      'bg-negative text-white active:brightness-90',
  }

  const sizes: Record<string, string> = {
    sm: 'px-3 py-2 text-sm rounded-xl',
    md: 'px-4 py-3 text-base rounded-3xl',
    lg: 'px-5 py-4 text-lg rounded-3xl',
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
