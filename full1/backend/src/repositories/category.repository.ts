import { prisma } from '../config/db';

export const categoryRepository = {
  findAll() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },

  findByName(name: string) {
    return prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  },
};
