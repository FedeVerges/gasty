import { Button as MaguitoButton } from 'maguitoui'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type GastyVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: GastyVariant
  size?: 'sm' | 'md' | 'lg'
  shape?: 'rounded' | 'circle'
  fullWidth?: boolean
}

/** Maps Gasty variant names to Maguito ColorVariant */
const VARIANT_MAP: Record<GastyVariant, string> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'ghost',
  danger: 'danger',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  fullWidth = false,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <MaguitoButton
      variant={VARIANT_MAP[variant] as 'primary'}
      size={size}
      shape={shape}
      fullWidth={fullWidth}
      shadow={variant !== 'tertiary'}
      className={className}
      {...rest}
    >
      {children}
    </MaguitoButton>
  )
}
