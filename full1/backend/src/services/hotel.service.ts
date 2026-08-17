import { hotelRepository } from '../repositories/hotel.repository';
import { hotelBookingRepository } from '../repositories/hotelBooking.repository';
import { hotelReviewRepository } from '../repositories/hotelReview.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, type PaginationMeta } from '../utils/ApiResponse';
import { parsePaginationQuery } from '../utils/pagination';
import { emailService, prefsOf } from './email.service';
import { notificationService } from './notification.service';
import crypto from 'node:crypto';
import type { HotelBookingStatus, Prisma } from '@prisma/client';

const TAX_RATE = 0.18; // 18% GST on stay

export const HOTEL_SORTS = ['price', 'rating', 'best_value', 'popularity', 'nearest'] as const;
export type HotelSort = (typeof HOTEL_SORTS)[number];

export function generateHotelBookingId(): string {
  const prefix = 'HTL';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

type HotelDestination = { id: string; name: string; slug: string; region: string };

type HotelListItem = Prisma.HotelGetPayload<{
  include: { destination: { select: { id: true; name: true; slug: true; region: true } } };
}>;

export interface HotelDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  image: string;
  gallery: string[];
  starRating: number;
  rating: number;
  reviewsCount: number;
  popularityScore: number;
  priceFrom: number;
  hotelType: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  distanceFromAttraction: number;
  checkIn: string;
  checkOut: string;
  cancellationPolicy: string;
  amenities: string[];
  familyFriendly: boolean;
  coupleFriendly: boolean;
  freeBreakfast: boolean;
  freeWiFi: boolean;
  swimmingPool: boolean;
  parking: boolean;
  airConditioning: boolean;
  nearbyAttractions: string[];
  nearbyRestaurants: string[];
  nearbyTransport: string[];
  destination: HotelDestination;
  rooms?: Array<Record<string, unknown>>;
  isActive?: boolean;
}

export function toHotelDTO(hotel: HotelListItem & { rooms?: Array<Record<string, unknown>> }): HotelDTO {
  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    tagline: hotel.tagline,
    description: hotel.description,
    longDescription: hotel.longDescription,
    image: hotel.image,
    gallery: hotel.gallery,
    starRating: hotel.starRating,
    rating: hotel.rating,
    reviewsCount: hotel.reviewsCount,
    popularityScore: hotel.popularityScore,
    priceFrom: hotel.priceFrom,
    hotelType: hotel.hotelType,
    location: hotel.location,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    distanceFromAttraction: hotel.distanceFromAttraction,
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
    cancellationPolicy: hotel.cancellationPolicy,
    amenities: hotel.amenities,
    familyFriendly: hotel.familyFriendly,
    coupleFriendly: hotel.coupleFriendly,
    freeBreakfast: hotel.freeBreakfast,
    freeWiFi: hotel.freeWiFi,
    swimmingPool: hotel.swimmingPool,
    parking: hotel.parking,
    airConditioning: hotel.airConditioning,
    nearbyAttractions: hotel.nearbyAttractions,
    nearbyRestaurants: hotel.nearbyRestaurants,
    nearbyTransport: hotel.nearbyTransport,
    destination: hotel.destination
      ? { id: hotel.destination.id, name: hotel.destination.name, slug: hotel.destination.slug, region: hotel.destination.region }
      : { id: '', name: '', slug: '', region: '' },
    ...(hotel.rooms ? { rooms: hotel.rooms } : {}),
    ...('isActive' in hotel ? { isActive: hotel.isActive } : {}),
  };
}

interface ListQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  q?: string;
  destination?: string;
  hotelType?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  familyFriendly?: string;
  coupleFriendly?: string;
  freeBreakfast?: string;
  freeWiFi?: string;
  swimmingPool?: string;
  parking?: string;
  airConditioning?: string;
  all?: string;
  [key: string]: unknown;
}

function boolParam(value: unknown): boolean | undefined {
  return value === 'true' || value === '1' ? true : undefined;
}

function buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): Prisma.HotelOrderByWithRelationInput[] {
  if (sortBy === 'price') return [{ priceFrom: sortOrder }, { rating: 'desc' }];
  if (sortBy === 'rating') return [{ rating: 'desc' }, { reviewsCount: 'desc' }];
  if (sortBy === 'popularity') return [{ popularityScore: 'desc' }, { rating: 'desc' }];
  if (sortBy === 'nearest') return [{ distanceFromAttraction: 'asc' }, { rating: 'desc' }];
  return [{ priceFrom: 'asc' }, { rating: 'desc' }];
}

