import Groq from 'groq-sdk';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { toDestinationDTO } from '../dto/destination.mapper';
import { analyticsLogService } from './analyticsLog.service';
import { buildPaginationMeta } from '../utils/ApiResponse';
import {
  normalizeText,
  bestFuzzyMatch,
  fuzzyScore,
  haversineKm,
  parseAmount,
} from '../utils/textMatch';
import type { DestinationDTO } from '../types';
import type { Destination, Category } from '@prisma/client';

type DestinationRow = Destination & { category: Category };

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SmartSearchFilters = {
  categories: string[];
  region: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  minRating: number | null;
  duration: string | null;
  travelStyle: string | null;
  season: string | null;
  crowd: string | null;
  proximity: { label: string; radiusKm: number } | null;
  keywords: string[];
};

export interface SmartSearchItem {
  destination: DestinationDTO;
  score: number;
  reasons: string[];
}

export type SmartSearchResult = {
  items: SmartSearchItem[];
  filters: SmartSearchFilters;
  explanation: string;
  usedAi: boolean;
  noExactMatch: boolean;
  suggestions: string[];
  meta: ReturnType<typeof buildPaginationMeta>;
};

export interface SuggestEntry {
  type: 'destination' | 'category' | 'region' | 'activity';
  label: string;
  value: string;
}

/* ------------------------------------------------------------------ */
/* Lexicon built from the destination DB (cached 5 minutes)            */
/* ------------------------------------------------------------------ */

interface Lexicon {
  categoryNames: string[];
  categoryKeywords: string[];
  regions: string[];
  regionAliases: string[];
  placeNames: string[];
  placeAliasNames: string[];
  activities: string[];
  regionCenters: Map<string, { lat: number; lng: number }>;
  places: Array<{ name: string; region: string; lat: number; lng: number }>;
}

let lexiconCache: { data: Lexicon; at: number } | null = null;
const LEXICON_TTL_MS = 5 * 60 * 1000;

/** Common-word -> category name, layered over DB category names. */
const CATEGORY_WORD_MAP: Array<[string[], string]> = [
  [['beach', 'beaches', 'seaside', 'seashore', 'sea'], 'Beach'],
  [['backwater', 'backwaters', 'houseboat', 'houseboats', 'kettuvalam', 'cruise'], 'Backwaters'],
  [['hill', 'hills', 'hillstation', 'mountain', 'mountains', 'highrange', 'misty'], 'Hill Station'],
  [['waterfall', 'waterfalls', 'falls', 'fall'], 'Waterfall'],
  [['fort', 'forts', 'palace', 'palaces', 'heritage', 'history', 'archaeology', 'royal'], 'Heritage'],
  [['wildlife', 'sanctuary', 'safari', 'elephants', 'tiger'], 'Wildlife'],
  [['nationalpark', 'national park'], 'National Park'],
  [['temple', 'temples', 'pilgrimage', 'pilgrim', 'shrine', 'spiritual'], 'Pilgrimage'],
  [['church', 'basilica', 'cathedral'], 'Church'],
  [['mosque', 'masjid'], 'Mosque'],
  [['museum', 'museums'], 'Museum'],
  [['zoo'], 'Zoo'],
  [['island', 'islands', 'isle'], 'Island'],
  [['dam', 'dams', 'reservoir'], 'Dam'],
  [['viewpoint', 'view point', 'peak', 'summit', 'panorama', 'viewpoints'], 'Viewpoint'],
  [['adventure'], 'Adventure'],
  [['tea plantation', 'tea estate', 'plantation', 'tea gardens'], 'Tea Plantation'],
  [['ecotourism', 'eco tourism', 'eco-tourism'], 'Eco-Tourism'],
];

/** City/alias -> district, layered over DB region names. */
const REGION_WORD_MAP: Array<[string[], string]> = [
  [['kochi', 'cochin', 'ernakulam', 'fortkochi'], 'Ernakulam'],
  [['trivandrum', 'tvm', 'thiruvananthapuram'], 'Thiruvananthapuram'],
  [['alleppey', 'allepy', 'alappey', 'alappuzha'], 'Alappuzha'],
  [['calicut', 'kozhikode'], 'Kozhikode'],
  [['quilon', 'kollam'], 'Kollam'],
  [['palghat', 'palakkad'], 'Palakkad'],
  [['cannanore', 'kannur'], 'Kannur'],
  [['kasargod', 'kasaragod'], 'Kasaragod'],
  [['thrissur', 'trissur', 'trisur'], 'Thrissur'],
  [['idukki', 'idikki'], 'Idukki'],
  [['wayanad', 'vythiri'], 'Wayanad'],
  [['pathanamthitta'], 'Pathanamthitta'],
  [['malappuram'], 'Malappuram'],
  [['kottayam'], 'Kottayam'],
];

const TRAVEL_STYLE_WORDS: Array<[string[], string]> = [
  [['family', 'kids', 'children', 'with kids', 'kid friendly'], 'family'],
  [['romantic', 'honeymoon', 'couple', 'couples', 'for two'], 'romantic'],
  [['solo', 'alone', 'backpacker', 'backpacking'], 'solo'],
  [['adventure', 'thrill', 'adrenaline', 'daring'], 'adventure'],
  [['luxury', 'premium', '5 star', 'five star', 'upscale', 'lavish'], 'luxury'],
  [['budget', 'cheap', 'affordable', 'economical', 'inexpensive'], 'budget'],
  [['group', 'friends', 'gang', 'team', 'with friends'], 'group'],
  [['senior', 'elderly', 'parents', 'old parents'], 'senior'],
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'in', 'on', 'at', 'to', 'of', 'near',
  'under', 'over', 'below', 'within', 'best', 'top', 'places', 'place', 'spot', 'spots',
  'trip', 'trips', 'travel', 'tour', 'destination', 'destinations', 'kerala', 'india',
  'please', 'find', 'show', 'give', 'me', 'some', 'cheap', 'good', 'nice', 'great',
  'around', 'nearby', 'close', 'from', 'km', 'kms', 'day', 'days', 'weekend', 'week',
  'search', 'looking', 'need', 'want', 'holiday', 'vacation', 'visit', 'visiting',
  'must', 'very', 'also', 'my', 'our', 'their', 'will', 'can', 'you', 'i',
]);

