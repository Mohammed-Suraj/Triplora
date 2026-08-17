import { prisma } from '../config/db';

export interface HotelReviewRow {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  stayDate: Date | null;
  createdAt: Date;
  user: { id: string; name: string; avatar: string | null };
}

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  images: true,
  stayDate: true,
  createdAt: true,
  user: { select: { id: true, name: true, avatar: true } },
} as const;

export const hotelReviewRepository = {
  findByHotel(hotelId: string, skip: number, take: number) {
    return prisma.hotelReview.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: reviewSelect,
    }) as unknown as HotelReviewRow[];
  },

  countByHotel(hotelId: string) {
    return prisma.hotelReview.count({ where: { hotelId } });
  },

  ratingDistribution(hotelId: string) {
    return prisma.hotelReview.groupBy({
      by: ['rating'],
      where: { hotelId },
      _count: { _all: true },
    });
  },

  countWithImages(hotelId: string) {
    return prisma.hotelReview.count({ where: { hotelId, images: { isEmpty: false } } });
  },

  aggregateForHotel(hotelId: string) {
    return prisma.hotelReview.aggregate({
      where: { hotelId },
      _avg: { rating: true },
      _count: { rating: true },
    });
  },

  findOne(userId: string, hotelId: string) {
    return prisma.hotelReview.findUnique({
      where: { userId_hotelId: { userId, hotelId } },
    });
  },

  findById(id: string) {
    return prisma.hotelReview.findUnique({ where: { id } });
  },

  create(userId: string, hotelId: string, rating: number, comment: string, images: string[], stayDate?: Date | null) {
    return prisma.hotelReview.create({
      data: { userId, hotelId, rating, comment, images, stayDate: stayDate ?? null },
    });
  },

  updateById(id: string, rating?: number, comment?: string, images?: string[], stayDate?: Date | null) {
    return prisma.hotelReview.update({
      where: { id },
      data: {
        ...(rating !== undefined ? { rating } : {}),
        ...(comment !== undefined ? { comment } : {}),
        ...(images !== undefined ? { images } : {}),
        ...(stayDate !== undefined ? { stayDate } : {}),
      },
    });
  },

  deleteById(id: string) {
    return prisma.hotelReview.delete({ where: { id } });
  },
};
