import { prisma } from '../config/db';
import type { BookingStatus, ContactStatus, EmailStatus, EmailType, PaymentStatus, Prisma, Role } from '@prisma/client';

export const adminRepository = {
  getStats() {
    return Promise.all([
      prisma.user.count(),
      prisma.destination.count(),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.review.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.contactMessage.count(),
    ]);
  },

  listUsers(skip: number, take: number) {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: { select: { bookings: true, reviews: true, wishlists: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countUsers() {
    return prisma.user.count();
  },

  listDestinations(skip: number, take: number) {
    return prisma.destination.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countDestinations() {
    return prisma.destination.count();
  },

  listBookings(skip: number, take: number, status?: BookingStatus, paymentStatus?: PaymentStatus) {
    return prisma.booking.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      include: {
        destination: { select: { id: true, name: true, slug: true, image: true, region: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countBookings(status?: BookingStatus, paymentStatus?: PaymentStatus) {
    return prisma.booking.count({
      where: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
    });
  },

  updateBookingStatus(id: string, status: BookingStatus) {
    return prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        destination: { select: { id: true, name: true, slug: true, image: true, region: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  findBookingById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  },

  listReviews(skip: number, take: number) {
    return prisma.review.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        destination: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countReviews() {
    return prisma.review.count();
  },

  deleteReview(id: string) {
    return prisma.review.delete({ where: { id } });
  },

  listContactMessages(skip: number, take: number, status?: ContactStatus) {
    return prisma.contactMessage.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countContactMessages(status?: ContactStatus) {
    return prisma.contactMessage.count({ where: status ? { status } : undefined });
  },

  updateContactStatus(id: string, status: ContactStatus) {
    return prisma.contactMessage.update({ where: { id }, data: { status } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  updateUserRole(id: string, role: Role) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  findDestinationById(id: string) {
    return prisma.destination.findUnique({ where: { id } });
  },

  updateDestination(id: string, data: Prisma.DestinationUpdateInput) {
    return prisma.destination.update({ where: { id }, data, include: { category: true } });
  },

  deleteDestination(id: string) {
    return prisma.destination.delete({ where: { id } });
  },

  deleteBooking(id: string) {
    return prisma.booking.delete({ where: { id } });
  },

  deleteContactMessage(id: string) {
    return prisma.contactMessage.delete({ where: { id } });
  },

  countEmailLogs(type?: EmailType, status?: EmailStatus) {
    return prisma.emailLog.count({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
    });
  },

  listEmailLogs(skip: number, take: number, type?: EmailType, status?: EmailStatus) {
    return prisma.emailLog.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },
};
