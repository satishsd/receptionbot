import prisma from '../prismaClient';

export interface CreatePropertyData {
  agentId: string;
  title: string;
  intent?: string;
  sizeSqft: number;
  price: number;
  area: string;
  imageUrl?: string;
  pdfUrl?: string;
}

export interface UpdatePropertyData {
  title?: string;
  intent?: string;
  sizeSqft?: number;
  price?: number;
  area?: string;
  imageUrl?: string;
  pdfUrl?: string;
  isListed?: boolean;
}

export const propertyRepository = {
  async create(data: CreatePropertyData) {
    return prisma.property.create({ data });
  },

  async findById(id: string) {
    return prisma.property.findUnique({ where: { id } });
  },

  async findByAgent(agentId: string) {
    return prisma.property.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' } });
  },

  async update(id: string, data: UpdatePropertyData) {
    return prisma.property.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.property.delete({ where: { id } });
  },
};
