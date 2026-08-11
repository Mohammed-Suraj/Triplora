import { z } from 'zod';
import { BookingStatus, ContactStatus, PaymentStatus, ReportStatus, Role } from '@prisma/client';

export const adminIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Resource id is required'),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User id is required'),
  }),
  body: z.object({
    role: z.enum([Role.USER, Role.ADMIN]),
  }),
});

const stringArray = z
  .union([z.array(z.string()), z.string()])
  .transform((val) => {
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch {
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  })
  .default([]);

export const updateDestinationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Destination id is required'),
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    tagline: z.string().min(2).max(160).optional(),
    region: z.string().min(2).max(80).optional(),
    categoryId: z.string().min(1, 'categoryId is required').optional(),
    priceFrom: z.coerce.number().int().nonnegative().optional(),
    duration: z.string().min(1).optional(),
    bestSeason: z.string().min(1).optional(),
    description: z.string().min(10).optional(),
    longDescription: z.string().min(10).optional(),
    highlights: stringArray.optional(),
    activities: stringArray.optional(),
    gallery: stringArray.optional(),
    image: z.string().url().optional(),
    isFeatured: z.boolean().optional(),
    latitude: z.union([z.null(), z.coerce.number().min(-90).max(90)]).optional(),
    longitude: z.union([z.null(), z.coerce.number().min(-180).max(180)]).optional(),
  }),
});

export const updateBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Booking id is required'),
  }),
  body: z.object({
    status: z.enum([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED]),
  }),
});

export const updateContactStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Message id is required'),
  }),
  body: z.object({
    status: z.enum([ContactStatus.NEW, ContactStatus.READ, ContactStatus.RESPONDED]),
  }),
});

export const listAdminSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED]).optional(),
    paymentStatus: z.enum([PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.REFUNDED]).optional(),
    search: z.string().optional(),
  }),
});

export const listEmailLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    type: z
      .enum([
        'WELCOME',
        'VERIFICATION',
        'FORGOT_PASSWORD',
        'PASSWORD_RESET',
        'BOOKING_CONFIRMATION',
        'PAYMENT_SUCCESS',
        'BOOKING_CANCELLED',
        'AI_TRIP_SAVED',
        'TRIP_REMINDER',
      ])
      .optional(),
    status: z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED']).optional(),
  }),
});

export const listReviewReportsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum([ReportStatus.OPEN, ReportStatus.RESOLVED, ReportStatus.DISMISSED]).optional(),
  }),
});

export const updateReportStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Report id is required'),
  }),
  body: z.object({
    status: z.enum([ReportStatus.OPEN, ReportStatus.RESOLVED, ReportStatus.DISMISSED]),
  }),
});

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(120),
    body: z.string().min(3, 'Message must be at least 3 characters').max(500),
    link: z.string().max(500).optional(),
  }),
});
