import type { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { analyticsService } from '../services/analytics.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import type { EmailStatus, EmailType, ReportStatus } from '@prisma/client';

function listParams(req: Request) {
  return {
    page: Number(req.query.page ?? 1),
    limit: Number(req.query.limit ?? 20),
  };
}

export const adminController = {
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getStats();
    res.json(new ApiResponse('Admin stats fetched successfully', stats));
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listUsers(listParams(req));
    res.json(new ApiResponse('Users fetched successfully', items, meta));
  }),

  listDestinations: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listDestinations(listParams(req));
    res.json(new ApiResponse('Destinations fetched successfully', items, meta));
  }),

  listBookings: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listBookings({
      ...listParams(req),
      status: req.query.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | undefined,
      paymentStatus: req.query.paymentStatus as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | undefined,
    });
    res.json(new ApiResponse('Bookings fetched successfully', items, meta));
  }),

  updateBookingStatus: asyncHandler(async (req: Request, res: Response) => {
    const booking = await adminService.updateBookingStatus(req.params.id, req.body.status);
    res.json(new ApiResponse('Booking status updated successfully', booking));
  }),

  listReviews: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listReviews(listParams(req));
    res.json(new ApiResponse('Reviews fetched successfully', items, meta));
  }),

  deleteReview: asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteReview(req.params.id);
    res.json(new ApiResponse('Review deleted successfully', null));
  }),

  listReviewReports: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listReviewReports({
      ...listParams(req),
      status: req.query.status as ReportStatus | undefined,
    });
    res.json(new ApiResponse('Review reports fetched successfully', items, meta));
  }),

  updateReportStatus: asyncHandler(async (req: Request, res: Response) => {
    const report = await adminService.updateReportStatus(req.params.id, req.body.status);
    res.json(new ApiResponse('Report status updated successfully', report));
  }),

  createAnnouncement: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.createAnnouncement(req.body);
    res.status(201).json(new ApiResponse('Announcement sent successfully', result));
  }),

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

  analyticsOverview: asyncHandler(async (_req: Request, res: Response) => {
    const data = await analyticsService.overview();
    res.json(new ApiResponse('Analytics overview fetched successfully', data));
  }),

  analyticsBookingGrowth: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.bookingGrowth(Number(req.query.months ?? 6));
    res.json(new ApiResponse('Booking growth fetched successfully', data));
  }),

  analyticsPopularDestinations: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.popularDestinations(Number(req.query.limit ?? 6));
    res.json(new ApiResponse('Popular destinations fetched successfully', data));
  }),

  analyticsTrending: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.trending(Number(req.query.limit ?? 6));
    res.json(new ApiResponse('Trending destinations fetched successfully', data));
  }),

  analyticsTopSearches: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.topSearches(Number(req.query.limit ?? 10));
    res.json(new ApiResponse('Top searches fetched successfully', data));
  }),

  analyticsAiUsage: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.aiUsage(Number(req.query.days ?? 14));
    res.json(new ApiResponse('AI usage fetched successfully', data));
  }),

  analyticsDestinationPerformance: asyncHandler(async (_req: Request, res: Response) => {
    const data = await analyticsService.destinationPerformance();
    res.json(new ApiResponse('Destination performance fetched successfully', data));
  }),

  analyticsMonthlyReport: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.monthlyReport(req.query.month as string | undefined);
    res.json(new ApiResponse('Monthly report fetched successfully', data));
  }),

  listContactMessages: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listContactMessages({
      ...listParams(req),
      status: req.query.status as 'NEW' | 'READ' | 'RESPONDED' | undefined,
    });
    res.json(new ApiResponse('Contact messages fetched successfully', items, meta));
  }),

  updateContactStatus: asyncHandler(async (req: Request, res: Response) => {
    const message = await adminService.updateContactStatus(req.params.id, req.body.status);
    res.json(new ApiResponse('Contact message status updated successfully', message));
  }),

  listEmailLogs: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await adminService.listEmailLogs({
      ...listParams(req),
      type: req.query.type as EmailType | undefined,
      status: req.query.status as EmailStatus | undefined,
    });
    res.json(new ApiResponse('Email logs fetched successfully', items, meta));
  }),

  updateUserRole: asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.updateUserRole(req.params.id, req.body.role, req.user!.sub);
    res.json(new ApiResponse('User role updated successfully', user));
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteUser(req.params.id, req.user!.sub);
    res.json(new ApiResponse('User deleted successfully', null));
  }),

  updateDestination: asyncHandler(async (req: Request, res: Response) => {
    const destination = await adminService.updateDestination(req.params.id, req.body);
    res.json(new ApiResponse('Destination updated successfully', destination));
  }),

  deleteDestination: asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteDestination(req.params.id);
    res.json(new ApiResponse('Destination deleted successfully', null));
  }),

  deleteBooking: asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteBooking(req.params.id);
    res.json(new ApiResponse('Booking deleted successfully', null));
  }),

  deleteContactMessage: asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteContactMessage(req.params.id);
    res.json(new ApiResponse('Contact message deleted successfully', null));
  }),
};