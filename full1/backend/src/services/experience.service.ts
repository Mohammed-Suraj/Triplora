import type { Prisma, Experience } from '@prisma/client';
import { experienceRepository, type ExperienceFilters } from '../repositories/experience.repository';
import { parsePaginationQuery } from '../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const EXPERIENCE_SORTS = ['price', 'rating', 'popularity'] as const;
export type ExperienceSort = (typeof EXPERIENCE_SORTS)[number];

export type ExperienceListItem = Experience;

export type ExperienceDTO = Experience & { similar?: ExperienceDTO[] };

export const toExperienceDTO = (experience: ExperienceListItem): ExperienceDTO => ({
  ...experience,
});

export const experienceService = {
  async list(query: Record<string, unknown>): Promise<{ items: ExperienceDTO[]; meta: PaginationMeta }> {
    const resolved = resolveSort(query);
    const pagination = parsePaginationQuery(resolved, {
      defaultLimit: 12,
      maxLimit: 50,
      defaultSortBy: 'popularity',
      allowedSortFields: [...EXPERIENCE_SORTS],
    });

    const filters: ExperienceFilters = {
      query: typeof resolved.q === 'string' && resolved.q ? resolved.q.trim() : undefined,
      category: typeof resolved.category === 'string' ? resolved.category : undefined,
      city: typeof resolved.city === 'string' && resolved.city ? resolved.city.trim() : undefined,
      difficulty: typeof resolved.difficulty === 'string' ? resolved.difficulty : undefined,
      minPrice: resolved.minPrice !== undefined ? Number(resolved.minPrice) : undefined,
      maxPrice: resolved.maxPrice !== undefined ? Number(resolved.maxPrice) : undefined,
      minRating: resolved.minRating !== undefined ? Number(resolved.minRating) : undefined,
      includeInactive: resolved.all === 'true' || resolved.all === '1',
    };

    const where = experienceRepository.buildWhere(filters);
    const orderBy = buildOrderBy(pagination.sortBy, pagination.sortOrder);

    const [items, total] = await Promise.all([
      experienceRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy,
      }),
      experienceRepository.count(where),
    ]);

    return {
      items: items.map(toExperienceDTO),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },

  async getByIdOrSlug(idOrSlug: string): Promise<ExperienceDTO & { similar: ExperienceDTO[] }> {
    const experience = await experienceRepository.findByIdOrSlug(idOrSlug);
    if (!experience) throw ApiError.notFound('Experience not found');

    const similar = await experienceRepository.findSimilar(experience, experience.id, 3);
    return { ...toExperienceDTO(experience), similar: similar.map(toExperienceDTO) };
  },

  async create(input: Record<string, unknown>) {
    const data: Prisma.ExperienceCreateInput = {
      slug: String(input.slug ?? slugify(String(input.name ?? ''))),
      name: String(input.name ?? ''),
      tagline: String(input.tagline ?? ''),
      description: String(input.description ?? ''),
      longDescription: String(input.longDescription ?? ''),
      category: (input.category as Prisma.ExperienceCreateInput['category']) ?? 'NATURE',
      duration: String(input.duration ?? ''),
      price: Number(input.price ?? 0),
      location: String(input.location ?? ''),
      city: String(input.city ?? ''),
      latitude: input.latitude === null || input.latitude === undefined ? null : Number(input.latitude),
      longitude: input.longitude === null || input.longitude === undefined ? null : Number(input.longitude),
      difficulty: (input.difficulty as Prisma.ExperienceCreateInput['difficulty']) ?? 'EASY',
      bestSeason: String(input.bestSeason ?? ''),
      suitableFor: Array.isArray(input.suitableFor) ? (input.suitableFor as string[]) : [],
      highlights: Array.isArray(input.highlights) ? (input.highlights as string[]) : [],
      rating: Number(input.rating ?? 0),
      ratingNote: String(input.ratingNote ?? 'Sample rating'),
      popularityScore: Number(input.popularityScore ?? 0),
      isFeatured: input.isFeatured !== undefined ? Boolean(input.isFeatured) : false,
      image: String(input.image ?? ''),
      gallery: Array.isArray(input.gallery) ? (input.gallery as string[]) : [],
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    };
    return experienceRepository.create(data);
  },

  async update(id: string, input: Record<string, unknown>) {
    const existing = await experienceRepository.findById(id);
    if (!existing) throw ApiError.notFound('Experience not found');

    const data: Prisma.ExperienceUpdateInput = {};
    if (input.slug !== undefined) data.slug = String(input.slug);
    if (input.name !== undefined) data.name = String(input.name);
    if (input.tagline !== undefined) data.tagline = String(input.tagline);
    if (input.description !== undefined) data.description = String(input.description);
    if (input.longDescription !== undefined) data.longDescription = String(input.longDescription);
    if (input.category !== undefined) data.category = input.category as Prisma.ExperienceUpdateInput['category'];
    if (input.duration !== undefined) data.duration = String(input.duration);
    if (input.price !== undefined) data.price = Number(input.price);
    if (input.location !== undefined) data.location = String(input.location);
    if (input.city !== undefined) data.city = String(input.city);
    if (input.latitude !== undefined) data.latitude = input.latitude === null ? null : Number(input.latitude);
    if (input.longitude !== undefined) data.longitude = input.longitude === null ? null : Number(input.longitude);
    if (input.difficulty !== undefined) data.difficulty = input.difficulty as Prisma.ExperienceUpdateInput['difficulty'];
    if (input.bestSeason !== undefined) data.bestSeason = String(input.bestSeason);
    if (input.suitableFor !== undefined) data.suitableFor = input.suitableFor as string[];
    if (input.highlights !== undefined) data.highlights = input.highlights as string[];
    if (input.rating !== undefined) data.rating = Number(input.rating);
    if (input.ratingNote !== undefined) data.ratingNote = String(input.ratingNote);
    if (input.popularityScore !== undefined) data.popularityScore = Number(input.popularityScore);
    if (input.isFeatured !== undefined) data.isFeatured = Boolean(input.isFeatured);
    if (input.image !== undefined) data.image = String(input.image);
    if (input.gallery !== undefined) data.gallery = input.gallery as string[];
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
    return experienceRepository.update(id, data);
  },

  async remove(id: string) {
    await experienceRepository.remove(id);
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
): Prisma.ExperienceOrderByWithRelationInput[] {
  if (sortBy === 'price') return [{ price: sortOrder }, { rating: 'desc' }];
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
