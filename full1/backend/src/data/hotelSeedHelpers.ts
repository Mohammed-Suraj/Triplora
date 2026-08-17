// Helpers for the curated hotel seed dataset: a library of royalty-free hotel
// property images (downloaded once into /public/images/hotels), coordinate
// anchors, deterministic gallery rotation, room generation and copy templates.

import type { HotelSeed, HotelSeedRoom } from './hotelSeed';

export type HotelType = HotelSeed['hotelType'];

// Local library of hotel property photos (Unsplash, royalty-free). Every hero,
// gallery and room image in the seed is drawn from here so the UI never shows
// tourist/attraction imagery. Categories map to the spec's gallery sections.
export const HOTEL_PROPERTY_LIBRARY: Record<string, string[]> = {
  exterior: [
    '/images/hotels/exterior-1.jpg',
    '/images/hotels/exterior-2.jpg',
    '/images/hotels/exterior-3.jpg',
    '/images/hotels/exterior-4.jpg',
    '/images/hotels/exterior-5.jpg',
    '/images/hotels/exterior-6.jpg',
    '/images/hotels/exterior-7.jpg',
    '/images/hotels/exterior-8.jpg',
    '/images/hotels/exterior-9.jpg',
  ],
  room: [
    '/images/hotels/room-1.jpg',
    '/images/hotels/room-2.jpg',
    '/images/hotels/room-3.jpg',
    '/images/hotels/room-4.jpg',
    '/images/hotels/room-5.jpg',
    '/images/hotels/room-6.jpg',
    '/images/hotels/room-7.jpg',
    '/images/hotels/room-8.jpg',
    '/images/hotels/room-9.jpg',
    '/images/hotels/room-10.jpg',
    '/images/hotels/room-11.jpg',
    '/images/hotels/room-12.jpg',
    '/images/hotels/room-13.jpg',
    '/images/hotels/room-14.jpg',
  ],
  bathroom: [
    '/images/hotels/bathroom-1.jpg',
    '/images/hotels/bathroom-2.jpg',
    '/images/hotels/bathroom-3.jpg',
    '/images/hotels/bathroom-4.jpg',
    '/images/hotels/bathroom-5.jpg',
  ],
  pool: [
    '/images/hotels/pool-1.jpg',
    '/images/hotels/pool-2.jpg',
    '/images/hotels/pool-3.jpg',
    '/images/hotels/pool-4.jpg',
    '/images/hotels/pool-5.jpg',
    '/images/hotels/pool-6.jpg',
  ],
  restaurant: [
    '/images/hotels/restaurant-1.jpg',
    '/images/hotels/restaurant-2.jpg',
    '/images/hotels/restaurant-3.jpg',
    '/images/hotels/restaurant-4.jpg',
    '/images/hotels/restaurant-5.jpg',
    '/images/hotels/restaurant-6.jpg',
    '/images/hotels/restaurant-7.jpg',
    '/images/hotels/restaurant-8.jpg',
  ],
  lobby: [
    '/images/hotels/lobby-2.jpg',
    '/images/hotels/lobby-3.jpg',
  ],
  garden: [
    '/images/hotels/garden-1.jpg',
    '/images/hotels/garden-2.jpg',
    '/images/hotels/garden-3.jpg',
    '/images/hotels/garden-4.jpg',
    '/images/hotels/garden-5.jpg',
  ],
  view: [
    '/images/hotels/view-1.jpg',
    '/images/hotels/view-2.jpg',
    '/images/hotels/view-3.jpg',
  ],
};

// Gallery composition per hotel type. The first slot is always the hero shot.
const GALLERY_TEMPLATES: Record<HotelType, string[]> = {
  RESORT: ['exterior', 'pool', 'room', 'bathroom', 'restaurant', 'lobby'],
  VILLA: ['exterior', 'pool', 'room', 'bathroom', 'garden', 'restaurant'],
  HOTEL: ['exterior', 'room', 'bathroom', 'restaurant', 'lobby', 'view'],
  HOMESTAY: ['exterior', 'room', 'bathroom', 'garden', 'restaurant', 'lobby'],
  BACKPACKER: ['exterior', 'room', 'bathroom', 'lobby', 'restaurant', 'garden'],
};

