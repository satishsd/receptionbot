import prisma from '../prismaClient';
import { Role, Prisma } from '@prisma/client';

export const messageRepository = {
  async create(
    sessionId: string,
    role: Role,
    content: string,
    intent?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return prisma.message.create({
      data: { sessionId, role, content, intent, metadata },
    });
  },

  async findBySession(sessionId: string) {
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  },
};
