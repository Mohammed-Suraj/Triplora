import { prisma } from '../config/db';

/**
 * Fire-and-forget usage logging for analytics (AI features, searches).
 * Never throws - analytics must never break the calling flow.
 */
export const analyticsLogService = {
  async logAiUsage(type: string, userId: string | undefined): Promise<void> {
    try {
      await prisma.aiUsageLog.create({ data: { type, userId: userId ?? null } });
    } catch (err) {
      console.error(`[analytics] ai usage log failed: ${err instanceof Error ? err.message : err}`);
    }
  },

  async logSearch(query: string, userId: string | undefined): Promise<void> {
    try {
      const normalized = query.trim().slice(0, 200);
      if (!normalized) return;
      await prisma.searchLog.create({ data: { query: normalized, userId: userId ?? null } });
    } catch (err) {
      console.error(`[analytics] search log failed: ${err instanceof Error ? err.message : err}`);
    }
  },
};
