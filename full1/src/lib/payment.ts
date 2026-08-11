import { paymentApi, type BookingResult } from '@/lib/api'
import { openRazorpayCheckout } from '@/lib/razorpay'

export type PaymentFlowResult =
  | { status: 'success'; booking: BookingResult }
  | { status: 'failed'; error?: string }
  | { status: 'cancelled' }

/**
 * Runs the full payment flow for a booking:
 * create Razorpay order -> open checkout -> verify signature on success.
 * On a failed or dismissed payment the booking is marked FAILED server-side
 * so the user can retry from My Bookings.
 */
export async function initiatePayment(input: {
  bookingId: string
  name: string
  email: string
  contact: string
  isRetry?: boolean
}): Promise<PaymentFlowResult> {
  let order
  if (input.isRetry) {
    order = (await paymentApi.retry(input.bookingId)).data
  } else {
    order = (await paymentApi.createOrder(input.bookingId)).data
  }

  const outcome = await openRazorpayCheckout(order, {
    name: input.name,
    email: input.email,
    contact: input.contact,
  })

  if (outcome.status === 'success') {
    try {
      const booking = await paymentApi.verify({
        bookingId: input.bookingId,
        razorpayOrderId: outcome.orderId!,
        razorpayPaymentId: outcome.paymentId!,
        razorpaySignature: outcome.signature!,
      })
      return { status: 'success', booking: booking.data }
    } catch (err) {
      return { status: 'failed', error: err instanceof Error ? err.message : 'Payment could not be verified.' }
    }
  }

  // Persist the failed/abandoned state so the booking shows FAILED with a retry option.
  try {
    await paymentApi.verify({
      bookingId: input.bookingId,
      razorpayOrderId: order.orderId,
      razorpayPaymentId: '',
      razorpaySignature: '',
    })
  } catch {
    // Expected: backend marks the booking FAILED and returns 400.
  }

  return outcome.status === 'failed'
    ? { status: 'failed', error: outcome.error }
    : { status: 'cancelled' }
}