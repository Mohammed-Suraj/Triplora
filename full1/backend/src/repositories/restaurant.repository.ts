import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export interface RestaurantFilters {
  query?: string;
  category?: string;
  city?: string;
  minPriceLevel?: number;
  maxPriceLevel?: number;
  minRating?: number;
  includeInactive?: boolean;
}

export const restaurantRepository = {
  buildWhere(filters: RestaurantFilters): Prisma.RestaurantWhereInput {
    const where: Prisma.RestaurantWhereInput = filters.includeInactive ? {} : { isActive: true };

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { tagline: { contains: filters.query, mode: 'insensitive' } },
        { address: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { cuisines: { has: filters.query } },
      ];
    }

    if (filters.category && filters.category !== 'ALL') {
      where.category = filters.category as Prisma.RestaurantWhereInput['category'];
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.minPriceLevel !== undefined || filters.maxPriceLevel !== undefined) {
      where.priceLevel = {
        ...(filters.minPriceLevel !== undefined ? { gte: filters.minPriceLevel } : {}),
        ...(filters.maxPriceLevel !== undefined ? { lte: filters.maxPriceLevel } : {}),
      };
    }

    if (filters.minRating !== undefined) {
      where.rating = { gte: filters.minRating };
    }

    return where;
  },

  findMany(params: {
    where: Prisma.RestaurantWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.RestaurantOrderByWithRelationInput | Prisma.RestaurantOrderByWithRelationInput[];
  }) {
    return prisma.restaurant.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
  },

  count(where: Prisma.RestaurantWhereInput) {
    return prisma.restaurant.count({ where });
  },

  findByIdOrSlug(idOrSlug: string) {
    return prisma.restaurant.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
  },

  findById(id: string) {
    return prisma.restaurant.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.restaurant.findUnique({ where: { slug } });
  },

  findSimilar(restaurant: { id: string; city: string }, excludeId: string, take: number) {
    return prisma.restaurant.findMany({
      where: {
        isActive: true,
        city: restaurant.city,
        id: { not: excludeId },
      },
      orderBy: [{ rating: 'desc' }, { popularityScore: 'desc' }],
      take,
    });
  },

  create(data: Prisma.RestaurantCreateInput) {
    return prisma.restaurant.create({ data });
  },

  update(id: string, data: Prisma.RestaurantUpdateInput) {
    return prisma.restaurant.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.restaurant.delete({ where: { id } });
  },
};
