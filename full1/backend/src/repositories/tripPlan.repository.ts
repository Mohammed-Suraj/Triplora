import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const includeItinerary = {
  itinerary: {
    include: { destination: { include: { category: true } } },
    orderBy: { day: 'asc' },
  },
} satisfies Prisma.TripPlanInclude;

export const tripPlanRepository = {
  findAllByUser(userId: string) {
    return prisma.tripPlan.findMany({
      where: { userId },
      include: includeItinerary,
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.tripPlan.findUnique({
      where: { id },
      include: includeItinerary,
    });
  },

  createWithItinerary(params: {
    userId: string;
    title?: string;
    budget: Prisma.TripPlanCreateInput['budget'];
    days: number;
    travelStyle: Prisma.TripPlanCreateInput['travelStyle'];
    interests: string[];
    itinerary: Array<{ day: number; focus: string; destinationId: string }>;
    payload?: Prisma.InputJsonValue;
  }) {
    return prisma.tripPlan.create({
      data: {
        user: { connect: { id: params.userId } },
        title: params.title,
        budget: params.budget,
        days: params.days,
        travelStyle: params.travelStyle,
        interests: params.interests,
        payload: params.payload,
        itinerary: {
          create: params.itinerary.map((item) => ({
            day: item.day,
            focus: item.focus,
            destination: { connect: { id: item.destinationId } },
          })),
        },
      },
      include: includeItinerary,
    });
  },

  updateTitle(id: string, title: string) {
    return prisma.tripPlan.update({
      where: { id },
      data: { title },
      include: includeItinerary,
    });
  },

  /**
   * Replaces the itinerary rows (destinations only) and the AI payload after a
   * chat edit. Custom destinations without a DB record are kept only in the
   * payload (itinerary rows keep the real destination relations).
   */
  replaceItineraryAndPayload(params: {
    id: string;
    payload: Prisma.InputJsonValue;
    days: number;
    itinerary: Array<{ day: number; focus: string; destinationId: string }>;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.itinerary.deleteMany({ where: { tripPlanId: params.id } });
      return tx.tripPlan.update({
        where: { id: params.id },
        data: {
          payload: params.payload,
          days: params.days,
          itinerary: {
            create: params.itinerary.map((item) => ({
              day: item.day,
              focus: item.focus,
              destination: { connect: { id: item.destinationId } },
            })),
          },
        },
        include: includeItinerary,
      });
    });
  },

  deleteById(id: string) {
    return prisma.tripPlan.delete({ where: { id } });
  },
};