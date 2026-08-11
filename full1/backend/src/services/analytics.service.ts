import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function revenueBetween(from: Date, to: Date): Promise<number> {
  const aggregate = await prisma.booking.aggregate({
    where: { paymentStatus: 'PAID', paidAt: { gte: from, lt: to } },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

async function countBetween(model: 'booking' | 'user' | 'review' | 'searchLog' | 'aiUsageLog', from: Date, to: Date): Promise<number> {
  const createdAt = { gte: from, lt: to };
  switch (model) {
    case 'booking':
      return prisma.booking.count({ where: { createdAt } });
    case 'user':
      return prisma.user.count({ where: { createdAt } });
    case 'review':
      return prisma.review.count({ where: { createdAt } });
    case 'searchLog':
      return prisma.searchLog.count({ where: { createdAt } });
    case 'aiUsageLog':
      return prisma.aiUsageLog.count({ where: { createdAt } });
  }
}

export const analyticsService = {
  async overview() {
    const [revenue, paidBookings, bookings, users, aiUsage, searches, reviews, avgRating] = await Promise.all([
      prisma.booking.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { amount: true } }),
      prisma.booking.count({ where: { paymentStatus: 'PAID' } }),
      prisma.booking.count(),
      prisma.user.count(),
      prisma.aiUsageLog.count(),
      prisma.searchLog.count(),
      prisma.review.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);
    return {
      revenue: revenue._sum.amount ?? 0,
      paidBookings,
      bookings,
      users,
      aiUsage,
      searches,
      reviews,
      averageRating: Number((avgRating._avg.rating ?? 0).toFixed(1)),
    };
  },

  async bookingGrowth(months: number) {
    const count = Math.min(24, Math.max(2, Math.floor(months ?? 6)));
    const end = addMonths(startOfMonth(new Date()), 1);

    const buckets: Array<{ month: string; bookings: number; revenue: number }> = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const from = addMonths(end, -i - 1);
      const to = addMonths(end, -i);
      const [bookings, revenue] = await Promise.all([
        countBetween('booking', from, to),
        revenueBetween(from, to),
      ]);
      buckets.push({ month: monthKey(from), bookings, revenue });
    }
    return buckets;
  },

  async popularDestinations(limit: number) {
    const take = Math.min(20, Math.max(1, Math.floor(limit ?? 6)));
    const rows = await prisma.destination.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        rating: true,
        reviewsCount: true,
        category: { select: { name: true } },
        _count: { select: { bookings: true } },
        bookings: { where: { paymentStatus: 'PAID' }, select: { amount: true } },
      },
      orderBy: { popularityScore: 'desc' },
      take: 100,
    });

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.image,
        category: row.category.name,
        rating: row.rating,
        reviewsCount: row.reviewsCount,
        bookings: row._count.bookings,
        revenue: row.bookings.reduce((sum, booking) => sum + (booking.amount ?? 0), 0),
      }))
      .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue)
      .slice(0, take);
  },

  async trending(limit: number) {
    const take = Math.min(20, Math.max(1, Math.floor(limit ?? 6)));
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.destination.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        rating: true,
        category: { select: { name: true } },
        _count: { select: { bookings: { where: { createdAt: { gte: since } } }, reviews: { where: { createdAt: { gte: since } } } } },
      },
      orderBy: { popularityScore: 'desc' },
      take,
    });

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.image,
        category: row.category.name,
        rating: row.rating,
        bookings30d: row._count.bookings,
        reviews30d: row._count.reviews,
        score: row._count.bookings * 5 + row._count.reviews * 2,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, take);
  },

  async topSearches(limit: number) {
    const take = Math.min(20, Math.max(1, Math.floor(limit ?? 10)));
    const rows = await prisma.searchLog.groupBy({
      by: ['query'],
      _count: { _all: true },
    });
    return rows
      .map((row) => ({ query: row.query, count: row._count?._all ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, take);
  },

  async aiUsage(days: number) {
    const range = Math.min(90, Math.max(1, Math.floor(days ?? 14)));
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);

    const [rows, byType] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
    ]);

    const byTypeSorted = byType
      .map((row) => ({ type: row.type, count: row._count?._all ?? 0 }))
      .sort((a, b) => b.count - a.count);

    const perDay = new Map<string, number>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      perDay.set(key, (perDay.get(key) ?? 0) + (row._count?._all ?? 0));
    }

    const series: Array<{ date: string; count: number }> = [];
    for (let i = range - 1; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      series.push({ date, count: perDay.get(date) ?? 0 });
    }

    return {
      total: byTypeSorted.reduce((sum, row) => sum + row.count, 0),
      byType: byTypeSorted,
      series,
    };
  },

  async destinationPerformance() {
    const rows = await prisma.destination.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        region: true,
        rating: true,
        reviewsCount: true,
        popularityScore: true,
        category: { select: { name: true } },
        _count: { select: { bookings: true } },
        bookings: { where: { paymentStatus: 'PAID' }, select: { amount: true } },
      },
      take: 200,
    });

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.image,
        region: row.region,
        category: row.category.name,
        rating: row.rating,
        reviewsCount: row.reviewsCount,
        popularityScore: row.popularityScore,
        bookings: row._count.bookings,
        revenue: row.bookings.reduce((sum, booking) => sum + (booking.amount ?? 0), 0),
      }))
      .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue || b.rating - a.rating)
      .slice(0, 50);
  },

  async monthlyReport(month?: string) {
    const parsed = /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')
      ? new Date(`${month}-01T00:00:00Z`)
      : new Date();
    if (Number.isNaN(parsed.getTime())) throw ApiError.badRequest('Invalid month format (expected YYYY-MM)');

    const from = startOfMonth(parsed);
    const to = addMonths(from, 1);
    const previousFrom = addMonths(from, -1);

    const [revenue, bookings, newUsers, newReviews, newSearches, aiUsage, top, previousRevenue] =
      await Promise.all([
        revenueBetween(from, to),
        countBetween('booking', from, to),
        countBetween('user', from, to),
        countBetween('review', from, to),
        countBetween('searchLog', from, to),
        countBetween('aiUsageLog', from, to),
        prisma.booking.findMany({
          where: { createdAt: { gte: from, lt: to } },
          include: {
            destination: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        revenueBetween(previousFrom, from),
      ]);

    const destinationBookings = new Map<string, { name: string; slug: string; bookings: number; revenue: number }>();
    for (const booking of top) {
      const entry = destinationBookings.get(booking.destination.id) ?? {
        name: booking.destination.name,
        slug: booking.destination.slug,
        bookings: 0,
        revenue: 0,
      };
      entry.bookings += 1;
      if (booking.paymentStatus === 'PAID') entry.revenue += booking.amount ?? 0;
      destinationBookings.set(booking.destination.id, entry);
    }

    return {
      month: monthKey(from),
      revenue,
      bookings,
      newUsers,
      newReviews,
      newSearches,
      aiUsage,
      previousMonthRevenue: previousRevenue,
      growthPct:
        previousRevenue > 0 ? Number((((revenue - previousRevenue) / previousRevenue) * 100).toFixed(1)) : null,
      topDestinations: [...destinationBookings.entries()]
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5),
      bookingsList: top,
    };
  },
};
