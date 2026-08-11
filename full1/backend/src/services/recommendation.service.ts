import { prisma } from '../config/db';
import { destinationRepository } from '../repositories/destination.repository';
import { toDestinationDTO } from '../dto/destination.mapper';
import type { DestinationDTO } from '../types';

type DestinationRow = Awaited<ReturnType<typeof destinationRepository.findAll>>[number];

export interface Recommendation {
  destination: DestinationDTO;
  score: number;
  reasons: string[];
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function currentMonthName(): string {
  return MONTH_NAMES[new Date().getMonth()];
}

/** "October - March" / "Sep - March" / "year round" -> set of months (by index). */
function seasonMonths(bestSeason: string): Set<number> | null {
  if (!bestSeason) return null;
  const lower = bestSeason.toLowerCase();
  if (/year[\s-]?round|all[\s-]?season/i.test(lower)) return null;

  const found = MONTH_NAMES
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => lower.includes(name))
    .map(({ index }) => index);

  if (found.length === 0) {
    const short = MONTH_NAMES.map((name) => name.slice(0, 3));
    const matched = short
      .map((abbr, index) => ({ abbr, index }))
      .filter(({ abbr }) => lower.includes(abbr))
      .map(({ index }) => index);
    return matched.length > 0 ? new Set(matched) : null;
  }

  // A range like "october - march" contains both months; treat as contiguous wrap-around.
  if (found.length >= 2) {
    const min = Math.min(...found);
    const max = Math.max(...found);
    if (max - min <= 6) {
      const set = new Set<number>();
      for (let m = min; m <= max; m += 1) set.add(m % 12);
      return set;
    }
  }
  return new Set(found);
}

async function userSignals(userId: string): Promise<{
  categoryWeights: Map<string, number>;
  searchTerms: string[];
  avgBudget: number | null;
}> {
  const [wishlists, bookings, searches] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId },
      include: { destination: { select: { category: { select: { name: true } } } } },
      take: 50,
    }),
    prisma.booking.findMany({ where: { userId }, select: { budget: true, destination: { select: { category: { select: { name: true } } } } }, take: 50 }),
    prisma.searchLog.findMany({ where: { userId }, select: { query: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const categoryWeights = new Map<string, number>();
  for (const entry of wishlists) {
    categoryWeights.set(entry.destination.category.name, (categoryWeights.get(entry.destination.category.name) ?? 0) + 3);
  }
  for (const booking of bookings) {
    categoryWeights.set(booking.destination.category.name, (categoryWeights.get(booking.destination.category.name) ?? 0) + 3);
  }

  const searchTerms = searches
    .flatMap((s) => s.query.toLowerCase().split(/\s+/))
    .filter((word) => word.length > 3)
    .slice(0, 25);

  const budgets = bookings.map((b) => b.budget).filter((b) => typeof b === 'number' && b > 0);
  const avgBudget = budgets.length > 0 ? budgets.reduce((sum, b) => sum + b, 0) / budgets.length : null;

  return { categoryWeights, searchTerms, avgBudget };
}

export const recommendationService = {
  async forUser(userId: string | undefined, limit = 6): Promise<Recommendation[]> {
    const take = Math.min(12, Math.max(1, Math.floor(limit ?? 6)));
    const all = await destinationRepository.findAll();
    if (all.length === 0) return [];

    let signals: Awaited<ReturnType<typeof userSignals>> | null = null;
    if (userId) signals = await userSignals(userId);

    const season = seasonMonths(currentMonthName().slice(0, 3));
    const currentMonth = new Date().getMonth();

    const scored: Recommendation[] = all.map((d: DestinationRow) => {
      const reasons: string[] = [];
      let score = 0;

      if (signals) {
        const categoryScore = signals.categoryWeights.get(d.category.name) ?? 0;
        if (categoryScore > 0) {
          score += categoryScore;
          reasons.push(`Matches your wishlist & bookings (${d.category.name})`);
        }

        const haystack = `${d.name} ${d.region} ${d.category.name} ${d.tagline} ${(d.highlights ?? []).join(' ')}`.toLowerCase();
        const matchedTerms = signals.searchTerms.filter((term) => haystack.includes(term));
        if (matchedTerms.length > 0) {
          score += Math.min(3, matchedTerms.length);
          reasons.push('Matches your recent searches');
        }

        if (signals.avgBudget !== null && d.priceFrom > 0 && d.priceFrom <= signals.avgBudget) {
          score += 1;
          reasons.push('Fits your usual budget');
        }
      }

      const seasonSet = seasonMonths(d.bestSeason);
      if (seasonSet === null || seasonSet.has(currentMonth)) {
        score += 1.5;
        reasons.push('Great this season');
      }

      score += Math.min(2, d.rating / 2.5);
      score += Math.min(2, d.popularityScore / 500);

      if (d.isFeatured) score += 0.5;
      if (reasons.length === 0) reasons.push('Popular right now');

      return { destination: toDestinationDTO(d), score: Number(score.toFixed(2)), reasons: reasons.slice(0, 3) };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, take);
  },
};
