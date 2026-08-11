// Live weather via Open-Meteo (free, no API key). Results are cached
// in-memory for 15 minutes to avoid hammering the upstream API.

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 15 * 60 * 1000;

export const WMO_WEATHER_CODES: Record<number, string> = {
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

export function isRainyCode(code: number): boolean {
  return code >= 51 || code === 45 || code === 48;
}

export interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  condition: string;
  code: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  uvIndex: number;
  visibilityKm: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherDay {
  date: string;
  dayLabel: string;
  condition: string;
  code: number;
  min: number;
  max: number;
}

export interface WeatherResult {
  location: { latitude: number; longitude: number };
  current: WeatherCurrent;
  daily: WeatherDay[];
  fetchedAt: string;
}

interface OpenMeteoCurrent {
  time: string;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  wind_speed_10m?: number;
}

interface OpenMeteoResponse {
  timezone?: string;
  current?: OpenMeteoCurrent;
  hourly?: {
    time?: string[];
    uv_index?: number[];
    visibility?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

const cache = new Map<string, { data: WeatherResult; expiresAt: number }>();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function conditionOf(code: number | undefined): string {
  return WMO_WEATHER_CODES[code ?? 0] ?? 'Variable';
}

function formatTime(iso: string | undefined, timezone: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  try {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

/**
 * Fetch live weather for a coordinate. Never throws: returns null on any
 * upstream failure so callers can degrade gracefully.
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  const key = cacheKey(latitude, longitude);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  const params =
    'latitude=' +
    latitude +
    '&longitude=' +
    longitude +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&hourly=uv_index,visibility,precipitation_probability' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset' +
    '&timezone=auto&forecast_days=7';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(`${OPEN_METEO_API}?${params}`, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[weather] Open-Meteo responded ${response.status} for ${key}`);
      return null;
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const timezone = data.timezone ?? 'Asia/Kolkata';

    // Pick the hourly values matching the current hour.
    const currentHour = (data.current?.time ?? '').slice(0, 13);
    let uvIndex = 0;
    let visibilityKm = 0;
    let rainProbability = 0;
    if (data.hourly?.time) {
      const idx = data.hourly.time.findIndex((t) => t.startsWith(currentHour));
      const i = idx >= 0 ? idx : 0;
      uvIndex = data.hourly.uv_index?.[i] ?? 0;
      const vis = data.hourly.visibility?.[i];
      visibilityKm = typeof vis === 'number' ? Math.round(vis / 1000) : 0;
      rainProbability = data.hourly.precipitation_probability?.[i] ?? 0;
    }

    const daily = (data.daily?.time ?? []).map((date, i) => ({
      date,
      dayLabel: dayLabel(date, i),
      condition: conditionOf(data.daily?.weather_code?.[i]),
      code: data.daily?.weather_code?.[i] ?? 0,
      min: Math.round(data.daily?.temperature_2m_min?.[i] ?? 0),
      max: Math.round(data.daily?.temperature_2m_max?.[i] ?? 0),
    }));

    const result: WeatherResult = {
      location: { latitude, longitude },
      current: {
        temperature: Math.round(data.current?.temperature_2m ?? 0),
        feelsLike: Math.round(data.current?.apparent_temperature ?? 0),
        condition: conditionOf(data.current?.weather_code),
        code: data.current?.weather_code ?? 0,
        humidity: Math.round(data.current?.relative_humidity_2m ?? 0),
        windSpeed: Math.round(data.current?.wind_speed_10m ?? 0),
        rainProbability: Math.round(rainProbability),
        uvIndex: Math.round(uvIndex * 10) / 10,
        visibilityKm,
        sunrise: formatTime(data.daily?.sunrise?.[0], timezone),
        sunset: formatTime(data.daily?.sunset?.[0], timezone),
      },
      daily,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.error(`[weather] fetch failed for ${key}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/** Short human-readable summary used for the AI prompt. */
export function weatherSummary(weather: WeatherResult): string {
  const c = weather.current;
  const base = `${c.condition}, ${c.temperature}\u00B0C (feels like ${c.feelsLike}\u00B0C), humidity ${c.humidity}%, wind ${c.windSpeed} km/h, rain probability ${c.rainProbability}%`;
  const today = weather.daily[0];
  const high = today ? `, daily high ${today.max}\u00B0C` : '';

  let advice: string;
  if (isRainyCode(c.code) || c.rainProbability >= 60) {
    if (c.code >= 80 || c.rainProbability >= 80) {
      advice =
        'Heavy rain expected: avoid trekking and open-water boating; schedule museums, tea museums, spice gardens, indoor attractions and short scenic viewpoints instead.';
    } else {
      advice =
        'Rain expected: prioritize museums, tea museums, spice gardens, indoor attractions and covered viewpoints; keep flexible outdoor slots.';
    }
  } else if (c.code <= 1) {
    advice = 'Clear weather: ideal for trekking, boating, beaches, viewpoints and outdoor sightseeing.';
  } else if (today && today.max >= 33) {
    advice = 'Very hot: plan sightseeing for early morning and late afternoon; avoid midday sun and carry water.';
  } else if (c.code === 3 || c.code === 45 || c.code === 48) {
    advice = 'Overcast/foggy: prefer morning indoor plans and start viewpoints later when visibility improves.';
  } else {
    advice = 'Mild weather: balanced mix of outdoor and indoor activities works well.';
  }

  return `${base}${high}. ${advice}`;
}
