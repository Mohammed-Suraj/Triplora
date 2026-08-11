// Leaflet helpers: themed tile layers and SVG divIcon markers.
// SVG divIcons avoid Vite's default marker-icon image issue entirely
// (no broken icons, no asset imports) and render crisply in dark theme.

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const LIGHT_TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const DARK_TILES_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export const LIGHT_TILES_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
export const DARK_TILES_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'

export function tilesForTheme(theme: 'light' | 'dark'): { url: string; attribution: string } {
  return theme === 'dark'
    ? { url: DARK_TILES_URL, attribution: DARK_TILES_ATTRIBUTION }
    : { url: LIGHT_TILES_URL, attribution: LIGHT_TILES_ATTRIBUTION }
}

const PIN_HTML = `
<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
    fill="%230d9488" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="18" cy="18" r="6.5" fill="#ffffff"/>
</svg>`

const PIN_ACTIVE_HTML = `
<svg width="44" height="52" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
    fill="#e11d48" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="18" cy="18" r="6.5" fill="#ffffff"/>
</svg>`

const USER_DOT_HTML = `
<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="11" cy="11" r="10" fill="rgba(37,99,235,0.25)"/>
  <circle cx="11" cy="11" r="5.5" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
</svg>`

/** Main destination pin. `active` renders the highlighted variant (search/selection). */
export function destinationPinIcon(active = false): L.DivIcon {
  const size = active ? 44 : 36
  return L.divIcon({
    className: 'triplora-pin',
    html: active ? PIN_ACTIVE_HTML : PIN_HTML,
    iconSize: [size, active ? 52 : 44],
    iconAnchor: [size / 2, active ? 52 : 44],
    popupAnchor: [0, active ? -46 : -38],
  })
}

/** Blue pulsing "You are here" marker for the user's browser location. */
export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'triplora-user-dot',
    html: USER_DOT_HTML,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/** Small teal dot used for start/end points of a route line. */
export function routeDotIcon(): L.DivIcon {
  return L.divIcon({
    className: 'triplora-route-dot',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#0d9488;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}
