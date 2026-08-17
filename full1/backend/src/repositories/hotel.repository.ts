import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export interface HotelFilters {
  query?: string;
  destinationId?: string;
  hotelType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  familyFriendly?: boolean;
  coupleFriendly?: boolean;
  freeBreakfast?: boolean;
  freeWiFi?: boolean;
  swimmingPool?: boolean;
  parking?: boolean;
  airConditioning?: boolean;
  includeInactive?: boolean;
}

const includeHotel = {
  destination: { select: { id: true, name: true, slug: true, region: true } },
} satisfies Prisma.HotelInclude;

const includeHotelDetail = {
  destination: { select: { id: true, name: true, slug: true, region: true } },
  rooms: { orderBy: { pricePerNight: 'asc' } },
} satisfies Prisma.HotelInclude;

export const hotelRepository = {
  buildWhere(filters: HotelFilters): Prisma.HotelWhereInput {
    const where: Prisma.HotelWhereInput = filters.includeInactive ? {} : { isActive: true };

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { tagline: { contains: filters.query, mode: 'insensitive' } },
        { location: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { destination: { name: { contains: filters.query, mode: 'insensitive' } } },
      ];
    }

    if (filters.destinationId) {
      where.destinationId = filters.destinationId;
    }

    if (filters.hotelType && filters.hotelType !== 'ALL') {
      where.hotelType = filters.hotelType as Prisma.HotelWhereInput['hotelType'];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.priceFrom = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }

    if (filters.minRating !== undefined) {
      where.rating = { gte: filters.minRating };
    }

    const flags: Array<keyof HotelFilters> = [
      'familyFriendly',
      'coupleFriendly',
      'freeBreakfast',
      'freeWiFi',
      'swimmingPool',
      'parking',
      'airConditioning',
    ];
    for (const flag of flags) {
      if (filters[flag]) {
        where[flag as 'familyFriendly'] = true;
      }
    }

    return where;
  },

  findMany(params: {
    where: Prisma.HotelWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.HotelOrderByWithRelationInput | Prisma.HotelOrderByWithRelationInput[];
  }) {
    return prisma.hotel.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      include: includeHotel,
    });
  },

  count(where: Prisma.HotelWhereInput) {
    return prisma.hotel.count({ where });
  },

  findByIdOrSlug(idOrSlug: string) {
    return prisma.hotel.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: includeHotelDetail,
    });
  },

  findById(id: string) {
    return prisma.hotel.findUnique({ where: { id }, include: includeHotelDetail });
  },

  findBySlug(slug: string) {
    return prisma.hotel.findUnique({ where: { slug }, include: includeHotelDetail });
  },

  findSimilar(hotel: { id: string; destinationId: string }, excludeId: string, take: number) {
    return prisma.hotel.findMany({
      where: {
        isActive: true,
        destinationId: hotel.destinationId,
        id: { not: excludeId },
      },
      orderBy: [{ popularityScore: 'desc' }, { rating: 'desc' }],
      take,
      include: includeHotel,
    });
  },

  create(data: Prisma.HotelCreateInput) {
    return prisma.hotel.create({ data, include: includeHotelDetail });
  },

  update(id: string, data: Prisma.HotelUpdateInput) {
    return prisma.hotel.update({ where: { id }, data, include: includeHotelDetail });
  },

  remove(id: string) {
    return prisma.hotel.delete({ where: { id } });
  },

  updateRatingAggregate(hotelId: string, rating: number, reviewsCount: number) {
    return prisma.hotel.update({
      where: { id: hotelId },
      data: { rating, reviewsCount },
    });
  },

  // ---- Rooms ----
  createRoom(hotelId: string, data: {
    name: string;
    description?: string;
    pricePerNight: number;
    maxGuests: number;
    bedType: string;
    totalRooms: number;
    amenities: string[];
    images: string[];
  }) {
    return prisma.hotelRoom.create({
      data: { ...data, hotel: { connect: { id: hotelId } } },
    });
  },

  updateRoom(roomId: string, data: Prisma.HotelRoomUpdateInput) {
    return prisma.hotelRoom.update({ where: { id: roomId }, data });
  },

  removeRoom(roomId: string) {
    return prisma.hotelRoom.delete({ where: { id: roomId } });
  },

  findRoomById(roomId: string) {
    return prisma.hotelRoom.findUnique({ where: { id: roomId } });
  },
};
