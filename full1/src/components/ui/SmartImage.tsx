import { useState, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

const DEFAULT_FALLBACK_IMAGE = '/images/hero-kerala.png'

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string
  fallbackSrc?: string
}

/**
 * Image with a shimmer skeleton behind it, fade-in on load,
 * lazy loading, and graceful fallback to default imagery.
 */
export function SmartImage({ className, skeletonClassName, fallbackSrc = DEFAULT_FALLBACK_IMAGE, onLoad, src, ...props }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc)
  const [failedOnce, setFailedOnce] = useState(false)

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {!loaded && <Skeleton className={cn('absolute inset-0 h-full w-full rounded-none', skeletonClassName)} />}
      <img
        {...props}
        src={imgSrc}
        loading={props.loading ?? 'lazy'}
        onLoad={(e) => {
          setLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          if (!failedOnce) {
            setFailedOnce(true)
            setImgSrc(fallbackSrc)
          } else {
            setLoaded(true)
          }
          props.onError?.(e)
        }}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}
