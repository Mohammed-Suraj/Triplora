import type { RestaurantCategory } from '@prisma/client';

export interface RestaurantSeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: RestaurantCategory;
  cuisines: string[];
  priceRange: string;
  priceLevel: number;
  openingHours: string;
  phone: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string;
  rating: number;
  ratingNote: string;
  popularityScore: number;
  reviewsCount: number;
  bestFor: string[];
  image: string;
  gallery: string[];
}

export const RESTAURANT_IMAGE_DIR = '/images/restaurants';

const RESTAURANT_IMAGES: Record<string, string[]> = {
  exterior: ['exterior-1', 'exterior-2', 'exterior-3', 'exterior-4'],
  interior: ['interior-1', 'interior-2', 'interior-3', 'interior-4', 'interior-5', 'interior-6'],
  table: ['table-1', 'table-2', 'table-3', 'table-4'],
  kerala: ['kerala-1', 'kerala-2', 'kerala-3', 'kerala-4'],
  dosa: ['dosa-1', 'dosa-2'],
  biryani: ['biryani-1', 'biryani-2', 'biryani-3'],
  seafood: ['seafood-1', 'seafood-2', 'seafood-3', 'seafood-4', 'seafood-5'],
  veg: ['veg-1', 'veg-2', 'veg-3'],
  cafe: ['cafe-1', 'cafe-2', 'cafe-3', 'cafe-4'],
  coffee: ['coffee-1', 'coffee-2', 'coffee-3'],
  juice: ['juice-1', 'juice-2'],
  pastry: ['pastry-1', 'pastry-2', 'pastry-3'],
  dessert: ['dessert-1', 'dessert-2'],
  fastfood: ['fastfood-1', 'fastfood-2', 'fastfood-3', 'fastfood-4'],
  fine: ['fine-1', 'fine-2', 'fine-3'],
};

const HERO_POOLS: Record<RestaurantCategory, string[]> = {
  KERALA: ['kerala', 'biryani'],
  SEAFOOD: ['seafood'],
  VEGETARIAN: ['veg', 'kerala'],
  CAFE: ['cafe', 'coffee'],
  FINE_DINING: ['fine', 'table'],
  BAKERY: ['pastry'],
  FAST_FOOD: ['fastfood'],
};

const GALLERY_TEMPLATES: Record<RestaurantCategory, string[]> = {
  KERALA: ['kerala', 'biryani', 'table', 'interior', 'dosa'],
  SEAFOOD: ['seafood', 'seafood', 'table', 'interior', 'kerala'],
  VEGETARIAN: ['veg', 'kerala', 'dosa', 'table', 'dessert'],
  CAFE: ['cafe', 'coffee', 'pastry', 'table', 'interior'],
  FINE_DINING: ['fine', 'table', 'interior', 'dessert', 'seafood'],
  BAKERY: ['pastry', 'cafe', 'coffee', 'dessert', 'interior'],
  FAST_FOOD: ['fastfood', 'cafe', 'table', 'juice', 'interior'],
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick(pool: string[], seed: number): string {
  return pool[seed % pool.length];
}

export function restaurantHero(category: RestaurantCategory, slug: string): string {
  const seed = hashString(slug);
  const poolKey = pick(HERO_POOLS[category] ?? ['table'], seed);
  const pool = RESTAURANT_IMAGES[poolKey] ?? RESTAURANT_IMAGES.table;
  return `${RESTAURANT_IMAGE_DIR}/${pick(pool, seed)}.jpg`;
}

export function restaurantGallery(category: RestaurantCategory, slug: string, count = 5): string[] {
  const seed = hashString(slug);
  const template = GALLERY_TEMPLATES[category] ?? GALLERY_TEMPLATES.KERALA;
  const templateSlots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const slotKey = template[i % template.length];
    const pool = RESTAURANT_IMAGES[slotKey] ?? RESTAURANT_IMAGES.table;
    templateSlots.push(pick(pool, seed + i * 7 + slotKey.length));
  }
  return templateSlots.map((slot) => `${RESTAURANT_IMAGE_DIR}/${slot}.jpg`);
}

export interface RestaurantConfig {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: RestaurantCategory;
  cuisines: string[];
  priceRange: string;
  priceLevel: number;
  openingHours: string;
  phone?: string | null;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  rating: number;
  ratingNote?: string;
  popularityScore: number;
  reviewsCount?: number;
  bestFor: string[];
}

export function R(cfg: RestaurantConfig): RestaurantSeed {
  const mapsQuery = encodeURIComponent(`${cfg.name}, ${cfg.city}`);
  return {
    slug: cfg.slug,
    name: cfg.name,
    tagline: cfg.tagline,
    description: cfg.description,
    longDescription: cfg.longDescription,
    category: cfg.category,
    cuisines: cfg.cuisines,
    priceRange: cfg.priceRange,
    priceLevel: cfg.priceLevel,
    openingHours: cfg.openingHours,
    phone: cfg.phone ?? null,
    address: cfg.address,
    city: cfg.city,
    latitude: cfg.latitude ?? null,
    longitude: cfg.longitude ?? null,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    rating: cfg.rating,
    ratingNote: cfg.ratingNote ?? 'Sample rating',
    popularityScore: cfg.popularityScore,
    reviewsCount: cfg.reviewsCount ?? Math.round(cfg.popularityScore * 18 + cfg.rating * 60),
    bestFor: cfg.bestFor,
    image: restaurantHero(cfg.category, cfg.slug),
    gallery: restaurantGallery(cfg.category, cfg.slug),
  };
}
