import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Search, SearchX, Star, Plus, Pencil, Trash2 } from 'lucide-react'
import { adminApi, categoriesApi, destinationsApi, type AdminCategory, type AdminDestination } from '@/lib/api'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { DestinationFormModal } from '@/components/admin/DestinationFormModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SmartImage } from '@/components/ui/SmartImage'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'featured'

export function DestinationsPage() {
  const toast = useToast()
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminDestination | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const fetchDestinations = () => {
    setLoading(true)
    setError(null)
    adminApi
      .destinations({ limit: 50 })
      .then((res) => setDestinations(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load destinations'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDestinations()
    categoriesApi.list().then((res) => setCategories(res.data)).catch(() => {})
  }, [])

  const handleDelete = async (destination: AdminDestination) => {
    if (!window.confirm(`Delete destination "${destination.name}"? This cannot be undone.`)) return
    setDeletingId(destination.id)
    try {
      await destinationsApi.remove(destination.id)
      setDestinations((prev) => prev.filter((d) => d.id !== destination.id))
      toast.success('Destination deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete destination')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = destinations.filter((d) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      q === '' || d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q) || d.category.name.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'featured' && d.isFeatured)
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      <AdminPageHeader title="Destinations" subtitle={`${destinations.length} destination${destinations.length === 1 ? '' : 's'} on the platform`} />

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
            placeholder="Search by name, region..."
            aria-label="Search destinations"
            className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-10 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Filter destinations">
            {(['all', 'featured'] as const).map((f) => (
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
            New Destination
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
        <EmptyState
          icon={SearchX}
          title="Could not load destinations"
          message={error}
          actionLabel="Try again"
          onAction={fetchDestinations}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={search || statusFilter !== 'all' ? 'No destinations match your filters' : 'No destinations yet'}
          message={
            search || statusFilter !== 'all'
              ? 'Try a different search term or filter.'
              : 'Create your first destination to get started.'
          }
          actionLabel={search || statusFilter !== 'all' ? 'Clear filters' : undefined}
          onAction={() => { setSearch(''); setStatusFilter('all') }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((destination) => (
            <div key={destination.id} className="glass-strong card-lift flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-border">
              <div className="relative">
                <SmartImage
                  src={destination.image}
                  alt={destination.name}
                  className="h-36 w-full"
                />
                {destination.isFeatured && (
                  <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">Featured</Badge>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/destinations/${destination.slug}`}
                    className="font-serif text-base font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {destination.name}
                  </Link>
                  <Badge className="shrink-0">{destination.category.name}</Badge>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {destination.region}, Kerala
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                    {destination.rating} ({destination.reviewsCount})
                  </span>
                  <span className="font-semibold text-foreground">
                    {'\u20B9'}{destination.priceFrom.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditing(destination); setModalOpen(true) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === destination.id}
                    onClick={() => handleDelete(destination)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DestinationFormModal
        categories={categories}
        destination={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); fetchDestinations() }}
      />
    </div>
  )
}