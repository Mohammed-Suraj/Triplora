import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X } from 'lucide-react'
import { destinationsApi, hotelsApi, type Hotel, type HotelInput, type HotelType } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const HOTEL_TYPES: HotelType[] = ['HOTEL', 'RESORT', 'VILLA', 'HOMESTAY', 'BACKPACKER']

interface HotelFormModalProps {
  hotel: Hotel | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface DestinationOption {
  id: string
  name: string
  region: string
  slug: string
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const textareaClass =
  'w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const FLAG_FIELDS: Array<{ key: keyof HotelInput; label: string }> = [
  { key: 'familyFriendly', label: 'Family friendly' },
  { key: 'coupleFriendly', label: 'Couple friendly' },
  { key: 'freeBreakfast', label: 'Free breakfast' },
  { key: 'freeWiFi', label: 'Free WiFi' },
  { key: 'swimmingPool', label: 'Swimming pool' },
  { key: 'parking', label: 'Free parking' },
  { key: 'airConditioning', label: 'Air conditioning' },
]

export function HotelFormModal({ hotel, open, onClose, onSaved }: HotelFormModalProps) {
  const toast = useToast()
  const [destinations, setDestinations] = useState<DestinationOption[]>([])

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [image, setImage] = useState('')
  const [gallery, setGallery] = useState('')
  const [starRating, setStarRating] = useState('3')
  const [priceFrom, setPriceFrom] = useState('')
  const [hotelType, setHotelType] = useState<HotelType>('HOTEL')
  const [location, setLocation] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [distanceFromAttraction, setDistanceFromAttraction] = useState('')
  const [checkIn, setCheckIn] = useState('2:00 PM')
  const [checkOut, setCheckOut] = useState('11:00 AM')
  const [cancellationPolicy, setCancellationPolicy] = useState(
    'Free cancellation up to 48 hours before check-in',
  )
  const [amenities, setAmenities] = useState('')
  const [nearbyAttractions, setNearbyAttractions] = useState('')
  const [nearbyRestaurants, setNearbyRestaurants] = useState('')
  const [nearbyTransport, setNearbyTransport] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    destinationsApi
      .list({ limit: '100' })
      .then((res) => {
        const list = (Array.isArray(res.data) ? res.data : []).map((d) => ({
          id: d.id,
          name: d.name,
          region: d.region ?? '',
          slug: d.slug,
        }))
        setDestinations(list.sort((a, b) => a.name.localeCompare(b.name)))
        if (!hotel && list.length > 0) setDestinationId((prev) => prev || list[0].id)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hotel])

  useEffect(() => {
    if (!open) return
    setName(hotel?.name ?? '')
    setTagline(hotel?.tagline ?? '')
    setDescription(hotel?.description ?? '')
    setLongDescription(hotel?.longDescription ?? '')
    setImage(hotel?.image ?? '')
    setGallery(hotel?.gallery?.join(', ') ?? '')
    setStarRating(hotel ? String(hotel.starRating) : '3')
    setPriceFrom(hotel ? String(hotel.priceFrom) : '')
    setHotelType(hotel?.hotelType ?? 'HOTEL')
    setLocation(hotel?.location ?? '')
    setDestinationId(hotel?.destination?.id ?? '')
    setDistanceFromAttraction(hotel ? String(hotel.distanceFromAttraction) : '')
    setCheckIn(hotel?.checkIn ?? '2:00 PM')
    setCheckOut(hotel?.checkOut ?? '11:00 AM')
    setCancellationPolicy(hotel?.cancellationPolicy ?? 'Free cancellation up to 48 hours before check-in')
    setAmenities(hotel?.amenities?.join(', ') ?? '')
    setNearbyAttractions(hotel?.nearbyAttractions?.join(', ') ?? '')
    setNearbyRestaurants(hotel?.nearbyRestaurants?.join(', ') ?? '')
    setNearbyTransport(hotel?.nearbyTransport?.join(', ') ?? '')
    setLatitude(hotel?.latitude != null ? String(hotel.latitude) : '')
    setLongitude(hotel?.longitude != null ? String(hotel.longitude) : '')
    const nextFlags: Record<string, boolean> = {}
    for (const field of FLAG_FIELDS) {
      nextFlags[field.key] = Boolean((hotel as Record<string, unknown> | null)?.[field.key])
    }
    setFlags(nextFlags)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hotel])

  const isEdit = Boolean(hotel)

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await hotelsApi.uploadImage(file)
      const url = res.data?.url
      if (url) setImage(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!destinationId) {
      setError('Please select a destination')
      return
    }
    setError(null)
    setSubmitting(true)

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      longDescription: longDescription.trim() || description.trim(),
      image: image.trim(),
      gallery: splitList(gallery),
      starRating: Number(starRating) || 3,
      priceFrom: Number(priceFrom) || 0,
      hotelType,
      location: location.trim(),
      destinationId,
      latitude: latitude.trim() === '' ? null : Number(latitude),
      longitude: longitude.trim() === '' ? null : Number(longitude),
      distanceFromAttraction: Number(distanceFromAttraction) || 0,
      checkIn: checkIn.trim(),
      checkOut: checkOut.trim(),
      cancellationPolicy: cancellationPolicy.trim(),
      amenities: splitList(amenities),
      nearbyAttractions: splitList(nearbyAttractions),
      nearbyRestaurants: splitList(nearbyRestaurants),
      nearbyTransport: splitList(nearbyTransport),
      familyFriendly: Boolean(flags.familyFriendly),
      coupleFriendly: Boolean(flags.coupleFriendly),
      freeBreakfast: Boolean(flags.freeBreakfast),
      freeWiFi: flags.freeWiFi !== false,
      swimmingPool: Boolean(flags.swimmingPool),
      parking: Boolean(flags.parking),
      airConditioning: Boolean(flags.airConditioning),
    }