const MONTHS: Array<[string, number]> = [
  ['january', 1], ['jan', 1], ['february', 2], ['feb', 2], ['march', 3], ['mar', 3],
  ['april', 4], ['apr', 4], ['may', 5], ['june', 6], ['jun', 6], ['july', 7], ['jul', 7],
  ['august', 8], ['aug', 8], ['september', 9], ['sep', 9], ['october', 10], ['oct', 10],
  ['november', 11], ['nov', 11], ['december', 12], ['dec', 12],
];

async function loadLexicon(): Promise<Lexicon> {
  const now = Date.now();
  if (lexiconCache && now - lexiconCache.at < LEXICON_TTL_MS) return lexiconCache.data;

  const [categories, destinations] = await Promise.all([
    prisma.category.findMany({ select: { name: true } }),
    prisma.destination.findMany({ include: { category: true } }),
  ]);

  const categoryNames = categories.map((c) => c.name);
  const categoryKeywords = [...new Set(categoryNames.map(normalizeText).concat(CATEGORY_WORD_MAP.flatMap(([w]) => w)))];

  const regions = [...new Set(destinations.map((d) => d.region))].filter(Boolean) as string[];
  const regionAliases = [...new Set(regions.map(normalizeText).concat(REGION_WORD_MAP.flatMap(([w]) => w)))];

  const placeNames = destinations.map((d) => d.name);
  const placeAliasNames = [...new Set(placeNames.map(normalizeText))];

  const activities = [...new Set(destinations.flatMap((d) => d.activities ?? []))];

  const regionCenters = new Map<string, { lat: number; lng: number }>();
  const places = destinations
    .filter((d) => typeof d.latitude === 'number' && typeof d.longitude === 'number')
    .map((d) => ({ name: d.name, region: d.region, lat: d.latitude as number, lng: d.longitude as number }));
  for (const region of regions) {
    const inRegion = places.filter((p) => p.region === region);
    if (inRegion.length > 0) {
      const lat = inRegion.reduce((s, p) => s + p.lat, 0) / inRegion.length;
      const lng = inRegion.reduce((s, p) => s + p.lng, 0) / inRegion.length;
      regionCenters.set(region, { lat, lng });
    }
  }

  const data: Lexicon = { categoryNames, categoryKeywords, regions, regionAliases, placeNames, placeAliasNames, activities, regionCenters, places };
  lexiconCache = { data, at: now };
  return data;
}

/** Forces a lexicon refresh (e.g. after admin adds a destination). */
export function refreshSmartSearchLexicon(): void {
  lexiconCache = null;
}

/* ------------------------------------------------------------------ */
/* Intent parsing                                                      */
/* ------------------------------------------------------------------ */

interface ParsedIntent {
  maxPrice: number | null;
  minPrice: number | null;
  minRating: number | null;
  durationDays: number | null;
  categories: string[];
  regions: string[];
  placeName: string | null;
  placeFuzzy: boolean;
  proximity: { lat: number; lng: number; label: string; radiusKm: number } | null;
  months: number[];
  seasonLabel: string | null;
  travelStyle: string | null;
  activities: string[];
  crowd: 'quiet' | 'popular' | null;
  popularityTop: boolean;
  keywords: string[];
  confidence: number;
}

function parseDuration(text: string): { days: number; label: string } | null {
  if (/\bweekend\b/.test(text)) return { days: 2, label: 'weekend' };
  if (/\bhalf\s*day\b/.test(text)) return { days: 0.5, label: 'half day' };
  const m = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*days?/);
  if (m) return { days: Number(m[2]), label: `${m[1]}-${m[2]} days` };
  const single = text.match(/(\d+)-?\s*days?\b/);
  if (single) {
    const n = Number(single[1]);
    if (n >= 1 && n <= 14) return { days: n, label: n === 1 ? '1 day' : `${n} days` };
  }
  const words: Array<[RegExp, number, string]> = [
    [/\bday\s*trip\b|\bone\s*day\b|\bsingle\s*day\b/, 1, '1 day'],
    [/\btwo\s*days?\b/, 2, '2 days'],
    [/\bthree\s*days?\b/, 3, '3 days'],
    [/\bfour\s*days?\b/, 4, '4 days'],
    [/\bfive\s*days?\b/, 5, '5 days'],
    [/\ba\s*week\b|\bone\s*week\b|\b7\s*days?\b/, 7, 'week'],
  ];
  for (const [re, days, label] of words) if (re.test(text)) return { days, label };
  return null;
}

