import prisma from '../prismaClient';
import { Prisma } from '@prisma/client';

export const webhookEventRepository = {
  async create(source: string, eventType: string, payload: Prisma.InputJsonValue) {
    return prisma.webhookEvent.create({
      data: { source, eventType, payload },
    });
  },

  async findAll(limit = 100) {
    return prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async markProcessed(id: string) {
    return prisma.webhookEvent.update({
      where: { id },
      data: { processed: true },
    });
  },

  async countAll() {
    return prisma.webhookEvent.count();
  },
};
