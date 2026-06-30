import prisma from '../prismaClient';

export interface CreateAgentData {
  name: string;
  whatsappPhoneNumberId?: string;
  metaAccessToken?: string;
  passwordHash?: string;
}

export const agentRepository = {
  async create(data: CreateAgentData) {
    return prisma.agent.create({ data });
  },

  async findById(id: string) {
    return prisma.agent.findUnique({ where: { id } });
  },

  async findByName(name: string) {
    return prisma.agent.findFirst({ where: { name } });
  },

  async findAll() {
    return prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async delete(id: string) {
    return prisma.agent.delete({ where: { id } });
  },
};
