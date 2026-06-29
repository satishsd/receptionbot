import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { requireAdminAuth, signAdminToken } from '../../middleware/adminAuth';
import { appointmentRepository } from '../../db/repositories/appointmentRepository';
import { sessionRepository } from '../../db/repositories/sessionRepository';
import { messageRepository } from '../../db/repositories/messageRepository';
import { webhookEventRepository } from '../../db/repositories/webhookEventRepository';
import { AppointmentStatus } from '@prisma/client';

const router = Router();

/**
 * POST /api/admin/login
 * Validate credentials and return a signed admin token.
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (
    !username ||
    !password ||
    username !== config.adminUsername ||
    password !== config.adminPassword
  ) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signAdminToken(username);
  res.json({ token });
});

/**
 * GET /api/admin/stats
 * Returns aggregate counts for the dashboard.
 */
router.get('/stats', requireAdminAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      totalSessions,
      totalMessages,
      totalWebhookEvents,
    ] = await Promise.all([
      appointmentRepository.countAll(),
      appointmentRepository.countByStatus(AppointmentStatus.PENDING),
      appointmentRepository.countByStatus(AppointmentStatus.CONFIRMED),
      sessionRepository.countAll(),
      messageRepository.countAll(),
      webhookEventRepository.countAll(),
    ]);

    res.json({
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
        cancelled: totalAppointments - pendingAppointments - confirmedAppointments,
      },
      sessions: totalSessions,
      messages: totalMessages,
      webhookEvents: totalWebhookEvents,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/appointments
 * List all appointments (newest first, max 200).
 */
router.get(
  '/appointments',
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const appointments = await appointmentRepository.findAll(200);
      res.json({ appointments });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/admin/appointments/:id
 * Update appointment status (PENDING | CONFIRMED | CANCELLED).
 */
router.patch(
  '/appointments/:id',
  requireAdminAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as { status?: string };

      const validStatuses: AppointmentStatus[] = [
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ];

      if (!status || !validStatuses.includes(status as AppointmentStatus)) {
        res.status(400).json({ error: 'status must be PENDING, CONFIRMED, or CANCELLED' });
        return;
      }

      const updated = await appointmentRepository.updateStatus(id, status as AppointmentStatus);
      res.json({ appointment: updated });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/admin/sessions
 * List recent sessions with message counts.
 */
router.get(
  '/sessions',
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await sessionRepository.findAll(200);
      res.json({ sessions });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/admin/webhook-events
 * List recent webhook events.
 */
router.get(
  '/webhook-events',
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await webhookEventRepository.findAll(200);
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
