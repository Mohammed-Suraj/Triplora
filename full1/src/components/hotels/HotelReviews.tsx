import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { hotelReviewsApi, type HotelReview, type HotelReviewListResult } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/formatters'

interface HotelReviewsProps {
  hotelId: string
  hotelName: string
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onClick={() => onChange(star)}
          className="rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50',
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  )
}

export function HotelReviews({ hotelId, hotelName }: HotelReviewsProps) {
  const { user } = useAuth()
  const toast = useToast()

  const [data, setData] = useState<HotelReviewListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [stayDate, setStayDate] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    hotelReviewsApi
      .list(hotelId)
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [hotelId])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = 5 - images.length
    if (remaining <= 0) {
      toast.error('You can attach up to 5 photos')
      return
    }
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const res = await hotelReviewsApi.uploadImage(file)
        const url = res.data?.url
        if (url) setImages((prev) => [...prev, url])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await hotelReviewsApi.create(hotelId, {
        rating,
        comment: comment.trim(),
        images,
        stayDate: stayDate || null,
      })
      toast.success('Review submitted. Thank you!')
      setComment('')
      setImages([])
      setStayDate('')
      setRating(5)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (review: HotelReview) => {
    setEditingId(review.id)
    setEditRating(review.rating)
    setEditComment(review.comment)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      await hotelReviewsApi.update(hotelId, editingId, { rating: editRating, comment: editComment.trim() })
      toast.success('Review updated')
      setEditingId(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update review')
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Delete this review?')) return
    try {
      await hotelReviewsApi.remove(hotelId, reviewId)
      toast.success('Review deleted')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete review')
    }
  }

  const stats = data?.stats
  const maxDistribution = Math.max(1, ...(stats?.distribution ?? []).map((d) => d.count))

  return (
    <section id="reviews" className="flex flex-col gap-4" aria-label="Guest reviews">
      <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
        <MessageSquarePlus className="h-6 w-6 text-primary" aria-hidden="true" />
        Guest reviews
      </h2>

      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      )}

      {error && <ErrorState title="Could not load reviews" onRetry={load} />}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass-strong flex flex-col gap-3 rounded-2xl p-5 shadow-sm">
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold text-foreground">
                  {(stats?.average ?? 0).toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-4 w-4',
                      star <= Math.round(stats?.average ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/40',
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Based on {stats?.total ?? 0} verified review{(stats?.total ?? 0) === 1 ? '' : 's'} for {hotelName}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-1.5 rounded-2xl bg-secondary p-5 lg:col-span-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.distribution.find((d) => d.star === star)?.count ?? 0
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="flex w-8 shrink-0 items-center gap-0.5 font-medium text-muted-foreground">
                      {star}
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${(count / maxDistribution) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {user && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-lg font-semibold text-card-foreground">
                  {editingId ? 'Update your review' : 'Share your stay experience'}
                </h3>
                <StarPicker value={editingId ? editRating : rating} onChange={editingId ? setEditRating : setRating} />
              </div>

              {editingId ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={3}
                    required
                    className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    placeholder="Tell others about your stay..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={saveEdit}>
                      Save changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    required
                    minLength={10}
                    className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    placeholder={`How was your stay at ${hotelName}? (min 10 characters)`}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
                      Stay date
                      <input
                        type="date"
                        value={stayDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setStayDate(e.target.value)}
                        className="ml-2 h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
                      />
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
                      <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
                      {uploading ? 'Uploading...' : 'Add photos'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => handleUpload(e.target.files)}
                      />
                    </label>
                    {images.length > 0 && (
                      <span className="text-xs text-muted-foreground">{images.length}/5 photos added</span>
                    )}
                  </div>
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {images.map((src, i) => (
                        <span key={i} className="relative">
                          <img src={src} alt="" className="h-16 w-20 rounded-lg object-cover ring-1 ring-border" />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-sm"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting || uploading}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Submit review
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}

          {!user && (
            <p className="rounded-2xl bg-secondary px-5 py-4 text-center text-sm text-secondary-foreground">
              Sign in to share your experience at {hotelName}.
            </p>
          )}

          {data.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
              No reviews yet — be the first to review this stay.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.items.map((review) => (
                <motion.li
                  key={review.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
                >
                  <div className="flex items-center gap-3">
                    {review.user.avatar ? (
                      <img
                        src={review.user.avatar}
                        alt={review.user.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                        {review.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-foreground">{review.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                        {review.stayDate && ` · Stayed ${formatDate(review.stayDate)}`}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold text-secondary-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      {review.rating}
                    </span>
                    {user?.id === review.user.id && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Edit review"
                          onClick={() => startEdit(review)}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete review"
                          onClick={() => handleDelete(review.id)}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {review.comment && <p className="text-sm leading-relaxed text-card-foreground">{review.comment}</p>}
                  {review.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.images.map((src, i) => (
                        <SmartImage
                          key={i}
                          src={src}
                          alt={`Photo ${i + 1} from ${review.user.name}`}
                          className="h-20 w-24 rounded-lg object-cover ring-1 ring-border"
                        />
                      ))}
                    </div>
                  )}
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
