import { adminRepository } from '../repositories/admin.repository';
import { reviewRepository } from '../repositories/review.repository';
import { hotelBookingRepository } from '../repositories/hotelBooking.repository';
import { notificationService } from './notification.service';
import { uploadService } from './upload.service';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta } from '../utils/ApiResponse';
import type { BookingStatus, ContactStatus, EmailStatus, EmailType, PaymentStatus, Prisma, ReportStatus, Role } from '@prisma/client';

interface ListParams {
  page: number;
  limit: number;
}

interface BookingListParams extends ListParams {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
}

interface ContactListParams extends ListParams {
  status?: ContactStatus;
}

interface EmailLogListParams extends ListParams {
  type?: EmailType;
  status?: EmailStatus;
}

function clampPage(raw?: number): { page: number } {
  return { page: Math.max(1, Math.floor(raw ?? 1)) };
}

export const adminService = {
  async getStats() {
    const [users, destinations, bookings, pendingBookings, reviews, newContactMessages, contactMessages] =
      await adminRepository.getStats();
    const [hotelBookings, pendingHotelBookings] = await Promise.all([
      hotelBookingRepository.countAll(),
      hotelBookingRepository.countPending(),
    ]);

    const recentBookings = await adminRepository.listBookings(0, 6);
    const recentUsers = await adminRepository.listUsers(0, 5);
    const recentContactMessages = await adminRepository.listContactMessages(0, 5);

    return {
      users,
      destinations,
      bookings,
      pendingBookings,
      hotelBookings,
      pendingHotelBookings,
      reviews,
      newContactMessages,
      contactMessages,
      recentBookings,
      recentUsers,
      recentContactMessages,
    };
  },

  async listUsers(params: ListParams) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const total = await adminRepository.countUsers();
    const items = await adminRepository.listUsers(skip, take);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async listDestinations(params: ListParams) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const total = await adminRepository.countDestinations();
    const items = await adminRepository.listDestinations(skip, take);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async listBookings(params: BookingListParams) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const { status, paymentStatus } = params;
    const total = await adminRepository.countBookings(status, paymentStatus);
    const items = await adminRepository.listBookings(skip, take, status, paymentStatus);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async updateBookingStatus(id: string, status: BookingStatus) {
    const booking = await adminRepository.findBookingById(id);
    if (!booking) throw ApiError.notFound('Booking not found');
    return adminRepository.updateBookingStatus(id, status);
  },

  async listReviews(params: ListParams) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const total = await adminRepository.countReviews();
    const items = await adminRepository.listReviews(skip, take);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async deleteReview(id: string) {
    await adminRepository.deleteReview(id);
  },

  async listReviewReports(params: ListParams & { status?: ReportStatus }) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const total = await reviewRepository.countReports(params.status);
    const items = await reviewRepository.listReports(skip, take, params.status);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async updateReportStatus(id: string, status: ReportStatus) {
    const report = await reviewRepository.findReportById(id);
    if (!report) throw ApiError.notFound('Report not found');
    return reviewRepository.updateReportStatus(id, status);
  },

  /** Broadcasts an admin announcement to every user's notification center. */
  async createAnnouncement(input: { title: string; body: string; link?: string }) {
    const recipients = await notificationService.createForAll(
      'ADMIN_ANNOUNCEMENT',
      input.title,
      input.body,
      input.link ?? null,
    );
    return { recipients };
  },

  async listContactMessages(params: ContactListParams) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const { status } = params;
    const total = await adminRepository.countContactMessages(status);
    const items = await adminRepository.listContactMessages(skip, take, status);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async listEmailLogs(params: EmailLogListParams) {
    const page = clampPage(params.page).page;
    const take = params.limit;
    const skip = (page - 1) * take;
    const { type, status } = params;
    const total = await adminRepository.countEmailLogs(type, status);
    const items = await adminRepository.listEmailLogs(skip, take, type, status);
    return { items, meta: buildPaginationMeta(page, take, total) };
  },

  async updateContactStatus(id: string, status: ContactStatus) {
    return adminRepository.updateContactStatus(id, status);
  },

  async updateUserRole(id: string, role: Role, actorId: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');

    if (id === actorId && role !== 'ADMIN') {
      throw ApiError.badRequest('You cannot remove your own admin role');
    }

    return adminRepository.updateUserRole(id, role);
  },

  async deleteUser(id: string, actorId: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');

    if (id === actorId) {
      throw ApiError.badRequest('You cannot delete your own account');
    }

    await adminRepository.deleteUser(id);
  },

  async updateDestination(id: string, input: {
    name?: string;
    tagline?: string;
    region?: string;
    categoryId?: string;
    priceFrom?: number;
    duration?: string;
    bestSeason?: string;
    description?: string;
    longDescription?: string;
    highlights?: string[];
    activities?: string[];
    gallery?: string[];
    image?: string;
    isFeatured?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    const existing = await adminRepository.findDestinationById(id);
    if (!existing) throw ApiError.notFound('Destination not found');

    const data: Prisma.DestinationUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
      data.slug = input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (input.tagline !== undefined) data.tagline = input.tagline;
    if (input.region !== undefined) data.region = input.region;
    if (input.priceFrom !== undefined) data.priceFrom = input.priceFrom;
    if (input.duration !== undefined) data.duration = input.duration;
    if (input.bestSeason !== undefined) data.bestSeason = input.bestSeason;
    if (input.description !== undefined) data.description = input.description;
    if (input.longDescription !== undefined) data.longDescription = input.longDescription;
    if (input.highlights !== undefined) data.highlights = input.highlights;
    if (input.activities !== undefined) data.activities = input.activities;
    if (input.gallery !== undefined) data.gallery = input.gallery;
    if (input.image !== undefined) data.image = input.image;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.latitude !== undefined) data.latitude = input.latitude;
    if (input.longitude !== undefined) data.longitude = input.longitude;
    if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };

    return adminRepository.updateDestination(id, data);
  },

  async deleteDestination(id: string) {
    const destination = await adminRepository.findDestinationById(id);
    if (!destination) throw ApiError.notFound('Destination not found');
    await adminRepository.deleteDestination(id);
    // Best-effort Cloudinary cleanup for locally-hosted cover images.
    if (destination.image) {
      void uploadService.deleteImage(destination.image);
    }
  },

  async deleteBooking(id: string) {
    const booking = await adminRepository.findBookingById(id);
    if (!booking) throw ApiError.notFound('Booking not found');
    await adminRepository.deleteBooking(id);
  },

  async deleteContactMessage(id: string) {
    await adminRepository.deleteContactMessage(id);
  },
};