import { tripPlanRepository } from '../repositories/tripPlan.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { userRepository } from '../repositories/user.repository';
import { generateItinerary } from './itinerary.service';
import { groqService } from './groq.service';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { emailService, prefsOf } from './email.service';
import { toDestinationDTO } from '../dto/destination.mapper';
import type { Prisma } from '@prisma/client';
import type { TripPlanDTO } from '../types';
import type { CreateTripPlanInput, SaveTripPlanInput, UpdateTripPlanInput } from '../validators/tripPlan.validator';
import type { AiItineraryDay, AiTripPlanResult } from './groq.service';

type TripPlanWithItinerary = Awaited<ReturnType<typeof tripPlanRepository.findById>>;

function toTripPlanDTO(tripPlan: NonNullable<TripPlanWithItinerary>): TripPlanDTO {
  return {
    id: tripPlan.id,
    title: tripPlan.title,
    budget: tripPlan.budget,
    days: tripPlan.days,
    travelStyle: tripPlan.travelStyle,
    interests: tripPlan.interests,
    payload: tripPlan.payload,
    createdAt: tripPlan.createdAt,
    itinerary: tripPlan.itinerary.map((item) => ({
      day: item.day,
      focus: item.focus,
      destination: toDestinationDTO(item.destination),
    })),
  };
}

async function requireOwnedPlan(userId: string, id: string): Promise<NonNullable<TripPlanWithItinerary>> {
  const plan = await tripPlanRepository.findById(id);
  if (!plan) {
    throw ApiError.notFound('Trip plan not found');
  }
  if (plan.userId !== userId) {
    throw ApiError.forbidden('You cannot access another user\u2019s trip plan');
  }
  return plan;
}

