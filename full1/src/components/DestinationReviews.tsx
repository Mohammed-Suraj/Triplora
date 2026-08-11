import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  Edit3,
  Flag,
  Heart,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { reviewsApi, type Review, type ReviewStats } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

const MAX_IMAGES = 6

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarRow({ value, onChange, size = 'h-5 w-5' }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          aria-pressed={star === value}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          className={cn(onChange && 'cursor-pointer', !onChange && 'pointer-events-none')}
        >
          <Star
            className={cn(size, star <= value ? 'fill-accent text-accent' : 'text-muted-foreground/60')}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  )
}

function ReviewImages({ images, onRemove }: { images: string[]; onRemove?: (index: number) => void }) {
  if (images.length === 0) return null
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((url, i) => (
        <div key={i} className="group relative overflow-hidden rounded-xl">
          <SmartImage src={url} alt={`Review photo ${i + 1}`} className="h-24 w-full" />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label="Remove photo"
              className="absolute top-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export function DestinationReviews({ destinationId }: { destinationId: string }) {
  const { user } = useAuth()
  const toast = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [updating, setUpdating] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')

  const loadReviews = () => {
    setLoading(true)
    reviewsApi
      .listByDestination(destinationId)
      .then((res) => {
        setReviews(res.data.items ?? res.data)
        setStats(res.data.stats ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId])

  const handleImageUpload = async (file: File) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`You can attach up to ${MAX_IMAGES} photos.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    setUploading(true)
    try {
      const res = await reviewsApi.uploadImage(file)
      setImages((prev) => [...prev, res.data.url].slice(0, MAX_IMAGES))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await reviewsApi.create({ destinationId, rating, comment: comment.trim(), images })
      setReviews((prev) => [res.data, ...prev])
      setComment('')
      setRating(5)
      setImages([])
      toast.success('Review submitted successfully!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit review'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (review: Review) => {
    setEditingId(review.id)
    setEditRating(review.rating)
    setEditComment(review.comment)
    setEditImages(review.images ?? [])
  }

  const handleUpdate = async (id: string) => {
    setUpdating(true)
    try {
      const res = await reviewsApi.update(id, { rating: editRating, comment: editComment.trim(), images: editImages })
      setReviews((prev) => prev.map((r) => (r.id === id ? res.data : r)))
      setEditingId(null)
      toast.success('Review updated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update review')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await reviewsApi.remove(id)
      setReviews((prev) => prev.filter((r) => r.id !== id))
      toast.success('Review deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLike = async (id: string) => {
    if (!user) return
    setLikingId(id)
    try {
      const res = await reviewsApi.toggleLike(id)
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, likedByMe: res.data.liked, likesCount: res.data.likesCount } : r)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update like.')
    } finally {
      setLikingId(null)
    }
  }

  const handleReport = async (id: string) => {
    if (!reportReason.trim()) return
    setReportingId(id)
    try {
      await reviewsApi.report(id, reportReason.trim())
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reportedByMe: true } : r)))
      setReportReason('')
      toast.success('Review reported. Our team will review it.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not report this review.')
    } finally {
      setReportingId(null)
    }
  }

  const userAlreadyReviewed = user && reviews.some((r) => r.author.id === user.id)
  const total = stats?.total ?? reviews.length
  const average = stats?.average ?? null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Traveller Reviews</h2>
        {!loading && total > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
            <span className="text-lg font-bold text-foreground">{average !== null ? average.toFixed(1) : '—'}</span>
            from {total} review{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {stats && total > 0 && (
        <div className="grid gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:grid-cols-2">
          <div className="flex flex-col justify-center gap-1">
            <p className="font-serif text-4xl font-bold text-foreground">
              {average !== null ? average.toFixed(1) : '—'}
            </p>
            <StarRow value={average ? Math.round(average) : 0} />
            <p className="text-xs text-muted-foreground">
              {stats.withImages} with photos · {total} total
            </p>
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const bucket = stats.distribution?.find((d) => d.star === star)
              const count = bucket?.count ?? 0
              const pct = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="flex w-7 shrink-0 items-center gap-0.5 font-medium text-muted-foreground">
                    {star} <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {user ? (
        !userAlreadyReviewed ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
          >
            <span className="text-sm font-medium text-foreground">Write a review</span>
            <StarRow value={rating} onChange={setRating} />
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Uploading...
                  </>
                ) : (
                  `Add photos (${images.length}/${MAX_IMAGES})`
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || images.length >= MAX_IMAGES}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleImageUpload(file)
                    e.target.value = ''
                  }}
                />
              </label>
              {images.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {images.length} photo{images.length === 1 ? '' : 's'} attached
                </span>
              )}
            </div>
            <ReviewImages images={images} onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))} />

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={submitting || uploading} className="w-fit">
              {submitting ? 'Submitting...' : 'Submit review'}
            </Button>
          </form>
        ) : null
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>{' '}
          to leave a review.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet — be the first to share your experience.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review, index) => {
            const isOwnReview = user && review.author.id === user.id
            const isEditing = editingId === review.id
            const isReporting = reportingId === review.id

            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Edit Your Review</span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <StarRow value={editRating} onChange={setEditRating} />

                    <textarea
                      rows={3}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    />

                    <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                      <ImagePlus className="h-4 w-4" aria-hidden="true" />
                      {uploading ? 'Uploading...' : `Add photos (${editImages.length}/${MAX_IMAGES})`}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading || editImages.length >= MAX_IMAGES}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setUploading(true)
                            reviewsApi
                              .uploadImage(file)
                              .then((res) => setEditImages((prev) => [...prev, res.data.url].slice(0, MAX_IMAGES)))
                              .catch(() => toast.error('Photo upload failed.'))
                              .finally(() => setUploading(false))
                          }
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <ReviewImages
                      images={editImages}
                      onRemove={(i) => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                    />

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" disabled={updating} onClick={() => handleUpdate(review.id)}>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        {updating ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-card-foreground">{review.author.name}</span>
                        {isOwnReview && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            You
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <StarRow value={review.rating} size="h-4 w-4" />

                        {!isOwnReview && (
                          <button
                            type="button"
                            onClick={() => handleLike(review.id)}
                            disabled={likingId === review.id || !user}
                            aria-label={review.likedByMe ? 'Unlike review' : 'Like review'}
                            title={user ? undefined : 'Log in to like'}
                            className={cn(
                              'flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                              review.likedByMe
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                            )}
                          >
                            <Heart
                              className={cn('h-3.5 w-3.5', review.likedByMe && 'fill-rose-500 text-rose-500')}
                              aria-hidden="true"
                            />
                            {review.likesCount}
                          </button>
                        )}

                        {isOwnReview ? (
                          <div className="flex items-center gap-1 border-l border-border pl-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(review)}
                              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              title="Edit review"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === review.id}
                              onClick={() => handleDelete(review.id)}
                              className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete review"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReport(review.id)}
                            disabled={isReporting || review.reportedByMe || !user}
                            title={review.reportedByMe ? 'Review reported' : user ? 'Report review' : 'Log in to report'}
                            className={cn(
                              'flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors',
                              review.reportedByMe
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                            )}
                          >
                            <Flag className="h-3 w-3" aria-hidden="true" />
                            {review.reportedByMe ? 'Reported' : 'Report'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                    <ReviewImages images={review.images ?? []} />

                    <AnimatePresence>
                      {isReporting && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={(e) => {
                            e.preventDefault()
                            void handleReport(review.id)
                          }}
                          className="mt-3 flex flex-col gap-2 overflow-hidden"
                        >
                          <textarea
                            rows={2}
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            maxLength={500}
                            required
                            placeholder="Why are you reporting this review? (spam, fake, offensive...)"
                            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" type="button" onClick={() => setReportingId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" type="submit" disabled={!reportReason.trim() || reportingId !== null}>
                              {reportingId !== null ? 'Submitting...' : 'Submit report'}
                            </Button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
