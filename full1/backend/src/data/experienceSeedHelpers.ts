import type { ExperienceCategory, ExperienceDifficulty } from '@prisma/client';

export interface ExperienceSeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: ExperienceCategory;
  duration: string;
  price: number;
  location: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  difficulty: ExperienceDifficulty;
  bestSeason: string;
  suitableFor: string[];
  highlights: string[];
  rating: number;
  ratingNote: string;
  popularityScore: number;
  reviewsCount: number;
  isFeatured: boolean;
  image: string;
  gallery: string[];
}

export const EXPERIENCE_IMAGE_DIR = '/images';

// Every entry below is a local asset already shipped in public/images
// (destination photo sets, one cover + up to 6 gallery frames per place).
const PLACES = {
  adventure: [
    'soochipara', 'meenmutty', 'palaruvi', 'valara', 'vazhachal', 'thusharagiri',
    'cheeyappara', 'edakkal-caves', 'vagamon', 'ponmudi', 'ranipuram', 'nelliyampathy',
    'chembra', 'kolukkumalai', 'top-station', 'ilaveezhapoonchira', 'gavi', 'thenmala',
  ],
  culture: [
    'padmanabhaswamy', 'chottanikkara', 'vadakkumnathan', 'guruvayur', 'sabarimala',
    'cheraman-masjid', 'sakthan-thampuran-palace', 'krishnapuram-palace', 'hill-palace',
    'kottakkunnu', 'st-angelo-fort', 'santa-cruz-basilica', 'napier-museum',
    'nilambur-teak-museum', 'marine-drive', 'beypore', 'chavakkad', 'jatayu-earth-center',
  ],
  wildlife: [
    'thekkady', 'parambikulam', 'thattekad', 'chinnar', 'silent-valley', 'eravikulam',
    'aralam', 'ranipuram', 'thrissur-zoo', 'gavi',
  ],
  food: [
    'kerala-1', 'kerala-2', 'kerala-3', 'kerala-4', 'dosa-1', 'dosa-2',
    'biryani-1', 'biryani-2', 'biryani-3', 'seafood-1', 'seafood-2', 'seafood-3',
    'seafood-4', 'seafood-5', 'veg-1', 'veg-2', 'veg-3', 'cafe-1', 'cafe-2',
    'cafe-3', 'cafe-4', 'coffee-1', 'coffee-2', 'coffee-3', 'juice-1', 'juice-2',
    'pastry-1', 'pastry-2', 'pastry-3', 'dessert-1', 'dessert-2', 'fastfood-1',
    'fastfood-2', 'fastfood-3', 'fastfood-4', 'fine-1', 'fine-2', 'fine-3',
    'table-1', 'table-2', 'table-3', 'table-4', 'interior-1', 'interior-2',
    'interior-3', 'interior-4', 'interior-5', 'interior-6', 'exterior-1',
    'exterior-2', 'exterior-3', 'exterior-4',
  ],
  wellness: [
    'kumarakom', 'ashtamudi', 'poovar-island', 'munroe-island', 'marari', 'kovalam',
    'shankumugham', 'snehatheeram', 'kuttanad', 'pookode', 'banasura', 'cherai',
  ],
  nature: [
    'anamudi', 'mattupetty-dam', 'idukki-dam', 'malampuzha-dam', 'pookode', 'banasura',
    'chembra', 'kuruvadweep', 'chinnakanal', 'valiyaparamba', 'silent-valley', 'ponmudi',
    'gavi', 'aralam', 'top-station', 'vagamon', 'nelliyampathy', 'thenmala',
  ],
  water: [
    'kumarakom', 'munroe-island', 'poovar-island', 'kuttanad', 'marari', 'cherai',
    'kappad', 'kozhikode-beach', 'payyambalam', 'muzhappilangad', 'shankumugham',
    'snehatheeram', 'beypore', 'valiyaparamba', 'idukki-dam', 'malampuzha-dam',
    'thenmala', 'ashtamudi',
  ],
};

const POOLS: Record<ExperienceCategory, string[]> = {
  ADVENTURE: PLACES.adventure,
  CULTURE: PLACES.culture,
  WILDLIFE: PLACES.wildlife,
  FOOD: PLACES.food,
  WELLNESS: PLACES.wellness,
  NATURE: PLACES.nature,
  WATER_ACTIVITIES: PLACES.water,
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

function coverPath(place: string): string {
  return `${EXPERIENCE_IMAGE_DIR}/${place}-cover.jpg`;
}

function galleryPath(place: string, index: number): string {
  return `${EXPERIENCE_IMAGE_DIR}/${place}-gallery-${index}.jpg`;
}

export function experienceHero(category: ExperienceCategory, slug: string, override?: string): string {
  if (override) return `${EXPERIENCE_IMAGE_DIR}/${override}`;
  return coverPath(pick(POOLS[category] ?? PLACES.nature, hashString(slug)));
}

export function experienceGallery(
  category: ExperienceCategory,
  slug: string,
  override?: string[],
  count = 6,
): string[] {
  if (override && override.length > 0) {
    return override.map((frame) => (frame.startsWith('/') ? frame : `${EXPERIENCE_IMAGE_DIR}/${frame}`));
  }
  const seed = hashString(slug);
  const place = pick(POOLS[category] ?? PLACES.nature, seed);
  const frames = [coverPath(place)];
  for (let i = 1; i < count; i += 1) {
    frames.push(galleryPath(place, (seed + i * 3) % 6 + 1));
  }
  return frames;
}

export interface ExperienceConfig {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: ExperienceCategory;
  duration: string;
  price: number;
  location: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  difficulty: ExperienceDifficulty;
  bestSeason: string;
  suitableFor: string[];
  highlights: string[];
  rating: number;
  popularityScore: number;
  featured?: boolean;
  image?: string;
  gallery?: string[];
}

export function E(cfg: ExperienceConfig): ExperienceSeed {
  return {
    slug: cfg.slug,
    name: cfg.name,
    tagline: cfg.tagline,
    description: cfg.description,
    longDescription: cfg.longDescription,
    category: cfg.category,
    duration: cfg.duration,
    price: cfg.price,
    location: cfg.location,
    city: cfg.city,
    latitude: cfg.latitude ?? null,
    longitude: cfg.longitude ?? null,
    difficulty: cfg.difficulty,
    bestSeason: cfg.bestSeason,
    suitableFor: cfg.suitableFor,
    highlights: cfg.highlights,
    rating: cfg.rating,
    ratingNote: 'Sample rating',
    popularityScore: cfg.popularityScore,
    reviewsCount: Math.round(cfg.popularityScore * 18 + cfg.rating * 60),
    isFeatured: cfg.featured ?? false,
    image: experienceHero(cfg.category, cfg.slug, cfg.image),
    gallery: experienceGallery(cfg.category, cfg.slug, cfg.gallery),
  };
}
