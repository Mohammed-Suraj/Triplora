// Reusable Leaflet map shell: dark/light tile switching, custom control bar
// (zoom in/out, current zoom chip, locate, reset view, fullscreen) and a
// focus follower that smoothly flies to a target coordinate.
// Heavy Leaflet module - always import lazily (React.lazy / dynamic import).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Crosshair, Focus, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react'
import type { Map as LeafletMap, LatLng } from 'leaflet'
import { useTheme } from '@/context/ThemeContext'
import { tilesForTheme } from '@/lib/map'
import { cn } from '@/lib/utils'

interface LeafletMapViewProps {
  center: [number, number]
  zoom?: number
  className?: string
  children?: ReactNode
  onReady?: (map: LeafletMap) => void
  /** When set, the map smoothly flies to this coordinate (e.g. search highlight). */
  focus?: { center: [number, number]; zoom?: number; key?: string | number } | null
  onLocate?: () => void
  onReset?: () => void
}

function MapReady({ onReady }: { onReady?: (map: LeafletMap) => void }) {
  const map = useMap()
  const called = useRef(false)
  useEffect(() => {
    if (!called.current && onReady) {
      called.current = true
      onReady(map)
    }
  }, [map, onReady])
  return null
}

function MapFocusFollower({ focus }: { focus: NonNullable<LeafletMapViewProps['focus']> }) {
  const map = useMap()
  const lastKey = useRef<unknown>(null)
  useEffect(() => {
    if (lastKey.current === focus.key && focus.key !== undefined) return
    lastKey.current = focus.key ?? true
    map.flyTo(focus.center, focus.zoom ?? map.getZoom(), { duration: 0.9 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.key, focus.center?.[0], focus.center?.[1], focus.zoom])
  return null
}

function FullscreenButton() {
  const map = useMap()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(async () => {
    const container = map.getContainer()
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
    } catch {
      // Fullscreen unsupported or denied - fail silently, button stays usable.
    }
  }, [map])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? 'Exit fullscreen map' : 'Expand map to fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      className="triplora-map-btn"
    >
      {isFullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
    </button>
  )
}

function MapControls({
  onLocate,
  onReset,
}: {
  onLocate?: () => void
  onReset?: () => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    zoom: () => setZoom(map.getZoom()),
  })

  return (
    <div className="triplora-map-controls" role="group" aria-label="Map controls">
      <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/95 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
          title="Zoom in"
          className="triplora-map-btn"
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <span
          className="flex h-8 items-center justify-center rounded-lg px-1 text-[11px] font-semibold tabular-nums text-muted-foreground select-none"
          aria-label={`Current zoom level ${zoom}`}
        >
          Z{zoom}
        </span>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
          title="Zoom out"
          className="triplora-map-btn"
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/95 p-1 shadow-lg backdrop-blur-md">
        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            aria-label="Locate destination"
            title="Locate destination"
            className="triplora-map-btn"
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset map view"
            title="Reset view"
            className="triplora-map-btn"
          >
            <Focus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <FullscreenButton />
      </div>
    </div>
  )
}

export function LeafletMapView({
  center,
  zoom = 12,
  className,
  children,
  onReady,
  focus,
  onLocate,
  onReset,
}: LeafletMapViewProps) {
  const { theme } = useTheme()
  const tiles = tilesForTheme(theme)

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      scrollWheelZoom
      className={cn('z-0 h-full w-full', className)}
      aria-label="Interactive map"
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} />
      <MapReady onReady={onReady} />
      {focus && <MapFocusFollower focus={focus} />}
      {children}
      <MapControls onLocate={onLocate} onReset={onReset} />
    </MapContainer>
  )
}

export type { LeafletMap }
export type MapPosition = LatLng
