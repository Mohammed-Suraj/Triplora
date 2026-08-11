// Map view for the Explore page: every (coordinate-enabled) destination as a
// pin, click-to-preview card, search highlight + auto-center, live filter
// updates and a bounds-aware reset view. Lazy-loads with the map itself.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import { MapPin, Star, X } from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { isValidCoord } from '@/lib/geo'
import { destinationPinIcon } from '@/lib/map'
import { LeafletMapView, type LeafletMap } from '@/components/map/LeafletMapView'

interface ExploreMapViewProps {
  destinations: Destination[]
  query: string
  onOpenDestination: (id: string) => void
}

function useFitBounds(map: LeafletMap | null, positions: [number, number][]) {
  const fittedFor = useRef('')
  useEffect(() => {
    if (!map || positions.length === 0) return
    const key = positions.map((p) => p.join(',')).join('|')
    if (fittedFor.current === key) return
    fittedFor.current = key
    const bounds = latLngBounds(positions)
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, positions])
}

export function ExploreMapView({ destinations, query, onOpenDestination }: ExploreMapViewProps) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ center: [number, number]; zoom?: number; key: string } | null>(null)

  const located = useMemo(
    () => destinations.filter((d) => isValidCoord(d.latitude, d.longitude)),
    [destinations],
  )
  const positions = useMemo<[number, number][]>(
    () => located.map((d) => [d.latitude as number, d.longitude as number]),
    [located],
  )

  // Search: highlight the first match and fly to it.
  const highlightedId = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const match = located.find(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q),
    )
    return match?.id ?? null
  }, [query, located])

  useEffect(() => {
    if (highlightedId) {
      const match = located.find((d) => d.id === highlightedId)
      if (match && match.latitude != null && match.longitude != null) {
        setSelectedId(highlightedId)
        setFocus({ center: [match.latitude, match.longitude], zoom: 14, key: `search-${highlightedId}-${Date.now()}` })
      }
    }
  }, [highlightedId, located])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resetView = useCallback(() => {
    setSelectedId(null)
    if (map && positions.length > 0) {
      map.fitBounds(latLngBounds(positions), { padding: [48, 48], maxZoom: 13 })
    } else if (map) {
      map.setView([10.5, 76.5], 8)
    }
  }, [map, positions])

  const locateSelected = useCallback(() => {
    if (selectedId) {
      const match = located.find((d) => d.id === selectedId)
      if (match && match.latitude != null && match.longitude != null) {
        setFocus({ center: [match.latitude, match.longitude], zoom: 14, key: `locate-${selectedId}-${Date.now()}` })
        return
      }
    }
    resetView()
  }, [selectedId, located, resetView])

  useFitBounds(map, positions)

  const selected = located.find((d) => d.id === selectedId) ?? null

  return (
    <div className="relative mt-12 h-[520px] w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-border">
      <LeafletMapView
        center={[10.5, 76.5]}
        zoom={8}
        onReady={setMap}
        focus={focus}
        onLocate={locateSelected}
        onReset={resetView}
      >
        {located.map((destination) => {
          const isSelected = destination.id === selectedId
          const isHighlighted = destination.id === highlightedId
          return (
            <Marker
              key={destination.id}
              position={[destination.latitude as number, destination.longitude as number]}
              icon={destinationPinIcon(isHighlighted || isSelected)}
              zIndexOffset={isHighlighted || isSelected ? 900 : 0}
              eventHandlers={{ click: () => setSelectedId(destination.id) }}
              title={destination.name}
            >
              <Popup>
                <div className="triplora-popup">
                  <span className="triplora-popup-title">{destination.name}</span>
                  <span className="triplora-popup-row">
                    <MapPin className="triplora-popup-icon" aria-hidden="true" />
                    {destination.region}, Kerala
                  </span>
                  <span className="triplora-popup-row">
                    <Star className="triplora-popup-icon" aria-hidden="true" />
                    {destination.rating} rating · {destination.category}
                  </span>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </LeafletMapView>

      {selected && (
        <div className="absolute bottom-4 left-4 z-[1000] w-[320px] max-w-[calc(100%-2rem)]">
          <div className="glass-strong flex gap-3 rounded-2xl p-3 shadow-xl">
            <img
              src={selected.image}
              alt=""
              loading="lazy"
              className="h-20 w-28 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-serif text-base font-semibold text-foreground">
                {selected.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {selected.region}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
                {selected.rating} · {selected.category}
              </span>
              <button
                type="button"
                onClick={() => onOpenDestination(selected.id)}
                className="mt-auto w-fit rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                View Destination
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label={`Close preview for ${selected.name}`}
              className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-card text-muted-foreground shadow ring-1 ring-border transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {located.length === 0 && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">
              No map locations match your search.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { useFitBounds }
export default ExploreMapView