// Maps the UI's combined `sort` value (e.g. "price_asc", "recommended") onto
// the sortBy/sortOrder pair used by parsePaginationQuery.
function resolveSort(query: Record<string, unknown>): Record<string, unknown> {
  const combined = typeof query.sort === 'string' ? query.sort : undefined;
  if (!combined) return query;
  const map: Record<string, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
    recommended: { sortBy: 'popularity', sortOrder: 'desc' },
    popularity: { sortBy: 'popularity', sortOrder: 'desc' },
    best_value: { sortBy: 'best_value', sortOrder: 'desc' },
    nearest: { sortBy: 'nearest', sortOrder: 'asc' },
    rating: { sortBy: 'rating', sortOrder: 'desc' },
    price_asc: { sortBy: 'price', sortOrder: 'asc' },
    price_desc: { sortBy: 'price', sortOrder: 'desc' },
  };
  const resolved = map[combined];
  if (!resolved) return query;
  return { ...query, sortBy: resolved.sortBy, sortOrder: resolved.sortOrder };
}

export const hotelService = {
  async list(query: ListQuery): Promise<{ items: HotelDTO[]; meta: PaginationMeta }> {
    const pagination = parsePaginationQuery(resolveSort(query as Record<string, unknown>), {
      defaultLimit: 12,
      maxLimit: 50,
      defaultSortBy: 'popularity',
      allowedSortFields: [...HOTEL_SORTS],
    });

    const where = hotelRepository.buildWhere({
      query: typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined,
      destinationId: typeof query.destination === 'string' ? query.destination : undefined,
      hotelType: typeof query.hotelType === 'string' ? query.hotelType : undefined,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      minRating: query.minRating ? Number(query.minRating) : undefined,
      familyFriendly: boolParam(query.familyFriendly),
      coupleFriendly: boolParam(query.coupleFriendly),
      freeBreakfast: boolParam(query.freeBreakfast),
      freeWiFi: boolParam(query.freeWiFi),
      swimmingPool: boolParam(query.swimmingPool),
      parking: boolParam(query.parking),
      airConditioning: boolParam(query.airConditioning),
      includeInactive: query.all === 'true',
    });

    const total = await hotelRepository.count(where);

    let rows: HotelListItem[];
    if (pagination.sortBy === 'best_value') {
      // Best value = rating ÷ price per night; compute in memory (bounded set).
      const all = (await hotelRepository.findMany({ where, skip: 0, take: 1000, orderBy: { priceFrom: 'asc' } })) as HotelListItem[];
      rows = all
        .filter((h) => h.priceFrom > 0)
        .sort((a, b) => b.rating / b.priceFrom - a.rating / a.priceFrom)
        .slice(pagination.skip, pagination.skip + pagination.limit);
    } else {
      rows = (await hotelRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: buildOrderBy(pagination.sortBy, pagination.sortOrder),
      })) as HotelListItem[];
    }

    return {
      items: rows.map((h) => toHotelDTO(h)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },

  async byDestination(destinationIdOrSlug: string, query: ListQuery): Promise<{ items: HotelDTO[]; meta: PaginationMeta }> {
    const destination = await destinationRepository.findByIdOrSlug(destinationIdOrSlug);
    if (!destination) throw ApiError.notFound('Destination not found');
    return this.list({ ...query, destination: destination.id, limit: query.limit ?? '12' });
  },

  async getByIdOrSlug(idOrSlug: string): Promise<HotelDTO & { similar: HotelDTO[] }> {
    const hotel = await hotelRepository.findByIdOrSlug(idOrSlug);
    if (!hotel || !hotel.isActive) throw ApiError.notFound('Hotel not found');

    const similar = await hotelRepository.findSimilar(hotel, hotel.id, 4);

    return {
      ...toHotelDTO(hotel as HotelListItem & { rooms: Array<Record<string, unknown>> }),
      similar: similar.map((h) => toHotelDTO(h as HotelListItem)),
    };
  },

  // ---- Admin CRUD ----

  async create(input: Record<string, unknown>): Promise<HotelDTO> {
    const destinationId = String(input.destinationId);
    const destination = await destinationRepository.findById(destinationId);
    if (!destination) throw ApiError.notFound('Destination not found');

    const name = String(input.name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const created = await hotelRepository.create({
      slug,
      name,
      tagline: String(input.tagline ?? ''),
      description: String(input.description ?? ''),
      longDescription: String(input.longDescription ?? ''),
      image: String(input.image),
      gallery: Array.isArray(input.gallery) ? input.gallery.map(String) : [],
      starRating: Number(input.starRating ?? 3),
      priceFrom: Number(input.priceFrom ?? 0),
      hotelType: String(input.hotelType ?? 'HOTEL') as HotelListItem['hotelType'],
      location: String(input.location ?? ''),
      latitude: input.latitude ? Number(input.latitude) : null,
      longitude: input.longitude ? Number(input.longitude) : null,
      distanceFromAttraction: Number(input.distanceFromAttraction ?? 0),
      checkIn: String(input.checkIn ?? '2:00 PM'),
      checkOut: String(input.checkOut ?? '11:00 AM'),
      cancellationPolicy: String(input.cancellationPolicy ?? 'Free cancellation up to 48 hours before check-in'),
      amenities: Array.isArray(input.amenities) ? input.amenities.map(String) : [],
      familyFriendly: Boolean(input.familyFriendly),
      coupleFriendly: Boolean(input.coupleFriendly),
      freeBreakfast: Boolean(input.freeBreakfast),
      freeWiFi: input.freeWiFi !== false,
      swimmingPool: Boolean(input.swimmingPool),
      parking: Boolean(input.parking),
      airConditioning: Boolean(input.airConditioning),
      nearbyAttractions: Array.isArray(input.nearbyAttractions) ? input.nearbyAttractions.map(String) : [],
      nearbyRestaurants: Array.isArray(input.nearbyRestaurants) ? input.nearbyRestaurants.map(String) : [],
      nearbyTransport: Array.isArray(input.nearbyTransport) ? input.nearbyTransport.map(String) : [],
      destination: { connect: { id: destinationId } },
    });

    return toHotelDTO(created as HotelListItem & { rooms: Array<Record<string, unknown>> });
  },

  async update(id: string, input: Record<string, unknown>): Promise<HotelDTO> {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) throw ApiError.notFound('Hotel not found');

    const data: Prisma.HotelUpdateInput = {};
    const stringFields = [
      'name', 'tagline', 'description', 'longDescription', 'image', 'location',
      'checkIn', 'checkOut', 'cancellationPolicy', 'hotelType',
    ] as const;
    for (const field of stringFields) {
      if (input[field] !== undefined) data[field] = String(input[field]);
    }
    const numberFields = ['starRating', 'priceFrom', 'distanceFromAttraction', 'latitude', 'longitude'] as const;
    for (const field of numberFields) {
      if (input[field] !== undefined && input[field] !== null && input[field] !== '') {
        data[field] = Number(input[field]);
      } else if ((input[field] === null || input[field] === '') && (field === 'latitude' || field === 'longitude')) {
        data[field] = null;
      }
    }
    const arrayFields = ['gallery', 'amenities', 'nearbyAttractions', 'nearbyRestaurants', 'nearbyTransport'] as const;
    for (const field of arrayFields) {
      if (Array.isArray(input[field])) data[field] = input[field].map(String);
    }
    const boolFields = [
      'familyFriendly', 'coupleFriendly', 'freeBreakfast', 'freeWiFi',
      'swimmingPool', 'parking', 'airConditioning', 'isActive',
    ] as const;
    for (const field of boolFields) {
      if (typeof input[field] === 'boolean') data[field] = input[field];
    }
    if (input.destinationId) {
      const destination = await destinationRepository.findById(String(input.destinationId));
      if (!destination) throw ApiError.notFound('Destination not found');
      data.destination = { connect: { id: destination.id } };
    }

    const updated = await hotelRepository.update(id, data);
    return toHotelDTO(updated as HotelListItem & { rooms: Array<Record<string, unknown>> });
  },

  async remove(id: string): Promise<void> {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    await hotelRepository.remove(id);
  },

  // ---- Rooms ----

  async createRoom(hotelId: string, input: {
    name: string;
    description?: string;
    pricePerNight: number;
    maxGuests: number;
    bedType: string;
    totalRooms: number;
    amenities: string[];
    images: string[];
  }) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    return hotelRepository.createRoom(hotelId, input);
  },

  async updateRoom(roomId: string, input: Record<string, unknown>) {
    const room = await hotelRepository.findRoomById(roomId);
    if (!room) throw ApiError.notFound('Room not found');

    const data: Prisma.HotelRoomUpdateInput = {};
    if (input.name !== undefined) data.name = String(input.name);
    if (input.description !== undefined) data.description = String(input.description);
    if (input.bedType !== undefined) data.bedType = String(input.bedType);
    const numberFields = ['pricePerNight', 'maxGuests', 'totalRooms'] as const;
    for (const field of numberFields) {
      if (input[field] !== undefined && input[field] !== null && input[field] !== '') {
        data[field] = Number(input[field]);
      }
    }
    if (Array.isArray(input.amenities)) data.amenities = input.amenities.map(String);
    if (Array.isArray(input.images)) data.images = input.images.map(String);

    return hotelRepository.updateRoom(roomId, data);
  },

  async removeRoom(roomId: string): Promise<void> {
    const room = await hotelRepository.findRoomById(roomId);
    if (!room) throw ApiError.notFound('Room not found');
    await hotelRepository.removeRoom(roomId);
  },

  // ---- Bookings ----

  async createBooking(userId: string, input: {
    hotelId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
    fullName: string;
    email: string;
    phone: string;
    specialRequests?: string;
  }) {
    const hotel = await hotelRepository.findById(input.hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    if (!hotel.isActive) throw ApiError.badRequest('This hotel is not accepting bookings');

    const room = hotel.rooms.find((r) => r.id === input.roomId);
    if (!room) throw ApiError.notFound('Room not found for this hotel');

    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) throw ApiError.badRequest('Invalid stay dates');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) throw ApiError.badRequest('Check-in date cannot be in the past');

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
    if (nights <= 0) throw ApiError.badRequest('Check-out must be after check-in');
    if (nights > 30) throw ApiError.badRequest('Stays longer than 30 nights cannot be booked online');

    if (input.guests < 1 || input.guests > room.maxGuests * input.rooms) {
      throw ApiError.badRequest(`This room accommodates up to ${room.maxGuests} guest${room.maxGuests === 1 ? '' : 's'} per room`);
    }
    if (input.rooms < 1 || input.rooms > 10) throw ApiError.badRequest('Invalid number of rooms');

    const existing = await hotelBookingRepository.findDuplicate(userId, hotel.id, checkIn, checkOut);
    if (existing) {
      throw ApiError.conflict('You already have a stay at this hotel overlapping the selected dates');
    }

    // Availability: rooms of this type booked (non-cancelled) overlapping the range.
    const overlapping = await hotelBookingRepository.adminList({
      skip: 0,
      take: 500,
      status: 'ALL',
    });
    // Filter in memory: room type + overlapping range + not cancelled
    const bookedRooms = overlapping.reduce((sum, booking) => {
      if (
        booking.roomId === room.id &&
        booking.status !== 'CANCELLED' &&
        booking.checkIn < checkOut &&
        booking.checkOut > checkIn
      ) {
        return sum + booking.rooms;
      }
      return sum;
    }, 0);
    if (bookedRooms + input.rooms > room.totalRooms) {
      throw ApiError.conflict('Not enough rooms available for the selected dates');
    }

    const subtotal = room.pricePerNight * nights * input.rooms;
    const taxes = Math.round(subtotal * TAX_RATE);
    const amount = subtotal + taxes;

    const bookingId = generateHotelBookingId();
    const booking = await hotelBookingRepository.create({
      bookingId,
      checkIn,
      checkOut,
      guests: input.guests,
      rooms: input.rooms,
      nights,
      pricePerNight: room.pricePerNight,
      taxes,
      amount,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      specialRequests: input.specialRequests,
      userId,
      hotelId: hotel.id,
      roomId: room.id,
    });

    const user = await userRepository.findById(userId).catch(() => null);
    emailService.sendBookingConfirmationEmail(
      booking.email,
      {
        name: booking.fullName,
        bookingId: booking.bookingId,
        destinationName: `${booking.hotel.name} · ${booking.room.name}`,
        region: booking.hotel.location ?? 'Kerala',
        travelDate: booking.checkIn,
        returnDate: booking.checkOut,
        numberOfTravelers: booking.guests,
        fullName: booking.fullName,
        email: booking.email,
        phone: booking.phone,
        budget: booking.amount,
        currency: 'INR',
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        bookingUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/my-stays`,
      },
      user ? prefsOf(user) : null,
    );

    void notificationService.create(
      userId,
      'BOOKING_CONFIRMED',
      'Hotel stay confirmed',
      `Your stay at ${booking.hotel.name} (${booking.bookingId}) is confirmed for ${booking.nights} night${booking.nights === 1 ? '' : 's'}.`,
      '/my-stays',
    );

    return booking;
  },

  async listUserBookings(userId: string): Promise<{ upcoming: unknown[]; past: unknown[]; all: unknown[] }> {
    const all = await hotelBookingRepository.findManyByUser(userId);
    const now = new Date();
    const upcoming = all.filter((b) => b.status !== 'CANCELLED' && b.checkOut >= now);
    const past = all.filter((b) => b.checkOut < now || b.status === 'CANCELLED');
    return { upcoming, past, all };
  },

  async getBookingById(id: string, userId: string) {
    const booking = await hotelBookingRepository.findById(id);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== userId) throw ApiError.forbidden('Not authorized to view this booking');
    return booking;
  },

  async getBookingByBookingId(bookingId: string) {
    const booking = await hotelBookingRepository.findByBookingId(bookingId);
    if (!booking) throw ApiError.notFound('Booking not found');
    return booking;
  },

  async cancelBooking(id: string, userId: string) {
    const booking = await hotelBookingRepository.findById(id);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== userId) throw ApiError.forbidden('Not authorized to cancel this booking');
    if (booking.status === 'CANCELLED') throw ApiError.badRequest('Booking is already cancelled');
    if (booking.status === 'COMPLETED') throw ApiError.badRequest('Cannot cancel a completed stay');

    const updated = await hotelBookingRepository.updateStatus(id, 'CANCELLED');

    void notificationService.create(
      userId,
      'BOOKING_CANCELLED',
      'Hotel stay cancelled',
      `Your stay at ${updated.hotel.name} (${updated.bookingId}) has been cancelled.`,
      '/my-stays',
    );

    return updated;
  },

  async updateBookingStatus(id: string, status: HotelBookingStatus) {
    const booking = await hotelBookingRepository.findById(id);
    if (!booking) throw ApiError.notFound('Booking not found');
    return hotelBookingRepository.updateStatus(id, status);
  },

  async adminListBookings(query: { page?: string; limit?: string; status?: string; search?: string }) {
    const pagination = parsePaginationQuery(query, { defaultLimit: 15, maxLimit: 100 });
    const [rows, total] = await Promise.all([
      hotelBookingRepository.adminList({
        skip: pagination.skip,
        take: pagination.limit,
        status: query.status,
        search: query.search,
      }),
      hotelBookingRepository.adminCount({ status: query.status, search: query.search }),
    ]);
    return {
      items: rows,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  },

  // ---- Reviews ----

  async listReviews(
    hotelId: string,
    query: { page?: string; limit?: string },
  ): Promise<{ items: unknown[]; meta: PaginationMeta; stats: { average: number; total: number; withImages: number; distribution: Array<{ star: number; count: number }> } }> {
    const hotel = await hotelRepository.findByIdOrSlug(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    const hotelUuid = hotel.id;

    const pagination = parsePaginationQuery(query, { defaultLimit: 8, maxLimit: 50 });
    const [rows, total, distribution, withImages] = await Promise.all([
      hotelReviewRepository.findByHotel(hotelUuid, pagination.skip, pagination.limit),
      hotelReviewRepository.countByHotel(hotelUuid),
      hotelReviewRepository.ratingDistribution(hotelUuid),
      hotelReviewRepository.countWithImages(hotelUuid),
    ]);

    const counts = new Map<number, number>(distribution.map((row) => [row.rating, row._count._all]));

    return {
      items: rows,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
      stats: {
        average: Number((hotel.rating ?? 0).toFixed(1)),
        total: total || hotel.reviewsCount,
        withImages,
        distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: counts.get(star) ?? 0 })),
      },
    };
  },

  async createReview(userId: string, hotelId: string, rating: number, comment: string, images: string[], stayDate?: string | null) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');

    const existing = await hotelReviewRepository.findOne(userId, hotelId);
    if (existing) throw ApiError.conflict('You have already reviewed this hotel');

    const parsedStayDate = stayDate ? new Date(stayDate) : null;
    if (parsedStayDate && isNaN(parsedStayDate.getTime())) throw ApiError.badRequest('Invalid stay date');

    const created = await hotelReviewRepository.create(userId, hotelId, rating, comment, images.slice(0, 6), parsedStayDate);
    await this.syncHotelRating(hotelId);
    return created;
  },

  async updateReview(userId: string, reviewId: string, userRole: 'USER' | 'ADMIN', rating?: number, comment?: string, images?: string[], stayDate?: string | null) {
    const review = await hotelReviewRepository.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');
    if (review.userId !== userId && userRole !== 'ADMIN') throw ApiError.forbidden('You cannot edit another user\u2019s review');

    const parsedStayDate = stayDate !== undefined ? (stayDate ? new Date(stayDate) : null) : undefined;
    if (parsedStayDate && isNaN(parsedStayDate.getTime())) throw ApiError.badRequest('Invalid stay date');

    const updated = await hotelReviewRepository.updateById(
      reviewId,
      rating,
      comment,
      images !== undefined ? images.slice(0, 6) : undefined,
      parsedStayDate,
    );
    await this.syncHotelRating(review.hotelId);
    return updated;
  },

  async removeReview(userId: string, reviewId: string, userRole: 'USER' | 'ADMIN'): Promise<void> {
    const review = await hotelReviewRepository.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');
    if (review.userId !== userId && userRole !== 'ADMIN') throw ApiError.forbidden('You cannot delete another user\u2019s review');

    await hotelReviewRepository.deleteById(reviewId);
    await this.syncHotelRating(review.hotelId);
  },

  async syncHotelRating(hotelId: string): Promise<void> {
    const aggregate = await hotelReviewRepository.aggregateForHotel(hotelId);
    const count = aggregate._count.rating;
    if (count === 0) return; // keep curated rating instead of zeroing out
    await hotelRepository.updateRatingAggregate(hotelId, Number((aggregate._avg.rating ?? 0).toFixed(1)), count);
  },

  // ---- AI recommendation ----

  async recommend(query: { style?: string; destinationId?: string; limit?: number }): Promise<HotelDTO[]> {
    const style = query.style ?? 'budget';
    const limit = Math.min(Math.max(query.limit ?? 4, 1), 8);

    const baseWhere = hotelRepository.buildWhere({
      destinationId: query.destinationId,
    });

    const all = (await hotelRepository.findMany({
      where: baseWhere,
      skip: 0,
      take: 200,
      orderBy: [{ popularityScore: 'desc' }, { rating: 'desc' }],
    })) as HotelListItem[];

    const scored = all
      .map((hotel) => ({ hotel, score: this.styleScore(hotel, style) }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ hotel }) => toHotelDTO(hotel));
  },

  styleScore(hotel: HotelListItem, style: string): number {
    const price = hotel.priceFrom;
    let score = hotel.rating * 2 + Math.min(hotel.popularityScore, 50) / 10;

    switch (style) {
      case 'luxury':
        score += Math.min(price / 500, 20);
        if (hotel.hotelType === 'RESORT' || hotel.hotelType === 'VILLA') score += 6;
        if (hotel.swimmingPool) score += 3;
        if (hotel.starRating >= 5) score += 4;
        break;
      case 'family':
        if (hotel.familyFriendly) score += 8;
        if (hotel.swimmingPool || hotel.freeBreakfast) score += 3;
        if (price > 12000) score -= 5;
        break;
      case 'couple':
        if (hotel.coupleFriendly) score += 8;
        if (hotel.hotelType === 'HOMESTAY' || hotel.hotelType === 'VILLA') score += 4;
        if (price > 15000) score -= 3;
        break;
      case 'solo':
        if (price <= 3000) score += 6;
        if (hotel.hotelType === 'HOMESTAY' || hotel.hotelType === 'BACKPACKER') score += 5;
        if (price > 6000) score -= 4;
        break;
      case 'backpacker':
        if (price <= 1500) score += 10;
        if (hotel.hotelType === 'BACKPACKER' || hotel.hotelType === 'HOMESTAY') score += 6;
        if (price > 3000) score -= 6;
        break;
      case 'budget':
      default:
        if (price <= 2500) score += 7;
        if (price > 7000) score -= 5;
        if (hotel.hotelType === 'HOMESTAY' || hotel.hotelType === 'BACKPACKER') score += 3;
        break;
    }
    return score;
  },
};
