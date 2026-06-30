import prisma from '../prismaClient';

export const leadRepository = {
  async findByAgent(agentId: string) {
    return prisma.lead.findMany({ where: { agentId }, orderBy: { lastInteraction: 'desc' } });
  },

  async countByAgent(agentId: string) {
    return prisma.lead.count({ where: { agentId } });
  },

  async countByAgentSince(agentId: string, since: Date) {
    return prisma.lead.count({ where: { agentId, lastInteraction: { gte: since } } });
  },
};
