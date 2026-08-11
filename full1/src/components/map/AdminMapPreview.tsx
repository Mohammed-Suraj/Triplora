// Small draggable-marker map preview for the admin destination editor.
// The marker moves with typed coordinates; dragging the marker updates them.

import { Marker, useMapEvents } from 'react-leaflet'
import { MapPin } from 'lucide-react'
import type { LeafletMouseEvent } from 'leaflet'
import { isValidCoord } from '@/lib/geo'
import { destinationPinIcon } from '@/lib/map'
import { LeafletMapView } from '@/components/map/LeafletMapView'

interface AdminMapPreviewProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => onPick(event.latlng.lat, event.latlng.lng),
  })
  return null
}

export function AdminMapPreview({ latitude, longitude, onChange }: AdminMapPreviewProps) {
  const hasCoords = isValidCoord(latitude, longitude)

  if (!hasCoords) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-center">
          <MapPin className="h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">
            Enter latitude & longitude to preview the location
          </p>
        </div>
      </div>
    )
  }

  const center: [number, number] = [latitude as number, longitude as number]

  return (
    <div className="h-56 w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-border">
      <LeafletMapView
        center={center}
        zoom={13}
        focus={{ center, zoom: 13, key: `preview-${center.join(',')}` }}
        className="h-full w-full"
      >
        <MapClickHandler onPick={onChange} />
        <Marker
          position={center}
          icon={destinationPinIcon(true)}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latLng = (event.target as { getLatLng: () => { lat: number; lng: number } }).getLatLng()
              onChange(Number(latLng.lat.toFixed(5)), Number(latLng.lng.toFixed(5)))
            },
          }}
        />
      </LeafletMapView>
    </div>
  )
}

export default AdminMapPreview