function parseBudget(text: string): { max: number | null; min: number | null } {
  let max: number | null = null;
  let min: number | null = null;

  /* strip distance phrases ("within 50 km of X") so they don't parse as budgets */
  const stripped = text.replace(/within\s+\d+\s*(?:km|kms?|kilometers?)\s*(?:of|from)?[a-z\s]*/g, ' ');

  const underRe = /(?:under|below|within|less than|upto|up to|max(?:imum)?|budget(?: of)?)\s+(?:rs\.?\s*|₹\s*)?([\d.,]+(?:\s*(?:k|thousand))?)/g;
  let m: RegExpExecArray | null;
  while ((m = underRe.exec(stripped)) !== null) {
    const amount = parseAmount(m[1]);
    if (amount !== null && (max === null || amount < max)) max = amount;
  }

  const overRe = /(?:over|above|more than|at least|minimum)\s+(?:rs\.?\s*|₹\s*)?([\d.,]+(?:\s*(?:k|thousand))?)/g;
  while ((m = overRe.exec(stripped)) !== null) {
    const amount = parseAmount(m[1]);
    if (amount !== null && (min === null || amount > min)) min = amount;
  }

  const bareRe = /(?:rs\.?\s*|₹\s*)([\d.,]+(?:\s*(?:k|thousand))?)|\b([\d.,]+)\s*(?:k|thousand)\b/g;
  while ((m = bareRe.exec(stripped)) !== null) {
    const amount = parseAmount(m[1] ?? m[2]);
    if (amount !== null && max === null) max = amount;
  }

  if (max === null && /\b(cheap|budget|affordable|inexpensive|economical)\b/.test(text)) max = 3000;
  if (min === null && /\b(luxury|premium|upscale|lavish|expensive)\b/.test(text)) min = 5000;

  return { max, min };
}

function parseSeason(text: string): { months: number[]; label: string | null } {
  const months: number[] = [];
  for (const [word, num] of MONTHS) {
    if (new RegExp(`\\b${word}\\b`).test(text)) months.push(num);
  }
  if (/\b(monsoon|rainy|rain|rains|wet)\b/.test(text)) {
    months.push(6, 7, 8, 9);
    return { months, label: 'monsoon (Jun–Sep)' };
  }
  if (/\b(summer|sunny|hot)\b/.test(text)) {
    months.push(3, 4, 5);
    return { months, label: 'summer (Mar–May)' };
  }
  if (/\b(winter|cool|cold|chilly)\b/.test(text)) {
    months.push(11, 12, 1, 2);
    return { months, label: 'winter (Nov–Feb)' };
  }
  if (/\bspring\b/.test(text)) {
    months.push(2, 3, 4);
    return { months, label: 'spring (Feb–Apr)' };
  }
  return { months, label: null };
}

/** Parses "Jun - Jan" style bestSeason strings into a set of month numbers (wraps year). */
function parseBestSeasonMonths(bestSeason: string): Set<number> | null {
  const m = bestSeason.match(/([a-z]{3,})[^a-z]+([a-z]{3,})/i);
  if (!m) return null;
  const toNum = (s: string): number | null => {
    const hit = MONTHS.find(([word]) => word === s.toLowerCase().slice(0, 3));
    return hit ? hit[1] : null;
  };
  const from = toNum(m[1]);
  const to = toNum(m[2]);
  if (from === null || to === null) return null;
  const set = new Set<number>();
  for (let month = from; ; month++) {
    const wrapped = ((month - 1) % 12) + 1;
    set.add(wrapped);
    if (wrapped === to) break;
  }
  return set;
}

function bestSeasonLabel(bestSeason: string): string {
  return bestSeason.replace(/\s*-\s*/g, '–');
}

/** Resolves a proximity phrase to coordinates (place coords or region centroid). */
function resolvePlace(text: string, lexicon: Lexicon): { lat: number; lng: number; label: string; region?: string } | null {
  const normalized = normalizeText(text);
  const directRegion = bestFuzzyMatch(normalized, lexicon.regions, 0.75);
  if (directRegion) {
    const center = lexicon.regionCenters.get(directRegion.value);
    if (center) return { lat: center.lat, lng: center.lng, label: directRegion.value, region: directRegion.value };
  }
  const regionAlias = bestFuzzyMatch(normalized, lexicon.regionAliases, 0.72);
  if (regionAlias) {
    const map = new Map<string, string>();
    for (const [words, region] of REGION_WORD_MAP) for (const w of words) map.set(w, region);
    for (const region of lexicon.regions) map.set(normalizeText(region), region);
    const region = map.get(regionAlias.value);
    if (region) {
      const center = lexicon.regionCenters.get(region);
      if (center) return { lat: center.lat, lng: center.lng, label: region, region };
    }
  }
  const place = bestFuzzyMatch(normalized, lexicon.placeAliasNames, 0.72);
  if (place) {
    const dest = lexicon.places.find((p) => normalizeText(p.name) === place.value);
    if (dest) return { lat: dest.lat, lng: dest.lng, label: dest.name, region: dest.region };
  }
  return null;
}

