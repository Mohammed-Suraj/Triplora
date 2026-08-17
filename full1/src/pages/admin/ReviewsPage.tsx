import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Trash2 } from 'lucide-react'
import { adminApi, type AdminReview } from '@/lib/api'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { useToast } from '@/context/ToastContext'

export function ReviewsPage() {
  const toast = useToast()
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadReviews = () => {
    adminApi
      .reviews({ limit: 50 })
      .then((res) => setReviews(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const handleDelete = async (review: AdminReview) => {
    if (!window.confirm(`Delete review by ${review.user.name} on ${review.destination.name}?`)) return
    setDeletingId(review.id)
    try {
      await adminApi.deleteReview(review.id)
      setReviews((prev) => prev.filter((r) => r.id !== review.id))
      toast.success('Review deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <AdminPageHeader title="Reviews" subtitle={`${reviews.length} review${reviews.length === 1 ? '' : 's'} on the platform`} />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadReviews} />
      ) : reviews.length === 0 ? (
        <AdminEmptyState icon={<Star className="h-6 w-6" aria-hidden="true" />} title="No reviews yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                    {review.user.avatar ? (
                      <img src={review.user.avatar} alt={review.user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold">{review.user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{review.user.name}</p>
                    <Link
                      to={`/destinations/${review.destination.slug}`}
                      className="truncate text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      {review.destination.name}
                    </Link>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                    <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                    {review.rating}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === review.id}
                    onClick={() => handleDelete(review)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete review</span>
                  </Button>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
              <p className="text-xs text-muted-foreground/70">
                {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}