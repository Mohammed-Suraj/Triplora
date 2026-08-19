import { prisma } from '../config/db';
import type { ReportStatus } from '@prisma/client';

const includeAuthor = {
  user: { select: { id: true, name: true, avatar: true } },
} as const;

export const reviewRepository = {
  findByDestination(destinationId: string, skip: number, take: number, userId?: string) {
    return prisma.review.findMany({
      where: { destinationId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true } },
        ...(userId ? { likes: { where: { userId }, select: { id: true } }, reports: { where: { userId }, select: { id: true } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countByDestination(destinationId: string) {
    return prisma.review.count({ where: { destinationId } });
  },

  findOne(userId: string, destinationId: string) {
    return prisma.review.findUnique({
      where: { userId_destinationId: { userId, destinationId } },
    });
  },

  findById(id: string) {
    return prisma.review.findUnique({ where: { id } });
  },

  create(userId: string, destinationId: string, rating: number, comment: string, images: string[]) {
    return prisma.review.create({
      data: { userId, destinationId, rating, comment, images },
      include: { ...includeAuthor, _count: { select: { likes: true } } },
    });
  },

  deleteById(id: string) {
    return prisma.review.delete({ where: { id } });
  },

  updateById(id: string, rating?: number, comment?: string, images?: string[]) {
    return prisma.review.update({
      where: { id },
      data: {
        ...(rating !== undefined ? { rating } : {}),
        ...(comment !== undefined ? { comment } : {}),
        ...(images !== undefined ? { images } : {}),
      },
      include: { ...includeAuthor, _count: { select: { likes: true } } },
    });
  },

  aggregateForDestination(destinationId: string) {
    return prisma.review.aggregate({
      where: { destinationId },
      _avg: { rating: true },
      _count: { rating: true },
    });
  },

  ratingDistribution(destinationId: string) {
    return prisma.review.groupBy({
      by: ['rating'],
      where: { destinationId },
      _count: { _all: true },
    });
  },

  countWithImages(destinationId: string) {
    return prisma.review.count({ where: { destinationId, images: { isEmpty: false } } });
  },

  findLike(reviewId: string, userId: string) {
    return prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
  },

  addLike(reviewId: string, userId: string) {
    return prisma.reviewLike.create({ data: { reviewId, userId } });
  },

  removeLike(reviewId: string, userId: string) {
    return prisma.reviewLike.delete({
      where: { reviewId_userId: { reviewId, userId } },
    });
  },

  countLikes(reviewId: string) {
    return prisma.reviewLike.count({ where: { reviewId } });
  },

  findReport(reviewId: string, userId: string) {
    return prisma.reviewReport.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
  },

  createReport(reviewId: string, userId: string, reason: string) {
    return prisma.reviewReport.create({ data: { reviewId, userId, reason } });
  },

  listReports(skip: number, take: number, status?: ReportStatus) {
    return prisma.reviewReport.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        review: {
          include: {
            user: { select: { id: true, name: true } },
            destination: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  countReports(status?: ReportStatus) {
    return prisma.reviewReport.count({ where: status ? { status } : undefined });
  },

  updateReportStatus(id: string, status: ReportStatus) {
    return prisma.reviewReport.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        review: {
          include: {
            user: { select: { id: true, name: true } },
            destination: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  },

  findReportById(id: string) {
    return prisma.reviewReport.findUnique({ where: { id } });
  },
};
