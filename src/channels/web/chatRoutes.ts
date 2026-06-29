import { Router, Request, Response, NextFunction } from 'express';
import { sessionStore } from '../../services/sessionStore';
import { processMessage } from '../../bot/engine';
import { messageRepository } from '../../db/repositories/messageRepository';
import { sessionRepository } from '../../db/repositories/sessionRepository';

const router = Router();

/**
 * POST /api/chat/session
 * Create a new chat session.
 */
router.post('/session', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionStore.create('web');
    res.status(201).json({
      sessionId: session.id,
      channel: session.channel,
      createdAt: session.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/chat/session/:sessionId
 * Get session details including message history.
 */
router.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params['sessionId'] as string;
    const dbSession = await sessionRepository.findById(sessionId);
    if (!dbSession) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(dbSession);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/chat/message
 * Send a user message and get a bot response.
 * Body: { sessionId: string, message: string }
 */
router.post('/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, message } = req.body as { sessionId?: string; message?: string };

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'message is required and must be a non-empty string' });
      return;
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found. Please start a new session.' });
      return;
    }

    const botResponse = await processMessage(session, message.trim());
    await sessionStore.save(session);

    res.json(botResponse);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get message history for a session.
 */
router.get('/history/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params['sessionId'] as string;
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const messages = await messageRepository.findBySession(sessionId);
    res.json({ sessionId, messages });
  } catch (err) {
    next(err);
  }
});

export default router;
