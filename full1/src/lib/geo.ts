// Geo utilities: distances, travel-time estimates and OpenStreetMap links.
// All free, no API keys, no billing - pure math over OpenStreetMap URLs.

const EARTH_RADIUS_KM = 6371
const DRIVING_SPEED_KMH = 45 // realistic average for Kerala roads
const WALKING_SPEED_KMH = 4.8

export function isValidCoord(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/** Great-circle distance between two coordinates in kilometres (haversine). */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 100) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function formatDuration(minutes: number): string {
  const rounded = Math.max(1, Math.round(minutes))
  if (rounded < 60) return `${rounded} min`
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`
}

export function estimateDrivingMinutes(km: number): number {
  return (km / DRIVING_SPEED_KMH) * 60
}

export function estimateWalkingMinutes(km: number): number {
  return (km / WALKING_SPEED_KMH) * 60
}

/** Link to the OpenStreetMap web map centred on the coordinates. */
export function osmMapLink(latitude: number, longitude: number, zoom = 14): string {
  return `https://www.openstreetmap.org/?mlat=${latitude.toFixed(5)}&mlon=${longitude.toFixed(5)}#map=${zoom}/${latitude.toFixed(5)}/${longitude.toFixed(5)}`
}

/** Link to OSM directions from a start coordinate to a destination coordinate. */
export function osmDirectionsLink(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): string {
  return `https://www.openstreetmap.org/directions?from=${fromLat.toFixed(5)}%2C${fromLon.toFixed(5)}&to=${toLat.toFixed(5)}%2C${toLon.toFixed(5)}`
}
