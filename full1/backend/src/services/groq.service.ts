import Groq from 'groq-sdk';
import { env } from '../config/env';
import { destinationRepository } from '../repositories/destination.repository';
import { toDestinationDTO } from '../dto/destination.mapper';
import { fetchWeather, weatherSummary } from './weather.service';
import { ApiError } from '../utils/ApiError';
import type { DestinationDTO } from '../types';

export type AiTripPlanInput = {
  budget: 'RELAXED' | 'PREMIUM' | 'LUXURY';
  days: number;
  travelStyle: 'ROMANTIC' | 'FAMILY' | 'SOLO' | 'FRIENDS';
  interests: string[];
  destination?: string | null;
  travelers?: string | null;
};

export type AiContact = { label: string; phone: string };

export type AiItineraryDay = {
  day: number;
  destination: DestinationDTO;
  focus: string;
  morning: string;
  afternoon: string;
  evening: string;
  hotels: string[];
  restaurants: string[];
  foodRecommendations: string[];
  estimatedDailyCost: string;
  localTransportation: string[];
  nearbyAttractions: string[];
  hiddenGems: string[];
  shopping: string[];
  travelNotes: string;
};

export type AiTripPlanResult = {
  title: string;
  summary: string;
  bestSeason: string;
  weatherAdvice: string;
  packingChecklist: string[];
  travelTips: string[];
  emergencyContacts: AiContact[];
  estimatedTotalBudget: string;
  itinerary: AiItineraryDay[];
};

export type AiTripPlanParsed = {
  destination: string | null;
  days: number;
  budget: AiTripPlanInput['budget'];
  travelStyle: AiTripPlanInput['travelStyle'];
  interests: string[];
  travelers: string | null;
};

type AiDayDetail = AiItineraryDay & { destination: string | DestinationDTO };

type AiRawResponse = {
  title?: string;
  summary?: string;
  bestSeason?: string;
  weatherAdvice?: string;
  packingChecklist?: string[];
  travelTips?: string[];
  emergencyContacts?: AiContact[];
  estimatedTotalBudget?: string;
  days?: AiDayDetail[];
  itinerary?: AiDayDetail[];
};

function rawDays(raw: AiRawResponse): AiDayDetail[] {
  if (Array.isArray(raw.days) && raw.days.length > 0) return raw.days;
  if (Array.isArray(raw.itinerary) && raw.itinerary.length > 0) return raw.itinerary;
  return Array.isArray(raw.days) ? raw.days : [];
}

type DestinationChoice = Awaited<ReturnType<typeof destinationRepository.findAll>>[number];

type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';

// Reduced during development to stay within free-tier token budgets.
// Longer trips get a slightly larger allowance, still well under the hard ceiling.
const MAX_TOKENS = 4096;
const MAX_TOKENS_LONG = 6144;
const CHAT_MAX_TOKENS = 6144;
const PARSE_MAX_TOKENS = 512;
const RETRY_DELAY_MS = 3000; // short delay before a single retry of temporary failures
const REQUEST_TIMEOUT = 120000; // 2 minutes - graceful for long itineraries

const tokensForDays = (days: number): number => (days > 7 ? MAX_TOKENS_LONG : MAX_TOKENS);

const budgetLabels: Record<AiTripPlanInput['budget'], string> = {
  RELAXED: 'Relaxed (comfort & value)',
  PREMIUM: 'Premium (boutique stays)',
  LUXURY: 'Luxury (the very best)',
};

const styleLabels: Record<AiTripPlanInput['travelStyle'], string> = {
  ROMANTIC: 'Romantic escape',
  FAMILY: 'Family adventure',
  SOLO: 'Solo journey',
  FRIENDS: 'Friends getaway',
};

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function asContacts(value: unknown): AiContact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as { label?: unknown; phone?: unknown };
      return {
        label: asString(o.label, 'Emergency'),
        phone: asString(o.phone, ''),
      };
    })
    .filter((contact): contact is AiContact => contact !== null && contact.phone.length > 0);
}

function assertGroqConfigured(): void {
  if (!env.groq.apiKey) {
    throw ApiError.internal('Groq API key is not configured. Set GROQ_API_KEY in the backend .env file.');
  }
}

