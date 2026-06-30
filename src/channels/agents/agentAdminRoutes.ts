import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdminAuth } from '../../middleware/adminAuth';
import { agentRepository } from '../../db/repositories/agentRepository';
import { hashPassword } from '../../utils/crypto';

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strip passwordHash before sending agent data to the client. */
function sanitize(agent: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = agent;
  return safe;
}

/**
 * GET /api/admin/agents
 * List all registered agents.
 */
router.get(
  '/',
  adminLimiter,
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await agentRepository.findAll();
      res.json({ agents: agents.map((a) => sanitize(a as Record<string, unknown>)) });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/admin/agents
 * Create a new agent. Body: { name, whatsappPhoneNumberId?, metaAccessToken?, password }
 */
router.post(
  '/',
  adminLimiter,
  requireAdminAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, whatsappPhoneNumberId, metaAccessToken, password } = req.body as {
        name?: string;
        whatsappPhoneNumberId?: string;
        metaAccessToken?: string;
        password?: string;
      };

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        res.status(400).json({ error: 'password must be at least 8 characters' });
        return;
      }

      const passwordHash = hashPassword(password);
      const agent = await agentRepository.create({
        name: name.trim(),
        whatsappPhoneNumberId: whatsappPhoneNumberId?.trim() || undefined,
        metaAccessToken: metaAccessToken?.trim() || undefined,
        passwordHash,
      });
      res.status(201).json({ agent: sanitize(agent as Record<string, unknown>) });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/admin/agents/:id
 * Delete an agent and all their properties / leads (cascade).
 */
router.delete(
  '/:id',
  adminLimiter,
  requireAdminAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await agentRepository.delete(req.params['id'] as string);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