    try {
      if (isEdit && hotel) {
        await hotelsApi.update(hotel.id, payload)
        toast.success('Hotel updated successfully')
      } else {
        await hotelsApi.create(payload)
        toast.success('Hotel created successfully')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      toast.error(err instanceof Error ? err.message : 'Failed to save hotel')
    } finally {
      setSubmitting(false)
    }
  }

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
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-serif text-xl font-bold text-card-foreground">
                {isEdit ? 'Edit Hotel' : 'New Hotel'}
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
                  <span className="text-sm font-medium text-foreground">Destination</span>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    required
                    className={cn(inputClass, 'appearance-none')}
                  >
                    <option value="" disabled>Select destination</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}{d.region ? `, ${d.region}` : ''}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Hotel type</span>
                  <select
                    value={hotelType}
                    onChange={(e) => setHotelType(e.target.value as HotelType)}
                    className={cn(inputClass, 'appearance-none')}
                  >
                    {HOTEL_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Star rating</span>
                  <select value={starRating} onChange={(e) => setStarRating(e.target.value)} className={cn(inputClass, 'appearance-none')}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Price from ({'\u20B9'}/night)</span>
                  <input type="number" min={0} value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} required className={inputClass} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Location</span>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g. Bison Valley, Munnar" className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Distance from main attraction (km)</span>
                  <input type="number" min={0} step="any" value={distanceFromAttraction} onChange={(e) => setDistanceFromAttraction(e.target.value)} className={inputClass} />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Tagline</span>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Check-in time</span>
                  <input value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Check-out time</span>
                  <input value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Cancellation policy</span>
                <input value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} required className={inputClass} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Cover image</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="url" value={image} onChange={(e) => setImage(e.target.value)} required placeholder="https://..." className={cn(inputClass, 'flex-1')} />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                    <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
                  </label>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Gallery URLs <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <textarea rows={2} value={gallery} onChange={(e) => setGallery(e.target.value)} className={textareaClass} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Latitude <span className="text-xs text-muted-foreground">(map pin)</span></span>
                  <input type="number" step="any" min={-90} max={90} value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 10.0889" className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Longitude <span className="text-xs text-muted-foreground">(map pin)</span></span>
                  <input type="number" step="any" min={-180} max={180} value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 77.0595" className={inputClass} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FLAG_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm font-medium text-secondary-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(flags[key])}
                      onChange={(e) => setFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-xs leading-tight">{label}</span>
                  </label>
                ))}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Amenities <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <textarea rows={2} value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Mountain view, Spa, Restaurant..." className={textareaClass} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Nearby attractions</span>
                  <textarea rows={2} value={nearbyAttractions} onChange={(e) => setNearbyAttractions(e.target.value)} className={textareaClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Nearby restaurants</span>
                  <textarea rows={2} value={nearbyRestaurants} onChange={(e) => setNearbyRestaurants(e.target.value)} className={textareaClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Nearby transport</span>
                  <textarea rows={2} value={nearbyTransport} onChange={(e) => setNearbyTransport(e.target.value)} className={textareaClass} />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Short description</span>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required className={textareaClass} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Long description</span>
                <textarea rows={4} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} className={textareaClass} />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Hotel'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
