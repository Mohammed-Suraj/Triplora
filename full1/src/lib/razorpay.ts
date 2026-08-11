const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact: string }
  theme: { color: string }
  handler: (response: RazorpayPaymentResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  on: (event: string, handler: (response: unknown) => void) => void
  open: () => void
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

export interface CheckoutOutcome {
  status: 'success' | 'failed' | 'cancelled'
  paymentId?: string
  orderId?: string
  signature?: string
  error?: string
}

export interface CheckoutOrder {
  bookingId: string
  orderId: string
  amount: number
  amountInRupees: number
  currency: string
  keyId: string
}

let scriptPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  if (typeof window !== 'undefined' && window.Razorpay) {
    scriptPromise = Promise.resolve()
    return scriptPromise
  }
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load Razorpay checkout. Please check your connection.'))
    }
    document.body.appendChild(script)
  })
  return scriptPromise
}

export async function openRazorpayCheckout(
  order: CheckoutOrder,
  prefill: { name: string; email: string; contact: string },
): Promise<CheckoutOutcome> {
  await loadCheckoutScript()

  if (!window.Razorpay) {
    return { status: 'failed', error: 'Razorpay checkout is unavailable. Please try again.' }
  }

  const RazorpayCtor = window.Razorpay
  return new Promise((resolve) => {
    let settled = false
    let lastError: string | undefined

    const done = (outcome: CheckoutOutcome) => {
      if (!settled) {
        settled = true
        resolve(outcome)
      }
    }

    const options: RazorpayCheckoutOptions = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Triplora',
      description: `Trip booking payment (${order.bookingId})`,
      order_id: order.orderId,
      prefill,
      theme: { color: '#0d9488' },
      handler: (response) => {
        done({
          status: 'success',
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        })
      },
      modal: {
        ondismiss: () => {
          done({
            status: lastError ? 'failed' : 'cancelled',
            error: lastError,
          })
        },
      },
    }

    const rzp = new RazorpayCtor(options)
    rzp.on('payment.failed', (response) => {
      const payload = response as { error?: { description?: string } }
      lastError = payload?.error?.description ?? 'Payment failed. Please try again.'
    })
    rzp.open()
  })
}