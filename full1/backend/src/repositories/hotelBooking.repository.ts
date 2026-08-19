import { prisma } from '../config/db';
import type { HotelBookingStatus } from '@prisma/client';

export type HotelBookingInclude = {
  hotel: { select: { id: true; name: true; slug: true; image: true; location: true; latitude: true; longitude: true } };
  room: { select: { id: true; name: true; bedType: true; maxGuests: true; images: true } };
};

const includeBooking = {
  hotel: { select: { id: true, name: true, slug: true, image: true, location: true, latitude: true, longitude: true } },
  room: { select: { id: true, name: true, bedType: true, maxGuests: true, images: true } },
} satisfies HotelBookingInclude;

export const hotelBookingRepository = {
  countAll() {
    return prisma.hotelBooking.count();
  },

  countPending() {
    return prisma.hotelBooking.count({ where: { status: 'PENDING' } });
  },

  create(data: {
    bookingId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    rooms: number;
    nights: number;
    pricePerNight: number;
    taxes: number;
    amount: number;
    fullName: string;
    email: string;
    phone: string;
    specialRequests?: string;
    userId: string;
    hotelId: string;
    roomId: string;
  }) {
    return prisma.hotelBooking.create({ data, include: includeBooking });
  },

  findById(id: string) {
    return prisma.hotelBooking.findUnique({ where: { id }, include: includeBooking });
  },

  findByBookingId(bookingId: string) {
    return prisma.hotelBooking.findUnique({ where: { bookingId }, include: includeBooking });
  },

  findManyByUser(userId: string, orderBy: { checkIn?: 'asc' | 'desc' } = { checkIn: 'desc' }) {
    return prisma.hotelBooking.findMany({
      where: { userId },
      orderBy,
      include: includeBooking,
    });
  },

  findDuplicate(userId: string, hotelId: string, checkIn: Date, checkOut: Date) {
    return prisma.hotelBooking.findFirst({
      where: {
        userId,
        hotelId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkIn: { lte: checkOut },
        checkOut: { gte: checkIn },
      },
    });
  },

  updateStatus(id: string, status: HotelBookingStatus) {
    return prisma.hotelBooking.update({
      where: { id },
      data: { status },
      include: includeBooking,
    });
  },

  updatePayment(id: string, data: {
    paymentId?: string;
    orderId?: string;
    paidAt?: Date | null;
    paymentMethod?: string;
    paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  }) {
    return prisma.hotelBooking.update({ where: { id }, data, include: includeBooking });
  },

  adminList(params: { skip: number; take: number; status?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (params.status && params.status !== 'ALL') where.status = params.status;
    if (params.search) {
      where.OR = [
        { bookingId: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return prisma.hotelBooking.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        ...includeBooking,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  adminCount(params: { status?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (params.status && params.status !== 'ALL') where.status = params.status;
    if (params.search) {
      where.OR = [
        { bookingId: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return prisma.hotelBooking.count({ where });
  },
};
