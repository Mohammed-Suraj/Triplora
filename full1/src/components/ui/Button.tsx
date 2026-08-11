import { forwardRef, useRef, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:bg-primary/85',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70',
  outline:
    'border border-border bg-transparent text-foreground shadow-sm hover:bg-secondary hover:border-foreground/15 active:bg-secondary/80',
  ghost: 'bg-transparent text-foreground hover:bg-secondary active:bg-secondary/80',
  glass: 'glass text-foreground shadow-sm hover:bg-card/80 active:bg-card/60',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, onClick, children, ...props }, ref) => {
    const rippleRef = useRef<HTMLSpanElement | null>(null)

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return
      const btn = e.currentTarget
      const rect = btn.getBoundingClientRect()
      const diameter = Math.max(rect.width, rect.height)
      const ripple = document.createElement('span')
      ripple.style.width = ripple.style.height = `${diameter}px`
      ripple.style.left = `${e.clientX - rect.left - diameter / 2}px`
      ripple.style.top = `${e.clientY - rect.top - diameter / 2}px`
      ripple.className =
        'pointer-events-none absolute rounded-full bg-current opacity-20 animate-[triplora-ripple_0.6s_ease-out_forwards]'
      rippleRef.current?.appendChild(ripple)
      window.setTimeout(() => ripple.remove(), 700)
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        className={cn(
          'press relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-colors duration-200 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current"
            aria-hidden="true"
          />
        )}
        <span ref={rippleRef} className="absolute inset-0 overflow-hidden rounded-full" aria-hidden="true" />
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </button>
    )
  },
)

Button.displayName = 'Button'
