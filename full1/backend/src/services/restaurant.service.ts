import type { Prisma, Restaurant } from '@prisma/client';
import { restaurantRepository, type RestaurantFilters } from '../repositories/restaurant.repository';
import { parsePaginationQuery } from '../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const RESTAURANT_SORTS = ['price', 'rating', 'popularity'] as const;
export type RestaurantSort = (typeof RESTAURANT_SORTS)[number];

export type RestaurantListItem = Restaurant;

export type RestaurantDTO = Restaurant & { similar?: RestaurantDTO[] };

export const toRestaurantDTO = (restaurant: RestaurantListItem): RestaurantDTO => ({
  ...restaurant,
});

export const restaurantService = {
  async list(query: Record<string, unknown>): Promise<{ items: RestaurantDTO[]; meta: PaginationMeta }> {
    const resolved = resolveSort(query);
    const pagination = parsePaginationQuery(resolved, {
      defaultLimit: 12,
      maxLimit: 50,
      defaultSortBy: 'popularity',
      allowedSortFields: [...RESTAURANT_SORTS],
    });

    const filters: RestaurantFilters = {
      query: typeof resolved.q === 'string' && resolved.q ? resolved.q.trim() : undefined,
      category: typeof resolved.category === 'string' ? resolved.category : undefined,
      city: typeof resolved.city === 'string' && resolved.city ? resolved.city.trim() : undefined,
      minPriceLevel:
        resolved.minPriceLevel !== undefined ? Number(resolved.minPriceLevel) : undefined,
      maxPriceLevel:
        resolved.maxPriceLevel !== undefined ? Number(resolved.maxPriceLevel) : undefined,
      minRating: resolved.minRating !== undefined ? Number(resolved.minRating) : undefined,
      includeInactive: resolved.all === 'true' || resolved.all === '1',
    };

    const where = restaurantRepository.buildWhere(filters);
    const orderBy = buildOrderBy(pagination.sortBy, pagination.sortOrder);

    const [items, total] = await Promise.all([
      restaurantRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy,
      }),
      restaurantRepository.count(where),
    ]);

    return {
      items: items.map(toRestaurantDTO),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },

  async getByIdOrSlug(idOrSlug: string): Promise<RestaurantDTO & { similar: RestaurantDTO[] }> {
    const restaurant = await restaurantRepository.findByIdOrSlug(idOrSlug);
    if (!restaurant) throw ApiError.notFound('Restaurant not found');

    const similar = await restaurantRepository.findSimilar(restaurant, restaurant.id, 3);
    return { ...toRestaurantDTO(restaurant), similar: similar.map(toRestaurantDTO) };
  },

  async recommend(query: {
    craving?: string;
    category?: string;
    city?: string;
    limit?: number;
  }): Promise<RestaurantDTO[]> {
    const craving = query.craving ?? 'authentic';
    const limit = Math.min(Math.max(query.limit ?? 4, 1), 8);

    const baseWhere = restaurantRepository.buildWhere({
      category: query.category,
      city: query.city,
    });

    const all = (await restaurantRepository.findMany({
      where: baseWhere,
      skip: 0,
      take: 200,
      orderBy: [{ popularityScore: 'desc' }, { rating: 'desc' }],
    })) as RestaurantListItem[];

    const scored = all
      .map((restaurant) => ({ restaurant, score: this.cravingScore(restaurant, craving) }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ restaurant }) => toRestaurantDTO(restaurant));
  },

  cravingScore(restaurant: RestaurantListItem, craving: string): number {
    const priceLevel = restaurant.priceLevel;
    let score = restaurant.rating * 2 + Math.min(restaurant.popularityScore, 50) / 10;

    switch (craving) {
      case 'seafood':
        if (restaurant.category === 'SEAFOOD') score += 10;
        if (restaurant.cuisines.some((c) => c.toLowerCase().includes('seafood'))) score += 3;
        if (restaurant.category === 'VEGETARIAN') score -= 6;
        break;
      case 'veg':
        if (restaurant.category === 'VEGETARIAN') score += 10;
        if (priceLevel <= 2) score += 3;
        if (restaurant.category === 'SEAFOOD' || restaurant.category === 'FINE_DINING') score -= 4;
        break;
      case 'quick':
        if (restaurant.category === 'FAST_FOOD') score += 8;
        if (restaurant.category === 'CAFE') score += 4;
        if (priceLevel === 1) score += 3;
        if (priceLevel >= 3) score -= 6;
        break;
      case 'cozy':
        if (restaurant.category === 'CAFE' || restaurant.category === 'BAKERY') score += 9;
        if (restaurant.category === 'FINE_DINING') score -= 3;
        break;
      case 'splurge':
        if (restaurant.category === 'FINE_DINING') score += 10;
        if (priceLevel >= 3) score += 4;
        if (priceLevel <= 1) score -= 6;
        break;
      case 'authentic':
      default:
        if (restaurant.category === 'KERALA') score += 8;
        if (restaurant.cuisines.some((c) => c.toLowerCase().includes('kerala') || c.toLowerCase().includes('malabar'))) score += 3;
        if (restaurant.category === 'FINE_DINING' || restaurant.category === 'FAST_FOOD') score -= 2;
        break;
    }
    return score;
  },

  async create(input: Record<string, unknown>) {
    const data: Prisma.RestaurantCreateInput = {
      name: String(input.name ?? ''),
      slug: String(input.slug ?? slugify(String(input.name ?? ''))),
      tagline: String(input.tagline ?? ''),
      description: String(input.description ?? ''),
      longDescription: String(input.longDescription ?? ''),
      category: (input.category as Prisma.RestaurantCreateInput['category']) ?? 'KERALA',
      cuisines: Array.isArray(input.cuisines) ? (input.cuisines as string[]) : [],
      priceRange: String(input.priceRange ?? ''),
      priceLevel: Number(input.priceLevel ?? 2),
      openingHours: String(input.openingHours ?? ''),
      phone: input.phone ? String(input.phone) : null,
      address: String(input.address ?? ''),
      city: String(input.city ?? ''),
      latitude: input.latitude === null || input.latitude === undefined ? null : Number(input.latitude),
      longitude: input.longitude === null || input.longitude === undefined ? null : Number(input.longitude),
      googleMapsUrl: String(
        input.googleMapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${input.name} ${input.city}`)}`,
      ),
      rating: Number(input.rating ?? 0),
      ratingNote: String(input.ratingNote ?? 'Sample rating'),
      popularityScore: Number(input.popularityScore ?? 0),
      bestFor: Array.isArray(input.bestFor) ? (input.bestFor as string[]) : [],
      image: String(input.image ?? ''),
      gallery: Array.isArray(input.gallery) ? (input.gallery as string[]) : [],
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    };
    return restaurantRepository.create(data);
  },

  async update(id: string, input: Record<string, unknown>) {
    const existing = await restaurantRepository.findById(id);
    if (!existing) throw ApiError.notFound('Restaurant not found');

    const data: Prisma.RestaurantUpdateInput = {};
    if (input.name !== undefined) data.name = String(input.name);
    if (input.slug !== undefined) data.slug = String(input.slug);
    if (input.tagline !== undefined) data.tagline = String(input.tagline);
    if (input.description !== undefined) data.description = String(input.description);
    if (input.longDescription !== undefined) data.longDescription = String(input.longDescription);
    if (input.category !== undefined) data.category = input.category as Prisma.RestaurantUpdateInput['category'];
    if (input.cuisines !== undefined) data.cuisines = input.cuisines as string[];
    if (input.priceRange !== undefined) data.priceRange = String(input.priceRange);
    if (input.priceLevel !== undefined) data.priceLevel = Number(input.priceLevel);
    if (input.openingHours !== undefined) data.openingHours = String(input.openingHours);
    if (input.phone !== undefined) data.phone = input.phone ? String(input.phone) : null;
    if (input.address !== undefined) data.address = String(input.address);
    if (input.city !== undefined) data.city = String(input.city);
    if (input.latitude !== undefined) data.latitude = input.latitude === null ? null : Number(input.latitude);
    if (input.longitude !== undefined) data.longitude = input.longitude === null ? null : Number(input.longitude);
    if (input.googleMapsUrl !== undefined) data.googleMapsUrl = String(input.googleMapsUrl);
    if (input.rating !== undefined) data.rating = Number(input.rating);
    if (input.ratingNote !== undefined) data.ratingNote = String(input.ratingNote);
    if (input.popularityScore !== undefined) data.popularityScore = Number(input.popularityScore);
    if (input.bestFor !== undefined) data.bestFor = input.bestFor as string[];
    if (input.image !== undefined) data.image = String(input.image);
    if (input.gallery !== undefined) data.gallery = input.gallery as string[];
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
    return restaurantRepository.update(id, data);
  },

  async remove(id: string) {
    await restaurantRepository.remove(id);
  },
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Prisma.RestaurantOrderByWithRelationInput[] {
  if (sortBy === 'price') return [{ priceLevel: sortOrder }, { rating: 'desc' }];
  if (sortBy === 'rating') return [{ rating: 'desc' }, { reviewsCount: 'desc' }];
  return [{ popularityScore: 'desc' }, { rating: 'desc' }];
}

function resolveSort(query: Record<string, unknown>): Record<string, unknown> {
  const combined = typeof query.sort === 'string' ? query.sort : undefined;
  if (!combined) return query;
  const map: Record<string, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
    recommended: { sortBy: 'popularity', sortOrder: 'desc' },
    popularity: { sortBy: 'popularity', sortOrder: 'desc' },
    rating: { sortBy: 'rating', sortOrder: 'desc' },
    price_asc: { sortBy: 'price', sortOrder: 'asc' },
    price_desc: { sortBy: 'price', sortOrder: 'desc' },
  };
  const resolved = map[combined];
  if (!resolved) return query;
  return { ...query, sortBy: resolved.sortBy, sortOrder: resolved.sortOrder };
}
