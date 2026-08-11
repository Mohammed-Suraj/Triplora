import { prisma } from '../config/db';

export const contactRepository = {
  create(data: { name: string; email: string; phone?: string; subject?: string; message: string }) {
    return prisma.contactMessage.create({ data });
  },

  findAll(skip: number, take: number) {
    return prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  count() {
    return prisma.contactMessage.count();
  },
};