function dayDestinationIds(days: AiItineraryDay[]): string[] {
  return days
    .map((day) => day.destination?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function isRealDestinationId(id: string): boolean {
  // Custom destinations (no DB record) are synthesized as "custom-<slug>".
  return !id.startsWith('custom-');
}

export const tripPlanService = {
  async create(userId: string, input: CreateTripPlanInput): Promise<TripPlanDTO> {
    // Pull a reasonably sized sample of destinations to build the itinerary from.
    const destinations = await destinationRepository.findManySample(50);
    if (destinations.length === 0) {
      throw ApiError.internal('No destinations available to build an itinerary');
    }

    const itinerary = generateItinerary({
      destinations,
      days: input.days,
      interests: input.interests,
    });

    const created = await tripPlanRepository.createWithItinerary({
      userId,
      title: input.title,
      budget: input.budget,
      days: input.days,
      travelStyle: input.travelStyle,
      interests: input.interests,
      itinerary,
    });

    return toTripPlanDTO(created);
  },

  async save(userId: string, input: SaveTripPlanInput): Promise<TripPlanDTO> {
    const payload = input.payload as unknown as AiTripPlanResult;
    const days = Array.isArray(payload?.itinerary) ? payload.itinerary : [];
    if (days.length === 0) {
      throw ApiError.badRequest('The itinerary payload contains no days.');
    }

    // Keep real destination relations; skip synthesized custom destinations.
    const rows = days
      .filter((day) => isRealDestinationId(day.destination?.id ?? ''))
      .map((day, index) => ({
        day: typeof day.day === 'number' ? day.day : index + 1,
        focus: day.focus || 'Explore the highlights of the region',
        destinationId: day.destination.id,
      }));

    const created = await tripPlanRepository.createWithItinerary({
      userId,
      title: input.title,
      budget: input.budget,
      days: days.length,
      travelStyle: input.travelStyle,
      interests: input.interests,
      itinerary: rows,
      payload: input.payload as unknown as Prisma.InputJsonValue,
    });

    const dto = toTripPlanDTO(created);
    void this.notifyTripSaved(userId, dto);
    return dto;
  },

  /** Fire-and-forget AI trip saved notification (respects user preferences). */
  async notifyTripSaved(userId: string, dto: TripPlanDTO): Promise<void> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) return;

      const firstDestination = dto.itinerary?.[0]?.destination;
      const destination =
        (typeof dto.payload === 'object' && dto.payload !== null && 'destination' in dto.payload
          ? String((dto.payload as { destination?: unknown }).destination ?? '')
          : '') || firstDestination?.name || dto.title || 'Kerala';

      emailService.sendAiTripSavedEmail(
        user.email,
        {
          name: user.name,
          tripPlanId: dto.id,
          title: dto.title ?? 'My Trip',
          destination,
          days: dto.days,
          budget: dto.budget,
          travelStyle: dto.travelStyle,
          tripUrl: `${env.email.frontendUrl}/my-ai-trips/${dto.id}`,
          exploreUrl: `${env.email.frontendUrl}/planner`,
        },
        prefsOf(user),
      );
    } catch (err) {
      console.error(`[email] AI trip saved notification failed for user ${userId}: ${err instanceof Error ? err.message : err}`);
    }
  },

  async listForUser(userId: string): Promise<TripPlanDTO[]> {
    const plans = await tripPlanRepository.findAllByUser(userId);
    return plans.map(toTripPlanDTO);
  },

  async getById(userId: string, id: string): Promise<TripPlanDTO> {
    return toTripPlanDTO(await requireOwnedPlan(userId, id));
  },

  async updateTitle(userId: string, id: string, input: UpdateTripPlanInput): Promise<TripPlanDTO> {
    const title = input.title?.trim();
    if (!title) {
      throw ApiError.badRequest('Title is required');
    }
    await requireOwnedPlan(userId, id);
    return toTripPlanDTO(await tripPlanRepository.updateTitle(id, title));
  },

  async duplicate(userId: string, id: string): Promise<TripPlanDTO> {
    const plan = await requireOwnedPlan(userId, id);
    const created = await tripPlanRepository.createWithItinerary({
      userId,
      title: plan.title ? `${plan.title} (copy)` : 'Untitled trip (copy)',
      budget: plan.budget,
      days: plan.days,
      travelStyle: plan.travelStyle,
      interests: plan.interests,
      itinerary: plan.itinerary.map((item) => ({
        day: item.day,
        focus: item.focus,
        destinationId: item.destinationId,
      })),
      payload: plan.payload ?? undefined,
    });
    return toTripPlanDTO(created);
  },

  async remove(userId: string, id: string): Promise<void> {
    await requireOwnedPlan(userId, id);
    await tripPlanRepository.deleteById(id);
  },

  /**
   * AI chat assistant - edits the EXISTING saved itinerary and persists the result.
   */
  async chat(
    userId: string,
    id: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<TripPlanDTO> {
    const plan = await requireOwnedPlan(userId, id);
    const payload = plan.payload as AiTripPlanResult | null;
    if (!payload || !Array.isArray(payload.itinerary) || payload.itinerary.length === 0) {
      throw ApiError.badRequest('This trip has no AI itinerary to edit.');
    }

    const updated = await groqService.editItinerary(payload, message, history);

    const ids = dayDestinationIds(updated.itinerary).filter(isRealDestinationId);
    const existing = ids.length > 0 ? await destinationRepository.findManyByIds(ids) : [];
    const validIds = new Set(existing.map((d) => d.id));

    const rows = updated.itinerary
      .filter((day) => isRealDestinationId(day.destination?.id ?? '') && validIds.has(day.destination.id))
      .map((day) => ({
        day: day.day,
        focus: day.focus,
        destinationId: day.destination.id,
      }));

    const saved = await tripPlanRepository.replaceItineraryAndPayload({
      id,
      payload: updated as unknown as Prisma.InputJsonValue,
      days: updated.itinerary.length,
      itinerary: rows,
    });

    return toTripPlanDTO(saved);
  },
};
