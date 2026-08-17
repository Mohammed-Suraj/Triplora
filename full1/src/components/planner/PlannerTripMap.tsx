import { Fragment, useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { MapPin } from 'lucide-react'
import type { PlannerTrip, PlannerTripItem } from '@/lib/api'
import { PLANNER_ITEM_LABELS } from '@/lib/planner'
import { cn } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

const KERALA_CENTER: [number, number] = [10.1632, 76.6413]

const TYPE_COLORS: Record<PlannerTripItem['type'], string> = {
  HOTEL: '#38bdf8',
  RESTAURANT: '#f87171',
  DESTINATION: '#34d399',
  EXPERIENCE: '#a78bfa',
}

const DAY_POLYLINE_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#fb7185', '#22d3ee']

export const PLANNER_MAP_TYPE_META: Array<{ type: PlannerTripItem['type']; label: string; color: string }> = [
  { type: 'HOTEL', label: 'Hotel', color: TYPE_COLORS.HOTEL },
  { type: 'RESTAURANT', label: 'Restaurant', color: TYPE_COLORS.RESTAURANT },
  { type: 'DESTINATION', label: 'Destination', color: TYPE_COLORS.DESTINATION },
  { type: 'EXPERIENCE', label: 'Experience', color: TYPE_COLORS.EXPERIENCE },
]

function markerIcon(item: PlannerTripItem, dayNumber: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:9999px;background:${TYPE_COLORS[item.type] ?? '#64748b'};color:#0b1220;font-weight:700;font-size:11px;font-family:ui-monospace,monospace;box-shadow:0 2px 10px rgba(0,0,0,.55);border:2px solid rgba(255,255,255,.9)">${dayNumber}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  })
}

function FitView({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) {
      map.setView(KERALA_CENTER, 6)
      return
    }
    if (points.length === 1) {
      map.setView(points[0], 12)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 13 })
  }, [points, map])
  return null
}

interface DayRoute {
  dayId: string
  dayNumber: number
  points: Array<[number, number]>
  items: PlannerTripItem[]
}

export function PlannerTripMap({ trip }: { trip: PlannerTrip }) {
  const routes = useMemo<DayRoute[]>(() => {
    const result: DayRoute[] = []
    trip.days.forEach((day, dayIndex) => {
      const points: Array<[number, number]> = []
      const items: PlannerTripItem[] = []
      for (const item of day.items) {
        if (item.latitude != null && item.longitude != null) {
          points.push([item.latitude, item.longitude])
          items.push(item)
        }
      }
      if (points.length > 0) {
        result.push({ dayId: day.id, dayNumber: dayIndex + 1, points, items })
      }
    })
    return result
  }, [trip])

  const allPoints = useMemo(() => routes.flatMap((route) => route.points), [routes])

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
          <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
          Route map
        </h3>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PLANNER_MAP_TYPE_META.map((meta) => (
            <span key={meta.type} className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              {meta.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-48 overflow-hidden rounded-xl ring-1 ring-border sm:h-52 lg:h-56">
        {allPoints.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary/30 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <MapPin className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-foreground">Your route will appear here</p>
            <p className="max-w-56 text-xs leading-relaxed text-muted-foreground">
              Add stops with locations and the day-by-day route lights up on the map.
            </p>
          </div>
        ) : (
          <MapContainer
            center={KERALA_CENTER}
            zoom={7}
            scrollWheelZoom
            className="h-full w-full"
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              subdomains="abcd"
              maxZoom={19}
            />
            <FitView points={allPoints} />
            {routes.map((route, routeIndex) => (
              <Fragment key={route.dayId}>
                <Polyline
                  positions={route.points}
                  pathOptions={{
                    color: DAY_POLYLINE_COLORS[routeIndex % DAY_POLYLINE_COLORS.length],
                    weight: 3,
                    opacity: 0.85,
                    dashArray: route.points.length > 2 ? '6 6' : undefined,
                  }}
                />
                {route.items.map((item) => (
                  <Marker
                    key={item.id}
                    position={[item.latitude!, item.longitude!]}
                    icon={markerIcon(item, route.dayNumber)}
                  >
                    <Popup>
                      <span className="block text-xs font-bold">{item.name}</span>
                      <span className="block text-[11px] opacity-80">
                        Day {route.dayNumber} · {PLANNER_ITEM_LABELS[item.type]}
                        {item.city ? ` · ${item.city}` : ''}
                      </span>
                      {item.price > 0 && (
                        <span className="block text-[11px] font-semibold opacity-90">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </Popup>
                  </Marker>
                ))}
              </Fragment>
            ))}
          </MapContainer>
        )}
      </div>

      <p className={cn('text-[11px] leading-relaxed text-muted-foreground')}>
        Day routes connect stops in order — zoom &amp; pan to explore. Colours match the itinerary timeline.
      </p>
    </div>
  )
}
