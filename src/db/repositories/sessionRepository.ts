import prisma from '../prismaClient';
import { Prisma } from '@prisma/client';

export const sessionRepository = {
  async create(channel = 'web', metadata?: Prisma.InputJsonValue) {
    return prisma.session.create({
      data: { channel, metadata },
    });
  },

  async findById(id: string) {
    return prisma.session.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  },

  async update(id: string, data: { metadata?: Prisma.InputJsonValue }) {
    return prisma.session.update({
      where: { id },
      data,
    });
  },

  async findAll(limit = 100) {
    return prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { messages: true } } },
    });
  },

  async findWhatsAppSessionByPhone(phone: string) {
    return prisma.session.findFirst({
      where: {
        channel: 'whatsapp',
        metadata: {
          path: ['phone'],
          equals: phone,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async countAll() {
    return prisma.session.count();
  },
};