function parseIntent(rawQuery: string, lexicon: Lexicon): ParsedIntent {
  const text = normalizeText(rawQuery);
  const words = text.split(/\s+/).filter(Boolean);

  const budget = parseBudget(text);
  const duration = parseDuration(text);
  const season = parseSeason(text);

  /* categories: match category keywords + DB category names */
  const categories = new Set<string>();
  const matchedCategoryWords = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word) || /\d/.test(word) || word.length < 3) continue;
    const kw = bestFuzzyMatch(word, lexicon.categoryKeywords, 0.78);
    if (kw) {
      const dbMatch = bestFuzzyMatch(kw.value, lexicon.categoryNames.map(normalizeText), 0.8);
      const byWord = CATEGORY_WORD_MAP.find(([w]) => w.includes(kw.value));
      const category = dbMatch
        ? lexicon.categoryNames[lexicon.categoryNames.map(normalizeText).indexOf(dbMatch.value)]
        : byWord?.[1];
      if (category) {
        categories.add(category);
        matchedCategoryWords.add(word);
      }
    }
  }

  /* multi-word place phrases first (e.g. "hill palace", "marine drive", "silent valley") */
  let placeName: string | null = null;
  let placeFuzzy = false;
  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    const hit = bestFuzzyMatch(pair, lexicon.placeAliasNames, 0.85);
    if (hit) {
      const dest = lexicon.places.find((p) => normalizeText(p.name) === hit.value);
      if (dest) {
        placeName = dest.name;
        placeFuzzy = normalizeText(dest.name) !== pair;
        break;
      }
    }
  }

  /* regions & place names (region first, so "thrissur" -> region, not "thrissur zoo") */
  const regions = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word) || /\d/.test(word) || word.length < 3) continue;
    if (matchedCategoryWords.has(word)) continue;
    const directRegion = bestFuzzyMatch(word, lexicon.regions.map(normalizeText), 0.75);
    if (directRegion) {
      regions.add(lexicon.regions[lexicon.regions.map(normalizeText).indexOf(directRegion.value)]);
      continue;
    }
    const alias = bestFuzzyMatch(word, lexicon.regionAliases, 0.74);
    if (alias) {
      const map = new Map<string, string>();
      for (const [ws, region] of REGION_WORD_MAP) for (const w of ws) map.set(w, region);
      for (const r of lexicon.regions) map.set(normalizeText(r), r);
      const region = map.get(alias.value);
      if (region) {
        regions.add(region);
        continue;
      }
    }
    const place = bestFuzzyMatch(word, lexicon.placeAliasNames, 0.72);
    if (place) {
      const dest = lexicon.places.find((p) => normalizeText(p.name) === place.value);
      if (dest) {
        placeName = dest.name;
        placeFuzzy = normalizeText(dest.name) !== word;
        regions.add(dest.region);
        continue;
      }
    }
  }

  /* proximity: "near X", "around X", "close to X", "within N km of X" */
  let proximity: ParsedIntent['proximity'] = null;
  const radiusMatch = text.match(/within\s+(\d+)\s*(?:km|kms?|kilometers?)/);
  const radiusKm = radiusMatch ? Number(radiusMatch[1]) : 100;
  const nearMatch = text.match(/(?:near|nearby|close to|around|within(?:\s+\d+\s*(?:km|kms?|kilometers?))?\s*(?:of|from)?)\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/);
  if (nearMatch && nearMatch[1] && !STOP_WORDS.has(nearMatch[1])) {
    const resolved = resolvePlace(nearMatch[1], lexicon);
    if (resolved) proximity = { lat: resolved.lat, lng: resolved.lng, label: resolved.label, radiusKm };
  } else if (radiusMatch) {
    const after = text.slice(radiusMatch.index ?? 0 + radiusMatch[0].length);
    const placeWord = after.match(/\b([a-z]{3,})\b/)?.[1];
    if (placeWord) {
      const resolved = resolvePlace(placeWord, lexicon);
      if (resolved) proximity = { lat: resolved.lat, lng: resolved.lng, label: resolved.label, radiusKm };
    }
  }

  /* travel style */
  let travelStyle: string | null = null;
  for (const [words, style] of TRAVEL_STYLE_WORDS) {
    if (words.some((w) => new RegExp(`\\b${w.replace(/\s+/g, '\\s+')}\\b`).test(text))) {
      travelStyle = style;
      break;
    }
  }

  /* activities */
  const activities = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word) || word.length < 4) continue;
    const hit = bestFuzzyMatch(word, lexicon.activities.map(normalizeText), 0.85);
    if (hit) {
      const idx = lexicon.activities.map(normalizeText).indexOf(hit.value);
      activities.add(lexicon.activities[idx]);
    }
  }

  /* crowd + popularity */
  let crowd: 'quiet' | 'popular' | null = null;
  if (/\b(less crowded|uncrowded|secluded|offbeat|hidden gem|hidden gems|peaceful|quiet|less touristy|untouched)\b/.test(text)) crowd = 'quiet';
  else if (/\b(popular|must visit|most visited|famous|trending)\b/.test(text)) crowd = 'popular';
  const popularityTop = /\b(top rated|best rated|highest rated|best|top)\b/.test(text);

  let minRating: number | null = null;
  if (/\b(top rated|best rated|highest rated|5 star|five star)\b/.test(text)) minRating = 4.5;
  else if (/\b4(?:\.\d)?\s*(?:star|\+)/.test(text)) minRating = 4.2;

  /* residual keywords (soft text match) */
  const keywords = words.filter(
    (w) => !STOP_WORDS.has(w) && w.length >= 3 && !/\d/.test(w) &&
      !categories.has(w) && !regions.has(w) &&
      ![...MONTHS.map(([m]) => m)].includes(w) &&
      !['cheap', 'budget', 'luxury', 'premium', 'romantic', 'family', 'solo', 'monsoon', 'summer', 'winter', 'near', 'nearby', 'around', 'close', 'under', 'below', 'within', 'over', 'above'].includes(w),
  ).slice(0, 6);

  /* confidence: fraction of constraint dimensions recognized */
  let matchedDimensions = 0;
  const dims = [
    budget.max !== null || budget.min !== null,
    duration !== null,
    season.months.length > 0,
    categories.size > 0,
    regions.size > 0,
    proximity !== null,
    travelStyle !== null,
    activities.size > 0,
    crowd !== null,
    keywords.length > 0,
  ];
  matchedDimensions = dims.filter(Boolean).length;
  const confidence = Math.min(1, matchedDimensions / 4);

  return {
    maxPrice: budget.max,
    minPrice: budget.min,
    minRating,
    durationDays: duration?.days ?? null,
    categories: [...categories],
    regions: [...regions],
    placeName,
    placeFuzzy,
    proximity,
    months: season.months,
    seasonLabel: season.label,
    travelStyle,
    activities: [...activities],
    crowd,
    popularityTop,
    keywords,
    confidence,
  };
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

