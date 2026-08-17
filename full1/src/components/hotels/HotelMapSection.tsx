import { Marker, Popup } from 'react-leaflet'
import { Car, ExternalLink, MapPin, Navigation, Route, Star, UtensilsCrossed } from 'lucide-react'
import type { Hotel } from '@/lib/api'
import { useInView } from '@/hooks/useInView'
import { LeafletMapView } from '@/components/map/LeafletMapView'
import { Skeleton } from '@/components/ui/Skeleton'
import { destinationPinIcon } from '@/lib/map'
import { isValidCoord } from '@/lib/geo'

interface HotelMapSectionProps {
  hotel: Hotel
}

export function HotelMapSection({ hotel }: HotelMapSectionProps) {
  const { ref: sectionRef, inView } = useInView<HTMLDivElement>({ rootMargin: '300px' })
  const hasCoords = isValidCoord(hotel.latitude, hotel.longitude)
  const center: [number, number] = hasCoords
    ? [hotel.latitude as number, hotel.longitude as number]
    : [10.5, 76.5]

  return (
    <div ref={sectionRef} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
        <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
        Location &amp; around
      </h2>

      {!hasCoords ? (
        <div className="glass-strong flex flex-col items-center gap-2 rounded-2xl p-8 text-center shadow-sm">
          <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Exact map coordinates are not available for this stay yet.</p>
        </div>
      ) : (
        <div className="relative h-[380px] w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-border">
          {inView ? (
            <LeafletMapView center={center} zoom={14}>
              <Marker position={center} icon={destinationPinIcon(true)} title={hotel.name} zIndexOffset={1000}>
                <Popup>
                  <div className="triplora-popup">
                    <span className="triplora-popup-title">{hotel.name}</span>
                    <span className="triplora-popup-row">
                      <MapPin className="triplora-popup-icon" aria-hidden="true" />
                      {hotel.location}
                    </span>
                    <span className="triplora-popup-row">
                      <Star className="triplora-popup-icon" aria-hidden="true" />
                      {hotel.rating > 0 ? `${hotel.rating.toFixed(1)} rating` : 'New'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            </LeafletMapView>
          ) : (
            <div className="h-full w-full p-4" aria-hidden="true">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={hasCoords ? `https://www.google.com/maps/search/?api=1&query=${center[0]},${center[1]}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open in Google Maps
        </a>
        {hasCoords && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${center[0]},${center[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Route className="h-4 w-4" aria-hidden="true" />
            Get directions
          </a>
        )}
      </div>

      {hotel.distanceFromAttraction > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Navigation className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          About {hotel.distanceFromAttraction} km from the main {hotel.destination?.name} attraction.
        </p>
      )}

      {hotel.nearbyAttractions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Nearby attractions
          </h3>
          <ul className="flex flex-wrap gap-2">
            {hotel.nearbyAttractions.map((item) => (
              <li
                key={item}
                className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hotel.nearbyRestaurants.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" />
            Where to eat nearby
          </h3>
          <ul className="flex flex-wrap gap-2">
            {hotel.nearbyRestaurants.map((item) => (
              <li
                key={item}
                className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hotel.nearbyTransport.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Car className="h-4 w-4 text-primary" aria-hidden="true" />
            Getting around
          </h3>
          <ul className="flex flex-wrap gap-2">
            {hotel.nearbyTransport.map((item) => (
              <li
                key={item}
                className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
