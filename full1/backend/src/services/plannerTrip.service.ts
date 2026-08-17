import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { plannerTripRepository } from '../repositories/plannerTrip.repository';
import { groqService } from './groq.service';
import { ApiError } from '../utils/ApiError';
import type { PlannerTripDTO } from '../types';
import type {
  CreatePlannerTripInput,
  OptimizePlannerTripInput,
  UpdatePlannerTripInput,
} from '../validators/plannerTrip.validator';

type PlannerTripRow = NonNullable<Awaited<ReturnType<typeof plannerTripRepository.findById>>>;

const SHARE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function randomShareCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += SHARE_ALPHABET[Math.floor(Math.random() * SHARE_ALPHABET.length)];
  }
  return code;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function toPlannerTripDTO(trip: PlannerTripRow): PlannerTripDTO {
  return {
    id: trip.id,
    title: trip.title,
    startDate: trip.startDate ? trip.startDate.toISOString() : null,
    days: parseJsonArray(trip.days) as PlannerTripDTO['days'],
    packing: parseJsonArray(trip.packing) as PlannerTripDTO['packing'],
    shareCode: trip.shareCode,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

async function requireOwnedTrip(userId: string, id: string): Promise<PlannerTripRow> {
  const trip = await plannerTripRepository.findById(id);
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }
  if (trip.userId !== userId) {
    throw ApiError.forbidden('You cannot access another user\u2019s trip');
  }
  return trip;
}

export const plannerTripService = {
  async listForUser(userId: string): Promise<PlannerTripDTO[]> {
    const trips = await plannerTripRepository.findAllByUser(userId);
    return trips.map(toPlannerTripDTO);
  },

  async getById(userId: string, id: string): Promise<PlannerTripDTO> {
    return toPlannerTripDTO(await requireOwnedTrip(userId, id));
  },

  async create(userId: string, input: CreatePlannerTripInput): Promise<PlannerTripDTO> {
    const created = await plannerTripRepository.create({
      userId,
      title: input.title,
      startDate: input.startDate ? new Date(input.startDate) : null,
      days: (input.days ?? []) as unknown as Prisma.InputJsonValue,
      packing: (input.packing ?? []) as unknown as Prisma.InputJsonValue,
    });
    return toPlannerTripDTO(created);
  },

  async update(userId: string, id: string, input: UpdatePlannerTripInput): Promise<PlannerTripDTO> {
    await requireOwnedTrip(userId, id);
    const updated = await plannerTripRepository.update(id, {
      title: input.title,
      startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
      days: input.days as unknown as Prisma.InputJsonValue | undefined,
      packing: input.packing as unknown as Prisma.InputJsonValue | undefined,
    });
    return toPlannerTripDTO(updated);
  },

  async duplicate(userId: string, id: string): Promise<PlannerTripDTO> {
    const trip = await requireOwnedTrip(userId, id);
    const days = (parseJsonArray(trip.days) as PlannerTripDTO['days']).map((day) => ({
      ...day,
      id: `day-${randomUUID()}`,
      items: day.items?.map((item) => ({
        ...item,
        id: `item-${randomUUID()}`,
      })) ?? [],
    }));
    const created = await plannerTripRepository.create({
      userId,
      title: `${trip.title} (copy)`,
      startDate: trip.startDate,
      days: days as unknown as Prisma.InputJsonValue,
      packing: parseJsonArray(trip.packing) as unknown as Prisma.InputJsonValue,
    });
    return toPlannerTripDTO(created);
  },

  async remove(userId: string, id: string): Promise<void> {
    await requireOwnedTrip(userId, id);
    await plannerTripRepository.deleteById(id);
  },

  async generateShareCode(userId: string, id: string): Promise<PlannerTripDTO> {
    await requireOwnedTrip(userId, id);
    let code = randomShareCode();
    let existing = await plannerTripRepository.findByShareCode(code);
    while (existing) {
      code = randomShareCode();
      existing = await plannerTripRepository.findByShareCode(code);
    }
    const updated = await plannerTripRepository.update(id, { shareCode: code });
    return toPlannerTripDTO(updated);
  },

  async getByShareCode(code: string): Promise<PlannerTripDTO> {
    const trip = await plannerTripRepository.findByShareCode(code);
    if (!trip) {
      throw ApiError.notFound('This shared trip no longer exists');
    }
    return toPlannerTripDTO(trip);
  },

  /** Deep AI optimize - asks Groq to reorder/regroup the itinerary. */
  async optimizeWithAi(
    userId: string,
    input: OptimizePlannerTripInput,
  ): Promise<{ days: PlannerTripDTO['days']; insights: string[] }> {
    const optimized = await groqService.optimizePlannerTrip({
      title: input.title,
      days: input.days,
    });
    return optimized;
  },
};