const STYLE_ACTIVITY_POOL: Record<string, string[]> = {
  family: ['picnic', 'family', 'boat rides', 'zoo', 'swimming', 'museum', 'garden', 'park', 'viewpoint'],
  romantic: ['sunset', 'viewpoint', 'houseboat', 'cruise', 'scenic', 'beach', 'backwater', 'lake', 'serene'],
  adventure: ['trek', 'raft', 'zipline', 'paraglid', 'kayak', 'safari', 'climb', 'off-road', 'jeep', 'cave', 'zip'],
  solo: ['walks', 'museum', 'viewpoint', 'temple', 'garden', 'short walks', 'local'],
  group: ['cruise', 'houseboat', 'boat', 'safari', 'camping', 'jeep', 'raft'],
  senior: ['walks', 'museum', 'garden', 'temple', 'viewpoint', 'cruise', 'short walks', 'garden walks'],
  luxury: ['spa', 'ayurveda', 'resort', 'plantation stays', 'homestay dining', 'cruise'],
  budget: [],
};

function durationFits(label: string, days: number): boolean {
  const l = normalizeText(label);
  if (l.includes('half')) return days <= 0.5;
  const m = l.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)?/);
  if (m) {
    const min = Number(m[1]);
    const max = m[2] ? Number(m[2]) : min;
    return days >= min && days <= max;
  }
  return false;
}

function scoreDestination(dest: DestinationRow, intent: ParsedIntent, lexicon: Lexicon): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 5;

  /* category */
  if (intent.categories.includes(dest.category.name)) {
    score += 30;
    reasons.push(`${dest.category.name} — matches your category`);
  }

  /* place name */
  if (intent.placeName && normalizeText(intent.placeName) === normalizeText(dest.name)) {
    score += 40;
    reasons.push(intent.placeFuzzy ? `Best match for "${intent.placeName}" (fuzzy)` : `${dest.name} — exactly what you asked for`);
  } else if (intent.placeName && dest.region === intent.regions[0]) {
    score += 12;
  }

  /* region */
  if (!intent.proximity && intent.regions.includes(dest.region)) {
    score += 25;
    reasons.push(`In ${dest.region} — your requested region`);
  }

  /* proximity */
  if (intent.proximity && typeof dest.latitude === 'number' && typeof dest.longitude === 'number') {
    const km = haversineKm(intent.proximity.lat, intent.proximity.lng, dest.latitude, dest.longitude);
    const maxKm = intent.proximity.radiusKm;
    const bonus = Math.max(0, 25 * (1 - km / maxKm));
    score += bonus;
    reasons.push(`~${Math.round(km)} km from ${intent.proximity.label}`);
  }

  /* activities */
  const destActivities = dest.activities ?? [];
  const matchedActivities = intent.activities.filter((a) =>
    destActivities.some((da) => normalizeText(da).includes(normalizeText(a))),
  );
  if (matchedActivities.length > 0) {
    score += Math.min(15, 5 + matchedActivities.length * 5);
    reasons.push(`Activities you asked for: ${matchedActivities.slice(0, 3).join(', ')}`);
  }

  /* season */
  if (intent.months.length > 0) {
    const seasonSet = parseBestSeasonMonths(dest.bestSeason);
    if (seasonSet && intent.months.some((m) => seasonSet.has(m))) {
      score += 10;
      reasons.push(`Best in ${bestSeasonLabel(dest.bestSeason)} — fits your ${intent.seasonLabel ?? 'season'} plan`);
    }
  }

  /* duration */
  if (intent.durationDays !== null) {
    if (durationFits(dest.duration, intent.durationDays)) {
      score += 8;
      reasons.push(`${dest.duration} fits your ${intent.durationDays === 2 ? 'weekend' : intent.durationDays === 1 ? 'day' : intent.durationDays + '-day'} plan`);
    } else if (intent.durationDays >= 4 && /2-3|1-2/.test(dest.duration)) {
      score += 4;
      reasons.push(`${dest.duration} — longest stay available for a longer trip`);
    }
  }

  /* travel style */
  if (intent.travelStyle) {
    const pool = STYLE_ACTIVITY_POOL[intent.travelStyle] ?? [];
    const styleHit = pool.some((k) =>
      destActivities.some((a) => normalizeText(a).includes(k)) ||
      normalizeText(dest.description).includes(k) ||
      normalizeText(dest.tagline).includes(k),
    );
    if (intent.travelStyle === 'budget' && dest.priceFrom <= 3000) {
      score += 10;
      reasons.push('Budget-friendly pick');
    } else if (intent.travelStyle === 'luxury' && dest.priceFrom >= 4500) {
      score += 10;
      reasons.push('Premium pick');
    } else if (styleHit) {
      score += 10;
      const styleLabel: Record<string, string> = {
        family: 'Great for families', romantic: 'Romantic pick', solo: 'Solo-travel friendly',
        adventure: 'Adventure pick', group: 'Great for groups', senior: 'Senior-friendly',
        luxury: 'Premium pick', budget: 'Budget-friendly pick',
      };
      reasons.push(styleLabel[intent.travelStyle] ?? `${intent.travelStyle} pick`);
    }
  }

  /* crowd */
  if (intent.crowd === 'quiet') {
    if (dest.popularityScore <= 70 || dest.reviewsCount <= 50) {
      score += 8;
      reasons.push('Quiet & offbeat — fewer crowds');
    }
  } else if (intent.crowd === 'popular') {
    if (dest.popularityScore >= 90) {
      score += 8;
      reasons.push('Popular & well-visited');
    }
  }

  /* popularity */
  if (intent.popularityTop && dest.rating >= 4.5) {
    score += 8;
    reasons.push(`Top rated (${dest.rating.toFixed(1)}★)`);
  }
  if (intent.minRating !== null && dest.rating >= intent.minRating) {
    score += 5;
  }

  /* residual keywords in free text */
  let keywordHits = 0;
  for (const kw of intent.keywords) {
    const text = normalizeText(`${dest.name} ${dest.tagline} ${dest.description} ${dest.longDescription}`);
    if (text.includes(kw)) {
      keywordHits++;
      reasons.push(`Mentions "${kw}"`);
    }
  }
  score += Math.min(10, keywordHits * 3);

  /* small quality baseline */
  score += Math.min(2, dest.rating / 10);
  score += Math.min(2, dest.popularityScore / 100);

  return { score: Math.round(Math.min(100, score) * 10) / 10, reasons: reasons.slice(0, 5) };
}

