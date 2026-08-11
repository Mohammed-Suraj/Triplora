/**
 * Email system test script — renders + sends all 9 email types through the
 * real EmailService (EmailLog persisted, retries exercised).
 * Usage:
 *   npm run test:emails            # mock mode (previews only, RESEND_API_KEY empty)
 *   RESEND_API_KEY=re_xxx npm run test:emails   # live mode
 */
import { emailService } from '../src/services/email.service';
import { env } from '../src/config/env';
import type { EmailType } from '@prisma/client';
import * as templates from '../src/emails/templates';

const to = env.email.resendApiKey ? 'test@triplora.travel' : 'demo@triplora.travel';
const origin = env.email.frontendUrl;

const cases: Array<{ name: string; type: EmailType; render: () => { subject: string; html: string } }> = [
  {
    name: 'welcome',
    type: 'WELCOME',
    render: () =>
      templates.welcomeEmail({
        name: 'Ananya Pillai',
        exploreUrl: `${origin}/explore`,
        websiteUrl: origin,
      }),
  },
  {
    name: 'verification',
    type: 'VERIFICATION',
    render: () =>
      templates.verificationEmail({
        name: 'Ananya Pillai',
        verificationUrl: `${origin}/verify-email?token=eyJhbGciOiJIUzI1NiJ9.placeholder-verification-token`,
      }),
  },
  {
    name: 'forgot-password',
    type: 'FORGOT_PASSWORD',
    render: () =>
      templates.forgotPasswordEmail({
        name: 'Ananya Pillai',
        resetUrl: `${origin}/reset-password?token=eyJhbGciOiJIUzI1NiJ9.placeholder-reset-token`,
        expiresInLabel: '15 minutes',
      }),
  },
  {
    name: 'password-reset',
    type: 'PASSWORD_RESET',
    render: () => templates.passwordResetEmail({ name: 'Ananya Pillai', exploreUrl: `${origin}/explore` }),
  },
  {
    name: 'booking-confirmation',
    type: 'BOOKING_CONFIRMATION',
    render: () =>
      templates.bookingConfirmationEmail({
        name: 'Ananya Pillai',
        bookingId: 'TRP2A9F4B7E',
        destinationName: 'Munnar',
        region: 'Idukki',
        travelDate: '2026-09-14T00:00:00.000Z',
        returnDate: '2026-09-18T00:00:00.000Z',
        numberOfTravelers: 2,
        fullName: 'Ananya Pillai',
        email: 'ananya@example.com',
        phone: '+91 98765 43210',
        budget: 24999,
        currency: 'INR',
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        bookingUrl: `${origin}/bookings/3f2a91d4-8c1e-4a2b-9d6f-1a2b3c4d5e6f`,
      }),
  },
  {
    name: 'payment-success',
    type: 'PAYMENT_SUCCESS',
    render: () =>
      templates.paymentSuccessEmail({
        name: 'Ananya Pillai',
        bookingId: 'TRP2A9F4B7E',
        destinationName: 'Munnar',
        amount: 24999,
        currency: 'INR',
        paymentId: 'pay_O4XkQwVzTpYqR1',
        paymentMethod: 'razorpay',
        paidAt: '2026-08-06T10:30:00.000Z',
        bookingUrl: `${origin}/bookings/3f2a91d4-8c1e-4a2b-9d6f-1a2b3c4d5e6f`,
      }),
  },
  {
    name: 'booking-cancelled',
    type: 'BOOKING_CANCELLED',
    render: () =>
      templates.bookingCancelledEmail({
        name: 'Ananya Pillai',
        bookingId: 'TRP2A9F4B7E',
        destinationName: 'Munnar',
        travelDate: '2026-09-14T00:00:00.000Z',
        refundStatus: 'Refund will be initiated to your original payment method within 5-7 business days',
        refundAmount: 24999,
        currency: 'INR',
        bookingUrl: `${origin}/explore`,
      }),
  },
  {
    name: 'ai-trip-saved',
    type: 'AI_TRIP_SAVED',
    render: () =>
      templates.aiTripSavedEmail({
        name: 'Ananya Pillai',
        tripPlanId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        title: 'Munnar & Alleppey Escape',
        destination: 'Munnar',
        days: 4,
        budget: 'PREMIUM',
        travelStyle: 'FAMILY',
        tripUrl: `${origin}/my-ai-trips/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d`,
        exploreUrl: `${origin}/planner`,
      }),
  },
  {
    name: 'trip-reminder',
    type: 'TRIP_REMINDER',
    render: () =>
      templates.tripReminderEmail({
        name: 'Ananya Pillai',
        bookingId: 'TRP2A9F4B7E',
        destinationName: 'Alleppey',
        region: 'Alappuzha',
        travelDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        weather: 'Partly cloudy, 24\u00B0C to 30\u00B0C',
        packing: 'Light cotton clothing, a light rain jacket, sunscreen and your travel documents.',
        hotel: 'Find hand-picked stays near Alleppey on Triplora before you leave.',
        emergencyContact: 'Kerala Tourism Helpline: 1363 (toll-free from India) · National Emergency: 112',
        bookingUrl: `${origin}/bookings/3f2a91d4-8c1e-4a2b-9d6f-1a2b3c4d5e6f`,
        exploreUrl: `${origin}/explore`,
      }),
  },
];

async function main(): Promise<void> {
  console.log(`Mode: ${emailService.isConfigured ? 'LIVE (Resend)' : 'MOCK (previews only)'}`);
  console.log(`Recipient: ${to}\n`);

  let failures = 0;
  for (const c of cases) {
    const { subject, html } = c.render();
    try {
      const log = await emailService.sendLogged(to, c.type, subject, html, { testCase: c.name });
      const ok = log.status === 'SENT';
      if (!ok) failures += 1;
      console.log(
        `${c.name.padEnd(20)} -> ${log.status} attempts=${log.attempts}${log.error ? ` error=${log.error}` : ''}`,
      );
    } catch (err) {
      failures += 1;
      console.log(`${c.name.padEnd(20)} -> ERROR ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone. ${failures === 0 ? 'All emails processed.' : `${failures} FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