const HOTEL_ANCHORS: Record<string, { lat: number; lng: number }> = {
  munnar: { lat: 10.0889, lng: 77.0595 },
  chinnakanal: { lat: 10.103, lng: 77.195 },
  kolukkumalai: { lat: 10.092, lng: 77.255 },
  'top-station': { lat: 10.0573, lng: 77.1735 },
  thekkady: { lat: 9.6031, lng: 77.1615 },
  vagamon: { lat: 9.6886, lng: 76.9047 },
  ponmudi: { lat: 8.7593, lng: 77.1151 },
  nelliyampathy: { lat: 10.5291, lng: 76.7186 },
  ilaveezhapoonchira: { lat: 9.718, lng: 76.858 },
  alleppey: { lat: 9.4981, lng: 76.3388 },
  marari: { lat: 9.5517, lng: 76.2949 },
  kumarakom: { lat: 9.5894, lng: 76.4266 },
  kuttanad: { lat: 9.3477, lng: 76.4011 },
  ashtamudi: { lat: 8.9497, lng: 76.6059 },
  'munroe-island': { lat: 8.997, lng: 76.62 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  cherai: { lat: 10.1393, lng: 76.19 },
  athirappally: { lat: 10.2816, lng: 76.5708 },
  thenmala: { lat: 8.956, lng: 77.0664 },
  kovalam: { lat: 8.3951, lng: 76.9786 },
  varkala: { lat: 8.7379, lng: 76.7164 },
  'poovar-island': { lat: 8.1611, lng: 77.0753 },
  bekal: { lat: 12.3909, lng: 75.0345 },
  muzhappilangad: { lat: 11.793, lng: 75.445 },
  payyambalam: { lat: 11.8761, lng: 75.38 },
  kozhikode: { lat: 11.251, lng: 75.7687 },
  guruvayur: { lat: 10.594, lng: 76.0395 },
  chavakkad: { lat: 10.5557, lng: 76.01 },
  wayanad: { lat: 11.6854, lng: 76.132 },
  kuruvadweep: { lat: 11.588, lng: 76.151 },
  thattekad: { lat: 9.9849, lng: 76.6651 },
  parambikulam: { lat: 10.3894, lng: 76.7788 },
  chinnar: { lat: 10.293, lng: 77.173 },
  gavi: { lat: 9.4375, lng: 77.1713 },
  'silent-valley': { lat: 11.0865, lng: 76.4296 },
};

export const HOTEL_DEST_NAMES: Record<string, string> = {
  munnar: 'Munnar', chinnakanal: 'Chinnakanal', kolukkumalai: 'Kolukkumalai', 'top-station': 'Top Station',
  thekkady: 'Thekkady', vagamon: 'Vagamon', ponmudi: 'Ponmudi', nelliyampathy: 'Nelliyampathy',
  ilaveezhapoonchira: 'Ilaveezhapoonchira', alleppey: 'Alappuzha', marari: 'Marari', kumarakom: 'Kumarakom',
  kuttanad: 'Kuttanad', ashtamudi: 'Ashtamudi', 'munroe-island': 'Munroe Island', kochi: 'Kochi', cherai: 'Cherai',
  athirappally: 'Athirappally', thenmala: 'Thenmala', kovalam: 'Kovalam', varkala: 'Varkala',
  'poovar-island': 'Poovar', bekal: 'Bekal', muzhappilangad: 'Muzhappilangad', payyambalam: 'Payyambalam',
  kozhikode: 'Kozhikode', guruvayur: 'Guruvayur', chavakkad: 'Chavakkad', wayanad: 'Wayanad',
  kuruvadweep: 'Kuruvadweep', thattekad: 'Thattekad', parambikulam: 'Parambikulam', chinnar: 'Chinnar',
  gavi: 'Gavi', 'silent-valley': 'Silent Valley',
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length];
}

// Deterministic 6-image property gallery (hero first) per hotel type.
export function propertyGallery(slug: string, type: HotelType, count = 6): string[] {
  const template = GALLERY_TEMPLATES[type] ?? GALLERY_TEMPLATES.HOTEL;
  const shift = hashStr(slug);
  return template.slice(0, count).map((cat) => pick(HOTEL_PROPERTY_LIBRARY[cat], shift + cat.length));
}

// Hero image: always the hotel building/exterior (pool-side for resorts).
export function propertyHero(type: HotelType, slug: string): string {
  const shift = hashStr(slug);
  const exterior = HOTEL_PROPERTY_LIBRARY.exterior;
  if (type === 'RESORT' || type === 'VILLA') {
    const pool = HOTEL_PROPERTY_LIBRARY.pool;
    return pick(shift % 2 === 0 ? pool : exterior, shift);
  }
  return pick(exterior, shift);
}

export function coordinatesFor(dest: string, jitter = 0): { lat: number; lng: number } {
  const anchor = HOTEL_ANCHORS[dest] ?? HOTEL_ANCHORS.munnar;
  if (!jitter) return { ...anchor };
  const h = hashStr(dest + jitter);
  return {
    lat: +(anchor.lat + ((h % 100) - 50) * 0.0004).toFixed(4),
    lng: +(anchor.lng + (((h >> 4) % 100) - 50) * 0.0004).toFixed(4),
  };
}