function buildGroqClient(): Groq {
  return new Groq({ apiKey: env.groq.apiKey, timeout: REQUEST_TIMEOUT });
}

type GroqErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  stack?: string;
  headers?: unknown;
  error?: unknown;
  response?: { data?: unknown };
  model?: unknown;
  request_id?: unknown;
};

function logGroqError(err: unknown, label: string): void {
  const e = (err ?? {}) as GroqErrorLike;
  const responseBody =
    (e as { response?: { data?: unknown } }).response?.data ?? (e as { error?: unknown }).error ?? null;
  console.error(
    `[groq] ${label}`,
    JSON.stringify(
      {
        httpStatus: e.status ?? null,
        errorCode: e.code ?? null,
        errorMessage: e.message ?? (err instanceof Error ? err.message : ''),
        responseBody,
        requestId: e.request_id ?? null,
        model: e.model ?? null,
        headers: e.headers ?? null,
        stack: e.stack ?? (err instanceof Error ? err.stack : ''),
      },
      null,
      2,
    ),
  );
}

// Maps a Groq SDK error to a user-facing ApiError AND logs the complete original
// error (HTTP status, code, message, response body, headers and stack trace) so
// the real root cause is never hidden behind a generic message.
function translateGroqError(err: unknown): ApiError {
  const e = (err ?? {}) as GroqErrorLike;
  const status = e.status ?? 0;
  const code = e.code ?? '';
  const rawMessage = e.message ?? (err instanceof Error ? err.message : '');
  const combined = `${status} ${code} ${rawMessage}`.toLowerCase();

  logGroqError(err, 'Groq error');

  if (status === 401 || code === 'invalid_api_key' || /api.?key|unauthorized|invalid.*credentials|authentication/i.test(combined)) {
    return ApiError.badRequest('Groq authentication failed - invalid API key. Check the GROQ_API_KEY in the backend .env file.');
  }
  if (status === 429 || code === 'rate_limit_exceeded' || /429|rate.?limit|too many requests/i.test(combined)) {
    return ApiError.badRequest('Groq free-tier rate limit reached. Please wait a few minutes and try again.');
  }
  if (code === 'context_length_exceeded' || /context (length|window)|max.*token|input.*exceed|too (many|long).*(token|input)/i.test(combined)) {
    return ApiError.badRequest('The itinerary is too long for the AI model context. Try fewer days or a shorter trip.');
  }
  if (status === 404 || code === 'model_not_found' || /model.*not (found|exist)/i.test(combined)) {
    return ApiError.badRequest(`Groq model not found: ${typeof e.model === 'string' ? e.model : env.groq.model}. Check GROQ_MODEL in the backend .env file.`);
  }
  if (status === 413 || code === 'payload_too_large' || /payload.*too large|content.*too large|request.*too large/i.test(combined)) {
    return ApiError.badRequest('The AI request is too large for Groq. Try fewer days or a shorter trip.');
  }
  if (status === 500 || code === 'internal_server_error' || /internal.*(server )?error/i.test(combined)) {
    return ApiError.badRequest('The Groq AI service encountered an internal error. Please try again later.');
  }
  if (/timeout|timed ?out|ECONNABORTED|ETIMEDOUT|took too long/i.test(combined)) {
    return ApiError.badRequest('The AI service took too long. Please try again with a shorter trip.');
  }
  if (status === 400 && /json/i.test(combined)) {
    return ApiError.badRequest('The AI service returned an invalid JSON response.');
  }
  // Fallback: surface the real Groq reason instead of hiding it.
  return ApiError.badRequest(
    rawMessage
      ? `The AI trip planner failed: ${rawMessage}${code ? ` (code: ${code})` : ''}`
      : 'The AI trip planner could not be reached. Please try again later.',
  );
}

// Destinations that anchor a region deserve the most days - the planner is told
// to spend 2-3 nights here whenever the trip length allows.
const MAJOR_DESTINATIONS = [
  'munnar',
  'alleppey',
  'wayanad',
  'thekkady',
  'kovalam',
  'varkala',
  'kumarakom',
  'bekal',
  'athirappally',
  'vagamon',
];

