// Live location section for the destination details page: interactive OSM
// map (centered on DB coordinates), beautiful pin with info popup, optional
// user location with straight-line route + travel times, "Open in Maps" link
// and nearby attractions within ~50 km (computed with haversine math).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Marker, Popup, Polyline } from 'react-leaflet'
import {
  Car,
  ExternalLink,
  Footprints,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Star,
  TriangleAlert,
} from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { destinationsApi } from '@/lib/api'
import {
  estimateDrivingMinutes,
  estimateWalkingMinutes,
  formatDistance,
  formatDuration,
  haversineKm,
  isValidCoord,
  osmDirectionsLink,
  osmMapLink,
} from '@/lib/geo'
import { destinationPinIcon, userLocationIcon } from '@/lib/map'
import { useInView } from '@/hooks/useInView'
import { LeafletMapView } from '@/components/map/LeafletMapView'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const NEARBY_RADIUS_KM = 50
const NEARBY_MAX = 5

interface DestinationMapSectionProps {
  destination: Destination
}

let allDestinationsCache: Promise<Destination[]> | null = null

function fetchAllDestinations(): Promise<Destination[]> {
  if (!allDestinationsCache) {
    allDestinationsCache = (async () => {
      const pageSize = 50
      const first = await destinationsApi.list({ limit: String(pageSize), page: '1' })
      let all = [...first.data]
      const total = first.meta?.total ?? all.length
      for (let page = 2; all.length < total; page++) {
        const next = await destinationsApi.list({ limit: String(pageSize), page: String(page) })
        all = [...all, ...next.data]
      }
      return all
    })().catch((err) => {
      allDestinationsCache = null
      throw err
    })
  }
  return allDestinationsCache
}

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied'