const ROOM_TEMPLATES: Record<string, Array<{ name: string; mult: number; guests: number; bed: string; total: number }>> = {
  HOMESTAY: [
    { name: 'Garden Room', mult: 1, guests: 2, bed: 'Double', total: 6 },
    { name: 'Deluxe Room', mult: 1.4, guests: 3, bed: 'Queen', total: 4 },
  ],
  BACKPACKER: [
    { name: 'Dorm Bed', mult: 0.32, guests: 1, bed: 'Bunk', total: 24 },
    { name: 'Private Room', mult: 1.2, guests: 2, bed: 'Double', total: 8 },
  ],
  HOTEL: [
    { name: 'Standard Room', mult: 1, guests: 2, bed: 'Double', total: 18 },
    { name: 'Deluxe Room', mult: 1.35, guests: 3, bed: 'Queen', total: 12 },
    { name: 'Premium Room', mult: 1.75, guests: 2, bed: 'King', total: 8 },
  ],
  RESORT: [
    { name: 'Deluxe Room', mult: 1, guests: 3, bed: 'Queen', total: 16 },
    { name: 'Premium Room', mult: 1.35, guests: 2, bed: 'King', total: 10 },
    { name: 'Family Suite', mult: 1.85, guests: 5, bed: 'King + Single', total: 6 },
    { name: 'Villa', mult: 2.5, guests: 6, bed: 'King + Queen', total: 4 },
  ],
  VILLA: [
    { name: 'Premium Room', mult: 1, guests: 2, bed: 'King', total: 6 },
    { name: 'Family Suite', mult: 1.4, guests: 5, bed: 'King + Single', total: 3 },
    { name: 'Villa', mult: 1.9, guests: 6, bed: 'King + Queen', total: 3 },
  ],
};

function roundHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

export function roomsFor(price: number, type: HotelType, slug: string): HotelSeedRoom[] {
  const templates = ROOM_TEMPLATES[type] ?? ROOM_TEMPLATES.HOTEL;
  const shift = hashStr(slug);
  const amenities = ['WiFi', 'Breakfast', 'Room Service'];
  const roomImgs = HOTEL_PROPERTY_LIBRARY.room;
  return templates.map((t, i) => {
    const idx = (shift + i) % templates.length;
    const tpl = templates[idx];
    return {
      name: tpl.name,
      description: `Comfortable ${tpl.bed} room with ensuite bathroom, tea/coffee and daily housekeeping.`,
      pricePerNight: roundHundred(price * tpl.mult),
      maxGuests: tpl.guests,
      bedType: tpl.bed,
      totalRooms: tpl.total,
      amenities,
      images: [pick(roomImgs, shift + i), pick(roomImgs, shift + i + 3)],
    };
  });
}

const CANCELLATION: Record<string, string> = {
  HOMESTAY: 'Free cancellation up to 48 hours before check-in. 100% refund minus taxes.',
  BACKPACKER: 'Free cancellation up to 24 hours before check-in. Refund minus taxes and one night.',
  HOTEL: 'Free cancellation up to 48 hours before check-in. 100% refund minus taxes.',
  RESORT: 'Free cancellation up to 72 hours before check-in. 90% refund minus taxes.',
  VILLA: 'Free cancellation up to 7 days before check-in. 75% refund minus taxes.',
};

const TAGLINES: Record<string, string[]> = {
  HOMESTAY: [
    'Family-run hospitality with a window into local life',
    'A warm home away from home, surrounded by {dest}',
    'Home-style comfort from hosts who know every trail',
  ],
  BACKPACKER: [
    'Bunk up, make friends, explore {dest} on a budget',
    'Social stays, shared sunsets and budget-friendly beds',
    'The traveller hangout of {dest}, made for explorers',
  ],
  HOTEL: [
    'Classic comfort in the heart of {dest}',
    'Convenient stays with a local touch, right in {dest}',
    'Reliable comfort, warm service and a prime {dest} address',
  ],
  RESORT: [
    'An immersive escape with pools, dining and big views of {dest}',
    'All-day resort living surrounded by the best of {dest}',
    'Slow mornings, curated experiences and luxury in {dest}',
  ],
  VILLA: [
    'A private villa for slow, spacious {dest} holidays',
    'Your own poolside hideaway in the heart of {dest}',
    'Space, privacy and views to wake up to in {dest}',
  ],
};

