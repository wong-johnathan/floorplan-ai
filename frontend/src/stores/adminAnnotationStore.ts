import { create } from 'zustand';
import type { WallSegment, RoomDef, PlacedFurniture } from '../types/admin';
import { detectRooms, splitWalls } from '../lib/geometry/roomDetection';

export type ToolMode = 'select' | 'draw-wall' | 'add-door' | 'add-window' | 'divider' | 'pan' | 'place-furniture';
export type GridSize = 25 | 50 | 100; // cm

interface Point { x: number; y: number; }

interface AnnotationState {
  walls: WallSegment[];
  rooms: RoomDef[];
  furniture: PlacedFurniture[];
  tool: ToolMode;
  selectedWallId: string | null;
  selectedRoomId: string | null;
  selectedDoorId: string | null;
  selectedWindowId: string | null;
  selectedFurnitureId: string | null;
  placingFurnitureType: string | null; // catalog type being placed
  gridSnap: boolean;
  gridSize: number; // Grid spacing in metres (0.25, 0.5, 1.0)
  wallSnap: boolean;
  snapDistance: number; // Wall snap distance in metres
  showBackground: boolean;
  wallOpacity: number;  // 0.2–1.0
  orthoLock: boolean;
  drawStart: Point | null;
  drawPreview: Point | null;
  isDrawing: boolean;
  cursorPos: Point | null;

  // Undo/redo
  undoStack: { walls: WallSegment[]; rooms: RoomDef[]; furniture: PlacedFurniture[] }[];
  redoStack: { walls: WallSegment[]; rooms: RoomDef[]; furniture: PlacedFurniture[] }[];

  // Actions
  setTool: (tool: ToolMode) => void;
  addWall: (start: Point, end: Point) => void;
  updateWall: (id: string, updates: Partial<WallSegment>) => void;
  deleteWall: (id: string) => void;
  selectWall: (id: string | null) => void;
  selectRoom: (id: string | null) => void;
  setDrawStart: (point: Point | null) => void;
  setDrawPreview: (point: Point | null) => void;
  setCursorPos: (point: Point | null) => void;
  setIsDrawing: (v: boolean) => void;
  detectAndSetRooms: () => void;
  updateRoom: (id: string, updates: Partial<RoomDef>) => void;
  addDoor: (wallId: string, position: number) => void;
  addWindow: (wallId: string, position: number) => void;
  removeDoor: (wallId: string, doorIndex: number) => void;
  removeWindow: (wallId: string, windowIndex: number) => void;
  addFurniture: (item: PlacedFurniture) => void;
  updateFurniture: (id: string, updates: Partial<PlacedFurniture>) => void;
  removeFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  setPlacingFurnitureType: (type: string | null) => void;
  loadAnnotation: (walls: WallSegment[], rooms: RoomDef[], furniture?: PlacedFurniture[]) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  snapToGrid: (p: Point) => Point;
  orthoSnap: (from: Point, to: Point) => Point;
  endpointSnap: (p: Point) => Point;
}

let wallIdCounter = 0;
let roomIdCounter = 0;
function nextWallId() { return `wall_${++wallIdCounter}`; }
function nextRoomId() { return `room_${++roomIdCounter}`; }

