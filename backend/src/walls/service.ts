import { prisma } from '../db/prisma';

export interface SaveAnnotationInput {
  walls: Array<{
    id?: string;
    startX: number; startY: number; endX: number; endY: number;
    thickness?: number; height?: number; wallType?: string; isLoadBearing?: boolean;
    positiveRoomId?: string | null; negativeRoomId?: string | null;
    sortOrder?: number;
    doors?: Array<{ position: number; width?: number; height?: number; length?: number; swing?: string; hinge?: string; doorType?: string }>;
    windows?: Array<{ position: number; width?: number; height?: number; sillHeight?: number; windowType?: string }>;
  }>;
  rooms: Array<{
    id?: string; label: string; roomType?: string; originalRoomType?: string;
    area?: number;
    defaultWallColor?: string; defaultFloorType?: string; defaultFloorColor?: string;
    sortOrder?: number;
  }>;
  furniture?: Array<{
    id?: string; itemType: string; x: number; y: number;
    width: number; height: number; rotation: number;
  }>;
}

export async function saveAnnotation(layoutVariantId: string, data: SaveAnnotationInput) {
  return prisma.$transaction(async (tx) => {
    await tx.wallSegment.deleteMany({ where: { layoutVariantId } });
    await tx.roomDef.deleteMany({ where: { layoutVariantId } });

    const roomIdMap = new Map<string, string>();
    for (const room of data.rooms) {
      const created = await tx.roomDef.create({
        data: {
          layoutVariantId,
          label: room.label,
          roomType: room.roomType ?? 'bedroom',
          area: room.area,
          originalRoomType: room.originalRoomType,
          defaultWallColor: room.defaultWallColor ?? '#F5F5F0',
          defaultFloorType: room.defaultFloorType ?? 'parquet',
          defaultFloorColor: room.defaultFloorColor ?? '#C4A882',
          sortOrder: room.sortOrder ?? 0,
        },
      });
      if (room.id) roomIdMap.set(room.id, created.id);
    }

    for (const wall of data.walls) {
      await tx.wallSegment.create({
        data: {
          layoutVariantId,
          startX: wall.startX, startY: wall.startY, endX: wall.endX, endY: wall.endY,
          thickness: wall.thickness ?? 0.10,
          height: wall.height ?? 2.6,
          wallType: wall.wallType ?? 'internal',
          isLoadBearing: wall.isLoadBearing ?? false,
          positiveRoomId: wall.positiveRoomId ? (roomIdMap.get(wall.positiveRoomId) ?? wall.positiveRoomId) : null,
          negativeRoomId: wall.negativeRoomId ? (roomIdMap.get(wall.negativeRoomId) ?? wall.negativeRoomId) : null,
          sortOrder: wall.sortOrder ?? 0,
          doors: { create: (wall.doors ?? []).map((d) => ({ position: d.position, width: d.width ?? 0.9, height: d.height ?? 2.1, length: d.length, swing: d.swing ?? 'in', hinge: d.hinge ?? 'left', doorType: d.doorType ?? 'swing' })) },
          windows: { create: (wall.windows ?? []).map((w) => ({ position: w.position, width: w.width ?? 1.2 })) },
        },
      });
    }

    await tx.layoutVariant.update({
      where: { id: layoutVariantId },
      data: { furniture: data.furniture ?? [] },
    });

    return tx.layoutVariant.findUnique({
      where: { id: layoutVariantId },
      include: {
        walls: { include: { doors: true, windows: true }, orderBy: { sortOrder: 'asc' } },
        roomDefs: { orderBy: { sortOrder: 'asc' } },
      },
    });
  });
}

export function publish(layoutVariantId: string) {
  return prisma.layoutVariant.update({ where: { id: layoutVariantId }, data: { published: true } });
}