/* ------------------------------------------------------------------ */
/* Suggestions + Groq fallback                                         */
/* ------------------------------------------------------------------ */

const SUGGESTION_QUERIES = [
  'beaches under ₹4,000',
  'waterfalls near Thrissur',
  'hill stations for a 3-day trip',
  'backwaters with houseboat cruise',
  'top rated heritage forts',
  'cheap family trip with trekking',
  'romantic places under ₹15,000',
  'less crowded beaches',
  'islands near Kochi',
  'wildlife safari',
];

function buildSuggestions(intent: ParsedIntent, noExact: boolean): string[] {
  const out: string[] = [];
  const cat = intent.categories[0];
  if (noExact) {
    if (intent.maxPrice !== null) out.push(`${cat ?? 'destinations'} under ₹${Math.round((intent.maxPrice * 1.4) / 500) * 500}`);
    if (intent.regions[0]) out.push(`${cat ?? 'destinations'} in ${intent.regions[0]}`);
    if (cat) out.push(`${cat}`);
    if (intent.travelStyle) out.push(`${cat ?? 'destinations'} for ${intent.travelStyle} trips`);
  } else if (intent.confidence < 0.35) {
    out.push(...SUGGESTION_QUERIES.slice(0, 4));
  } else {
    if (cat) out.push(`${cat}${intent.maxPrice !== null ? ` under ₹${intent.maxPrice}` : ''}${intent.regions[0] ? ` in ${intent.regions[0]}` : ''}`);
    if (intent.regions[0]) out.push(`cheap ${cat ?? 'destinations'} in ${intent.regions[0]}`);
    if (intent.travelStyle) out.push(`${cat ?? 'places'} for ${intent.travelStyle} trips`);
  }
  const unique = [...new Set(out.filter(Boolean))];
  return unique.length > 0 ? unique.slice(0, 4) : SUGGESTION_QUERIES.slice(0, 4);
}

const GROQ_SYSTEM_PROMPT =
  'You are the intent parser for Triplora, a Kerala travel site. Parse the user\'s query into JSON ' +
  'with keys: category (one of: ' +
  'Hill Station, Backwaters, Beach, Heritage, Wildlife, Waterfall, Tea Plantation, Island, Pilgrimage, Adventure, Eco-Tourism, Museum, Zoo, Church, Mosque, National Park, Viewpoint, Dam — or null), ' +
  'region (one of: Thrissur, Idukki, Thiruvananthapuram, Alappuzha, Ernakulam, Kasaragod, Palakkad, Kannur, Kozhikode, Kollam, Wayanad, Pathanamthitta, Malappuram, Kottayam — or null), ' +
  'place (destination name like Munnar, Alleppey, Kochi or null), maxPrice (INR number or null), minPrice (number or null), ' +
  'minRating (number 0-5 or null), months (array of month numbers 1-12 or []), durationDays (number or null), travelStyle (family|romantic|solo|adventure|luxury|budget|group|senior or null), ' +
  'keywords (up to 4 strings). Respond ONLY with the JSON object. If the query is gibberish, return {"category":null,"region":null,"place":null,"maxPrice":null,"minPrice":null,"minRating":null,"months":[],"durationDays":null,"travelStyle":null,"keywords":[]}.';