function pushUndo(state: AnnotationState): void {
  if (state.undoStack.length >= 50) state.undoStack.shift();
  state.undoStack.push({
    walls: JSON.parse(JSON.stringify(state.walls)),
    rooms: JSON.parse(JSON.stringify(state.rooms)),
    furniture: JSON.parse(JSON.stringify(state.furniture)),
  });
  state.redoStack = [];
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  walls: [],
  rooms: [],
  furniture: [],
  tool: 'select',
  selectedWallId: null,
  selectedRoomId: null,
  selectedDoorId: null,
  selectedWindowId: null,
  selectedFurnitureId: null,
  placingFurnitureType: null,
  gridSnap: true,
  gridSize: 0.25,
  wallSnap: true,
  snapDistance: 0.08, // ~8px at 100px/m
  showBackground: true,
  wallOpacity: 0.8,
  orthoLock: false,
  drawStart: null,
  drawPreview: null,
  isDrawing: false,
  cursorPos: null,
  undoStack: [],
  redoStack: [],

  setTool: (tool) => set({ tool, isDrawing: false, drawStart: null, drawPreview: null }),

  addWall: (start, end) => {
    const state = get();
    pushUndo(state);
    const wall: WallSegment = {
      id: nextWallId(),
      startX: start.x, startY: start.y, endX: end.x, endY: end.y,
      thickness: 0.1, height: 2.6,
      wallType: state.tool === 'divider' ? 'virtual' : 'internal',
      isLoadBearing: false,
      doors: [], windows: [],
      sortOrder: state.walls.length,
    };
    set({ walls: [...state.walls, wall], isDrawing: false, drawStart: null, drawPreview: null });
  },

  updateWall: (id, updates) => {
    set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)) }));
  },

  deleteWall: (id) => {
    const state = get();
    const wall = state.walls.find(w => w.id === id);
    if (wall?.isLoadBearing || wall?.wallType === 'external') return; // Can't delete structural
    pushUndo(state);
    set({ walls: state.walls.filter(w => w.id !== id), selectedWallId: null });
  },

  selectWall: (id) => set({ selectedWallId: id, selectedRoomId: null }),

  selectRoom: (id) => set({ selectedRoomId: id, selectedWallId: null }),

  setDrawStart: (p) => set({ drawStart: p, isDrawing: !!p }),
  setDrawPreview: (p) => set({ drawPreview: p }),
  setCursorPos: (p) => set({ cursorPos: p }),
  setIsDrawing: (v) => set({ isDrawing: v }),

  detectAndSetRooms: () => {
    const state = get();
    pushUndo(state);
    const { walls } = state;
    if (walls.length < 3) return;

    const allWallInputs = walls.map(w => ({
      startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY,
    }));

    // Split walls at T-junctions/X-crossings; persist the result
    const splitInputs = splitWalls(allWallInputs);

    // Build a mapping: for each split segment, find its parent wall (by checking
    // which original wall contains the segment's start point).
    // Track assigned door/window indices per parent to avoid duplication at split boundaries.
    const assignedDoors = new Map<string, Set<number>>();
    const assignedWindows = new Map<string, Set<number>>();

    const buildSplitWalls = (): WallSegment[] => {
      return splitInputs.map(seg => {
        // Find the original wall this segment came from
        const parent = walls.find(w => {
          const dx = w.endX - w.startX;
          const dy = w.endY - w.startY;
          const len2 = dx * dx + dy * dy;
          if (len2 < 1e-10) return false;
          // Check seg.start and seg.end lie on this wall
          const tStart = ((seg.startX - w.startX) * dx + (seg.startY - w.startY) * dy) / len2;
          const tEnd   = ((seg.endX   - w.startX) * dx + (seg.endY   - w.startY) * dy) / len2;
          return tStart >= -0.01 && tEnd <= 1.01 && tStart < tEnd;
        });

        if (!parent) {
          // No parent found (shouldn't happen) — create as plain internal wall
          return {
            id: nextWallId(), startX: seg.startX, startY: seg.startY,
            endX: seg.endX, endY: seg.endY,
            thickness: 0.1, height: 2.6, wallType: 'internal', isLoadBearing: false,
            doors: [], windows: [], sortOrder: 0,
          };
        }

        // Compute t_start and t_end of this sub-segment on the parent
        const dx = parent.endX - parent.startX;
        const dy = parent.endY - parent.startY;
        const len2 = dx * dx + dy * dy;
        const tStart = ((seg.startX - parent.startX) * dx + (seg.startY - parent.startY) * dy) / len2;
        const tEnd   = ((seg.endX   - parent.startX) * dx + (seg.endY   - parent.startY) * dy) / len2;

        const parentKey = parent.id!;

        // Migrate doors — assign each door index to at most one sub-segment (first match wins)
        if (!assignedDoors.has(parentKey)) assignedDoors.set(parentKey, new Set());
        const usedDoorIndices = assignedDoors.get(parentKey)!;
        const doors = (parent.doors ?? [])
          .map((d, idx) => ({ d, idx }))
          .filter(({ d, idx }) =>
            !usedDoorIndices.has(idx) &&
            d.position >= tStart - 0.001 && d.position <= tEnd + 0.001
          )
          .map(({ d, idx }) => {
            usedDoorIndices.add(idx);
            return { ...d, position: (d.position - tStart) / (tEnd - tStart) };
          });

        // Migrate windows — same deduplication approach
        if (!assignedWindows.has(parentKey)) assignedWindows.set(parentKey, new Set());
        const usedWindowIndices = assignedWindows.get(parentKey)!;
        const windows = (parent.windows ?? [])
          .map((w, idx) => ({ w, idx }))
          .filter(({ w, idx }) =>
            !usedWindowIndices.has(idx) &&
            w.position >= tStart - 0.001 && w.position <= tEnd + 0.001
          )
          .map(({ w, idx }) => {
            usedWindowIndices.add(idx);
            return { ...w, position: (w.position - tStart) / (tEnd - tStart) };
          });

        return {
          ...parent,
          id: nextWallId(),
          startX: seg.startX, startY: seg.startY,
          endX: seg.endX, endY: seg.endY,
          doors, windows,
          sortOrder: parent.sortOrder,
        };
      });
    };

    const newStoredWalls = buildSplitWalls();

    // Detect rooms using the split geometry
    const polygons = detectRooms(allWallInputs);

    const rooms: RoomDef[] = polygons.map((poly, i) => ({
      id: nextRoomId(),
      label: `Room ${i + 1}`,
      roomType: 'bedroom',
      area: Math.round(poly.area * 100) / 100,
      centroidX: Math.round(poly.centroid.x * 1000) / 1000,
      centroidY: Math.round(poly.centroid.y * 1000) / 1000,
      polygon: poly.vertices,
      sortOrder: i,
    }));

    // Assign wall adjacency using the new stored walls
    const TOL = 0.02;
    const updatedWalls = newStoredWalls.map(w => {
      let posRoom: string | null = null;
      let negRoom: string | null = null;
      for (let ri = 0; ri < polygons.length; ri++) {
        const poly = polygons[ri];
        for (let vi = 0; vi < poly.vertices.length; vi++) {
          const v1 = poly.vertices[vi];
          const v2 = poly.vertices[(vi + 1) % poly.vertices.length];
          const match1 = Math.abs(w.startX - v1.x) < TOL && Math.abs(w.startY - v1.y) < TOL
            && Math.abs(w.endX - v2.x) < TOL && Math.abs(w.endY - v2.y) < TOL;
          const match2 = Math.abs(w.startX - v2.x) < TOL && Math.abs(w.startY - v2.y) < TOL
            && Math.abs(w.endX - v1.x) < TOL && Math.abs(w.endY - v1.y) < TOL;
          if (match1 || match2) {
            if (!posRoom) posRoom = rooms[ri].id!;
            else if (!negRoom) negRoom = rooms[ri].id!;
          }
        }
      }
      return { ...w, positiveRoomId: posRoom ?? null, negativeRoomId: negRoom ?? null };
    });

    set({ rooms, walls: updatedWalls, selectedWallId: null, selectedRoomId: null });
  },

  updateRoom: (id, updates) => {
    set((s) => ({ rooms: s.rooms.map(r => r.id === id ? { ...r, ...updates } : r) }));
  },

  addDoor: (wallId, position) => {
    pushUndo(get());
    set((s) => ({
      walls: s.walls.map(w => w.id === wallId
        ? { ...w, doors: [...(w.doors ?? []), { position, width: 0.9, height: 2.1, swing: 'in', hinge: 'left', doorType: 'swing', length: 0.9 }] }
        : w),
    }));
  },

  addWindow: (wallId, position) => {
    pushUndo(get());
    set((s) => ({
      walls: s.walls.map(w => w.id === wallId
        ? { ...w, windows: [...(w.windows ?? []), { position, width: 1.2 }] }
        : w),
    }));
  },

  removeDoor: (wallId, doorIndex) => {
    pushUndo(get());
    set((s) => ({
      walls: s.walls.map(w => w.id === wallId
        ? { ...w, doors: (w.doors ?? []).filter((_, i) => i !== doorIndex) }
        : w),
    }));
  },

  removeWindow: (wallId, windowIndex) => {
    pushUndo(get());
    set((s) => ({
      walls: s.walls.map(w => w.id === wallId
        ? { ...w, windows: (w.windows ?? []).filter((_, i) => i !== windowIndex) }
        : w),
    }));
  },

  addFurniture: (item) => {
    pushUndo(get());
    set((s) => ({ furniture: [...s.furniture, { ...item, id: item.id ?? `furn_${Date.now()}` }] }));
  },

  updateFurniture: (id, updates) => {
    set((s) => ({ furniture: s.furniture.map((f) => (f.id === id ? { ...f, ...updates } : f)) }));
  },

  removeFurniture: (id) => {
    pushUndo(get());
    set((s) => ({ furniture: s.furniture.filter((f) => f.id !== id), selectedFurnitureId: null }));
  },

  selectFurniture: (id) => set({ selectedFurnitureId: id, selectedWallId: null, selectedRoomId: null }),
  setPlacingFurnitureType: (type) => set({ placingFurnitureType: type, tool: type ? 'place-furniture' : 'select' }),

  loadAnnotation: (walls, rooms, furniture) => {
    set({ walls, rooms, furniture: furniture ?? [], selectedWallId: null, selectedRoomId: null, isDrawing: false, undoStack: [], redoStack: [] });
  },

  reset: () => {
    pushUndo(get());
    wallIdCounter = 0; roomIdCounter = 0;
    set({ walls: [], rooms: [], furniture: [], selectedWallId: null, selectedRoomId: null, isDrawing: false, drawStart: null, drawPreview: null });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack[state.undoStack.length - 1];
    state.redoStack.push({ walls: JSON.parse(JSON.stringify(state.walls)), rooms: JSON.parse(JSON.stringify(state.rooms)), furniture: JSON.parse(JSON.stringify(state.furniture)) });
    set({ undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack], walls: prev.walls, rooms: prev.rooms, furniture: prev.furniture, selectedWallId: null, selectedFurnitureId: null });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const next = state.redoStack[state.redoStack.length - 1];
    state.undoStack.push({ walls: JSON.parse(JSON.stringify(state.walls)), rooms: JSON.parse(JSON.stringify(state.rooms)), furniture: JSON.parse(JSON.stringify(state.furniture)) });
    set({ redoStack: state.redoStack.slice(0, -1), undoStack: [...state.undoStack], walls: next.walls, rooms: next.rooms, furniture: next.furniture });
  },

  snapToGrid: (p) => {
    const { gridSnap, gridSize } = get();
    if (!gridSnap) return p;
    return { x: Math.round(p.x / gridSize) * gridSize, y: Math.round(p.y / gridSize) * gridSize };
  },

  orthoSnap: (from, to) => {
    const state = get();
    if (!state.orthoLock) return to;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) return { x: to.x, y: from.y };
    return { x: from.x, y: to.y };
  },

  endpointSnap: (p) => {
    const { walls, wallSnap, snapDistance } = get();
    if (!wallSnap) return p;
    const SNAP = snapDistance;
    let best = Infinity, bestPt = p;
    for (const w of walls) {
      // Snap to endpoints
      for (const pt of [{ x: w.startX, y: w.startY }, { x: w.endX, y: w.endY }]) {
        const d = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (d < SNAP && d < best) { best = d; bestPt = pt; }
      }
      // Snap to nearest point on wall segment (T-junction snapping)
      const dx = w.endX - w.startX, dy = w.endY - w.startY;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 0.0001) continue;
      const t = Math.max(0, Math.min(1, ((p.x - w.startX) * dx + (p.y - w.startY) * dy) / lenSq));
      const proj = { x: w.startX + t * dx, y: w.startY + t * dy };
      // Skip if the projection is essentially at an endpoint (already checked)
      const dToStart = Math.hypot(proj.x - w.startX, proj.y - w.startY);
      const dToEnd = Math.hypot(proj.x - w.endX, proj.y - w.endY);
      if (dToStart < 0.02 || dToEnd < 0.02) continue;
      const d = Math.hypot(proj.x - p.x, proj.y - p.y);
      if (d < SNAP && d < best) { best = d; bestPt = proj; }
    }
    return bestPt;
  },
}));
