import { reviewRepository } from '../repositories/review.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, type PaginationMeta } from '../utils/ApiResponse';
import { parsePaginationQuery } from '../utils/pagination';

export interface ReviewDTO {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: Date;
  likesCount: number;
  likedByMe: boolean;
  reportedByMe: boolean;
  author: { id: string; name: string; avatar: string | null };
}

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: Date;
  user: { id: string; name: string; avatar: string | null };
  _count?: { likes: number };
  likes?: Array<{ id: string }>;
  reports?: Array<{ id: string }>;
};

function toReviewDTO(review: ReviewRow): ReviewDTO {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    images: review.images ?? [],
    createdAt: review.createdAt,
    likesCount: review._count?.likes ?? 0,
    likedByMe: Array.isArray(review.likes) && review.likes.length > 0,
    reportedByMe: Array.isArray(review.reports) && review.reports.length > 0,
    author: review.user,
  };
}

async function syncDestinationRating(destinationId: string): Promise<void> {
  const aggregate = await reviewRepository.aggregateForDestination(destinationId);
  const count = aggregate._count.rating;
  if (count === 0) {
    // No real reviews left - keep the destination's curated rating/review
    // count instead of zeroing it out (zeroing wiped the seeded aggregate
    // whenever the last review was deleted).
    return;
  }
  await destinationRepository.updateRatingAggregate(
    destinationId,
    Number((aggregate._avg.rating ?? 0).toFixed(1)),
    count,
  );
}

export const reviewService = {
  async listByDestination(
    destinationId: string,
    query: { page?: string; limit?: string },
    userId?: string,
  ): Promise<{ items: ReviewDTO[]; meta: PaginationMeta; stats: ReviewStats }> {
    const destination = await destinationRepository.findByIdOrSlug(destinationId);
    if (!destination) {
      throw ApiError.notFound('Destination not found');
    }

    const pagination = parsePaginationQuery(query, { defaultLimit: 10, maxLimit: 50 });
    const [rows, total, distribution, withImages] = await Promise.all([
      reviewRepository.findByDestination(destinationId, pagination.skip, pagination.limit, userId),
      reviewRepository.countByDestination(destinationId),
      reviewRepository.ratingDistribution(destinationId),
      reviewRepository.countWithImages(destinationId),
    ]);

    const counts = new Map<number, number>(distribution.map((row) => [row.rating, row._count._all]));

    return {
      items: rows.map(toReviewDTO),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
      stats: {
        average: Number((destination.rating ?? 0).toFixed(1)),
        total: total || destination.reviewsCount,
        withImages,
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: counts.get(star) ?? 0,
        })),
      },
    };
  },

  async statsForDestination(destinationId: string): Promise<ReviewStats> {
    const destination = await destinationRepository.findByIdOrSlug(destinationId);
    if (!destination) {
      throw ApiError.notFound('Destination not found');
    }
    const [total, distribution, withImages] = await Promise.all([
      reviewRepository.countByDestination(destinationId),
      reviewRepository.ratingDistribution(destinationId),
      reviewRepository.countWithImages(destinationId),
    ]);
    const counts = new Map<number, number>(distribution.map((row) => [row.rating, row._count._all]));
    return {
      average: Number((destination.rating ?? 0).toFixed(1)),
      total: total || destination.reviewsCount,
      withImages,
      distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: counts.get(star) ?? 0 })),
    };
  },

  async create(
    userId: string,
    destinationId: string,
    rating: number,
    comment: string,
    images: string[],
  ): Promise<ReviewDTO> {
    const destination = await destinationRepository.findById(destinationId);
    if (!destination) {
      throw ApiError.notFound('Destination not found');
    }

    const existing = await reviewRepository.findOne(userId, destinationId);
    if (existing) {
      throw ApiError.conflict('You have already reviewed this destination');
    }

    const created = await reviewRepository.create(userId, destinationId, rating, comment, images.slice(0, 6));
    await syncDestinationRating(destinationId);

    return toReviewDTO({ ...created, likes: [], reports: [] });
  },

  async remove(userId: string, reviewId: string, userRole: 'USER' | 'ADMIN'): Promise<void> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw ApiError.notFound('Review not found');
    }
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw ApiError.forbidden('You cannot delete another user\u2019s review');
    }

    await reviewRepository.deleteById(reviewId);
    await syncDestinationRating(review.destinationId);
  },

  async update(
    userId: string,
    reviewId: string,
    userRole: 'USER' | 'ADMIN',
    rating?: number,
    comment?: string,
    images?: string[],
  ): Promise<ReviewDTO> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw ApiError.notFound('Review not found');
    }
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw ApiError.forbidden('You cannot edit another user\u2019s review');
    }

    const updated = await reviewRepository.updateById(
      reviewId,
      rating,
      comment,
      images !== undefined ? images.slice(0, 6) : undefined,
    );
    await syncDestinationRating(review.destinationId);
    return toReviewDTO({ ...updated, likes: [], reports: [] });
  },

  async toggleLike(userId: string, reviewId: string): Promise<{ liked: boolean; likesCount: number }> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    const existing = await reviewRepository.findLike(reviewId, userId);
    if (existing) {
      await reviewRepository.removeLike(reviewId, userId);
      return { liked: false, likesCount: await reviewRepository.countLikes(reviewId) };
    }
    await reviewRepository.addLike(reviewId, userId);
    return { liked: true, likesCount: await reviewRepository.countLikes(reviewId) };
  },

  async report(userId: string, reviewId: string, reason: string): Promise<void> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw ApiError.notFound('Review not found');
    }
    if (review.userId === userId) {
      throw ApiError.badRequest('You cannot report your own review');
    }

    const existing = await reviewRepository.findReport(reviewId, userId);
    if (existing) {
      throw ApiError.conflict('You have already reported this review');
    }

    await reviewRepository.createReport(reviewId, userId, reason.slice(0, 500));
  },
};

export interface ReviewStats {
  average: number;
  total: number;
  withImages: number;
  distribution: Array<{ star: number; count: number }>;
}
