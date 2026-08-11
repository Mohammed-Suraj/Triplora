import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'glass' | 'accent'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        variant === 'default' && 'bg-secondary text-secondary-foreground',
        variant === 'glass' && 'glass text-foreground',
        variant === 'accent' && 'bg-accent text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}
