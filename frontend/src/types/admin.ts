// ─── BTO Project ─────────────────────────────────────────────────

export interface BTOProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  town: string;
  location: string;
  launchYear: number;
  classification: string;
  developer: string;
  imageUrl?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { flatTypes: number };
  flatTypes?: FlatType[];
}

// ─── Flat Type (HDB room category: 2-Room, 3-Room, 4-Room, etc.) ─

export interface FlatType {
  id: string;
  btoProjectId: string;
  name: string;
  bedroomCount: number;
  typicalSizeMin?: number;
  typicalSizeMax?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { variants: number };
  variants?: LayoutVariant[];
  btoProject?: BTOProject;
}

// ─── Layout Variant (specific floor plan within a flat type) ─────

export interface LayoutVariant {
  id: string;
  flatTypeId: string;
  name: string;
  floorPlanUrl?: string;
  thumbnailUrl?: string;
  totalArea?: number;
  isWhiteFlat: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { walls: number; roomDefs: number };
  flatType?: FlatType;
  walls?: WallSegment[];
  roomDefs?: RoomDef[];
}

// ─── Walls / Doors / Windows / Rooms ─────────────────────────────

export interface WallSegment {
  id?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness?: number;
  height?: number;
  wallType?: string;
  isLoadBearing?: boolean;
  positiveRoomId?: string | null;
  negativeRoomId?: string | null;
  sortOrder?: number;
  doors?: DoorOpening[];
  windows?: WindowOpening[];
}

export interface DoorOpening {
  position: number;
  width?: number;
  height?: number;
  length?: number;  // visual extension from wall (arc radius / folding depth)
  swing?: string;   // "in" | "out"
  hinge?: string;   // "left" | "right"
  doorType?: string; // "swing" | "folding"
}

export interface WindowOpening {
  position: number;
  width?: number;
}

export interface RoomDef {
  id?: string;
  label: string;
  roomType?: string;
  originalRoomType?: string;
  area?: number;
  defaultWallColor?: string;
  defaultFloorType?: string;
  defaultFloorColor?: string;
  sortOrder?: number;
  centroidX?: number;
  centroidY?: number;
  polygon?: { x: number; y: number }[];
}

export interface PlacedFurniture {
  id?: string;
  itemType: string;    // key from furniture catalog
  x: number; y: number; // centre position (metres)
  width: number;        // metres
  height: number;       // metres
  rotation: number;     // degrees
}

export interface AnnotationData {
  walls: WallSegment[];
  rooms: RoomDef[];
  furniture?: PlacedFurniture[];
}
