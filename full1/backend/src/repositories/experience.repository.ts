import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export interface ExperienceFilters {
  query?: string;
  category?: string;
  city?: string;
  difficulty?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  includeInactive?: boolean;
}

export const experienceRepository = {
  buildWhere(filters: ExperienceFilters): Prisma.ExperienceWhereInput {
    const where: Prisma.ExperienceWhereInput = filters.includeInactive ? {} : { isActive: true };

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { tagline: { contains: filters.query, mode: 'insensitive' } },
        { location: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { city: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.category && filters.category !== 'ALL') {
      where.category = filters.category as Prisma.ExperienceWhereInput['category'];
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      where.difficulty = filters.difficulty as Prisma.ExperienceWhereInput['difficulty'];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }

    if (filters.minRating !== undefined) {
      where.rating = { gte: filters.minRating };
    }

    return where;
  },

  findMany(params: {
    where: Prisma.ExperienceWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.ExperienceOrderByWithRelationInput | Prisma.ExperienceOrderByWithRelationInput[];
  }) {
    return prisma.experience.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
  },

  count(where: Prisma.ExperienceWhereInput) {
    return prisma.experience.count({ where });
  },

  findByIdOrSlug(idOrSlug: string) {
    return prisma.experience.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
  },

  findById(id: string) {
    return prisma.experience.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.experience.findUnique({ where: { slug } });
  },

  findSimilar(experience: { id: string; category: string }, excludeId: string, take: number) {
    return prisma.experience.findMany({
      where: {
        isActive: true,
        category: experience.category as Prisma.ExperienceWhereInput['category'],
        id: { not: excludeId },
      },
      orderBy: [{ rating: 'desc' }, { popularityScore: 'desc' }],
      take,
    });
  },

  create(data: Prisma.ExperienceCreateInput) {
    return prisma.experience.create({ data });
  },

  update(id: string, data: Prisma.ExperienceUpdateInput) {
    return prisma.experience.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.experience.delete({ where: { id } });
  },
};