const DESCRIPTIONS: Record<string, string[]> = {
  HOMESTAY: [
    'Run by a local family, this homestay pairs simple, spotless rooms with home-cooked Kerala meals, morning chai on the porch and insider tips on the best hidden corners of {dest}.',
    'A small, characterful homestay where guests are treated like family. Expect generous local cooking, comfortable rooms and hosts who happily arrange sightseeing, treks and transport.',
  ],
  BACKPACKER: [
    'A laid-back stay built for travellers: shared dorms and private rooms, a common lounge, tour desk and evening bonfires. The easiest way to meet like-minded explorers in {dest}.',
    'Budget beds, big common areas and a social vibe make this the go-to base for backpackers exploring {dest} and beyond.',
  ],
  HOTEL: [
    'A well-run hotel in a prime {dest} location with clean, comfortable rooms, a multicuisine restaurant and round-the-clock front desk service.',
    'Comfortable, centrally located rooms with modern bathrooms, a rooftop restaurant and friendly staff who make {dest} easy to explore on foot.',
  ],
  RESORT: [
    'Spread across lush grounds with a swimming pool, in-house dining and curated local experiences, this resort is made for guests who want to stay a while in {dest}.',
    'A full-service resort offering spacious rooms, poolside relaxation, a spa and guided tours of {dest} — comfort and adventure in equal measure.',
  ],
  VILLA: [
    'A private, self-contained villa with its own garden and sitting areas, designed for families and groups who want space, privacy and slow mornings in {dest}.',
    'Stylishly appointed villa with a private plunge pool and open-air living, ideal for couples and families craving an exclusive {dest} escape.',
  ],
};

function fill(template: string, dest: string): string {
  return template.split('{dest}').join(dest);
}

export interface HotelConfig {
  slug: string;
  name: string;
  type: HotelType;
  stars: number;
  price: number;
  rating: number;
  reviews?: number;
  loc: string;
  dist: number;
  amens: string[];
  family?: boolean;
  couple?: boolean;
  tag?: string;
  desc?: string;
  long?: string;
  near: string[];
  eat: string[];
  go: string[];
  jitter?: number;
  lat?: number;
  lng?: number;
}

export function H(dest: string, cfg: HotelConfig): HotelSeed {
  const destName = HOTEL_DEST_NAMES[dest] ?? dest;
  const imgPool = propertyGallery(cfg.slug, cfg.type, 6);
  const image = propertyHero(cfg.type, cfg.slug);
  const coords = coordinatesFor(dest, cfg.jitter ?? 1);
  const hash = hashStr(cfg.slug);
  const tagline = cfg.tag ?? fill(TAGLINES[cfg.type][hash % TAGLINES[cfg.type].length], destName);
  const desc = cfg.desc ?? fill(DESCRIPTIONS[cfg.type][hash % 2], destName);
  const longDesc =
    cfg.long ??
    `${desc} Situated at ${cfg.loc}, it sits within easy reach of ${cfg.near[0]?.toLowerCase() ?? 'the main sights'} and offers ${cfg.amens.slice(0, 3).join(', ').toLowerCase()}.`;
  const amens = cfg.amens;
  const has = (re: RegExp) => amens.some((a) => re.test(a));

  return {
    slug: cfg.slug,
    destinationSlug: dest,
    name: cfg.name,
    tagline,
    description: desc,
    longDescription: longDesc,
    image,
    gallery: imgPool,
    starRating: cfg.stars,
    rating: cfg.rating,
    reviewsCount: cfg.reviews ?? (180 + (hash % 620)),
    popularityScore: Math.min(97, Math.max(55, Math.round(cfg.rating * 20) + (hash % 7))),
    priceFrom: cfg.price,
    hotelType: cfg.type,
    location: cfg.loc,
    latitude: cfg.lat ?? coords.lat,
    longitude: cfg.lng ?? coords.lng,
    distanceFromAttraction: cfg.dist,
    checkIn: '2:00 PM',
    checkOut: '11:00 AM',
    cancellationPolicy: CANCELLATION[cfg.type],
    amenities: amens,
    familyFriendly: cfg.family ?? true,
    coupleFriendly: cfg.couple ?? true,
    freeBreakfast: has(/breakfast/i),
    freeWiFi: has(/wifi/i),
    swimmingPool: has(/pool/i),
    parking: has(/parking/i),
    airConditioning: has(/\bAC\b|air conditioning|a\/c/i),
    nearbyAttractions: cfg.near,
    nearbyRestaurants: cfg.eat,
    nearbyTransport: cfg.go,
    rooms: roomsFor(cfg.price, cfg.type, cfg.slug),
  };
}
