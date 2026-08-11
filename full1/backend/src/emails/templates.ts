import {
  emailLayout,
  emailHeading,
  emailParagraph,
  emailButton,
  emailButtons,
  emailMutedLink,
  emailDivider,
} from './layout';

export interface EmailRender {
  subject: string;
  html: string;
}

function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(amount: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '\u20B9' : `${currency} `;
  return `${symbol}${Number(amount ?? 0).toLocaleString('en-IN')}`;
}

function bookingTable(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:10px 14px;font-size:13px;color:#6b7f79;width:38%;border-bottom:1px solid #eef4f2;">${label}</td>
          <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#12201d;border-bottom:1px solid #eef4f2;">${value}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dce7e3;border-radius:12px;overflow:hidden;margin:16px 0 8px;">
    ${cells}
  </table>`;
}

const BUDGET_LABELS: Record<string, string> = { RELAXED: 'Relaxed', PREMIUM: 'Premium', LUXURY: 'Luxury' };
const STYLE_LABELS: Record<string, string> = {
  ROMANTIC: 'Romantic',
  FAMILY: 'Family',
  SOLO: 'Solo',
  FRIENDS: 'Friends',
};

function readableEnum(value: string, labels: Record<string, string>): string {
  return labels[value] ?? value.charAt(0) + value.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------
export function welcomeEmail(input: {
  name: string;
  exploreUrl: string;
  websiteUrl: string;
}): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: 'Welcome to Triplora',
      preheader: `Namaste ${firstName}! Your Kerala journey starts here.`,
    },
    `${emailHeading(`Namaste, ${firstName}!`)}
    ${emailParagraph(
      'Welcome to <strong>Triplora</strong> — your companion for discovering Kerala, from the misty tea hills of Munnar to the tranquil backwaters of Alleppey.',
    )}
    ${emailParagraph('Here is what you can do with your account:')}
    <ul style="margin:0 0 16px;padding-left:20px;color:#22332e;">
      <li style="margin-bottom:6px;">Explore <strong>74+ hand-picked destinations</strong> across all 14 districts</li>
      <li style="margin-bottom:6px;">Plan multi-day trips with our <strong>AI trip planner</strong></li>
      <li>Book stays, save favourites and manage everything in one place</li>
    </ul>
    ${emailButtons([
      { label: 'Explore Destinations', url: input.exploreUrl, primary: true },
      { label: 'Visit Website', url: input.websiteUrl, primary: false },
    ])}
    ${emailParagraph('If you have any questions, just reply to this email — we would love to help.')}
    <p style="margin:0;color:#6b7f79;font-size:13px;">Happy travels,<br /><strong>The Triplora Team</strong></p>`,
  );
  return { subject: `Welcome to Triplora, ${firstName}!`, html };
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------
export function verificationEmail(input: { name: string; verificationUrl: string }): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: 'Verify your email',
      preheader: 'Please confirm your email address to secure your Triplora account.',
    },
    `${emailHeading('Verify your email address')}
    ${emailParagraph(`Hi ${firstName}, thanks for joining Triplora. Please confirm this email address belongs to you — it helps us keep your account secure.`)}
    ${emailButton('Verify Email', input.verificationUrl)}
    ${emailMutedLink('Verify Email', input.verificationUrl)}
    ${emailParagraph('This link is valid for <strong>24 hours</strong>. If you did not create an account with us, you can safely ignore this email.')}`,
  );
  return { subject: 'Verify your Triplora email', html };
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export function forgotPasswordEmail(input: {
  name: string;
  resetUrl: string;
  expiresInLabel: string;
}): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: 'Reset your password',
      preheader: 'We received a request to reset your Triplora password.',
    },
    `${emailHeading('Reset your password')}
    ${emailParagraph(`Hi ${firstName}, we received a request to reset the password for your Triplora account. Click the button below to choose a new one.`)}
    ${emailButton('Reset Password', input.resetUrl)}
    ${emailMutedLink('Reset Password', input.resetUrl)}
    ${emailParagraph(`This link is valid for <strong>${input.expiresInLabel}</strong>.`)}
    ${emailParagraph('If you did not request this, you can safely ignore this email — your password will stay the same.')}`,
  );
  return { subject: 'Reset your Triplora password', html };
}

// ---------------------------------------------------------------------------
// Password reset confirmation
// ---------------------------------------------------------------------------
export function passwordResetEmail(input: { name: string; exploreUrl: string }): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: 'Password changed',
      preheader: 'Your Triplora password was successfully updated.',
    },
    `${emailHeading('Your password has been changed')}
    ${emailParagraph(`Hi ${firstName}, this is a confirmation that the password for your Triplora account was successfully changed.`)}
    ${emailParagraph('If this was not you, please contact us immediately at <a href="mailto:support@triplora.travel" style="color:#0d7a66;">support@triplora.travel</a>.')}
    ${emailButton('Go to Triplora', input.exploreUrl)}
    ${emailDivider()}
    <p style="margin:0;color:#6b7f79;font-size:13px;">You can safely delete this email once you have confirmed your password works.</p>`,
  );
  return { subject: 'Your Triplora password has been changed', html };
}

// ---------------------------------------------------------------------------
// Booking confirmation
// ---------------------------------------------------------------------------
export interface BookingEmailInput {
  name: string;
  bookingId: string;
  destinationName: string;
  region: string;
  travelDate: Date | string;
  returnDate?: Date | string | null;
  numberOfTravelers: number;
  fullName: string;
  email: string;
  phone: string;
  budget: number;
  currency?: string;
  bookingStatus: string;
  paymentStatus: string;
  bookingUrl: string;
}

export function bookingConfirmationEmail(input: BookingEmailInput): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: `Booking confirmed — ${input.destinationName}`,
      preheader: `Your Triplora booking ${input.bookingId} is confirmed.`,
    },
    `${emailHeading('Your trip is booked!')}
    ${emailParagraph(`Hi ${firstName}, thank you for booking with Triplora. Your journey to <strong>${input.destinationName}</strong> is confirmed. A copy of your booking details is below.`)}
    ${bookingTable([
      ['Booking ID', input.bookingId],
      ['Destination', `${input.destinationName}, ${input.region}`],
      ['Travel Date', formatDate(input.travelDate)],
      ['Return Date', input.returnDate ? formatDate(input.returnDate) : 'One-way trip'],
      ['Travellers', `${input.numberOfTravelers} ${input.numberOfTravelers === 1 ? 'person' : 'people'}`],
      ['Booked by', input.fullName],
      ['Contact Email', input.email],
      ['Contact Phone', input.phone],
      ['Total Price', formatMoney(input.budget, input.currency)],
      ['Booking Status', input.bookingStatus],
      ['Payment Status', input.paymentStatus],
    ])}
    ${emailButton('View Booking', input.bookingUrl)}
    ${emailParagraph('Payment can be completed securely at checkout. We will send you a separate confirmation once your payment is processed.')}
    <p style="margin:0;color:#6b7f79;font-size:13px;">Need to change or cancel? Log in to your account or reply to this email — free cancellation up to 7 days before departure.</p>`,
  );
  return { subject: `Booking confirmed: ${input.destinationName} (${input.bookingId})`, html };
}

// ---------------------------------------------------------------------------
// Payment successful
// ---------------------------------------------------------------------------
export interface PaymentEmailInput {
  name: string;
  bookingId: string;
  destinationName: string;
  amount: number;
  currency?: string;
  paymentId: string;
  paymentMethod: string;
  paidAt: Date | string;
  bookingUrl: string;
}

export function paymentSuccessEmail(input: PaymentEmailInput): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: `Payment received — ${input.destinationName}`,
      preheader: `Payment of ${formatMoney(input.amount, input.currency)} received for booking ${input.bookingId}.`,
    },
    `${emailHeading('Payment successful')}
    ${emailParagraph(`Hi ${firstName}, we have received your payment for <strong>${input.destinationName}</strong>. Your trip is fully confirmed — pack your bags!`)}
    ${bookingTable([
      ['Transaction ID', input.paymentId],
      ['Booking ID', input.bookingId],
      ['Destination', input.destinationName],
      ['Amount Paid', formatMoney(input.amount, input.currency)],
      ['Payment Method', input.paymentMethod],
      ['Paid On', formatDate(input.paidAt)],
    ])}
    ${emailButton('View Booking', input.bookingUrl)}
    ${emailParagraph('A detailed receipt has also been recorded in your Triplora account under My Bookings.')}
    <p style="margin:0;color:#6b7f79;font-size:13px;">Warm regards,<br /><strong>The Triplora Team</strong></p>`,
  );
  return { subject: `Payment received: ${input.destinationName} (${input.bookingId})`, html };
}

// ---------------------------------------------------------------------------
// Booking cancelled
// ---------------------------------------------------------------------------
export interface BookingCancelledEmailInput {
  name: string;
  bookingId: string;
  destinationName: string;
  travelDate: Date | string;
  refundStatus: string;
  refundAmount: number;
  currency?: string;
  bookingUrl: string;
}

export function bookingCancelledEmail(input: BookingCancelledEmailInput): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: `Booking cancelled — ${input.destinationName}`,
      preheader: `Your Triplora booking ${input.bookingId} has been cancelled.`,
    },
    `${emailHeading('Booking cancelled')}
    ${emailParagraph(`Hi ${firstName}, your booking for <strong>${input.destinationName}</strong> has been cancelled as requested.`)}
    ${bookingTable([
      ['Booking ID', input.bookingId],
      ['Destination', input.destinationName],
      ['Travel Date', formatDate(input.travelDate)],
      ['Refund Amount', formatMoney(input.refundAmount, input.currency)],
      ['Refund Status', input.refundStatus],
    ])}
    ${emailButton('Explore More Destinations', input.bookingUrl)}
    ${emailParagraph('We hope to welcome you to Kerala another time. If you cancelled by mistake or need help, reply to this email and our team will assist you.')}
    <p style="margin:0;color:#6b7f79;font-size:13px;">The Triplora Team</p>`,
  );
  return { subject: `Booking cancelled: ${input.destinationName} (${input.bookingId})`, html };
}

// ---------------------------------------------------------------------------
// AI trip saved
// ---------------------------------------------------------------------------
export interface AiTripSavedEmailInput {
  name: string;
  tripPlanId: string;
  title: string;
  destination: string;
  days: number;
  budget: string;
  travelStyle: string;
  tripUrl: string;
  exploreUrl: string;
}

export function aiTripSavedEmail(input: AiTripSavedEmailInput): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: `Trip saved — ${input.destination}`,
      preheader: `Your ${input.days}-day ${readableEnum(input.travelStyle, STYLE_LABELS).toLowerCase()} itinerary is ready.`,
    },
    `${emailHeading('Your AI trip is saved!')}
    ${emailParagraph(`Hi ${firstName}, we have saved your <strong>${input.days}-day</strong> itinerary${input.destination ? ` for <strong>${input.destination}</strong>` : ''}. You can open it anytime from <em>My AI Trips</em>.`)}
    ${bookingTable([
      ['Destination', input.destination],
      ['Travel Days', `${input.days} day${input.days === 1 ? '' : 's'}`],
      ['Budget', readableEnum(input.budget, BUDGET_LABELS)],
      ['Travel Style', readableEnum(input.travelStyle, STYLE_LABELS)],
    ])}
    ${emailButton('Open Trip', input.tripUrl)}
    ${emailParagraph('Want to explore more of Kerala before you go? Our trip planner can build another route in seconds.')}
    ${emailButtons([{ label: 'Plan Another Trip', url: input.exploreUrl, primary: false }])}
    <p style="margin:0;color:#6b7f79;font-size:13px;">Warm regards,<br /><strong>The Triplora Team</strong></p>`,
  );
  return { subject: `Your ${input.days}-day trip to ${input.destination} is saved`, html };
}

// ---------------------------------------------------------------------------
// Trip reminder (sent 24h before departure)
// ---------------------------------------------------------------------------
export interface TripReminderEmailInput {
  name: string;
  bookingId: string;
  destinationName: string;
  region: string;
  travelDate: Date | string;
  weather: string;
  packing: string;
  hotel: string;
  emergencyContact: string;
  bookingUrl: string;
  exploreUrl: string;
}

export function tripReminderEmail(input: TripReminderEmailInput): EmailRender {
  const firstName = input.name.split(' ')[0];
  const html = emailLayout(
    {
      title: `Trip tomorrow — ${input.destinationName}`,
      preheader: `Your Triplora trip to ${input.destinationName} departs in 24 hours.`,
    },
    `${emailHeading(`Your trip to ${input.destinationName} starts tomorrow!`)}
    ${emailParagraph(`Hi ${firstName}, get ready — your journey to <strong>${input.destinationName}</strong>, ${input.region} begins in less than 24 hours. Here is everything you need for a smooth start.`)}
    ${bookingTable([
      ['Booking ID', input.bookingId],
      ['Departure', formatDate(input.travelDate)],
      ['Weather', input.weather],
      ['Packing Reminder', input.packing],
      ['Stay', input.hotel],
      ['Emergency Contact', input.emergencyContact],
    ])}
    ${emailButton('View Booking', input.bookingUrl)}
    ${emailButtons([{ label: 'Explore More Destinations', url: input.exploreUrl, primary: false }])}
    ${emailParagraph('Have a wonderful trip! We hope Kerala gives you memories to treasure.')}
    <p style="margin:0;color:#6b7f79;font-size:13px;">The Triplora Team · <a href="mailto:support@triplora.travel" style="color:#0d7a66;">support@triplora.travel</a></p>`,
  );
  return { subject: `Trip tomorrow: ${input.destinationName} (${input.bookingId})`, html };
}
