/**
 * Cron runner — standalone entry point executed by CloudPanel's cron scheduler.
 *
 * CloudPanel cron command example (run every hour):
 *   cd /home/receptionbot.cloud/htdocs/receptionbot && node dist/cron/runner.js
 *
 * Or using ts-node in development:
 *   cd /home/receptionbot.cloud/htdocs/receptionbot && npx ts-node src/cron/runner.ts
 *
 * Available jobs (pass as CLI argument, defaults to "all"):
 *   node dist/cron/runner.js all
 *   node dist/cron/runner.js cleanupSessions
 *   node dist/cron/runner.js cleanupWebhookEvents
 *   node dist/cron/runner.js appointmentReminders
 */

import 'dotenv/config';
import prisma from '../db/prismaClient';
import { cleanupSessions } from './cleanupSessions';
import { cleanupWebhookEvents } from './cleanupWebhookEvents';
import { appointmentReminders } from './appointmentReminders';

const JOBS: Record<string, () => Promise<void>> = {
  cleanupSessions,
  cleanupWebhookEvents,
  appointmentReminders,
};

async function run(): Promise<void> {
  const jobArg = process.argv[2] ?? 'all';
  const start = Date.now();

  console.log(`[cron-runner] Starting job(s): ${jobArg} at ${new Date().toISOString()}`);

  try {
    if (jobArg === 'all') {
      for (const [name, job] of Object.entries(JOBS)) {
        console.log(`[cron-runner] Running: ${name}`);
        await job();
      }
    } else {
      const job = JOBS[jobArg];
      if (!job) {
        console.error(
          `[cron-runner] Unknown job: "${jobArg}". Available: ${Object.keys(JOBS).join(', ')}`,
        );
        process.exitCode = 1;
        return;
      }
      await job();
    }
  } catch (err) {
    console.error('[cron-runner] Job failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    console.log(`[cron-runner] Finished in ${Date.now() - start}ms`);
  }
}

void run();
