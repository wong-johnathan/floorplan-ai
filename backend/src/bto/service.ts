import { prisma } from '../db/prisma';

export interface CreateBTOInput {
  name: string;
  slug: string;
  description?: string;
  town: string;
  location: string;
  launchYear: number;
  classification?: string;
  imageUrl?: string;
}

export function listPublished() {
  return prisma.bTOProject.findMany({
    where: {
      flatTypes: { some: { variants: { some: { published: true } } } },
    },
    include: { _count: { select: { flatTypes: true } } },
    orderBy: { launchYear: 'desc' },
  });
}

export function listAll() {
  return prisma.bTOProject.findMany({
    include: { _count: { select: { flatTypes: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getById(id: string) {
  return prisma.bTOProject.findUnique({
    where: { id },
    include: {
      flatTypes: {
        orderBy: { sortOrder: 'asc' },
        include: { variants: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
}

export function create(data: CreateBTOInput) {
  return prisma.bTOProject.create({ data });
}

export function update(id: string, data: Partial<CreateBTOInput>) {
  return prisma.bTOProject.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.bTOProject.delete({ where: { id } });
}
