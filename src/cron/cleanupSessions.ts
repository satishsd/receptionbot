/**
 * Cron job: clean up stale web sessions older than the configured retention period.
 * Cascades to associated messages via the Prisma onDelete: Cascade relation.
 */

import prisma from '../db/prismaClient';

const RETENTION_DAYS = parseInt(process.env['SESSION_RETENTION_DAYS'] || '30', 10);

export async function cleanupSessions(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.session.deleteMany({
    where: {
      channel: 'web',
      updatedAt: { lt: cutoff },
    },
  });

  console.log(
    `[cleanupSessions] Deleted ${result.count} stale session(s) older than ${RETENTION_DAYS} days.`,
  );
}
