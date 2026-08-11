import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export interface DestinationFilters {
  category?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}

const includeCategory = {
  category: true,
} satisfies Prisma.DestinationInclude;

export const destinationRepository = {
  buildWhere(filters: DestinationFilters): Prisma.DestinationWhereInput {
    const where: Prisma.DestinationWhereInput = {};

    if (filters.category && filters.category.toLowerCase() !== 'all') {
      where.category = { name: { equals: filters.category, mode: 'insensitive' } };
    }

    if (filters.region) {
      where.region = { equals: filters.region, mode: 'insensitive' };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.priceFrom = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { region: { contains: filters.query, mode: 'insensitive' } },
        { tagline: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    return where;
  },

  findMany(params: {
    where: Prisma.DestinationWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.DestinationOrderByWithRelationInput | Prisma.DestinationOrderByWithRelationInput[];
  }) {
    return prisma.destination.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      include: includeCategory,
    });
  },

  count(where: Prisma.DestinationWhereInput) {
    return prisma.destination.count({ where });
  },

  findById(id: string) {
    return prisma.destination.findUnique({
      where: { id },
      include: includeCategory,
    });
  },

  findBySlug(slug: string) {
    return prisma.destination.findUnique({
      where: { slug },
      include: includeCategory,
    });
  },

  findByIdOrSlug(idOrSlug: string) {
    return prisma.destination.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: includeCategory,
    });
  },

  create(data: Prisma.DestinationCreateInput) {
    return prisma.destination.create({ data, include: includeCategory });
  },

  updateRatingAggregate(destinationId: string, rating: number, reviewsCount: number) {
    return prisma.destination.update({
      where: { id: destinationId },
      data: { rating, reviewsCount },
    });
  },

  findManyByIds(ids: string[]) {
    return prisma.destination.findMany({
      where: { id: { in: ids } },
      include: includeCategory,
    });
  },

  count_all() {
    return prisma.destination.count();
  },

  findManySample(take: number) {
    return prisma.destination.findMany({ take, include: includeCategory });
  },

  findAll() {
    return prisma.destination.findMany({ include: includeCategory });
  },
};
