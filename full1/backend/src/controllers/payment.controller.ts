import type { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const paymentController = {
  createOrder: asyncHandler(async (req: Request, res: Response) => {
    const order = await paymentService.createOrder(req.body.bookingId, req.user!.sub);
    res.status(201).json(new ApiResponse('Razorpay order created successfully', order));
  }),

  verifyPayment: asyncHandler(async (req: Request, res: Response) => {
    const booking = await paymentService.verifyPayment({
      bookingId: req.body.bookingId,
      userId: req.user!.sub,
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    });
    res.json(new ApiResponse('Payment verified successfully', booking));
  }),

  retryPayment: asyncHandler(async (req: Request, res: Response) => {
    const order = await paymentService.retryPayment(req.body.bookingId, req.user!.sub);
    res.status(201).json(new ApiResponse('New Razorpay order created successfully', order));
  }),

  getPayment: asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.getPayment(req.params.bookingId, req.user!.sub, req.user!.role);
    res.json(new ApiResponse('Payment details retrieved successfully', payment));
  }),
};