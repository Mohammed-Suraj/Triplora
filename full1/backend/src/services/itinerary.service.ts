import type { Category, Destination } from '@prisma/client';

type DestinationWithCategory = Destination & { category: Category };

export interface GeneratedItineraryItem {
  day: number;
  focus: string;
  destinationId: string;
}

const DAY_FOCUSES = [
  'Arrival & gentle exploration',
  'Signature experiences',
  'Nature & adventure',
  'Culture & cuisine',
  'Relaxation & wellness',
  'Hidden gems',
  'Farewell moments',
];

/** Maps the frontend's Destination.category labels to the interest tags surfaced in the planner UI. */
const CATEGORY_TO_INTEREST: Record<string, string[]> = {
  'Hill Station': ['Hill Stations'],
  Backwaters: ['Backwaters'],
  Beach: ['Beaches'],
  Heritage: ['Heritage', 'Food & Culture'],
  Wildlife: ['Wildlife'],
  Waterfall: ['Waterfalls'],
};

/**
 * Builds a deterministic, rule-based day-by-day itinerary from the available
 * destinations, matching selected interests where possible and falling back
 * to a round-robin over all destinations. This intentionally contains no AI
 * calls, per project scope ("generate itinerary using backend logic only").
 */
export function generateItinerary(params: {
  destinations: DestinationWithCategory[];
  days: number;
  interests: string[];
}): GeneratedItineraryItem[] {
  const { destinations, days, interests } = params;

  if (destinations.length === 0) {
    return [];
  }

  const normalizedInterests = interests.map((i) => i.toLowerCase());

  const matching = destinations.filter((d) => {
    const tags = CATEGORY_TO_INTEREST[d.category.name] ?? [];
    return tags.some((tag) => normalizedInterests.includes(tag.toLowerCase()));
  });

  // Prioritize destinations matching selected interests, then fill remaining
  // days with the highest-rated destinations not already used, cycling if needed.
  const ranked = [
    ...matching,
    ...destinations
      .filter((d) => !matching.includes(d))
      .sort((a, b) => b.rating - a.rating),
  ];

  const pool = ranked.length > 0 ? ranked : destinations;

  return Array.from({ length: days }, (_, index) => {
    const destination = pool[index % pool.length];
    const focus = DAY_FOCUSES[index % DAY_FOCUSES.length];
    return {
      day: index + 1,
      focus,
      destinationId: destination.id,
    };
  });
}
