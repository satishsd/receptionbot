import prisma from '../prismaClient';
import { AppointmentStatus } from '@prisma/client';

export interface CreateAppointmentData {
  sessionId?: string;
  name: string;
  phone?: string;
  email?: string;
  service: string;
  preferredAt?: Date;
  notes?: string;
}

export const appointmentRepository = {
  async create(data: CreateAppointmentData) {
    return prisma.appointment.create({ data });
  },

  async findById(id: string) {
    return prisma.appointment.findUnique({ where: { id } });
  },

  async findBySession(sessionId: string) {
    return prisma.appointment.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findAll(limit = 100) {
    return prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async countByStatus(status: AppointmentStatus) {
    return prisma.appointment.count({ where: { status } });
  },

  async countAll() {
    return prisma.appointment.count();
  },

  async updateStatus(id: string, status: AppointmentStatus) {
    return prisma.appointment.update({
      where: { id },
      data: { status },
    });
  },
};
