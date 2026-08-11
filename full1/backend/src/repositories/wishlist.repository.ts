import { prisma } from '../config/db';

const includeDestination = {
  destination: { include: { category: true } },
} as const;

export const wishlistRepository = {
  findAllByUser(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      include: includeDestination,
      orderBy: { createdAt: 'desc' },
    });
  },

  findOne(userId: string, destinationId: string) {
    return prisma.wishlist.findUnique({
      where: { userId_destinationId: { userId, destinationId } },
    });
  },

  findById(id: string) {
    return prisma.wishlist.findUnique({ where: { id }, include: includeDestination });
  },

  create(userId: string, destinationId: string) {
    return prisma.wishlist.create({
      data: { userId, destinationId },
      include: includeDestination,
    });
  },

  deleteById(id: string) {
    return prisma.wishlist.delete({ where: { id } });
  },

  deleteByUserAndDestination(userId: string, destinationId: string) {
    return prisma.wishlist.deleteMany({ where: { userId, destinationId } });
  },
};
