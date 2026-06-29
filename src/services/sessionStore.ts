import { ConversationSession } from '../types';
import { sessionRepository } from '../db/repositories/sessionRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory session store. Each entry holds runtime conversation state
 * (current intent, multi-turn step, draft data). The durable record
 * (messages, appointments) lives in PostgreSQL via the repository layer.
 *
 * Swap this map for a Redis/DB-backed store in phase 5 without changing
 * the interface that the bot engine depends on.
 */
const inMemorySessions = new Map<string, ConversationSession>();

export const sessionStore = {
  /**
   * Create a new session – persists in DB and caches in memory.
   */
  async create(channel = 'web'): Promise<ConversationSession> {
    const dbSession = await sessionRepository.create(channel);
    const session: ConversationSession = {
      id: dbSession.id,
      channel,
      state: {},
      context: { turnCount: 0 },
      createdAt: dbSession.createdAt,
      updatedAt: dbSession.updatedAt,
    };
    inMemorySessions.set(session.id, session);
    return session;
  },

  /**
   * Look up a session from the in-memory cache, or reload it from DB.
   */
  async get(id: string): Promise<ConversationSession | null> {
    const cached = inMemorySessions.get(id);
    if (cached) return cached;

    // Re-hydrate from DB (e.g. after server restart)
    const dbSession = await sessionRepository.findById(id);
    if (!dbSession) return null;

    const session: ConversationSession = {
      id: dbSession.id,
      channel: dbSession.channel,
      state: {},
      context: { turnCount: dbSession.messages.length },
      createdAt: dbSession.createdAt,
      updatedAt: dbSession.updatedAt,
    };
    inMemorySessions.set(id, session);
    return session;
  },

  /**
   * Persist state changes back to memory (DB is updated by repositories as messages/appointments are written).
   */
  async save(session: ConversationSession): Promise<void> {
    session.updatedAt = new Date();
    inMemorySessions.set(session.id, session);
  },

  /**
   * Generate a session id without persisting (for testing / lightweight use).
   */
  generateId(): string {
    return uuidv4();
  },
};
