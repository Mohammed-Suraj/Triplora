import { destinationRepository } from '../repositories/destination.repository';
import { categoryRepository } from '../repositories/category.repository';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, type PaginationMeta } from '../utils/ApiResponse';
import { parsePaginationQuery } from '../utils/pagination';
import { toDestinationDTO } from '../dto/destination.mapper';
import type { DestinationDTO } from '../types';
import type { Prisma } from '@prisma/client';

const ALLOWED_SORT_FIELDS = ['createdAt', 'rating', 'priceFrom', 'name', 'popularity', 'reviews'];

interface ListQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  category?: string;
  region?: string;
  minPrice?: string;
  maxPrice?: string;
  [key: string]: unknown;
}

// Default "Most Popular" ordering: popularity first, then highest rated,
// then trending (review count), then newly added - so the icons of Kerala
// tourism always surface first on the Explore page.
function buildOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Prisma.DestinationOrderByWithRelationInput | Prisma.DestinationOrderByWithRelationInput[] {
  if (sortBy === 'popularity') {
    return [
      { popularityScore: sortOrder },
      { rating: 'desc' },
      { reviewsCount: 'desc' },
      { createdAt: 'desc' },
    ];
  }
  if (sortBy === 'reviews') {
    return { reviewsCount: sortOrder };
  }
  return { [sortBy]: sortOrder };
}

export const destinationService = {
  async list(query: ListQuery): Promise<{ items: DestinationDTO[]; meta: PaginationMeta }> {
    const pagination = parsePaginationQuery(query, {
      defaultSortBy: 'popularity',
      allowedSortFields: ALLOWED_SORT_FIELDS,
      maxLimit: 100,
    });

    const where = destinationRepository.buildWhere({
      category: query.category,
      region: query.region,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
    });

    const [rows, total] = await Promise.all([
      destinationRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: buildOrderBy(pagination.sortBy, pagination.sortOrder),
      }),
      destinationRepository.count(where),
    ]);

    return {
      items: rows.map(toDestinationDTO),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },

  async search(q: string, query: ListQuery): Promise<{ items: DestinationDTO[]; meta: PaginationMeta }> {
    const pagination = parsePaginationQuery(query, { defaultLimit: 12, maxLimit: 100 });
    const where = destinationRepository.buildWhere({ query: q });

    const [rows, total] = await Promise.all([
      destinationRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { rating: 'desc' },
      }),
      destinationRepository.count(where),
    ]);

    return {
      items: rows.map(toDestinationDTO),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },

  async byCategory(category: string, query: ListQuery): Promise<{ items: DestinationDTO[]; meta: PaginationMeta }> {
    if (category.toLowerCase() !== 'all') {
      const exists = await categoryRepository.findByName(category);
      if (!exists) {
        throw ApiError.notFound(`Category "${category}" not found`);
      }
    }

    return this.list({ ...query, category });
  },

  async getById(idOrSlug: string): Promise<DestinationDTO> {
    const destination = await destinationRepository.findByIdOrSlug(idOrSlug);
    if (!destination) {
      throw ApiError.notFound('Destination not found');
    }
    return toDestinationDTO(destination);
  },

  async create(input: {
    name: string;
    tagline: string;
    region: string;
    categoryId: string;
    priceFrom: number;
    duration: string;
    bestSeason: string;
    description: string;
    longDescription: string;
    highlights: string[];
    activities: string[];
    gallery: string[];
    image: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<DestinationDTO> {
    const category = await categoryRepository.findBySlug(input.categoryId);
    const categoryId = category?.id ?? input.categoryId;

    const slug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const created = await destinationRepository.create({
      name: input.name,
      slug,
      tagline: input.tagline,
      region: input.region,
      image: input.image,
      gallery: input.gallery,
      priceFrom: input.priceFrom,
      duration: input.duration,
      bestSeason: input.bestSeason,
      description: input.description,
      longDescription: input.longDescription,
      highlights: input.highlights,
      activities: input.activities,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      category: { connect: { id: categoryId } },
    });

    return toDestinationDTO(created);
  },
};
