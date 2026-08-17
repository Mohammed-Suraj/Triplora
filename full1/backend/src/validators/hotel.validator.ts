import { z } from 'zod';

export const HOTEL_TYPES = ['HOTEL', 'RESORT', 'VILLA', 'HOMESTAY', 'BACKPACKER'] as const;
export const HOTEL_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Hotel id is required') }),
});

const boolOptional = z.enum(['true', '1', 'false', '0']).optional();

export const listHotelsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    sortBy: z.enum(['price', 'rating', 'best_value', 'popularity', 'nearest']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    sort: z.string().max(30).optional(),
    q: z.string().max(100).optional(),
    destination: z.string().min(1).optional(),
    hotelType: z.enum([...HOTEL_TYPES, 'ALL']).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    familyFriendly: boolOptional,
    coupleFriendly: boolOptional,
    freeBreakfast: boolOptional,
    freeWiFi: boolOptional,
    swimmingPool: boolOptional,
    parking: boolOptional,
    airConditioning: boolOptional,
    all: z.enum(['true', '1']).optional(),
  }),
});

export const hotelIdParamSchema = idParamSchema;

export const createHotelSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Hotel name is required'),
    tagline: z.string().max(200).default(''),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    longDescription: z.string().max(5000).default(''),
    image: z.string().min(1, 'Hotel image is required'),
    gallery: z.array(z.string()).max(30).default([]),
    starRating: z.number().int().min(1).max(5).default(3),
    priceFrom: z.number().positive('Price per night is required'),
    hotelType: z.enum(HOTEL_TYPES).default('HOTEL'),
    location: z.string().min(2, 'Location is required'),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    distanceFromAttraction: z.number().min(0).default(0),
    checkIn: z.string().default('2:00 PM'),
    checkOut: z.string().default('11:00 AM'),
    cancellationPolicy: z.string().min(5).default('Free cancellation up to 48 hours before check-in'),
    amenities: z.array(z.string()).max(60).default([]),
    familyFriendly: z.boolean().default(false),
    coupleFriendly: z.boolean().default(false),
    freeBreakfast: z.boolean().default(false),
    freeWiFi: z.boolean().default(true),
    swimmingPool: z.boolean().default(false),
    parking: z.boolean().default(false),
    airConditioning: z.boolean().default(false),
    nearbyAttractions: z.array(z.string()).max(20).default([]),
    nearbyRestaurants: z.array(z.string()).max(20).default([]),
    nearbyTransport: z.array(z.string()).max(20).default([]),
    destinationId: z.string().min(1, 'Destination is required'),
  }),
});

export const updateHotelSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    tagline: z.string().max(200).optional(),
    description: z.string().min(10).optional(),
    longDescription: z.string().max(5000).optional(),
    image: z.string().min(1).optional(),
    gallery: z.array(z.string()).max(30).optional(),
    starRating: z.number().int().min(1).max(5).optional(),
    priceFrom: z.number().positive().optional(),
    hotelType: z.enum(HOTEL_TYPES).optional(),
    location: z.string().min(2).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    distanceFromAttraction: z.number().min(0).optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    cancellationPolicy: z.string().min(5).optional(),
    amenities: z.array(z.string()).max(60).optional(),
    familyFriendly: z.boolean().optional(),
    coupleFriendly: z.boolean().optional(),
    freeBreakfast: z.boolean().optional(),
    freeWiFi: z.boolean().optional(),
    swimmingPool: z.boolean().optional(),
    parking: z.boolean().optional(),
    airConditioning: z.boolean().optional(),
    nearbyAttractions: z.array(z.string()).max(20).optional(),
    nearbyRestaurants: z.array(z.string()).max(20).optional(),
    nearbyTransport: z.array(z.string()).max(20).optional(),
    isActive: z.boolean().optional(),
    destinationId: z.string().min(1).optional(),
  }),
});

export const createRoomSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2, 'Room name is required'),
    description: z.string().max(1000).optional(),
    pricePerNight: z.number().positive('Price per night is required'),
    maxGuests: z.number().int().min(1).max(20).default(2),
    bedType: z.string().max(50).default('King'),
    totalRooms: z.number().int().min(1).max(500).default(5),
    amenities: z.array(z.string()).max(30).default([]),
    images: z.array(z.string()).max(12).default([]),
  }),
});

export const roomIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Room id is required') }),
});

export const updateRoomSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().max(1000).nullable().optional(),
    pricePerNight: z.number().positive().optional(),
    maxGuests: z.number().int().min(1).max(20).optional(),
    bedType: z.string().max(50).optional(),
    totalRooms: z.number().int().min(1).max(500).optional(),
    amenities: z.array(z.string()).max(30).optional(),
    images: z.array(z.string()).max(12).optional(),
  }),
});

export const createHotelBookingSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1, 'Hotel is required'),
    roomId: z.string().min(1, 'Room is required'),
    checkIn: z
      .string()
      .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid check-in date' }),
    checkOut: z
      .string()
      .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid check-out date' }),
    guests: z.number().int().min(1).max(50),
    rooms: z.number().int().min(1).max(10).default(1),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format'),
    specialRequests: z.string().max(1000).optional(),
  }),
});

export const listHotelBookingsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum([...HOTEL_BOOKING_STATUSES, 'ALL']).optional(),
    search: z.string().max(100).optional(),
  }),
});

export const updateHotelBookingStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(HOTEL_BOOKING_STATUSES),
  }),
});

export const createHotelReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
    comment: z.string().min(3, 'Review comment is required').max(2000),
    images: z.array(z.string()).max(6).default([]),
    stayDate: z.string().nullable().optional(),
  }),
});

export const updateHotelReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().min(3).max(2000).optional(),
    images: z.array(z.string()).max(6).optional(),
    stayDate: z.string().nullable().optional(),
  }),
});

export const hotelReviewIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const hotelReviewParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    reviewId: z.string().min(1, 'Review id is required'),
  }),
});

export const listHotelReviewsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

export const recommendHotelsQuerySchema = z.object({
  query: z.object({
    style: z.enum(['budget', 'family', 'couple', 'solo', 'luxury', 'backpacker']).optional(),
    destination: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(8).optional(),
  }),
});
