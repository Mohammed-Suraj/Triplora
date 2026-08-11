import { useState, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string
}

/**
 * Image with a shimmer skeleton behind it, fade-in on load,
 * and graceful error fallback. Keeps layout stable via aspect ratio wrapper.
 */
export function SmartImage({ className, skeletonClassName, onLoad, ...props }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {!loaded && <Skeleton className={cn('absolute inset-0 h-full w-full rounded-none', skeletonClassName)} />}
      <img
        {...props}
        loading={props.loading ?? 'lazy'}
        onLoad={(e) => {
          setLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setFailed(true)
          if (props.onError) {
            props.onError(e)
          } else {
            e.currentTarget.style.display = 'none'
          }
        }}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-500',
          loaded && !failed ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}
