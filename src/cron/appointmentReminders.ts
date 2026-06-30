/**
 * Cron job: log upcoming appointments scheduled within the next 24 hours
 * that are still in PENDING status.
 *
 * Extend this job to send email/SMS reminders once a notification service
 * is configured (e.g., Nodemailer, Twilio).
 */

import prisma from '../db/prismaClient';
import { AppointmentStatus } from '@prisma/client';

export async function appointmentReminders(): Promise<void> {
  const now = new Date();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.PENDING,
      preferredAt: {
        gte: now,
        lte: in24h,
      },
    },
    orderBy: { preferredAt: 'asc' },
  });

  if (upcoming.length === 0) {
    console.log('[appointmentReminders] No upcoming appointments in the next 24 hours.');
    return;
  }

  console.log(
    `[appointmentReminders] ${upcoming.length} upcoming appointment(s) in the next 24 hours:`,
  );
  for (const appt of upcoming) {
    const time = appt.preferredAt ? appt.preferredAt.toISOString() : 'unscheduled';
    console.log(
      `  - [${appt.id}] ${appt.name} | ${appt.service} | ${time} | phone: ${appt.phone ?? 'n/a'}`,
    );
    // TODO: send SMS/email reminder here once notification service is wired up
  }
}
