import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export const plannerTripRepository = {
  findAllByUser(userId: string) {
    return prisma.plannerTrip.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.plannerTrip.findUnique({ where: { id } });
  },

  findByShareCode(shareCode: string) {
    return prisma.plannerTrip.findUnique({ where: { shareCode } });
  },

  create(params: {
    userId: string;
    title: string;
    startDate?: Date | null;
    days?: Prisma.InputJsonValue;
    packing?: Prisma.InputJsonValue;
    shareCode?: string;
  }) {
    return prisma.plannerTrip.create({
      data: {
        user: { connect: { id: params.userId } },
        title: params.title,
        startDate: params.startDate ?? null,
        days: params.days ?? '[]',
        packing: params.packing ?? '[]',
        shareCode: params.shareCode,
      },
    });
  },

  update(id: string, data: { title?: string; startDate?: Date | null; days?: Prisma.InputJsonValue; packing?: Prisma.InputJsonValue; shareCode?: string | null }) {
    return prisma.plannerTrip.update({
      where: { id },
      data,
    });
  },

  deleteById(id: string) {
    return prisma.plannerTrip.delete({ where: { id } });
  },
};
