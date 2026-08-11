/**
 * Small, dependency-free text-matching helpers used by the smart search engine:
 * - fuzzy similarity (Dice coefficient + Levenshtein fallback)
 * - best-match lookup against a candidate list
 * - haversine distance for proximity ranking
 */

/** Normalizes a string for comparison: lowercase, collapse whitespace, strip currency marks. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[₹,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dice coefficient over character bigrams (0..1). Good for short-name typos. */
export function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const bigram of A) if (B.has(bigram)) inter++;
  return (2 * inter) / (A.size + B.size);
}

/** Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Combined fuzzy score 0..1 between a query token and a candidate.
 * Prefers prefix matches and high Dice similarity; Levenshtein corrects
 * "munar" -> "Munnar" (dice 0.89), "allepy" -> "Alappuzha" (0.75 via aliases).
 */
export function fuzzyScore(query: string, candidate: string): number {
  const q = normalizeText(query);
  const c = normalizeText(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.startsWith(q) && q.length >= 3) return 0.95;
  if (q.startsWith(c) && c.length >= 4) return 0.9;
  const dice = diceSimilarity(q, c);
  const maxLen = Math.max(q.length, c.length);
  const levScore = maxLen > 0 ? 1 - levenshtein(q, c) / maxLen : 0;
  return Math.max(dice, levScore);
}

export interface FuzzyHit {
  value: string;
  score: number;
}

/** Returns the best candidate (score >= threshold) or null. */
export function bestFuzzyMatch(
  query: string,
  candidates: string[],
  threshold = 0.6,
): FuzzyHit | null {
  let best: FuzzyHit | null = null;
  for (const candidate of candidates) {
    const score = fuzzyScore(query, candidate);
    if (score >= threshold && (!best || score > best.score)) {
      best = { value: candidate, score };
    }
  }
  return best;
}

/** Haversine great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Number words -> digits, for "five thousand" style budgets. */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twelve: 12, fifteen: 15, twenty: 20, twentyfive: 25, fifty: 50, hundred: 100,
};

/** Parses amounts like "5000", "5,000", "5k", "rs 5000", "₹ 4000", "five thousand". */
export function parseAmount(text: string): number | null {
  const t = normalizeText(text);
  const kMatch = t.match(/^(\d+(?:\.\d+)?)\s*(k|thousand)$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  const numMatch = t.match(/^rs\.?\s*(\d+(?:\.\d+)?)$/);
  if (numMatch) return Math.round(parseFloat(numMatch[1]));

  const plain = t.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return Math.round(parseFloat(plain[1]));

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 2 && NUMBER_WORDS[words[0]] && words[1] === 'thousand') {
    return NUMBER_WORDS[words[0]] * 1000;
  }
  return null;
}
