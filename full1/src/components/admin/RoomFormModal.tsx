import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X } from 'lucide-react'
import { hotelsApi, type HotelRoom, type HotelRoomInput } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'

interface RoomFormModalProps {
  hotelId: string
  room: HotelRoom | null
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

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function RoomFormModal({ hotelId, room, open, onClose, onSaved }: RoomFormModalProps) {
  const toast = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pricePerNight, setPricePerNight] = useState('')
  const [maxGuests, setMaxGuests] = useState('2')
  const [bedType, setBedType] = useState('King')
  const [totalRooms, setTotalRooms] = useState('5')
  const [amenities, setAmenities] = useState('')
  const [images, setImages] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(room?.name ?? '')
    setDescription(room?.description ?? '')
    setPricePerNight(room ? String(room.pricePerNight) : '')
    setMaxGuests(room ? String(room.maxGuests) : '2')
    setBedType(room?.bedType ?? 'King')
    setTotalRooms(room ? String(room.totalRooms) : '5')
    setAmenities(room?.amenities?.join(', ') ?? '')
    setImages(room?.images?.join(', ') ?? '')
    setError(null)
  }, [open, room])

  const isEdit = Boolean(room)

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await hotelsApi.uploadImage(file)
      const url = res.data?.url
      if (url) setImages((prev) => (prev.trim() ? prev.trim() + ', ' + url : url))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload: HotelRoomInput = {
      name: name.trim(),
      description: description.trim() || null,
      pricePerNight: Number(pricePerNight),
      maxGuests: Number(maxGuests),
      bedType: bedType.trim(),
      totalRooms: Number(totalRooms),
      amenities: splitList(amenities),
      images: splitList(images),
    }

    try {
      if (isEdit && room) {
        await hotelsApi.updateRoom(room.id, payload)
        toast.success('Room updated successfully')
      } else {
        await hotelsApi.createRoom(hotelId, payload)
        toast.success('Room added successfully')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      toast.error(err instanceof Error ? err.message : 'Failed to save room')
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
            className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-serif text-xl font-bold text-card-foreground">
                {isEdit ? 'Edit Room' : 'Add Room'}
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

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Room name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Garden View Deluxe" className={inputClass} />
              </label>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Price/night ({'\u20B9'})</span>
                  <input type="number" min={0} value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Max guests</span>
                  <input type="number" min={1} max={20} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Bed type</span>
                  <input value={bedType} onChange={(e) => setBedType(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Total rooms</span>
                  <input type="number" min={1} max={500} value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} required className={inputClass} />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Description</span>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Amenities <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <textarea rows={2} value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="King bed, Mountain view, Balcony..." className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Room image URLs <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <textarea
                    rows={2}
                    value={images}
                    onChange={(e) => setImages(e.target.value)}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                    <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
                  </label>
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Room'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
