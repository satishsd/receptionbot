import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAgentAuth, signAgentToken } from '../../middleware/agentAuth';
import { agentRepository } from '../../db/repositories/agentRepository';
import { propertyRepository } from '../../db/repositories/propertyRepository';
import { leadRepository } from '../../db/repositories/leadRepository';
import { verifyPassword } from '../../utils/crypto';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitizeAgent(agent: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = agent;
  return safe;
}

/** Convert Prisma Decimal fields to JS numbers for JSON serialisation. */
function serializeProperty(p: Record<string, unknown>) {
  return {
    ...p,
    sizeSqft: Number(p['sizeSqft']),
    price: Number(p['price']),
  };
}

// ─── Login ────────────────────────────────────────────────────────────────

/**
 * POST /api/agent/login
 * Body: { name, password }
 */
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, password } = req.body as { name?: string; password?: string };
    if (!name || !password) {
      res.status(400).json({ error: 'name and password are required' });
      return;
    }
    const agent = await agentRepository.findByName(name);
    if (!agent || !agent.passwordHash || !verifyPassword(password, agent.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signAgentToken(agent.id);
    res.json({ token, agent: sanitizeAgent(agent as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});

// ─── Profile ──────────────────────────────────────────────────────────────

/**
 * GET /api/agent/me
 */
router.get(
  '/me',
  portalLimiter,
  requireAgentAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const agent = await agentRepository.findById(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      res.json({ agent: sanitizeAgent(agent as Record<string, unknown>) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Properties ───────────────────────────────────────────────────────────

/**
 * GET /api/agent/properties
 */
router.get(
  '/properties',
  portalLimiter,
  requireAgentAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const properties = await propertyRepository.findByAgent(agentId);
      res.json({
        properties: properties.map((p) => serializeProperty(p as Record<string, unknown>)),
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/agent/properties
 * Body: { title, intent?, sizeSqft, price, area, imageUrl?, pdfUrl? }
 */
router.post(
  '/properties',
  portalLimiter,
  requireAgentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const { title, intent, sizeSqft, price, area, imageUrl, pdfUrl } = req.body as {
        title?: string;
        intent?: string;
        sizeSqft?: string | number;
        price?: string | number;
        area?: string;
        imageUrl?: string;
        pdfUrl?: string;
      };

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'title is required' });
        return;
      }
      if (sizeSqft === undefined || isNaN(Number(sizeSqft))) {
        res.status(400).json({ error: 'sizeSqft must be a number' });
        return;
      }
      if (price === undefined || isNaN(Number(price))) {
        res.status(400).json({ error: 'price must be a number' });
        return;
      }
      if (!area || typeof area !== 'string' || area.trim().length === 0) {
        res.status(400).json({ error: 'area is required' });
        return;
      }
      if (intent !== undefined && !['rent', 'buy'].includes(intent)) {
        res.status(400).json({ error: 'intent must be rent or buy' });
        return;
      }

      const property = await propertyRepository.create({
        agentId,
        title: title.trim(),
        intent,
        sizeSqft: Number(sizeSqft),
        price: Number(price),
        area: area.trim(),
        imageUrl: imageUrl?.trim() || undefined,
        pdfUrl: pdfUrl?.trim() || undefined,
      });
      res.status(201).json({ property: serializeProperty(property as Record<string, unknown>) });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/agent/properties/:id
 * Update fields or toggle isListed.
 */
router.patch(
  '/properties/:id',
  portalLimiter,
  requireAgentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const id = req.params['id'] as string;

      const existing = await propertyRepository.findById(id);
      if (!existing || existing.agentId !== agentId) {
        res.status(404).json({ error: 'Property not found' });
        return;
      }

      const { title, intent, sizeSqft, price, area, imageUrl, pdfUrl, isListed } = req.body as {
        title?: string;
        intent?: string;
        sizeSqft?: string | number;
        price?: string | number;
        area?: string;
        imageUrl?: string;
        pdfUrl?: string;
        isListed?: boolean;
      };

      if (intent !== undefined && !['rent', 'buy'].includes(intent)) {
        res.status(400).json({ error: 'intent must be rent or buy' });
        return;
      }

      const updated = await propertyRepository.update(id, {
        ...(title !== undefined && { title }),
        ...(intent !== undefined && { intent }),
        ...(sizeSqft !== undefined && { sizeSqft: Number(sizeSqft) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(area !== undefined && { area }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(pdfUrl !== undefined && { pdfUrl }),
        ...(isListed !== undefined && { isListed: Boolean(isListed) }),
      });
      res.json({ property: serializeProperty(updated as Record<string, unknown>) });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/agent/properties/:id
 */
router.delete(
  '/properties/:id',
  portalLimiter,
  requireAgentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const id = req.params['id'] as string;
      const existing = await propertyRepository.findById(id);
      if (!existing || existing.agentId !== agentId) {
        res.status(404).json({ error: 'Property not found' });
        return;
      }
      await propertyRepository.delete(id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Leads ────────────────────────────────────────────────────────────────

/**
 * GET /api/agent/leads
 */
router.get(
  '/leads',
  portalLimiter,
  requireAgentAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const leads = await leadRepository.findByAgent(agentId);
      res.json({ leads });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Stats ────────────────────────────────────────────────────────────────

/**
 * GET /api/agent/stats
 * Aggregated business statistics for the agent's dashboard.
 */
router.get(
  '/stats',
  portalLimiter,
  requireAgentAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = res.locals['agentId'] as string;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [properties, totalLeads, leadsThisWeek, leadsThisMonth] = await Promise.all([
        propertyRepository.findByAgent(agentId),
        leadRepository.countByAgent(agentId),
        leadRepository.countByAgentSince(agentId, weekAgo),
        leadRepository.countByAgentSince(agentId, monthAgo),
      ]);

      res.json({
        properties: {
          total: properties.length,
          listed: properties.filter((p) => p.isListed).length,
          delisted: properties.filter((p) => !p.isListed).length,
          byIntent: {
            rent: properties.filter((p) => p.intent === 'rent').length,
            buy: properties.filter((p) => p.intent === 'buy').length,
          },
        },
        leads: {
          total: totalLeads,
          thisWeek: leadsThisWeek,
          thisMonth: leadsThisMonth,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