export function DestinationMapSection({ destination }: DestinationMapSectionProps) {
  const navigate = useNavigate()
  const hasCoords = isValidCoord(destination.latitude, destination.longitude)
  const center: [number, number] = hasCoords
    ? [destination.latitude as number, destination.longitude as number]
    : [10.5, 76.5]

  const { ref: sectionRef, inView } = useInView<HTMLDivElement>({ rootMargin: '300px' })
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [nearby, setNearby] = useState<Destination[]>([])
  const [focus, setFocus] = useState<{ center: [number, number]; zoom: number; key: string } | null>(null)

  useEffect(() => {
    let active = true
    if (!hasCoords) return
    fetchAllDestinations()
      .then((all) => {
        if (!active) return
        const withDistance = all
          .filter(
            (d) =>
              d.id !== destination.id &&
              isValidCoord(d.latitude, d.longitude),
          )
          .map((d) => ({
            destination: d,
            distanceKm: haversineKm(
              center[0],
              center[1],
              d.latitude as number,
              d.longitude as number,
            ),
          }))
          .filter((item) => item.distanceKm <= NEARBY_RADIUS_KM)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, NEARBY_MAX)
        setNearby(withDistance.map((item) => item.destination))
      })
      .catch(() => {
        // nearby attractions are non-critical
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination.id, hasCoords])

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationState('denied')
      return
    }
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLoc({ lat: position.coords.latitude, lon: position.coords.longitude })
        setLocationState('granted')
      },
      () => {
        setLocationState('denied')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    if (hasCoords) requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords])

  const distanceInfo = useMemo(() => {
    if (!userLoc || !hasCoords) return null
    const km = haversineKm(userLoc.lat, userLoc.lon, center[0], center[1])
    return {
      km,
      drivingMinutes: estimateDrivingMinutes(km),
      walkingMinutes: estimateWalkingMinutes(km),
    }
  }, [userLoc, hasCoords, center])

  const nearbyDistances = useMemo(() => {
    if (!hasCoords) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const d of nearby) {
      map.set(
        d.id,
        haversineKm(center[0], center[1], d.latitude as number, d.longitude as number),
      )
    }
    return map
  }, [nearby, hasCoords, center])

  const locateDestination = useCallback(() => {
    setFocus({ center, zoom: 13, key: `locate-${Date.now()}` })
  }, [center])

  const resetView = useCallback(() => {
    setFocus({ center, zoom: 12, key: `reset-${Date.now()}` })
  }, [center])

  if (!hasCoords) {
    return (
      <div ref={sectionRef} className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
          <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
          Location
        </h2>
        <div className="glass-strong flex flex-col items-center gap-3 rounded-2xl p-10 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <TriangleAlert className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="font-serif text-lg font-semibold text-foreground">Location unavailable.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Coordinates for {destination.name} are not set yet. Please check back shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={sectionRef} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
        <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
        Location
      </h2>

      <div className="relative h-[420px] w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-border">
        {inView ? (
          <LeafletMapView
            center={center}
            zoom={13}
            focus={focus}
            onLocate={locateDestination}
            onReset={resetView}
          >
            <Marker
              position={center}
              icon={destinationPinIcon(true)}
              title={destination.name}
              zIndexOffset={1000}
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
                    {destination.rating} rating
                  </span>
                  <span className="triplora-popup-row">{destination.category}</span>
                </div>
              </Popup>
            </Marker>

            {userLoc && (
              <>
                <Marker position={[userLoc.lat, userLoc.lon]} icon={userLocationIcon()} title="You are here" zIndexOffset={500}>
                  <Popup>
                    <div className="triplora-popup">
                      <span className="triplora-popup-title">You are here</span>
                      {distanceInfo && (
                        <span className="triplora-popup-row">
                          {formatDistance(distanceInfo.km)} from {destination.name}
                        </span>
                      )}
                    </div>
                  </Popup>
                </Marker>
                <Polyline
                  positions={[
                    [userLoc.lat, userLoc.lon],
                    center,
                  ]}
                  pathOptions={{ color: '#0d9488', weight: 3.5, opacity: 0.85, dashArray: '8 8' }}
                />
              </>
            )}
          </LeafletMapView>
        ) : (
          <div className="flex h-full w-full flex-col gap-3 p-4" aria-hidden="true">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        )}

        {locationState !== 'granted' && (
          <button
            type="button"
            onClick={requestLocation}
            disabled={locationState === 'requesting'}
            className="glass-strong absolute bottom-4 left-4 z-[1000] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {locationState === 'requesting' ? 'Locating...' : 'Use my location'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={osmMapLink(center[0], center[1])}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open in Maps
        </a>
        {locationState === 'granted' && userLoc && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Navigation className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Straight-line route to {destination.name}
          </span>
        )}
      </div>

      {distanceInfo && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Distance from your location">
          <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Navigation className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Distance
            </span>
            <span className="text-lg font-semibold text-foreground">
              {formatDistance(distanceInfo.km)}
            </span>
          </div>
          <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Car className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Driving (est.)
            </span>
            <span className="text-lg font-semibold text-foreground">
              {formatDuration(distanceInfo.drivingMinutes)}
            </span>
          </div>
          <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Footprints className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Walking (est.)
            </span>
            <span className="text-lg font-semibold text-foreground">
              {formatDuration(distanceInfo.walkingMinutes)}
            </span>
          </div>
        </div>
      )}

      {distanceInfo && (
        <a
          href={osmDirectionsLink(userLoc!.lat, userLoc!.lon, center[0], center[1])}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Route className="h-4 w-4" aria-hidden="true" />
          Get directions on OpenStreetMap
        </a>
      )}

      {nearby.length > 0 && (
        <div className="mt-2 flex flex-col gap-4">
          <h3 className="font-serif text-xl font-semibold text-foreground">Nearby Attractions</h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nearby.map((near) => (
              <li key={near.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/destinations/${near.id}`)}
                  className="glass-strong group flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <img
                    src={near.image}
                    alt=""
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded-xl object-cover"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium text-foreground group-hover:text-primary">
                      {near.name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {near.region}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
                        {near.rating}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={cn('font-medium', (nearbyDistances.get(near.id) ?? 0) <= 20 ? 'text-primary' : 'text-foreground')}>
                        {formatDistance(nearbyDistances.get(near.id) ?? 0)}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                    View Destination
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