// Satellite places that belong to a neighbouring anchor's stay. They are shown
// to the planner as day-trip extensions, NOT as separate bases, so nearby
// attractions get grouped under one destination (professional tour-package logic).
const SATELLITE_GROUPS: Record<string, string[]> = {
  Munnar: ['Top Station', 'Eravikulam National Park', 'Mattupetty Dam', 'Anamudi Peak', 'Chinnakanal', 'Kolukkumalai', 'Cheeyappara', 'Valara', 'Idukki Dam'],
  Wayanad: ['Chembra Peak', 'Edakkal Caves', 'Meenmutty', 'Soochipara', 'Banasura Sagar', 'Pookode', 'Kuruvadweep', 'Nilambur Teak Museum'],
  Alleppey: ['Kuttanad', 'Krishnapuram Palace', 'Marari Beach'],
  Kochi: ['Marine Drive', 'Santa Cruz Basilica', 'Cherai', 'Hill Palace', 'Thattekad'],
  'Bekal/Kannur coast': ['Ranipuram', 'Valiyaparamba', 'Kappad', 'Payyambalam', 'Muzhappilangad', 'St. Angelo Fort'],
  Kovalam: ['Shankumugham', 'Ponmudi', 'Napier Museum', 'Poovar Island'],
  'Kollam area': ['Jatayu Earth Center', 'Ashtamudi', 'Munroe Island', 'Thenmala', 'Palaruvi'],
  Kumarakom: ['Kuttanad day cruise'],
  'Kozhikode area': ['Kozhikode Beach', 'Beypore', 'Kottakkunnu', 'Thusharagiri'],
  'Thrissur city': ['Thrissur Zoo', 'Vadakkumnathan Temple', 'Cheraman Juma Masjid', 'Sakthan Thampuran Palace'],
  'Athirappally': ['Vazhachal'],
  'Palakkad area': ['Malampuzha Dam'],
  Vagamon: ['Ilaveezhapoonchira'],
  Sabarimala: ['Gavi'],
};

function buildDestinationCatalog(catalog: DestinationChoice[]): string {
  return catalog
    .map((d) => {
      const tops = [...(d.highlights ?? []), ...(d.activities ?? [])].slice(0, 4).join('; ');
      return `- ${d.name} | ${d.region} | ideal stay: ${d.duration || '1-2 days'} | ${tops}`;
    })
    .join('\n');
}

function buildSatelliteGroups(): string {
  return Object.entries(SATELLITE_GROUPS)
    .map(([anchor, members]) => `- ${anchor}: ${members.join(', ')}`)
    .join('\n');
}

