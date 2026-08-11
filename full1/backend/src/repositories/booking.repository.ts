import { prisma } from '../config/db';
import type { BookingStatus } from '@prisma/client';

type BookingWhereInput = {
  userId?: string;
  status?: BookingStatus;
  destinationId?: string;
  travelDate?: Date;
};

type BookingOrderBy = {
  createdAt?: 'asc' | 'desc';
  travelDate?: 'asc' | 'desc';
  status?: 'asc' | 'desc';
};

export const bookingRepository = {
  findMany: (where: BookingWhereInput, orderBy: BookingOrderBy = { createdAt: 'desc' }) =>
    prisma.booking.findMany({
      where,
      orderBy,
      include: { destination: { select: { id: true, name: true, slug: true, image: true, region: true } } },
    }),

  findById: (id: string) =>
    prisma.booking.findUnique({
      where: { id },
      include: { destination: { select: { id: true, name: true, slug: true, image: true, region: true, priceFrom: true } } },
    }),

  findByBookingId: (bookingId: string) =>
    prisma.booking.findUnique({
      where: { bookingId },
      include: { destination: { select: { id: true, name: true, slug: true, image: true, region: true, priceFrom: true } } },
    }),

  findDuplicate: (userId: string, destinationId: string, travelDate: Date) =>
    prisma.booking.findFirst({
      where: { userId, destinationId, travelDate },
    }),

  create: (data: {
    bookingId: string;
    fullName: string;
    email: string;
    phone: string;
    numberOfTravelers: number;
    travelDate: Date;
    returnDate?: Date;
    budget: number;
    specialRequests?: string;
    userId: string;
    destinationId: string;
  }) =>
    prisma.booking.create({
      data,
      include: { destination: { select: { id: true, name: true, slug: true, image: true, region: true } } },
    }),

  updateStatus: (id: string, status: BookingStatus) =>
    prisma.booking.update({
      where: { id },
      data: { status },
      include: { destination: { select: { id: true, name: true, slug: true, image: true, region: true } } },
    }),
};
