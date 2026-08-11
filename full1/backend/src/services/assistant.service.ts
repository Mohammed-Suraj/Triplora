import Groq from 'groq-sdk';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { destinationRepository } from '../repositories/destination.repository';
import { toDestinationDTO } from '../dto/destination.mapper';
import { analyticsLogService } from './analyticsLog.service';
import { ApiError } from '../utils/ApiError';
import type { DestinationDTO } from '../types';

export type AssistantMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
};

export type AssistantConversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage: string | null;
};

export type AssistantChatResult = {
  conversationId: string;
  title: string;
  reply: string;
  destinations: DestinationDTO[];
};

type DestinationChoice = Awaited<ReturnType<typeof destinationRepository.findAll>>[number];

const MAX_HISTORY_MESSAGES = 12;
const MAX_TOKENS = 1024;
const REQUEST_TIMEOUT = 60000;

const SYSTEM_PROMPT =
  'You are the Triplora AI Travel Assistant - an expert on Kerala (India) tourism. ' +
  'Below is Triplora\u2019s destination database. Answer the user\u2019s question using THIS database FIRST: ' +
  'name real destinations from the catalog (verbatim names), their regions, categories, ratings, best seasons, ' +
  'prices and activities. Only fall back to general knowledge when the catalog cannot answer (e.g. general hotels, ' +
  'packing, visa or generic travel tips). Keep answers helpful and concise (under 200 words). ' +
  'The user can ask about honeymoon spots, beaches, budget trips, family trips, hidden gems, best season, ' +
  'restaurants, hotels, weather or travel tips.';

function buildCatalogBlock(catalog: DestinationChoice[]): string {
  return catalog
    .map(
      (d) =>
        `- ${d.name} | ${d.region} | ${d.category.name} | rating ${d.rating} (${d.reviewsCount} reviews) | ` +
        `from \u20B9${d.priceFrom} | best season: ${d.bestSeason || 'n/a'} | ${[...(d.highlights ?? []), ...(d.activities ?? [])].slice(0, 3).join('; ')}`,
    )
    .join('\n');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !['the', 'and', 'for', 'with', 'from', 'best', 'place', 'places', 'where', 'what', 'which', 'hotel', 'hotels', 'beach', 'beaches'].includes(word));
}

/** Database-first retrieval: rank catalog destinations against the user's words. */
async function retrieveDestinations(message: string, limit = 8): Promise<DestinationChoice[]> {
  const all = await destinationRepository.findAll();
  const tokens = tokenize(message);
  if (tokens.length === 0) return all.slice(0, limit);

  const scored = all
    .map((d) => {
      const haystack = `${d.name} ${d.region} ${d.category.name} ${d.tagline} ${d.description} ${(d.highlights ?? []).join(' ')} ${(d.activities ?? []).join(' ')}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 1;
      }
      if (d.name.toLowerCase().split(/\s+/).some((part) => tokens.includes(part))) score += 2;
      return { d, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.d.rating - a.d.rating)
    .slice(0, limit);

  return scored.length > 0 ? scored.map((entry) => entry.d) : all.slice(0, limit);
}

function fallbackAnswer(message: string, destinations: DestinationChoice[]): string {
  if (destinations.length === 0) {
    return 'I could not find matching destinations right now. Try asking about beaches, hill stations, backwaters or a specific place like Munnar or Alleppey.';
  }
  const lines = destinations
    .slice(0, 4)
    .map(
      (d) =>
        `- ${d.name} (${d.region}, ${d.category.name}, rating ${d.rating})\n  ${d.tagline || (d.highlights?.[0] ?? '')}`,
    )
    .join('\n');
  return `Based on Triplora\u2019s destination database, here are the best matches for "${message.trim()}":\n\n${lines}\n\nYou can find full details, photos and reviews for each on the Explore page.`;
}

export const assistantService = {
  async listConversations(userId: string): Promise<AssistantConversation[]> {
    const rows = await prisma.aiConversation.findMany({
      where: { userId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      messageCount: row._count.messages,
      lastMessage: row.messages[0]?.content ?? null,
    }));
  },

  async getConversation(userId: string, id: string): Promise<{ conversation: AssistantConversation; messages: AssistantMessage[] }> {
    const conversation = await prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw ApiError.notFound('Conversation not found');
    if (conversation.userId !== userId) throw ApiError.forbidden('You cannot access another user\u2019s conversation');

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length,
        lastMessage: conversation.messages[conversation.messages.length - 1]?.content ?? null,
      },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
  },

  async removeConversation(userId: string, id: string): Promise<void> {
    const conversation = await prisma.aiConversation.findUnique({ where: { id } });
    if (!conversation) throw ApiError.notFound('Conversation not found');
    if (conversation.userId !== userId) throw ApiError.forbidden('You cannot delete another user\u2019s conversation');
    await prisma.aiConversation.delete({ where: { id } });
  },

  async chat(
    userId: string,
    message: string,
    conversationId?: string | null,
  ): Promise<AssistantChatResult> {
    const trimmed = message.trim();
    if (!trimmed) throw ApiError.badRequest('Message is required');

    // 1) Database-first retrieval (RAG).
    const matched = await retrieveDestinations(trimmed);

    // 2) Load (or create) the conversation + history.
    let conversation = conversationId
      ? await prisma.aiConversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null;
    if (conversationId && !conversation) throw ApiError.notFound('Conversation not found');
    if (conversation && conversation.userId !== userId) {
      throw ApiError.forbidden('You cannot access another user\u2019s conversation');
    }

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: {
          userId,
          title: trimmed.slice(0, 60) || 'New conversation',
          messages: { create: { role: 'USER', content: trimmed } },
        },
        include: { messages: true },
      });
    } else {
      await prisma.aiMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: trimmed } });
      conversation = await prisma.aiConversation.findUniqueOrThrow({
        where: { id: conversation.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    // 3) Build the prompt: catalog FIRST, then history, then the question.
    const history = conversation.messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => `${m.role === 'USER' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = [
      `TRIPLORA DATABASE (use these first):\n${buildCatalogBlock(matched)}`,
      history.length > 0 ? `\nCONVERSATION SO FAR:\n${history}` : '',
      `\nLATEST USER QUESTION: ${trimmed}`,
    ].join('\n');

    let reply: string;
    try {
      if (!env.groq.apiKey) throw new Error('GROQ_API_KEY not configured');
      const groq = new Groq({ apiKey: env.groq.apiKey, timeout: REQUEST_TIMEOUT });
      const completion = await groq.chat.completions.create({
        model: env.groq.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: MAX_TOKENS,
      });
      reply = completion.choices?.[0]?.message?.content?.trim() || '';
      if (!reply) throw new Error('Empty assistant response');
    } catch (err) {
      // Never fail the chat - fall back to database-driven template answer.
      console.error(`[assistant] groq call failed: ${err instanceof Error ? err.message : err}`);
      reply = fallbackAnswer(trimmed, matched);
    }

    await prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: reply },
    });
    await prisma.aiConversation.update({ where: { id: conversation.id }, data: { title: conversation.title } });

    void analyticsLogService.logAiUsage('ASSISTANT', userId);

    return {
      conversationId: conversation.id,
      title: conversation.title,
      reply,
      destinations: matched.slice(0, 4).map(toDestinationDTO),
    };
  },
};
