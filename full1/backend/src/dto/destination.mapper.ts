import type { Destination, Category } from '@prisma/client';
import type { DestinationDTO } from '../types';

type DestinationWithCategory = Destination & { category: Category };

/**
 * Reshapes the Prisma Destination (+ Category relation) into the flat shape
 * the existing frontend's `Destination` interface expects (src/data/destinations.ts),
 * so the frontend can consume API responses with minimal/no changes.
 */
export function toDestinationDTO(destination: DestinationWithCategory): DestinationDTO {
  return {
    id: destination.id,
    slug: destination.slug,
    name: destination.name,
    tagline: destination.tagline,
    region: destination.region,
    category: destination.category.name,
    image: destination.image,
    gallery: destination.gallery,
    rating: destination.rating,
    reviews: destination.reviewsCount,
    popularityScore: destination.popularityScore,
    priceFrom: destination.priceFrom,
    latitude: destination.latitude,
    longitude: destination.longitude,
    duration: destination.duration,
    bestSeason: destination.bestSeason,
    description: destination.description,
    longDescription: destination.longDescription,
    highlights: destination.highlights,
    activities: destination.activities,
  };
}
