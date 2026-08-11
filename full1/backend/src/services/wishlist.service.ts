import { wishlistRepository } from '../repositories/wishlist.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { ApiError } from '../utils/ApiError';
import { toDestinationDTO } from '../dto/destination.mapper';
import { notificationService } from './notification.service';

export interface WishlistEntryDTO {
  id: string;
  createdAt: Date;
  destination: ReturnType<typeof toDestinationDTO>;
}

export const wishlistService = {
  async list(userId: string): Promise<WishlistEntryDTO[]> {
    const entries = await wishlistRepository.findAllByUser(userId);
    return entries.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      destination: toDestinationDTO(entry.destination),
    }));
  },

  async add(userId: string, destinationId: string): Promise<WishlistEntryDTO> {
    const destination = await destinationRepository.findById(destinationId);
    if (!destination) {
      throw ApiError.notFound('Destination not found');
    }

    const existing = await wishlistRepository.findOne(userId, destinationId);
    if (existing) {
      throw ApiError.conflict('Destination is already in your wishlist');
    }

    const created = await wishlistRepository.create(userId, destinationId);

    void notificationService.create(
      userId,
      'WISHLIST_UPDATE',
      'Added to wishlist',
      `${destination.name} is now in your wishlist.`,
      `/destinations/${destination.slug}`,
    );

    return {
      id: created.id,
      createdAt: created.createdAt,
      destination: toDestinationDTO(created.destination),
    };
  },

  async remove(userId: string, wishlistId: string): Promise<void> {
    const entry = await wishlistRepository.findById(wishlistId);
    if (!entry) {
      throw ApiError.notFound('Wishlist entry not found');
    }
    if (entry.userId !== userId) {
      throw ApiError.forbidden('You cannot modify another user\u2019s wishlist');
    }
    await wishlistRepository.deleteById(wishlistId);
  },
};
