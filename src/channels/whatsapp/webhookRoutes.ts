import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { sessionStore } from '../../services/sessionStore';
import { sessionRepository } from '../../db/repositories/sessionRepository';
import { webhookEventRepository } from '../../db/repositories/webhookEventRepository';
import { processMessage } from '../../bot/engine';
import { sendWhatsAppMessage, markMessageRead } from './whatsappClient';
import { Prisma } from '@prisma/client';

const router = Router();

/** In-memory map of WhatsApp phone number → session ID. Re-hydrated from DB on cache miss. */
const phoneSessionMap = new Map<string, string>();

/** Strip all non-digit/non-plus characters to prevent injection via phone field. */
function sanitizePhone(raw: string): string {
  return raw.replace(/[^0-9+]/g, '');
}

async function getOrCreateWhatsAppSession(phone: string): Promise<string> {
  const cached = phoneSessionMap.get(phone);
  if (cached) return cached;

  const existing = await sessionRepository.findWhatsAppSessionByPhone(phone);
  if (existing) {
    phoneSessionMap.set(phone, existing.id);
    return existing.id;
  }

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

  if (
    mode === 'subscribe' &&
    token === config.whatsappVerifyToken &&
    typeof challenge === 'string' &&
    /^[0-9]+$/.test(challenge)
  ) {
    console.log('[WhatsApp] Webhook verified');
    // Send only the numeric challenge string – validated above to be digits only
    res.status(200).type('text/plain').send(challenge);
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
    // Persist raw webhook event for audit/debugging – capture the created ID
    const webhookEvent = await webhookEventRepository.create(
      'whatsapp',
      'incoming',
      body as Prisma.InputJsonValue,
    );

    const entries = (body['entry'] as Record<string, unknown>[]) ?? [];
    for (const entry of entries) {
      const changes = (entry['changes'] as Record<string, unknown>[]) ?? [];
      for (const change of changes) {
        const value = change['value'] as Record<string, unknown>;
        if (!value || change['field'] !== 'messages') continue;

        const messages = (value['messages'] as Record<string, unknown>[]) ?? [];
        for (const msg of messages) {
          if (msg['type'] !== 'text') continue;

          const rawPhone = msg['from'] as string;
          const messageId = msg['id'] as string;
          const userText = ((msg['text'] as Record<string, unknown>)?.['body'] as string) ?? '';

          const phone = sanitizePhone(rawPhone);
          if (!phone || !userText.trim()) continue;

          await markMessageRead(messageId);

          const sessionId = await getOrCreateWhatsAppSession(phone);
          const session = await sessionStore.get(sessionId);
          if (!session) continue;

          const botResponse = await processMessage(session, userText.trim());
          await sessionStore.save(session);

          await sendWhatsAppMessage(phone, botResponse.message.text);
        }
      }
    }

    // Mark the persisted event as processed once all messages are handled
    await webhookEventRepository.markProcessed(webhookEvent.id).catch(() => undefined);
  } catch (err) {
    next(err);
  }
});

export default router;
