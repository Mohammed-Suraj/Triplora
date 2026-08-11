import { Suspense, lazy, useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, X } from 'lucide-react'
import { destinationsApi, type AdminCategory, type AdminDestination } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const AdminMapPreview = lazy(() =>
  import('@/components/map/AdminMapPreview').then((m) => ({ default: m.AdminMapPreview })),
)

interface DestinationFormModalProps {
  categories: AdminCategory[]
  destination: AdminDestination | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function DestinationFormModal({ categories, destination, open, onClose, onSaved }: DestinationFormModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [region, setRegion] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priceFrom, setPriceFrom] = useState('')
  const [duration, setDuration] = useState('')
  const [bestSeason, setBestSeason] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [image, setImage] = useState('')
  const [gallery, setGallery] = useState('')
  const [highlights, setHighlights] = useState('')
  const [activities, setActivities] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(destination?.name ?? '')
    setTagline(destination?.tagline ?? '')
    setRegion(destination?.region ?? '')
    setCategoryId(destination?.categoryId ?? categories[0]?.id ?? '')
    setPriceFrom(destination ? String(destination.priceFrom) : '')
    setDuration(destination?.duration ?? '')
    setBestSeason(destination?.bestSeason ?? '')
    setDescription(destination?.description ?? '')
    setLongDescription(destination?.longDescription ?? '')
    setImage(destination?.image ?? '')
    setGallery(destination?.gallery?.join(', ') ?? '')
    setHighlights(destination?.highlights?.join(', ') ?? '')
    setActivities(destination?.activities?.join(', ') ?? '')
    setLatitude(destination?.latitude != null ? String(destination.latitude) : '')
    setLongitude(destination?.longitude != null ? String(destination.longitude) : '')
    setIsFeatured(destination?.isFeatured ?? false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, destination])

  const isEdit = Boolean(destination)

  const parsedLatitude = (() => {
    if (latitude.trim() === '') return null
    const parsed = Number(latitude)
    return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90 ? parsed : null
  })()

  const parsedLongitude = (() => {
    if (longitude.trim() === '') return null
    const parsed = Number(longitude)
    return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180 ? parsed : null
  })()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!categoryId) {
      setError('Please select a category')
      return
    }
    setError(null)
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      region: region.trim(),
      categoryId,
      priceFrom: Number(priceFrom),
      duration: duration.trim(),
      bestSeason: bestSeason.trim(),
      description: description.trim(),
      longDescription: longDescription.trim(),
      image: image.trim(),
      gallery: splitList(gallery),
      highlights: splitList(highlights),
      activities: splitList(activities),
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      isFeatured,
    }

    try {
      if (isEdit && destination) {
        await destinationsApi.update(destination.id, payload)
        toast.success('Destination updated successfully')
      } else {
        await destinationsApi.create(payload)
        toast.success('Destination created successfully')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      toast.error(err instanceof Error ? err.message : 'Failed to save destination')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!submitting) onClose() }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-serif text-xl font-bold text-card-foreground">
                {isEdit ? 'Edit Destination' : 'New Destination'}
              </h2>
              <button
                type="button"
                onClick={() => { if (!submitting) onClose() }}
                disabled={submitting}
                aria-label="Close dialog"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Category</span>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className={cn(inputClass, 'appearance-none')}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Tagline</span>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} required className={inputClass} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Region</span>
                  <input value={region} onChange={(e) => setRegion(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Price From ({'\u20B9'})</span>
                  <input type="number" min={0} value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Duration</span>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} required className={inputClass} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Best Season</span>
                  <input value={bestSeason} onChange={(e) => setBestSeason(e.target.value)} required className={inputClass} />
                </label>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Featured destination
                  </label>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Image URL</span>
                <input type="url" value={image} onChange={(e) => setImage(e.target.value)} required className={inputClass} placeholder="https://..." />
              </label>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Latitude <span className="text-xs text-muted-foreground">(map pin)</span>
                    </span>
                    <input
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 10.0889"
                      className={cn(inputClass, parsedLatitude === null && latitude.trim() !== '' && 'border-red-400')}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Longitude <span className="text-xs text-muted-foreground">(map pin)</span>
                    </span>
                    <input
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 77.0595"
                      className={cn(inputClass, parsedLongitude === null && longitude.trim() !== '' && 'border-red-400')}
                    />
                  </label>
                </div>
                <Suspense
                  fallback={
                    <div className="flex h-56 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                    </div>
                  }
                >
                  <AdminMapPreview
                    latitude={parsedLatitude}
                    longitude={parsedLongitude}
                    onChange={(lat, lng) => {
                      setLatitude(String(lat))
                      setLongitude(String(lng))
                    }}
                  />
                </Suspense>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Drag the marker or click the map to pick a spot. Shown on the destination map.
                </span>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Gallery URLs <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <textarea rows={2} value={gallery} onChange={(e) => setGallery(e.target.value)} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Highlights <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <textarea rows={2} value={highlights} onChange={(e) => setHighlights(e.target.value)} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Activities <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <textarea rows={2} value={activities} onChange={(e) => setActivities(e.target.value)} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Short Description</span>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Long Description</span>
                <textarea rows={4} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} required className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Destination'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}