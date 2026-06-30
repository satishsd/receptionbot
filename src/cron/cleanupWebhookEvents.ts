/**
 * Cron job: clean up processed webhook events older than the configured retention period.
 */

import prisma from '../db/prismaClient';

const RETENTION_DAYS = parseInt(process.env['WEBHOOK_RETENTION_DAYS'] || '7', 10);

export async function cleanupWebhookEvents(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.webhookEvent.deleteMany({
    where: {
      processed: true,
      createdAt: { lt: cutoff },
    },
  });

  console.log(
    `[cleanupWebhookEvents] Deleted ${result.count} processed webhook event(s) older than ${RETENTION_DAYS} days.`,
  );
}
