import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-xl', className)} {...props} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border', className)}>
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-1 h-9 w-full rounded-full" />
    </div>
  )
}

export function DestinationGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, n) => (
        <SkeletonCard key={n} />
      ))}
    </div>
  )
}
