import type { Request, Response } from 'express';
import { hotelService } from '../services/hotel.service';
import { uploadService } from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user;
}

export const hotelController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await hotelService.list(req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Hotels fetched successfully', items, meta));
  }),

  byDestination: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await hotelService.byDestination(req.params.destinationId, req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Hotels fetched successfully', items, meta));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const hotel = await hotelService.getByIdOrSlug(req.params.id);
    res.status(200).json(new ApiResponse('Hotel fetched successfully', hotel));
  }),

  recommend: asyncHandler(async (req: Request, res: Response) => {
    const items = await hotelService.recommend({
      style: req.query.style as string | undefined,
      destinationId: req.query.destination as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json(new ApiResponse('Hotel recommendations fetched successfully', items));
  }),

  // ---- Admin CRUD ----

  create: asyncHandler(async (req: Request, res: Response) => {
    let imageUrl = req.body.image as string | undefined;
    if (req.file) {
      imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/hotels', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
    }
    if (!imageUrl) throw ApiError.badRequest('An image file or image URL is required');

    const hotel = await hotelService.create({ ...req.body, image: imageUrl });
    res.status(201).json(new ApiResponse('Hotel created successfully', hotel));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    let body = req.body;
    if (req.file) {
      const imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/hotels', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
      body = { ...body, image: imageUrl };
    }
    const hotel = await hotelService.update(req.params.id, body);
    res.status(200).json(new ApiResponse('Hotel updated successfully', hotel));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await hotelService.remove(req.params.id);
    res.status(200).json(new ApiResponse('Hotel deleted successfully', null));
  }),

  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    requireUser(req);
    if (!req.file) throw ApiError.badRequest('An image file is required');
    const url = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/hotels', {
      baseUrl: `${req.protocol}://${req.get('host')}`,
      originalName: req.file.originalname,
    });
    res.status(201).json(new ApiResponse('Image uploaded successfully', { url }));
  }),

  // ---- Rooms ----

  createRoom: asyncHandler(async (req: Request, res: Response) => {
    const room = await hotelService.createRoom(req.params.id, req.body);
    res.status(201).json(new ApiResponse('Room created successfully', room));
  }),

  updateRoom: asyncHandler(async (req: Request, res: Response) => {
    const room = await hotelService.updateRoom(req.params.id, req.body);
    res.status(200).json(new ApiResponse('Room updated successfully', room));
  }),

  removeRoom: asyncHandler(async (req: Request, res: Response) => {
    await hotelService.removeRoom(req.params.id);
    res.status(200).json(new ApiResponse('Room deleted successfully', null));
  }),

  // ---- Bookings ----

  createBooking: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const booking = await hotelService.createBooking(user.sub, req.body);
    res.status(201).json(new ApiResponse('Hotel booking created successfully', booking));
  }),

  myBookings: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const result = await hotelService.listUserBookings(user.sub);
    res.status(200).json(new ApiResponse('Hotel bookings retrieved successfully', result));
  }),

  getBookingById: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const booking = await hotelService.getBookingById(req.params.id, user.sub, user.role);
    res.status(200).json(new ApiResponse('Hotel booking retrieved successfully', booking));
  }),

  getBookingByBookingId: asyncHandler(async (req: Request, res: Response) => {
    const booking = await hotelService.getBookingByBookingId(req.params.bookingId);
    res.status(200).json(new ApiResponse('Hotel booking retrieved successfully', booking));
  }),

  cancelBooking: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const booking = await hotelService.cancelBooking(req.params.id, user.sub, user.role);
    res.status(200).json(new ApiResponse('Hotel booking cancelled successfully', booking));
  }),

  adminBookings: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await hotelService.adminListBookings(req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Hotel bookings retrieved successfully', items, meta));
  }),

  updateBookingStatus: asyncHandler(async (req: Request, res: Response) => {
    const booking = await hotelService.updateBookingStatus(req.params.id, req.body.status);
    res.status(200).json(new ApiResponse('Hotel booking status updated successfully', booking));
  }),

  // ---- Reviews ----

  listReviews: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta, stats } = await hotelService.listReviews(req.params.id, req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Hotel reviews fetched successfully', { items, stats }, meta));
  }),

  createReview: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const review = await hotelService.createReview(
      user.sub,
      req.params.id,
      req.body.rating,
      req.body.comment,
      req.body.images ?? [],
      req.body.stayDate ?? null,
    );
    res.status(201).json(new ApiResponse('Hotel review submitted successfully', review));
  }),

  updateReview: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const review = await hotelService.updateReview(
      user.sub,
      req.params.id,
      user.role,
      req.body.rating,
      req.body.comment,
      req.body.images,
      req.body.stayDate,
    );
    res.status(200).json(new ApiResponse('Hotel review updated successfully', review));
  }),

  removeReview: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    await hotelService.removeReview(user.sub, req.params.id, user.role);
    res.status(200).json(new ApiResponse('Hotel review deleted successfully', null));
  }),
};