async function groqParse(rawQuery: string, lexicon: Lexicon): Promise<ParsedIntent | null> {
  if (!env.groq.apiKey) return null;
  try {
    const groq = new Groq({ apiKey: env.groq.apiKey, timeout: 20000 });
    const completion = await groq.chat.completions.create({
      model: env.groq.model,
      messages: [
        { role: 'system', content: GROQ_SYSTEM_PROMPT },
        { role: 'user', content: rawQuery },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });
    const raw = JSON.parse(completion.choices?.[0]?.message?.content ?? '{}') as Record<string, unknown>;
    const intent = parseIntent(rawQuery, lexicon);

    const category = String(raw.category ?? '').trim();
    if (category) {
      const hit = bestFuzzyMatch(normalizeText(category), lexicon.categoryNames.map(normalizeText), 0.72);
      if (hit) intent.categories = [lexicon.categoryNames[lexicon.categoryNames.map(normalizeText).indexOf(hit.value)]];
    }
    const region = String(raw.region ?? '').trim();
    if (region) {
      const hit = bestFuzzyMatch(normalizeText(region), lexicon.regions.map(normalizeText), 0.72);
      if (hit) intent.regions = [lexicon.regions[lexicon.regions.map(normalizeText).indexOf(hit.value)]];
    }
    const place = String(raw.place ?? '').trim();
    if (place) {
      const hit = bestFuzzyMatch(normalizeText(place), lexicon.placeAliasNames, 0.7);
      if (hit) {
        const dest = lexicon.places.find((p) => normalizeText(p.name) === hit.value);
        intent.placeName = dest?.name ?? null;
        if (dest && !intent.regions.includes(dest.region)) intent.regions.push(dest.region);
      }
    }
    if (typeof raw.maxPrice === 'number' && raw.maxPrice > 0) intent.maxPrice = Math.round(raw.maxPrice);
    if (typeof raw.minPrice === 'number' && raw.minPrice > 0) intent.minPrice = Math.round(raw.minPrice);
    if (typeof raw.minRating === 'number' && raw.minRating > 0) intent.minRating = Math.min(5, raw.minRating);
    if (Array.isArray(raw.months)) intent.months = raw.months.map(Number).filter((m) => m >= 1 && m <= 12);
    if (typeof raw.durationDays === 'number' && raw.durationDays > 0) intent.durationDays = raw.durationDays;
    const style = String(raw.travelStyle ?? '').trim();
    if (style && TRAVEL_STYLE_WORDS.some(([, s]) => s === style)) intent.travelStyle = style;
    if (Array.isArray(raw.keywords)) {
      intent.keywords = [...intent.keywords, ...raw.keywords.map(String).filter((k) => k.length >= 3)].slice(0, 6);
    }
    intent.confidence = Math.max(intent.confidence, 0.5);
    return intent;
  } catch (err) {
    console.error(`[smart-search] Groq parse failed (${err instanceof Error ? err.message : String(err)})`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Main search                                                         */
/* ------------------------------------------------------------------ */

function explain(intent: ParsedIntent, total: number, noExact: boolean): string {
  const parts: string[] = [];
  if (intent.categories.length > 0) parts.push(intent.categories.join(' or ').toLowerCase());
  if (intent.maxPrice !== null) parts.push(`under ₹${intent.maxPrice.toLocaleString('en-IN')}`);
  if (intent.minPrice !== null) parts.push(`over ₹${intent.minPrice.toLocaleString('en-IN')}`);
  if (!intent.proximity && intent.regions.length > 0) parts.push(`in ${intent.regions.join(' or ')}`);
  if (intent.proximity) parts.push(`within ${intent.proximity.radiusKm} km of ${intent.proximity.label}`);
  if (intent.seasonLabel) parts.push(intent.seasonLabel);
  if (intent.durationDays !== null) parts.push(`${intent.durationDays === 2 ? 'a weekend' : intent.durationDays === 1 ? 'a day' : intent.durationDays + ' days'}`);
  if (intent.travelStyle) parts.push(`for ${intent.travelStyle} travel`);
  if (intent.minRating !== null) parts.push(`rated ${intent.minRating}+`);

  if (noExact) {
    return `No exact match found for your request (${parts.join(', ') || rawFallbackHint(intent)}) — showing closest alternatives instead.`;
  }
  if (parts.length === 0) {
    return 'Matched destinations by relevance for your query.';
  }
  return `Found ${total} destination${total === 1 ? '' : 's'} ${parts.join(', ')}, ranked by relevance.`;
}

function rawFallbackHint(intent: ParsedIntent): string {
  return intent.keywords.slice(0, 2).join(' ') || 'your query';
}

export const smartSearchService = {
  async search(rawQuery: string, userId: string | undefined, page = 1, limit = 12): Promise<SmartSearchResult> {
    const startedAt = Date.now();
    void analyticsLogService.logSearch(rawQuery, userId);

    const lexicon = await loadLexicon();
    let intent = parseIntent(rawQuery, lexicon);

    /* Low-confidence queries get an AI second look (only when local parsing
       found almost nothing; the nothingUnderstood check below handles pure
       gibberish without the AI round-trip). */
    let usedAi = false;
    if (intent.confidence < 0.25) {
      const aiIntent = await groqParse(rawQuery, lexicon);
      if (aiIntent) {
        intent = aiIntent;
        usedAi = true;
        void analyticsLogService.logAiUsage('SMART_SEARCH', userId);
      }
    }

    const allRows = await prisma.destination.findMany({ include: { category: true } });

    /* Hard filters (budget is ABSOLUTE). */
    let pool = allRows.filter((d) => {
      if (intent.maxPrice !== null && d.priceFrom > intent.maxPrice) return false;
      if (intent.minPrice !== null && d.priceFrom < intent.minPrice) return false;
      if (intent.minRating !== null && d.rating < intent.minRating) return false;
      if (intent.categories.length > 0 && !intent.categories.includes(d.category.name)) return false;
      if (!intent.proximity && intent.regions.length > 0 && !intent.regions.includes(d.region)) return false;
      if (intent.proximity && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        const km = haversineKm(intent.proximity.lat, intent.proximity.lng, d.latitude, d.longitude);
        if (km > intent.proximity.radiusKm) return false;
      }
      return true;
    });

    let noExactMatch = false;
    let relaxedNote = '';
    if (pool.length === 0) {
      noExactMatch = true;

      /* Step 1: widen proximity radius (100 -> 250 -> 500 km) */
      if (intent.proximity) {
        const center = intent.proximity;
        for (const radius of [250, 500]) {
          const widened = allRows.filter((d) => {
            if (intent.maxPrice !== null && d.priceFrom > intent.maxPrice) return false;
            if (intent.minPrice !== null && d.priceFrom < intent.minPrice) return false;
            if (intent.minRating !== null && d.rating < intent.minRating) return false;
            if (intent.categories.length > 0 && !intent.categories.includes(d.category.name)) return false;
            if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
              const km = haversineKm(center.lat, center.lng, d.latitude, d.longitude);
              if (km > radius) return false;
            }
            return true;
          });
          if (widened.length > 0) {
            intent.proximity = { ...center, radiusKm: radius };
            pool = widened;
            relaxedNote = `proximity radius widened to ${radius} km`;
            break;
          }
        }
      }

      /* Step 2: drop region, keep category + budget */
      if (pool.length === 0) {
        const relaxed = allRows.filter((d) => {
          if (intent.maxPrice !== null && d.priceFrom > intent.maxPrice) return false;
          if (intent.minPrice !== null && d.priceFrom < intent.minPrice) return false;
          if (intent.minRating !== null && d.rating < intent.minRating) return false;
          if (intent.categories.length > 0 && !intent.categories.includes(d.category.name)) return false;
          return true;
        });
        if (relaxed.length > 0) {
          pool = relaxed;
          relaxedNote = intent.proximity ? 'proximity filter' : 'region filter';
        }
      }

      /* Step 3: drop category, keep budget + rating */
      if (pool.length === 0) {
        const relaxed = allRows.filter((d) => {
          if (intent.maxPrice !== null && d.priceFrom > intent.maxPrice) return false;
          if (intent.minRating !== null && d.rating < intent.minRating) return false;
          return true;
        });
        if (relaxed.length > 0) {
          pool = relaxed;
          relaxedNote = 'category filter';
        }
      }

      /* Step 4: keep only the absolute budget ceiling (never exceeded) */
      if (pool.length === 0) {
        const relaxed = allRows.filter((d) => intent.maxPrice !== null ? d.priceFrom <= intent.maxPrice : true);
        if (relaxed.length > 0) {
          pool = relaxed;
          relaxedNote = 'budget ceiling';
        } else {
          pool = allRows;
          relaxedNote = 'budget';
        }
      }
    }

    const scored = pool.map((d) => ({ dest: d, ...scoreDestination(d, intent, lexicon) }));
    scored.sort((a, b) => b.score - a.score || b.dest.rating - a.dest.rating || b.dest.popularityScore - a.dest.popularityScore);

    if (noExactMatch) {
      for (const item of scored.slice(0, Math.min(6, limit))) {
        if (!item.reasons.includes(`Relaxed ${relaxedNote} filter for closest match`)) {
          item.reasons.unshift(`Closest alternative — no exact match (relaxed ${relaxedNote})`);
        }
      }
    }

    const total = scored.length;
    const startIdx = (page - 1) * limit;

    /* If the query was genuinely unparseable (no constraint applied and no
       destination got a real reason), don't return junk — suggest queries. */
    const hadHardFilters =
      intent.maxPrice !== null || intent.minPrice !== null || intent.minRating !== null ||
      intent.categories.length > 0 || intent.regions.length > 0 || intent.proximity !== null;
    const nothingUnderstood = !hadHardFilters && scored.every((s) => s.reasons.length === 0);

    const items: SmartSearchItem[] = nothingUnderstood
      ? []
      : scored.slice(startIdx, startIdx + limit).map(({ dest, score, reasons }) => ({
          destination: toDestinationDTO(dest),
          score,
          reasons: reasons.slice(0, 5),
        }));

    const filters: SmartSearchFilters = {
      categories: intent.categories,
      region: intent.regions[0] ?? null,
      maxPrice: intent.maxPrice,
      minPrice: intent.minPrice,
      minRating: intent.minRating,
      duration: intent.durationDays === null ? null : intent.durationDays === 0.5 ? 'half day' : intent.durationDays === 2 ? 'weekend' : `${intent.durationDays} days`,
      travelStyle: intent.travelStyle,
      season: intent.seasonLabel,
      crowd: intent.crowd,
      proximity: intent.proximity ? { label: intent.proximity.label, radiusKm: intent.proximity.radiusKm } : null,
      keywords: intent.keywords,
    };

    const suggestions = items.length === 0 || noExactMatch
      ? buildSuggestions(intent, noExactMatch || items.length === 0)
      : [];

    console.log(`[smart-search] "${rawQuery}" -> ${items.length} results in ${Date.now() - startedAt}ms (ai=${usedAi}, noExact=${noExactMatch}, conf=${intent.confidence.toFixed(2)})`);

    return {
      items,
      filters,
      explanation: items.length === 0
        ? `I couldn't understand "${rawQuery}" — try one of these searches instead.`
        : explain(intent, total, noExactMatch),
      usedAi,
      noExactMatch,
      suggestions,
      meta: buildPaginationMeta(page, limit, nothingUnderstood ? 0 : total),
    };
  },

  /** Autocomplete: destination/category/region/activity suggestions for a prefix. */
  async suggest(rawQuery: string): Promise<SuggestEntry[]> {
    const lexicon = await loadLexicon();
    const q = normalizeText(rawQuery);
    if (q.length < 2) return [];

    type Scored = SuggestEntry & { score: number };
    const entries: Scored[] = [];
    const pushed = new Set<string>();

    const tryAdd = (type: SuggestEntry['type'], label: string, score: number) => {
      const key = `${type}:${normalizeText(label)}`;
      if (!pushed.has(key)) {
        pushed.add(key);
        entries.push({ type, label, value: label, score });
      }
    };

    for (const name of lexicon.places) {
      const n = normalizeText(name.name);
      const score = fuzzyScore(q, n);
      if (n.startsWith(q) || score >= 0.62) tryAdd('destination', name.name, score);
    }
    for (const cat of lexicon.categoryNames) {
      const n = normalizeText(cat);
      const score = fuzzyScore(q, n);
      if (n.startsWith(q) || score >= 0.65) tryAdd('category', cat, score);
    }
    for (const region of lexicon.regions) {
      const n = normalizeText(region);
      const score = fuzzyScore(q, n);
      if (n.startsWith(q) || score >= 0.62) tryAdd('region', region, score);
    }
    for (const activity of lexicon.activities) {
      const n = normalizeText(activity);
      const score = fuzzyScore(q, n);
      if (n.startsWith(q) || score >= 0.75) tryAdd('activity', activity, score);
    }

    return entries
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 8)
      .map(({ type, label, value }) => ({ type, label, value }));
  },
};