function buildUserPrompt(
  input: AiTripPlanInput,
  catalog: DestinationChoice[],
  anchor: { name: string; inDb: boolean } | null,
  weatherLine: string | null = null,
): string {
  const catalogBlock = buildDestinationCatalog(catalog);
  const satelliteBlock = buildSatelliteGroups();

  const locationLines = anchor
    ? anchor.inDb
      ? `Trip location: ${anchor.name} (catalog destination - base the trip there; nearby catalog places OK)\n`
      : `Trip location: ${anchor.name} (NOT in catalog - design the ENTIRE trip around it; do not use catalog destinations)\n`
    : `Only these destinations are available (use ONLY verbatim names from this list):\n${catalogBlock}\n`;

  return `Create a ${input.days}-day Kerala (India) itinerary like a professional tour operator.
Budget: ${budgetLabels[input.budget]}. Style: ${styleLabels[input.travelStyle]}.${input.travelers ? ` Travelers: ${input.travelers}.` : ''}
Interests: ${input.interests.join(', ') || 'General sightseeing'}.
${locationLines}
${weatherLine ? `Current weather at the trip location (use this to plan activities): ${weatherLine}\n` : ''}
Satellite places belong to their anchor's stay and must NOT be used as separate bases (visit them from the anchor):
${satelliteBlock}
Rules:
1. Costs in INR (₹), realistic for the budget.
2. Hotels/restaurants/food/attractions/shopping specific to each day's destination.
3. Emergency contacts: Police 100, Ambulance 108, Fire 101, Tourist Helpline 1363.
4. Exactly ${input.days} days. Keep each day concise (under ~200 words total across all fields).
5. MULTI-DAY STAYS: keep the SAME destination for 2-3 CONSECUTIVE days when it has enough attractions (see "ideal stay" above). Major destinations (${MAJOR_DESTINATIONS.join(', ')}) deserve the most days. NEVER split every day across different destinations when a longer stay is justified.
6. Consecutive days at the same destination MUST have different focus and entirely unique attractions, activities, hotels, restaurants and food - nothing repeats across days (e.g. Munnar: Day 1 tea estates & viewpoints, Day 2 waterfalls & villages, Day 3 Eravikulam & adventure).
7. ROUTING: follow a logical geographic progression with minimal backtracking. Typical circuits: (a) south: Kochi -> Munnar high ranges -> Thekkady -> Alleppey/Kumarakom backwaters -> Kovalam/Varkala coast -> Trivandrum; (b) north: Kochi -> Athirappally -> Wayanad -> Kannur/Kasaragod coast (Bekal); (c) Kollam area: Ashtamudi/Munroe Island -> Thenmala -> Varkala. Travel between consecutive destinations must be feasible in half a day or less.
8. Each day's "destination" must be a verbatim name from the list above; consecutive days MAY repeat the same name (that is a multi-day stay - this is expected and good).
${anchor && !anchor.inDb ? `9. Every day's "destination" must be exactly "${anchor.name}".` : ''}

Return ONLY strict JSON (no markdown), schema:
{
  "title": "short appealing title",
  "summary": "2-3 sentences",
  "bestSeason": "e.g. October - March",
  "weatherAdvice": "1-2 sentences",
  "packingChecklist": ["item"],
  "travelTips": ["tip"],
  "emergencyContacts": [{"label":"Police","phone":"100"}],
  "estimatedTotalBudget": "e.g. ₹45,000 - ₹60,000 for two",
  "days": [{
    "day": 1,
    "destination": "verbatim destination name",
    "focus": "one line",
    "morning": "activities",
    "afternoon": "activities",
    "evening": "activities",
    "hotels": ["hotel"],
    "restaurants": ["restaurant"],
    "foodRecommendations": ["local dish"],
    "estimatedDailyCost": "e.g. ₹6,000 - ₹8,000",
    "localTransportation": ["mode"],
    "nearbyAttractions": ["attraction"],
    "hiddenGems": ["place"],
    "shopping": ["market"],
    "travelNotes": "1-2 practical notes"
  }]
}`;
}

function toCustomDestinationDTO(name: string): DestinationDTO {
  const slug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'custom';
  return {
    id: `custom-${slug}`,
    slug,
    name,
    tagline: '',
    region: '',
    category: 'Custom',
    image: FALLBACK_IMAGE,
    gallery: [],
    rating: 0,
    reviews: 0,
    popularityScore: 0,
    priceFrom: 0,
    latitude: null,
    longitude: null,
    duration: '',
    bestSeason: '',
    description: '',
    longDescription: '',
    highlights: [],
    activities: [],
  };
}

function pickDestination(
  wanted: string,
  byName: Map<string, DestinationChoice>,
  unused: Set<string>,
  all: DestinationChoice[],
): DestinationChoice {
  const key = normalize(wanted);
  const exact = byName.get(key);
  if (exact) {
    // Multi-day stays are intentional - a matching repeat is always honoured.
    return exact;
  }

  // Loose: any available destination whose name matches the AI's choice.
  const loose = all.find(
    (d) => d.name && (normalize(d.name) === key || normalize(d.name).includes(key) || key.includes(normalize(d.name))),
  );
  if (loose) {
    return loose;
  }

  // Unmatched name: prefer an unused destination, else any remaining one.
  // Only fallbacks consume from `unused`, so real picks stay repeatable.
  const unusedDest = all.find((d) => unused.has(d.id));
  const fallback = unusedDest ?? all[0];
  if (fallback) unused.delete(fallback.id);
  return fallback;
}

function normalizeDay(
  day: Partial<AiDayDetail> | undefined,
  dayNumber: number,
  destination: DestinationDTO,
): AiItineraryDay {
  return {
    day: dayNumber,
    destination,
    focus: asString(day?.focus, 'Explore the highlights of the region'),
    morning: asString(day?.morning, ''),
    afternoon: asString(day?.afternoon, ''),
    evening: asString(day?.evening, ''),
    hotels: asStringList(day?.hotels),
    restaurants: asStringList(day?.restaurants),
    foodRecommendations: asStringList(day?.foodRecommendations),
    estimatedDailyCost: asString(day?.estimatedDailyCost, ''),
    localTransportation: asStringList(day?.localTransportation),
    nearbyAttractions: asStringList(day?.nearbyAttractions),
    hiddenGems: asStringList(day?.hiddenGems),
    shopping: asStringList(day?.shopping),
    travelNotes: asString(day?.travelNotes, ''),
  };
}

function sanitizeDestination(destination: unknown, fallbackName: string): DestinationDTO {
  if (!destination || typeof destination !== 'object') {
    return toCustomDestinationDTO(fallbackName);
  }
  const d = destination as Record<string, unknown>;
  const name = asString(d.name, fallbackName);
  const base = toCustomDestinationDTO(name);
  return {
    id: typeof d.id === 'string' && d.id ? d.id : base.id,
    slug: typeof d.slug === 'string' && d.slug ? d.slug : base.slug,
    name,
    tagline: asString(d.tagline, ''),
    region: asString(d.region, ''),
    category: asString(d.category, 'Custom'),
    image: typeof d.image === 'string' && d.image ? d.image : FALLBACK_IMAGE,
    gallery: asStringList(d.gallery),
    rating: typeof d.rating === 'number' && d.rating > 0 ? d.rating : 0,
    reviews: typeof d.reviews === 'number' ? d.reviews : 0,
    popularityScore: typeof d.popularityScore === 'number' ? d.popularityScore : 0,
    priceFrom: typeof d.priceFrom === 'number' ? d.priceFrom : 0,
    latitude: typeof d.latitude === 'number' ? d.latitude : null,
    longitude: typeof d.longitude === 'number' ? d.longitude : null,
    duration: asString(d.duration, ''),
    bestSeason: asString(d.bestSeason, ''),
    description: asString(d.description, ''),
    longDescription: asString(d.longDescription, ''),
    highlights: asStringList(d.highlights),
    activities: asStringList(d.activities),
  };
}

function normalizePlan(raw: AiRawResponse, daysCount: number, fallbackDayDestination: (index: number) => DestinationDTO): AiTripPlanResult {
  const daySource = rawDays(raw);
  const itinerary = daySource.slice(0, daysCount).map((day, index) => {
    const dayNumber = index + 1;
    const destination =
      typeof day?.destination === 'string' && day.destination
        ? fallbackDayDestination(dayNumber)
        : sanitizeDestination(day?.destination, fallbackDayDestination(dayNumber).name);
    return normalizeDay(day, dayNumber, destination);
  });

  return {
    title: asString(raw.title, `Kerala getaway - ${daysCount} days`),
    summary: asString(raw.summary, `A ${daysCount}-day journey through the best of Kerala.`),
    bestSeason: asString(raw.bestSeason, 'October - March'),
    weatherAdvice: asString(raw.weatherAdvice, ''),
    packingChecklist: asStringList(raw.packingChecklist),
    travelTips: asStringList(raw.travelTips),
    emergencyContacts: asContacts(raw.emergencyContacts),
    estimatedTotalBudget: asString(raw.estimatedTotalBudget, ''),
    itinerary,
  };
}

function extractDays(raw: AiRawResponse): number {
  return rawDays(raw).length;
}

// Only obvious temporary failures are retried once (rate limit, timeout, 5xx, 413).
// Auth/validation/JSON errors are permanent and never retried.
function isRetryableGroqError(err: unknown): boolean {
  const e = (err ?? {}) as GroqErrorLike;
  const status = e.status ?? 0;
  const code = e.code ?? '';
  const rawMessage = e.message ?? (err instanceof Error ? err.message : '');
  const combined = `${status} ${code} ${rawMessage}`.toLowerCase();
  return (
    status === 429 ||
    status >= 500 ||
    status === 413 ||
    code === 'rate_limit_exceeded' ||
    /429|rate.?limit|too many requests|timeout|timed ?out|ECONNABORTED|ETIMEDOUT|took too long/i.test(combined)
  );
}

async function runGroqJson(prompt: string, system: string, maxTokens = MAX_TOKENS): Promise<AiRawResponse> {
  assertGroqConfigured();
  const groq = buildGroqClient();

  const call = async (): Promise<string> => {
    const completion = await groq.chat.completions.create({
      model: env.groq.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });
    return completion.choices?.[0]?.message?.content ?? '';
  };

  let content: string;
  try {
    content = await call();
  } catch (err) {
    if (isRetryableGroqError(err)) {
      logGroqError(err, 'Temporary failure - retrying once');
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      try {
        content = await call();
      } catch (retryErr) {
        throw translateGroqError(retryErr);
      }
    } else {
      throw translateGroqError(err);
    }
  }

  if (!content.trim()) {
    throw ApiError.internal('The AI trip planner returned an empty response.');
  }

  try {
    return JSON.parse(content) as AiRawResponse;
  } catch {
    throw ApiError.internal('The AI trip planner returned an invalid response.');
  }
}

export const groqService = {
  async generateTripPlan(input: AiTripPlanInput): Promise<AiTripPlanResult> {
    const destinations = await destinationRepository.findAll();
    if (destinations.length === 0) {
      throw ApiError.internal('No destinations available to build an itinerary');
    }

    // Resolve an explicit destination (typed or picked from autocomplete).
    let anchor: { name: string; inDb: boolean } | null = null;
    if (input.destination && input.destination.trim()) {
      const key = normalize(input.destination);
      const match = destinations.find((d) => d.name && normalize(d.name) === key);
      anchor = { name: input.destination.trim(), inDb: !!match };
    }

    // Live weather for the anchored destination (cached 15 min, never throws).
    let weatherLine: string | null = null;
    if (anchor?.inDb) {
      const matched = destinations.find((d) => d.name && normalize(d.name) === normalize(anchor.name));
      if (matched && typeof matched.latitude === 'number' && typeof matched.longitude === 'number') {
        const weather = await fetchWeather(matched.latitude, matched.longitude);
        if (weather) {
          weatherLine = weatherSummary(weather);
          console.log(`[groq] injected weather for ${matched.name} (${weather.current.temperature}\u00B0C, ${weather.current.condition})`);
        }
      }
    }

    const raw = await runGroqJson(
      buildUserPrompt(input, destinations, anchor, weatherLine),
      'You are an expert travel itinerary planner. You always respond with valid JSON in the exact schema requested and only use the destinations provided.',
      tokensForDays(input.days),
    );

    const dayCount = extractDays(raw);
    if (dayCount === 0) {
      throw ApiError.internal('The AI trip planner did not return any itinerary days.');
    }

    const byName = new Map<string, DestinationChoice>();
    for (const d of destinations) {
      if (d.name) byName.set(normalize(d.name), d);
    }
    const unused = new Set(destinations.map((d) => d.id));

    // If the AI returns fewer days than requested (or skips a destination
    // name), the missing days extend the last real destination - so a planned
    // multi-day stay is never truncated into one-day hops.
    let lastWanted = '';
    const plan = normalizePlan(raw, input.days, (dayNumber) => {
      if (anchor && !anchor.inDb) {
        return toCustomDestinationDTO(anchor.name);
      }
      const aiDay = raw.days?.[dayNumber - 1];
      const aiWanted =
        aiDay && typeof aiDay.destination === 'string' && aiDay.destination.trim() ? aiDay.destination.trim() : '';
      if (aiWanted) lastWanted = aiWanted;
      const wanted = aiWanted || lastWanted;
      const picked = pickDestination(wanted, byName, unused, destinations);
      return toDestinationDTO(picked);
    });

    return plan;
  },

  async generateTripPlanFromPrompt(
    prompt: string,
  ): Promise<{ plan: AiTripPlanResult; parsed: AiTripPlanParsed }> {
    const parsed = await this.parseTripPrompt(prompt);
    const plan = await this.generateTripPlan({
      destination: parsed.destination,
      budget: parsed.budget,
      days: parsed.days,
      travelStyle: parsed.travelStyle,
      interests: parsed.interests,
      travelers: parsed.travelers,
    });
    return { plan, parsed };
  },

  async parseTripPrompt(prompt: string): Promise<AiTripPlanParsed> {
    const system =
      'You are a travel-intent parser. Extract structured trip details from a user\'s free-text request. ' +
      'Map budget hints: under ₹15,000 = RELAXED, ₹15,000 - ₹50,000 = PREMIUM, above ₹50,000 = LUXURY. ' +
      'Map trip length hints: weekend = 3 days, week = 7 days, fortnight = 10 days. ' +
      'Map travel style hints: honeymoon/romantic = ROMANTIC, family/kids = FAMILY, solo/alone = SOLO, friends/group = FRIENDS. ' +
      'Respond ONLY with valid JSON in exactly this shape: ' +
      '{"destination": "place name or null", "days": number|null, "budget": "RELAXED|PREMIUM|LUXURY|null", ' +
      '"travelStyle": "ROMANTIC|FAMILY|SOLO|FRIENDS|null", "interests": ["interest"], "travelers": "e.g. 2 adults or null"}';

    let raw: AiRawResponse & {
      destination?: unknown;
      days?: unknown;
      budget?: unknown;
      travelStyle?: unknown;
      interests?: unknown;
      travelers?: unknown;
    };
    try {
      raw = await runGroqJson(prompt, system, PARSE_MAX_TOKENS);
    } catch {
      // Never fail the planner - fall back to sensible defaults.
      return {
        destination: null,
        days: 5,
        budget: 'PREMIUM',
        travelStyle: 'FAMILY',
        interests: [],
        travelers: null,
      };
    }

    const budget = ['RELAXED', 'PREMIUM', 'LUXURY'].includes(String(raw.budget ?? ''))
      ? (String(raw.budget) as AiTripPlanInput['budget'])
      : 'PREMIUM';
    const travelStyle = ['ROMANTIC', 'FAMILY', 'SOLO', 'FRIENDS'].includes(String(raw.travelStyle ?? ''))
      ? (String(raw.travelStyle) as AiTripPlanInput['travelStyle'])
      : 'FAMILY';
    const days = typeof raw.days === 'number' && raw.days >= 1 && raw.days <= 30 ? Math.round(raw.days) : 5;

    return {
      destination: asString(raw.destination, '') || null,
      days,
      budget,
      travelStyle,
      interests: asStringList(raw.interests).slice(0, 12),
      travelers: asString(raw.travelers, '') || null,
    };
  },

  /**
   * Chat assistant: edits an EXISTING itinerary (never a full regeneration).
   * Returns the complete modified itinerary in the same schema.
   */
  async editItinerary(current: AiTripPlanResult, message: string, history: ChatHistoryItem[]): Promise<AiTripPlanResult> {
    if (!Array.isArray(current?.itinerary) || current.itinerary.length === 0) {
      throw ApiError.badRequest('This trip has no AI itinerary to edit.');
    }

    const historyBlock =
      history.length > 0
        ? `\n\nConversation so far:\n${history
            .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
            .join('\n')}`
        : '';

    const slim: AiTripPlanResult = {
      ...current,
      itinerary: current.itinerary.map((day) => ({
        ...day,
        destination: {
          name: day.destination.name,
          id: day.destination.id,
        },
      })) as AiTripPlanResult['itinerary'],
    };

    const prompt = `You are editing an EXISTING travel itinerary. Apply the user's request to this exact trip.
NEVER regenerate a completely new trip. Keep every section the user did not ask to change.
Preserve the JSON schema exactly (the day list MUST be under the key "days" as an array of day objects). You may adjust the title, summary, budget and any day's sections (including changing a day's destination name, hotels, costs, etc.).

CURRENT ITINERARY (JSON):
${JSON.stringify(slim)}
${historyBlock}
LATEST USER REQUEST: ${message}

Respond ONLY with the COMPLETE modified itinerary as valid JSON in the exact same schema shown above, with the day objects under the "days" key.`;

    const raw = await runGroqJson(
      prompt,
      'You are a precise travel itinerary editor. You always reply with the complete modified itinerary as valid JSON in the exact schema provided, and you only edit what the user asks for.',
      CHAT_MAX_TOKENS,
    );

    const dayCount = extractDays(raw);
    if (dayCount === 0) {
      throw ApiError.internal('The AI assistant returned an empty itinerary.');
    }

    return normalizePlan(raw, Math.max(dayCount, current.itinerary.length), (index) => {
      const previous = current.itinerary[index - 1];
      if (previous) return sanitizeDestination(previous.destination, previous.destination.name);
      return toCustomDestinationDTO(`Day ${index}`);
    });
  },
};
