import { prisma } from '../db/prisma';

// ─── Flat Types ──────────────────────────────────────────────────

export function listFlatTypes(btoProjectId: string) {
  return prisma.flatType.findMany({
    where: { btoProjectId },
    include: {
      _count: { select: { variants: true } },
      variants: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export function createFlatType(btoProjectId: string, data: { name: string; bedroomCount: number; typicalSizeMin?: number; typicalSizeMax?: number; sortOrder?: number }) {
  return prisma.flatType.create({ data: { ...data, btoProjectId } });
}

export function updateFlatType(id: string, data: Record<string, unknown>) {
  return prisma.flatType.update({ where: { id }, data });
}

export function removeFlatType(id: string) {
  return prisma.flatType.delete({ where: { id } });
}

// ─── Layout Variants ─────────────────────────────────────────────

export function listVariants(flatTypeId: string) {
  return prisma.layoutVariant.findMany({
    where: { flatTypeId },
    include: { _count: { select: { walls: true, roomDefs: true } } },
    orderBy: { sortOrder: 'asc' },
  });
}

export function createVariant(flatTypeId: string, data: { name: string; totalArea?: number; isWhiteFlat?: boolean }) {
  return prisma.layoutVariant.create({ data: { ...data, flatTypeId } });
}

export function getVariant(id: string) {
  return prisma.layoutVariant.findUnique({
    where: { id },
    include: {
      flatType: { include: { btoProject: true } },
      walls: { include: { doors: true, windows: true }, orderBy: { sortOrder: 'asc' } },
      roomDefs: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

export function updateVariant(id: string, data: Record<string, unknown>) {
  return prisma.layoutVariant.update({ where: { id }, data });
}

export function removeVariant(id: string) {
  return prisma.layoutVariant.delete({ where: { id } });
}

export function publishVariant(id: string) {
  return prisma.layoutVariant.update({ where: { id }, data: { published: true } });
}
