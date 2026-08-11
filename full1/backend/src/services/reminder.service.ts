import { prisma } from '../config/db';
import { env } from '../config/env';
import { emailService, prefsOf } from './email.service';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from './notification.service';

const REMINDER_WINDOW_HOURS = 24;
const WEATHER_TIMEOUT_MS = 5000;

const DEFAULT_PACKING =
  'Light cotton clothing, a light rain jacket (monsoon season), comfortable walking shoes, sunscreen, mosquito repellent and your travel documents.';

const EMERGENCY_CONTACT =
  'Kerala Tourism Helpline: 1363 (toll-free from India) · National Emergency: 112';

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear skies',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy with icy rime',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Light rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

interface OpenMeteoResponse {
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
}

async function fetchWeather(latitude: number | null, longitude: number | null): Promise<string> {
  if (latitude === null || longitude === null) {
    return 'Weather forecast unavailable for this destination.';
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      latitude +
      '&longitude=' +
      longitude +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=1&timezone=auto';
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return 'Weather forecast unavailable.';
    const data = (await response.json()) as OpenMeteoResponse;
    const max = data.daily?.temperature_2m_max?.[0];
    const min = data.daily?.temperature_2m_min?.[0];
    const code = data.daily?.weather_code?.[0] ?? 0;
    const condition = WEATHER_CODES[code] ?? 'Variable';
    if (typeof min === 'number' && typeof max === 'number') {
      return `${condition}, ${Math.round(min)}\u00B0C to ${Math.round(max)}\u00B0C`;
    }
    return condition;
  } catch {
    return 'Weather forecast unavailable.';
  }
}

async function hasReminderSent(bookingId: string): Promise<boolean> {
  // Any log entry (queued, sent, skipped or failed) counts — the emailLog
  // retry scheduler re-delivers failed sends from the persisted HTML.
  const existing = await prisma.emailLog.findFirst({
    where: {
      type: 'TRIP_REMINDER',
      metadata: { contains: `"bookingId":"${bookingId}"` },
    },
  });
  return existing !== null;
}

/**
 * Send trip reminders to every booking departing within the next 24 hours.
 * Each booking is reminded exactly once (dedupe via EmailLog metadata).
 */
export async function runDueReminders(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      travelDate: { gte: now, lte: horizon },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: { destination: { select: { id: true, name: true, region: true, latitude: true, longitude: true } } },
  });

  let sent = 0;
  for (const booking of bookings) {
    try {
      if (await hasReminderSent(booking.bookingId)) continue;

      const user = await userRepository.findById(booking.userId).catch(() => null);
      const weather = await fetchWeather(booking.destination.latitude, booking.destination.longitude);

      emailService.sendTripReminderEmail(
        booking.email,
        {
          name: booking.fullName,
          bookingId: booking.bookingId,
          destinationName: booking.destination.name,
          region: booking.destination.region ?? 'Kerala',
          travelDate: booking.travelDate,
          weather,
          packing: booking.specialRequests
            ? `${DEFAULT_PACKING} Special requests on your booking: "${booking.specialRequests}"`
            : DEFAULT_PACKING,
          hotel: `Find hand-picked stays near ${booking.destination.name} on Triplora before you leave.`,
          emergencyContact: EMERGENCY_CONTACT,
          bookingUrl: `${env.email.frontendUrl}/bookings/${booking.id}`,
          exploreUrl: `${env.email.frontendUrl}/explore`,
        },
        user ? prefsOf(user) : null,
      );

      void notificationService.create(
        booking.userId,
        'TRIP_REMINDER',
        'Trip reminder',
        `Your trip to ${booking.destination.name} starts ${booking.travelDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Pack light and travel safe!`,
        `/bookings/${booking.id}`,
      );
      sent += 1;
    } catch (err) {
      console.error(
        `[email] trip reminder failed for booking ${booking.bookingId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  if (sent > 0) {
    console.log(`[email] queued ${sent} trip reminder(s) for the next ${REMINDER_WINDOW_HOURS} hours.`);
  }
  return sent;
}
