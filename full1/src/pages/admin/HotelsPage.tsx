import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Eye, EyeOff, Pencil, Plus, Search, SearchX, Star, Trash2 } from 'lucide-react'
import { hotelsApi, type Hotel, type HotelRoom } from '@/lib/api'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { HotelFormModal } from '@/components/admin/HotelFormModal'
import { RoomFormModal } from '@/components/admin/RoomFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SmartImage } from '@/components/ui/SmartImage'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { HOTEL_TYPE_LABELS } from '@/components/hotels/HotelCard'

type StatusFilter = 'all' | 'active' | 'inactive'

/** Backend caps /hotels list limit at 50; fetch every page to show all hotels. */
const ADMIN_HOTELS_PAGE_SIZE = 50

export function HotelsPage() {
  const toast = useToast()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Hotel | null>(null)
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null)
  const [roomHotel, setRoomHotel] = useState<Hotel | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const collected: Hotel[] = []
      const seen = new Set<string>()
      let page = 1
      let totalPages = 1
      do {
        const res = await hotelsApi.list({
          limit: String(ADMIN_HOTELS_PAGE_SIZE),
          page: String(page),
          all: 'true',
        })
        for (const hotel of res.data) {
          if (!seen.has(hotel.id)) {
            seen.add(hotel.id)
            collected.push(hotel)
          }
        }
        if (res.meta) {
          totalPages = res.meta.totalPages
          page = res.meta.page + 1
        } else {
          break
        }
      } while (page <= totalPages && collected.length < 10000)
      setHotels(collected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hotels')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const handleToggleActive = async (hotel: Hotel) => {
    setBusyId(hotel.id)
    try {
      await hotelsApi.update(hotel.id, { isActive: !hotel.isActive })
      toast.success(hotel.isActive ? 'Hotel deactivated' : 'Hotel activated')
      fetchHotels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update hotel')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (hotel: Hotel) => {
    if (!window.confirm(`Delete hotel "${hotel.name}"? All rooms, bookings and reviews will be removed. This cannot be undone.`)) return
    setBusyId(hotel.id)
    try {
      await hotelsApi.remove(hotel.id)
      setHotels((prev) => prev.filter((h) => h.id !== hotel.id))
      toast.success('Hotel deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete hotel')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteRoom = async (room: HotelRoom) => {
    if (!window.confirm(`Delete room "${room.name}"?`)) return
    try {
      await hotelsApi.removeRoom(room.id)
      toast.success('Room deleted successfully')
      if (roomHotel) {
        const fresh = await hotelsApi.get(roomHotel.id)
        setRoomHotel(fresh.data)
      }
      fetchHotels()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete room')
    }
  }

  const filtered = hotels.filter((h) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      h.name.toLowerCase().includes(q) ||
      h.location.toLowerCase().includes(q) ||
      h.destination.name.toLowerCase().includes(q)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && h.isActive !== false) ||
      (statusFilter === 'inactive' && h.isActive === false)
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      <AdminPageHeader
        title="Hotels & Stays"
        subtitle={`${hotels.length} hotel${hotels.length === 1 ? '' : 's'} on the platform`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, location..."
            aria-label="Search hotels"
            className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-10 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Filter hotels">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                aria-pressed={statusFilter === f}
                className={cn(
                  'press rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  statusFilter === f ? 'bg-card text-card-foreground shadow-sm' : 'text-secondary-foreground hover:text-foreground',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="h-4 w-4" />
            New Hotel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={SearchX} title="Could not load hotels" message={error} actionLabel="Try again" onAction={fetchHotels} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title={search || statusFilter !== 'all' ? 'No hotels match your filters' : 'No hotels yet'}
          message={
            search || statusFilter !== 'all'
              ? 'Try a different search term or filter.'
              : 'Create your first hotel to get started.'
          }
          actionLabel={search || statusFilter !== 'all' ? 'Clear filters' : undefined}
          onAction={() => { setSearch(''); setStatusFilter('all') }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((hotel) => (
            <div key={hotel.id} className={cn('glass-strong card-lift flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-border', hotel.isActive === false && 'opacity-75')}>
              <div className="relative">
                <SmartImage src={hotel.image} alt={hotel.name} className="h-36 w-full" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <Badge className="bg-black/40 text-white backdrop-blur-sm">{HOTEL_TYPE_LABELS[hotel.hotelType] ?? hotel.hotelType}</Badge>
                  {hotel.isActive === false && <Badge className="bg-red-500/90 text-white">Inactive</Badge>}
                </div>
                <span className="glass-strong absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                  {hotel.rating > 0 ? hotel.rating.toFixed(1) : 'New'}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/hotels/${hotel.slug || hotel.id}`} className="font-serif text-base font-semibold text-foreground transition-colors hover:text-primary">
                    {hotel.name}
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">{hotel.location} · {hotel.destination.name}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{'\u20B9'}{hotel.priceFrom.toLocaleString('en-IN')}/night</span>
                  <span className="text-xs text-muted-foreground">{hotel.rooms?.length ?? 0} room{(hotel.rooms?.length ?? 0) === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setRoomHotel(hotel); setEditingRoom(null); setRoomModalOpen(true) }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Room
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setExpanded(expanded === hotel.id ? null : hotel.id); setRoomHotel(hotel) }}
                  >
                    <BedDouble className="h-3.5 w-3.5" />
                    Rooms
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(hotel); setModalOpen(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === hotel.id}
                    onClick={() => handleToggleActive(hotel)}
                    title={hotel.isActive === false ? 'Activate' : 'Deactivate'}
                  >
                    {hotel.isActive === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === hotel.id}
                    onClick={() => handleDelete(hotel)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expanded === hotel.id && (
                <div className="flex flex-col gap-2 border-t border-border/50 bg-muted/30 p-3">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Rooms</span>
                  {(!roomHotel || roomHotel.id !== hotel.id || (hotel.rooms?.length ?? 0) === 0) ? (
                    <p className="text-xs text-muted-foreground">No rooms yet — add one to start selling stays.</p>
                  ) : (
                    (hotel.rooms ?? []).map((room) => (
                      <div key={room.id} className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-border">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{room.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {'\u20B9'}{room.pricePerNight}/night · {room.maxGuests} guests · {room.bedType}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setRoomHotel(hotel); setEditingRoom(room); setRoomModalOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRoom(room)} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <HotelFormModal
        hotel={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); fetchHotels() }}
      />
      <RoomFormModal
        hotelId={roomHotel?.id ?? ''}
        room={editingRoom}
        open={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        onSaved={() => { setRoomModalOpen(false); setExpanded(roomHotel?.id ?? null); fetchHotels() }}
      />
    </div>
  )
}
