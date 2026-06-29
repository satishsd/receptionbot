import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { sessionStore } from '../../services/sessionStore';
import { sessionRepository } from '../../db/repositories/sessionRepository';
import { webhookEventRepository } from '../../db/repositories/webhookEventRepository';
import { processMessage } from '../../bot/engine';
import { sendWhatsAppMessage, markMessageRead } from './whatsappClient';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * In-memory map of WhatsApp phone number → session ID.
 * Re-hydrated from DB on cache miss.
 */
const phoneSessionMap = new Map<string, string>();

async function getOrCreateWhatsAppSession(phone: string): Promise<string> {
  const cached = phoneSessionMap.get(phone);
  if (cached) return cached;

  // Try to find an existing session in DB
  const existing = await sessionRepository.findWhatsAppSessionByPhone(phone);
  if (existing) {
    phoneSessionMap.set(phone, existing.id);
    return existing.id;
  }

  // Create a new session for this WhatsApp user
  const session = await sessionStore.create('whatsapp');
  await sessionRepository.update(session.id, { metadata: { phone } as Prisma.InputJsonValue });
  phoneSessionMap.set(phone, session.id);
  return session.id;
}

/**
 * GET /api/webhook/whatsapp
 * Meta webhook verification challenge.
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
    console.log('[WhatsApp] Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.warn('[WhatsApp] Webhook verification failed');
    res.status(403).json({ error: 'Forbidden' });
  }
});

/**
 * POST /api/webhook/whatsapp
 * Receive incoming WhatsApp messages.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  // Acknowledge receipt immediately (Meta requires a 200 within 5 s)
  res.sendStatus(200);

  const body = req.body as Record<string, unknown>;

  // Only handle whatsapp_business_account events
  if (body['object'] !== 'whatsapp_business_account') return;

  try {
    // Persist raw webhook event for audit/debugging
    await webhookEventRepository.create('whatsapp', 'incoming', body as Prisma.InputJsonValue);

    const entries = (body['entry'] as Record<string, unknown>[]) ?? [];
    for (const entry of entries) {
      const changes = (entry['changes'] as Record<string, unknown>[]) ?? [];
      for (const change of changes) {
        const value = change['value'] as Record<string, unknown>;
        if (!value || change['field'] !== 'messages') continue;

        const messages = (value['messages'] as Record<string, unknown>[]) ?? [];
        for (const msg of messages) {
          if (msg['type'] !== 'text') continue; // ignore non-text for now

          const phone = msg['from'] as string;
          const messageId = msg['id'] as string;
          const userText = ((msg['text'] as Record<string, unknown>)?.['body'] as string) ?? '';

          if (!phone || !userText.trim()) continue;

          // Mark message as read
          await markMessageRead(messageId);

          // Get or create session for this phone number
          const sessionId = await getOrCreateWhatsAppSession(phone);
          const session = await sessionStore.get(sessionId);
          if (!session) continue;

          // Process through the bot engine
          const botResponse = await processMessage(session, userText.trim());
          await sessionStore.save(session);

          // Reply via WhatsApp
          await sendWhatsAppMessage(phone, botResponse.message.text);

          // Mark event as processed
          await webhookEventRepository
            .markProcessed((await webhookEventRepository.findAll(1))[0]?.id ?? '')
            .catch(() => undefined);
        }
      }
    }
  } catch (err) {
    next(err);
  }
});

export default router;
