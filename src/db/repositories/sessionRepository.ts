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
};
