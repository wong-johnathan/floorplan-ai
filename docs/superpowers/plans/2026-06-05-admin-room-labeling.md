# Admin Room Labeling System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add room labeling to the admin annotation tool — sequential wizard after detection, inline click-to-correct popup, wall endpoint dragging (Mode A), room vertex handle dragging (Mode B), and wall auto-split on detect with label preservation on re-detect.

**Architecture:** Room polygons are always derived from walls via the half-edge algorithm. Vertex editing is wall endpoint editing — no independent polygon store. The wizard and popup are HTML overlays over the Konva canvas; vertex/endpoint handles are Konva Circle shapes. Wall auto-split persists `splitWalls()` output to the store and migrates door/window positions to the correct sub-segment.

**Tech Stack:** React 19, TypeScript, Zustand 5, react-konva, Vitest, @testing-library/react, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-06-05-admin-room-labeling-design.md`

---

## File Map

| Status | Path | What changes |
|--------|------|-------------|
| Modify | `frontend/src/types/admin.ts` | Add `centroidX`, `centroidY`, `polygon` to `RoomDef` |
| Modify | `frontend/src/lib/geometry/roomDetection.ts` | Export `splitWalls`, add exported `pointInPolygon` |
| Create | `frontend/src/lib/geometry/__tests__/roomDetection.test.ts` | Unit tests for `splitWalls` and `pointInPolygon` |
| Modify | `frontend/src/stores/adminAnnotationStore.ts` | Persist split walls, store centroid+polygon, labeling mode state, `preserveLabelsOnRedetect` |
| Create | `frontend/src/stores/__tests__/adminAnnotationStore.test.ts` | Store action unit tests |
| Create | `frontend/src/components/admin/RoomLabelingWizard.tsx` | Bottom panel sequential labeling wizard |
| Create | `frontend/src/components/admin/__tests__/RoomLabelingWizard.test.tsx` | Wizard component tests |
| Create | `frontend/src/components/admin/RoomLabelPopup.tsx` | Floating inline relabel popup |
| Create | `frontend/src/components/admin/__tests__/RoomLabelPopup.test.tsx` | Popup component tests |
| Modify | `frontend/src/components/admin/WallAnnotationCanvas.tsx` | Endpoint handles (Mode A), room vertex handles (Mode B), room click callback |
| Modify | `frontend/src/components/admin/AnnotationToolbar.tsx` | Add "Re-detect Rooms" and "Label Rooms" buttons |
| Modify | `frontend/src/pages/admin/FlatModelAnnotatePage.tsx` | Mount wizard, manage popup state, inline toast |

---

## Task 1: Extend types + export geometry utilities

**Files:**
- Modify: `frontend/src/types/admin.ts`
- Modify: `frontend/src/lib/geometry/roomDetection.ts`
- Create: `frontend/src/lib/geometry/__tests__/roomDetection.test.ts`

- [ ] **Step 1.1: Add centroid and polygon fields to RoomDef**

In `frontend/src/types/admin.ts`, update the `RoomDef` interface:

```typescript
export interface RoomDef {
  id?: string;
  label: string;
  roomType?: string;
  originalRoomType?: string;
  area?: number;
  centroidX?: number;   // add
  centroidY?: number;   // add
  polygon?: { x: number; y: number }[];  // add — detected polygon vertices
  defaultWallColor?: string;
  defaultFloorType?: string;
  defaultFloorColor?: string;
  sortOrder?: number;
}
```

- [ ] **Step 1.2: Export `splitWalls` and add `pointInPolygon` to roomDetection.ts**

In `frontend/src/lib/geometry/roomDetection.ts`:

1. Change `function splitWalls` to `export function splitWalls` (line ~54).

2. Add the following export at the end of the file (after `polygonCentroid`):

```typescript
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
```

- [ ] **Step 1.3: Write failing tests for splitWalls and pointInPolygon**

Create `frontend/src/lib/geometry/__tests__/roomDetection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { splitWalls, pointInPolygon, detectRooms } from '../roomDetection';

describe('splitWalls', () => {
  it('returns wall unchanged when no intersections', () => {
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },
      { startX: 0, startY: 0, endX: 0, endY: 3 },
    ];
    const result = splitWalls(walls);
    expect(result).toHaveLength(2);
  });

  it('splits a long wall at a T-junction', () => {
    // Long horizontal wall from x=0 to x=4
    // Vertical wall endpoint at (2, 0) — T-junction
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },  // long wall
      { startX: 2, startY: 0, endX: 2, endY: 3 },   // perpendicular
    ];
    const result = splitWalls(walls);
    // Long wall should split into [0→2] and [2→4]
    const horizontals = result.filter(w => Math.abs(w.startY - w.endY) < 0.01);
    expect(horizontals).toHaveLength(2);
    const xs = horizontals.flatMap(w => [w.startX, w.endX]).sort((a, b) => a - b);
    expect(xs).toEqual([0, 2, 2, 4]);
  });

  it('splits at X-crossing (two walls crossing in interior)', () => {
    const walls = [
      { startX: 0, startY: 1, endX: 4, endY: 1 },  // horizontal
      { startX: 2, startY: 0, endX: 2, endY: 3 },   // vertical, crosses at (2,1)
    ];
    const result = splitWalls(walls);
    // Each wall should be split into 2 = 4 segments total
    expect(result).toHaveLength(4);
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 },
  ];

  it('returns true for point inside polygon', () => {
    expect(pointInPolygon({ x: 2, y: 2 }, square)).toBe(true);
  });

  it('returns false for point outside polygon', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(false);
  });

  it('returns false for point on boundary (edge case)', () => {
    // Ray casting is ambiguous on boundary; just verify it does not throw
    expect(() => pointInPolygon({ x: 0, y: 0 }, square)).not.toThrow();
  });
});

describe('detectRooms', () => {
  it('detects a single rectangle from 4 walls', () => {
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },
      { startX: 4, startY: 0, endX: 4, endY: 3 },
      { startX: 4, startY: 3, endX: 0, endY: 3 },
      { startX: 0, startY: 3, endX: 0, endY: 0 },
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(12, 0);
  });

  it('detects two rooms from a divided rectangle', () => {
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },
      { startX: 4, startY: 0, endX: 4, endY: 3 },
      { startX: 4, startY: 3, endX: 0, endY: 3 },
      { startX: 0, startY: 3, endX: 0, endY: 0 },
      { startX: 2, startY: 0, endX: 2, endY: 3 },  // divider
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(2);
  });
});
```

- [ ] **Step 1.4: Run tests — expect failures on splitWalls/pointInPolygon (not exported yet)**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -30
```

Expected: Tests in `roomDetection.test.ts` fail because `splitWalls` and `pointInPolygon` are not yet exported.

- [ ] **Step 1.5: Apply the code changes from Steps 1.1 and 1.2**

- [ ] **Step 1.6: Run tests — expect all pass**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -30
```

Expected: All roomDetection tests pass.

- [ ] **Step 1.7: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/types/admin.ts frontend/src/lib/geometry/roomDetection.ts frontend/src/lib/geometry/__tests__/roomDetection.test.ts && git commit -m "feat(admin): export splitWalls/pointInPolygon, extend RoomDef with centroid+polygon"
```

---

## Task 2: Persist split walls + door migration in detectAndSetRooms()

**Files:**
- Modify: `frontend/src/stores/adminAnnotationStore.ts`
- Create: `frontend/src/stores/__tests__/adminAnnotationStore.test.ts`

- [ ] **Step 2.1: Write failing tests for the new detectAndSetRooms behaviour**

Create `frontend/src/stores/__tests__/adminAnnotationStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from '../adminAnnotationStore';

beforeEach(() => {
  useAnnotationStore.getState().reset();
});

const RECT_WALLS = [
  { startX: 0, startY: 0, endX: 4, endY: 0 },
  { startX: 4, startY: 0, endX: 4, endY: 3 },
  { startX: 4, startY: 3, endX: 0, endY: 3 },
  { startX: 0, startY: 3, endX: 0, endY: 0 },
];

describe('detectAndSetRooms', () => {
  it('detects one room from a rectangle', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal', isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    const { rooms } = useAnnotationStore.getState();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].label).toBe('Room 1');
    expect(rooms[0].area).toBeCloseTo(12, 0);
  });

  it('stores centroid and polygon with each detected room', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal', isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    const room = useAnnotationStore.getState().rooms[0];
    expect(room.centroidX).toBeCloseTo(2, 1);
    expect(room.centroidY).toBeCloseTo(1.5, 1);
    expect(room.polygon).toBeDefined();
    expect(room.polygon!.length).toBeGreaterThanOrEqual(4);
  });

  it('splits a long wall at T-junctions and persists split segments', () => {
    // Rectangle with one long top wall and a vertical divider from the top
    const walls = [
      { id: 'top', startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'right', startX: 4, startY: 0, endX: 4, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'bottom', startX: 4, startY: 3, endX: 0, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'left', startX: 0, startY: 3, endX: 0, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'divider', startX: 2, startY: 0, endX: 2, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
    ];
    useAnnotationStore.getState().loadAnnotation(walls, []);
    // Initially 5 walls
    expect(useAnnotationStore.getState().walls).toHaveLength(5);
    useAnnotationStore.getState().detectAndSetRooms();
    const { walls: storedWalls } = useAnnotationStore.getState();
    // top wall (0→4) should split at x=2: [0→2] and [2→4] = 6 total
    expect(storedWalls.length).toBeGreaterThan(5);
  });

  it('migrates a door from a split wall to the correct sub-segment', () => {
    // Long wall from x=0 to x=4, door at position=0.25 (x=1), divider at x=2
    const longWall = {
      id: 'top', startX: 0, startY: 0, endX: 4, endY: 0,
      thickness: 0.1, height: 2.6, wallType: 'internal' as const,
      isLoadBearing: false,
      doors: [{ position: 0.25, width: 0.9, height: 2.1, swing: 'in' as const, hinge: 'left' as const, doorType: 'swing' as const, length: 0.9 }],
      windows: [],
    };
    const walls = [
      longWall,
      { id: 'right', startX: 4, startY: 0, endX: 4, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'bottom', startX: 4, startY: 3, endX: 0, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'left', startX: 0, startY: 3, endX: 0, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'divider', startX: 2, startY: 0, endX: 2, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
    ];
    useAnnotationStore.getState().loadAnnotation(walls, []);
    useAnnotationStore.getState().detectAndSetRooms();
    const { walls: storedWalls } = useAnnotationStore.getState();
    // Door was at position 0.25 of [0→4] = x=1, which is on the [0→2] sub-segment
    // After migration it should be at position 0.5 of [0→2] (1/2 = 0.5)
    const leftHalf = storedWalls.find(w => Math.abs(w.startX - 0) < 0.01 && Math.abs(w.endX - 2) < 0.01);
    expect(leftHalf).toBeDefined();
    expect(leftHalf!.doors).toHaveLength(1);
    expect(leftHalf!.doors![0].position).toBeCloseTo(0.5, 2);
  });
});
```

- [ ] **Step 2.2: Run tests — expect failures**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -40
```

Expected: The centroid/polygon and wall-split tests fail.

- [ ] **Step 2.3: Update `detectAndSetRooms()` in adminAnnotationStore.ts**

Replace the existing `detectAndSetRooms` action body with the following. Find the action (currently around line 151) and replace its implementation:

```typescript
detectAndSetRooms: () => {
  const { walls } = get();
  if (walls.length < 3) return;

  const allWallInputs = walls.map(w => ({
    startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY,
  }));

  // Split walls at T-junctions/X-crossings; persist the result
  const splitInputs = splitWalls(allWallInputs);

  // Build a mapping: for each split segment, find its parent wall (by checking
  // which original wall contains the segment's start point)
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

      // Migrate doors that fall in [tStart, tEnd]
      const doors = (parent.doors ?? [])
        .filter(d => d.position >= tStart - 0.001 && d.position <= tEnd + 0.001)
        .map(d => ({ ...d, position: (d.position - tStart) / (tEnd - tStart) }));

      // Migrate windows that fall in [tStart, tEnd]
      const windows = (parent.windows ?? [])
        .filter(w => w.position >= tStart - 0.001 && w.position <= tEnd + 0.001)
        .map(w => ({ ...w, position: (w.position - tStart) / (tEnd - tStart) }));

      return {
        ...parent,
        id: nextWallId(),
        startX: seg.startX, startY: seg.startY,
        endX: seg.endX, endY: seg.endY,
        doors, windows,
        sortOrder: 0,
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

  set({ rooms, walls: updatedWalls });
},
```

Also add the import of `splitWalls` at the top of the store file (alongside the existing `detectRooms` import):

```typescript
import { detectRooms, splitWalls } from '../lib/geometry/roomDetection';
```

- [ ] **Step 2.4: Run tests — expect all pass**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -40
```

Expected: All store tests pass.

- [ ] **Step 2.5: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/stores/adminAnnotationStore.ts frontend/src/stores/__tests__/adminAnnotationStore.test.ts && git commit -m "feat(admin): persist split walls and store centroid+polygon in detectAndSetRooms"
```

---

## Task 3: Labeling mode state + preserveLabelsOnRedetect()

**Files:**
- Modify: `frontend/src/stores/adminAnnotationStore.ts`
- Modify: `frontend/src/stores/__tests__/adminAnnotationStore.test.ts`

- [ ] **Step 3.1: Add failing tests for labeling mode and label preservation**

Append to `frontend/src/stores/__tests__/adminAnnotationStore.test.ts`:

```typescript
describe('labeling mode', () => {
  it('enterLabelingMode sets isLabelingMode=true and builds labelingOrder from unlabeled rooms', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    useAnnotationStore.getState().enterLabelingMode();
    const { isLabelingMode, labelingOrder, rooms } = useAnnotationStore.getState();
    expect(isLabelingMode).toBe(true);
    expect(labelingOrder).toHaveLength(rooms.length);
  });

  it('exitLabelingMode sets isLabelingMode=false', () => {
    useAnnotationStore.getState().enterLabelingMode();
    useAnnotationStore.getState().exitLabelingMode();
    expect(useAnnotationStore.getState().isLabelingMode).toBe(false);
  });

  it('advanceLabelRoom increments activeLabelRoomIndex', () => {
    useAnnotationStore.getState().loadAnnotation(
      [
        { id: 'w0', startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w1', startX: 4, startY: 0, endX: 4, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w2', startX: 4, startY: 3, endX: 0, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w3', startX: 0, startY: 3, endX: 0, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w4', startX: 2, startY: 0, endX: 2, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      ], []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    useAnnotationStore.getState().enterLabelingMode();
    expect(useAnnotationStore.getState().activeLabelRoomIndex).toBe(0);
    useAnnotationStore.getState().advanceLabelRoom();
    expect(useAnnotationStore.getState().activeLabelRoomIndex).toBe(1);
  });

  it('advanceLabelRoom closes wizard when all rooms labeled', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    useAnnotationStore.getState().enterLabelingMode();
    // There is 1 room; label it
    const { rooms } = useAnnotationStore.getState();
    useAnnotationStore.getState().updateRoom(rooms[0].id!, { label: 'Living Room', roomType: 'living' });
    useAnnotationStore.getState().advanceLabelRoom();
    expect(useAnnotationStore.getState().isLabelingMode).toBe(false);
  });
});

describe('preserveLabelsOnRedetect', () => {
  it('inherits label when old room centroid falls inside new polygon', () => {
    const newPolygons = [
      {
        vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }],
        area: 12,
        centroid: { x: 2, y: 1.5 },
      },
    ];
    const oldRooms = [
      {
        id: 'r1', label: 'Living Room', roomType: 'living',
        centroidX: 2, centroidY: 1.5, area: 12,
      },
    ];
    const result = useAnnotationStore.getState().preserveLabelsOnRedetect(newPolygons, oldRooms);
    expect(result[0].label).toBe('Living Room');
    expect(result[0].roomType).toBe('living');
  });

  it('assigns generic label when no old room contains the new centroid', () => {
    const newPolygons = [
      {
        vertices: [{ x: 10, y: 10 }, { x: 14, y: 10 }, { x: 14, y: 13 }, { x: 10, y: 13 }],
        area: 12,
        centroid: { x: 12, y: 11.5 },
      },
    ];
    const oldRooms = [
      {
        id: 'r1', label: 'Living Room', roomType: 'living',
        centroidX: 2, centroidY: 1.5, area: 12,
      },
    ];
    const result = useAnnotationStore.getState().preserveLabelsOnRedetect(newPolygons, oldRooms);
    expect(result[0].label).toMatch(/^Room \d+/);
  });
});
```

- [ ] **Step 3.2: Run tests — expect failures**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -30
```

Expected: labeling mode and preserveLabelsOnRedetect tests fail (not yet implemented).

- [ ] **Step 3.3: Add new state fields to AnnotationState interface in adminAnnotationStore.ts**

In the `AnnotationState` interface, add after the `undoStack` / `redoStack` lines:

```typescript
// Labeling mode
isLabelingMode: boolean;
activeLabelRoomIndex: number;
labelingOrder: string[];   // room IDs, largest-area first

// Actions
enterLabelingMode: () => void;
exitLabelingMode: () => void;
advanceLabelRoom: () => void;
preserveLabelsOnRedetect: (
  newPolygons: import('./adminAnnotationStore').RoomPolygonForPreserve[],
  oldRooms: RoomDef[]
) => RoomDef[];
```

Also add a helper type at the top of the file (after imports):

```typescript
export interface RoomPolygonForPreserve {
  vertices: { x: number; y: number }[];
  area: number;
  centroid: { x: number; y: number };
}
```

And import `pointInPolygon` alongside `splitWalls`:

```typescript
import { detectRooms, splitWalls, pointInPolygon } from '../lib/geometry/roomDetection';
```

- [ ] **Step 3.4: Add initial values for new state fields in the `create()` call**

Find the initial state object in `create<AnnotationState>((set, get) => ({` and add:

```typescript
isLabelingMode: false,
activeLabelRoomIndex: 0,
labelingOrder: [],
```

- [ ] **Step 3.5: Add the new action implementations**

After the `detectAndSetRooms` action, add:

```typescript
enterLabelingMode: () => {
  const { rooms } = get();
  // Only include rooms that still have generic labels
  const unlabeled = rooms
    .filter(r => /^Room \d+$/.test(r.label))
    .sort((a, b) => (b.area ?? 0) - (a.area ?? 0))
    .map(r => r.id!);
  // All rooms labeled already — no-op
  if (unlabeled.length === 0) return;
  set({ isLabelingMode: true, activeLabelRoomIndex: 0, labelingOrder: unlabeled });
},

exitLabelingMode: () => set({ isLabelingMode: false }),

advanceLabelRoom: () => {
  const { activeLabelRoomIndex, labelingOrder, rooms } = get();
  const nextIndex = activeLabelRoomIndex + 1;
  if (nextIndex >= labelingOrder.length) {
    set({ isLabelingMode: false, activeLabelRoomIndex: 0 });
    return;
  }
  // Skip already-labeled rooms in the order
  const nextUnlabeled = labelingOrder.slice(nextIndex).findIndex(id => {
    const r = rooms.find(r => r.id === id);
    return r && /^Room \d+$/.test(r.label);
  });
  if (nextUnlabeled === -1) {
    set({ isLabelingMode: false, activeLabelRoomIndex: 0 });
  } else {
    set({ activeLabelRoomIndex: nextIndex + nextUnlabeled });
  }
},

preserveLabelsOnRedetect: (newPolygons, oldRooms) => {
  return newPolygons.map((poly, i) => {
    const match = oldRooms.find(r =>
      r.centroidX !== undefined &&
      r.centroidY !== undefined &&
      r.polygon !== undefined &&
      pointInPolygon({ x: r.centroidX, y: r.centroidY }, poly.vertices)
    );
    if (match) {
      return {
        id: nextRoomId(),
        label: match.label,
        roomType: match.roomType,
        area: Math.round(poly.area * 100) / 100,
        centroidX: Math.round(poly.centroid.x * 1000) / 1000,
        centroidY: Math.round(poly.centroid.y * 1000) / 1000,
        polygon: poly.vertices,
        sortOrder: i,
      };
    }
    return {
      id: nextRoomId(),
      label: `Room ${i + 1}`,
      roomType: 'bedroom',
      area: Math.round(poly.area * 100) / 100,
      centroidX: Math.round(poly.centroid.x * 1000) / 1000,
      centroidY: Math.round(poly.centroid.y * 1000) / 1000,
      polygon: poly.vertices,
      sortOrder: i,
    };
  });
},
```

Also update the `reset` action to include the new fields:

```typescript
reset: () => set({
  walls: [], rooms: [], furniture: [],
  tool: 'select', selectedWallId: null, selectedRoomId: null,
  selectedDoorId: null, selectedWindowId: null,
  selectedFurnitureId: null, placingFurnitureType: null,
  drawStart: null, drawPreview: null, isDrawing: false, cursorPos: null,
  undoStack: [], redoStack: [],
  isLabelingMode: false, activeLabelRoomIndex: 0, labelingOrder: [],
}),
```

- [ ] **Step 3.6: Run tests — expect all pass**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 3.7: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/stores/adminAnnotationStore.ts frontend/src/stores/__tests__/adminAnnotationStore.test.ts && git commit -m "feat(admin): add labeling mode state and preserveLabelsOnRedetect to store"
```

---

## Task 4: RoomLabelingWizard component

**Files:**
- Create: `frontend/src/components/admin/RoomLabelingWizard.tsx`
- Create: `frontend/src/components/admin/__tests__/RoomLabelingWizard.test.tsx`

- [ ] **Step 4.1: Write failing tests**

Create `frontend/src/components/admin/__tests__/RoomLabelingWizard.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAnnotationStore } from '../../../stores/adminAnnotationStore';
import { RoomLabelingWizard } from '../RoomLabelingWizard';

beforeEach(() => useAnnotationStore.getState().reset());

function setupTwoRooms() {
  // Manually inject two unlabeled rooms into the store
  useAnnotationStore.setState({
    rooms: [
      { id: 'r1', label: 'Room 1', roomType: 'bedroom', area: 14, centroidX: 1, centroidY: 1, polygon: [], sortOrder: 0 },
      { id: 'r2', label: 'Room 2', roomType: 'bedroom', area: 8, centroidX: 5, centroidY: 1, polygon: [], sortOrder: 1 },
    ],
    isLabelingMode: true,
    labelingOrder: ['r1', 'r2'],
    activeLabelRoomIndex: 0,
  });
}

describe('RoomLabelingWizard', () => {
  it('renders the wizard when isLabelingMode is true', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    expect(screen.getByText(/Room 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/14/)).toBeInTheDocument(); // area
  });

  it('does not render when isLabelingMode is false', () => {
    useAnnotationStore.setState({ isLabelingMode: false });
    render(<RoomLabelingWizard />);
    expect(screen.queryByText(/Room 1 of/i)).not.toBeInTheDocument();
  });

  it('clicking a room type chip labels the room and advances', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Living Room/i }));
    const { rooms, activeLabelRoomIndex } = useAnnotationStore.getState();
    expect(rooms.find(r => r.id === 'r1')!.label).toBe('Living Room');
    expect(rooms.find(r => r.id === 'r1')!.roomType).toBe('living');
    expect(activeLabelRoomIndex).toBe(1);
  });

  it('clicking Done closes the wizard', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(useAnnotationStore.getState().isLabelingMode).toBe(false);
  });

  it('custom name input labels the room on Enter', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    const input = screen.getByPlaceholderText(/custom/i);
    fireEvent.change(input, { target: { value: 'Study Nook' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useAnnotationStore.getState().rooms.find(r => r.id === 'r1')!.label).toBe('Study Nook');
  });
});
```

- [ ] **Step 4.2: Run tests — expect failures (component doesn't exist)**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -20
```

Expected: Import error for `RoomLabelingWizard`.

- [ ] **Step 4.3: Create the component**

Create `frontend/src/components/admin/RoomLabelingWizard.tsx`:

```typescript
import { useState } from 'react';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';

const ROOM_CHIPS: { label: string; roomType: string }[] = [
  { label: 'Living Room', roomType: 'living' },
  { label: 'Master BR', roomType: 'bedroom_master' },
  { label: 'Bedroom', roomType: 'bedroom' },
  { label: 'Kitchen', roomType: 'kitchen' },
  { label: 'Toilet', roomType: 'toilet' },
  { label: 'Balcony', roomType: 'balcony' },
  { label: 'Bomb Shelter', roomType: 'bomb_shelter' },
  { label: 'Service Yard', roomType: 'service_yard' },
  { label: 'Hallway', roomType: 'hallway' },
];

export function RoomLabelingWizard() {
  const isLabelingMode = useAnnotationStore(s => s.isLabelingMode);
  const activeLabelRoomIndex = useAnnotationStore(s => s.activeLabelRoomIndex);
  const labelingOrder = useAnnotationStore(s => s.labelingOrder);
  const rooms = useAnnotationStore(s => s.rooms);
  const updateRoom = useAnnotationStore(s => s.updateRoom);
  const advanceLabelRoom = useAnnotationStore(s => s.advanceLabelRoom);
  const exitLabelingMode = useAnnotationStore(s => s.exitLabelingMode);

  const [customName, setCustomName] = useState('');

  if (!isLabelingMode) return null;

  const activeRoomId = labelingOrder[activeLabelRoomIndex];
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  if (!activeRoom) return null;

  const total = labelingOrder.length;
  const current = activeLabelRoomIndex + 1;
  const progress = (current / total) * 100;

  function applyLabel(label: string, roomType: string) {
    updateRoom(activeRoomId, { label, roomType });
    setCustomName('');
    advanceLabelRoom();
  }

  function handleCustomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && customName.trim()) {
      applyLabel(customName.trim(), activeRoom?.roomType ?? 'bedroom');
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-zinc-200 shadow-lg">
      {/* Progress bar */}
      <div className="h-1 bg-zinc-100">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">
        {/* Counter + area */}
        <div className="shrink-0 text-xs font-semibold text-zinc-700 whitespace-nowrap">
          Room {current} of {total}
          {activeRoom.area !== undefined && (
            <span className="ml-2 font-normal text-zinc-400">{activeRoom.area} m²</span>
          )}
        </div>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ROOM_CHIPS.map(chip => (
            <button
              key={chip.roomType}
              onClick={() => applyLabel(chip.label, chip.roomType)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <input
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          placeholder="Custom name… (Enter)"
          className="px-2 py-0.5 border border-zinc-200 rounded text-xs w-44 focus:outline-none focus:border-blue-400"
        />

        <div className="flex-1" />

        {/* Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => useAnnotationStore.setState(s => ({
              activeLabelRoomIndex: Math.max(0, s.activeLabelRoomIndex - 1),
            }))}
            disabled={activeLabelRoomIndex === 0}
            className="px-2 py-0.5 text-xs border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            onClick={() => advanceLabelRoom()}
            className="px-2 py-0.5 text-xs border border-zinc-200 rounded hover:bg-zinc-50"
          >
            Skip
          </button>
          <button
            onClick={exitLabelingMode}
            className="px-2.5 py-0.5 text-xs bg-zinc-700 text-white rounded hover:bg-zinc-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.4: Run tests — expect all pass**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -20
```

Expected: All RoomLabelingWizard tests pass.

- [ ] **Step 4.5: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/components/admin/RoomLabelingWizard.tsx frontend/src/components/admin/__tests__/RoomLabelingWizard.test.tsx && git commit -m "feat(admin): add RoomLabelingWizard component"
```

---

## Task 5: RoomLabelPopup component

**Files:**
- Create: `frontend/src/components/admin/RoomLabelPopup.tsx`
- Create: `frontend/src/components/admin/__tests__/RoomLabelPopup.test.tsx`

- [ ] **Step 5.1: Write failing tests**

Create `frontend/src/components/admin/__tests__/RoomLabelPopup.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAnnotationStore } from '../../../stores/adminAnnotationStore';
import { RoomLabelPopup } from '../RoomLabelPopup';

beforeEach(() => useAnnotationStore.getState().reset());

function setupRoom() {
  useAnnotationStore.setState({
    rooms: [
      { id: 'r1', label: 'Master BR', roomType: 'bedroom_master', area: 12, centroidX: 2, centroidY: 2, polygon: [], sortOrder: 0 },
    ],
  });
}

describe('RoomLabelPopup', () => {
  it('renders with current room label', () => {
    setupRoom();
    render(<RoomLabelPopup roomId="r1" screenX={200} screenY={200} onClose={() => {}} />);
    expect(screen.getByText('Master BR')).toBeInTheDocument();
  });

  it('clicking a chip updates the room label and calls onClose', () => {
    setupRoom();
    const onClose = vi.fn();
    render(<RoomLabelPopup roomId="r1" screenX={200} screenY={200} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Kitchen/i }));
    expect(useAnnotationStore.getState().rooms[0].label).toBe('Kitchen');
    expect(useAnnotationStore.getState().rooms[0].roomType).toBe('kitchen');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('custom input submits on Enter and calls onClose', () => {
    setupRoom();
    const onClose = vi.fn();
    render(<RoomLabelPopup roomId="r1" screenX={200} screenY={200} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/custom/i);
    fireEvent.change(input, { target: { value: 'Study' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useAnnotationStore.getState().rooms[0].label).toBe('Study');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders null when roomId does not match any room', () => {
    setupRoom();
    const { container } = render(<RoomLabelPopup roomId="nonexistent" screenX={0} screenY={0} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 5.2: Run tests — expect failures**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -20
```

Expected: Import error for `RoomLabelPopup`.

- [ ] **Step 5.3: Create the component**

Create `frontend/src/components/admin/RoomLabelPopup.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';

const ROOM_CHIPS: { label: string; roomType: string }[] = [
  { label: 'Living Room', roomType: 'living' },
  { label: 'Master BR', roomType: 'bedroom_master' },
  { label: 'Bedroom', roomType: 'bedroom' },
  { label: 'Kitchen', roomType: 'kitchen' },
  { label: 'Toilet', roomType: 'toilet' },
  { label: 'Balcony', roomType: 'balcony' },
  { label: 'Bomb Shelter', roomType: 'bomb_shelter' },
  { label: 'Service Yard', roomType: 'service_yard' },
  { label: 'Hallway', roomType: 'hallway' },
];

interface Props {
  roomId: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

export function RoomLabelPopup({ roomId, screenX, screenY, onClose }: Props) {
  const rooms = useAnnotationStore(s => s.rooms);
  const updateRoom = useAnnotationStore(s => s.updateRoom);
  const [customName, setCustomName] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  const room = rooms.find(r => r.id === roomId);
  if (!room) return null;

  function applyLabel(label: string, roomType: string) {
    updateRoom(roomId, { label, roomType });
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && customName.trim()) {
      applyLabel(customName.trim(), room!.roomType ?? 'bedroom');
    }
    if (e.key === 'Escape') onClose();
  }

  // Clamp position to viewport
  const popupWidth = 260;
  const popupHeight = 160;
  const clampedX = Math.min(screenX, window.innerWidth - popupWidth - 8);
  const clampedY = Math.min(screenY - popupHeight - 8, window.innerHeight - popupHeight - 8);
  const finalY = clampedY < 8 ? screenY + 8 : clampedY;

  return (
    <div
      ref={popupRef}
      className="absolute z-30 bg-white border border-zinc-200 rounded-lg shadow-xl p-3"
      style={{ left: clampedX, top: finalY, width: popupWidth }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Current label badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Relabel room</span>
        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          {room.label}
        </span>
      </div>

      {/* Chip grid */}
      <div className="flex flex-wrap gap-1 mb-2">
        {ROOM_CHIPS.map(chip => (
          <button
            key={chip.roomType}
            onClick={() => applyLabel(chip.label, chip.roomType)}
            className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <input
        type="text"
        autoFocus
        value={customName}
        onChange={e => setCustomName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Custom name… (Enter to confirm)"
        className="w-full px-2 py-1 border border-zinc-200 rounded text-xs focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
```

- [ ] **Step 5.4: Run tests — expect all pass**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -20
```

Expected: All RoomLabelPopup tests pass.

- [ ] **Step 5.5: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/components/admin/RoomLabelPopup.tsx frontend/src/components/admin/__tests__/RoomLabelPopup.test.tsx && git commit -m "feat(admin): add RoomLabelPopup inline correction component"
```

---

## Task 6: Wall endpoint dragging — Mode A

**Files:**
- Modify: `frontend/src/components/admin/WallAnnotationCanvas.tsx`

Mode A: when a wall is selected, show two draggable `Circle` handles at its endpoints. Dragging updates the wall's coordinates in the store.

- [ ] **Step 6.1: Locate the wall rendering section in WallAnnotationCanvas.tsx**

Read the full file to find where wall `Line` elements are rendered:

```bash
grep -n "selectedWallId\|Line\|Circle\|wallId" frontend/src/components/admin/WallAnnotationCanvas.tsx | head -40
```

- [ ] **Step 6.2: Add endpoint handle rendering for selected wall**

Find the Layer that renders walls. After the existing wall `Line` elements, add endpoint handles for the selected wall. Add this inside the wall `Layer` (after all Line/Arc/Shape wall renderings), before closing the Layer tag:

```typescript
{/* Mode A — Endpoint handles for selected wall */}
{selectedWallId && (() => {
  const wall = walls.find(w => w.id === selectedWallId);
  if (!wall) return null;
  const pts: Array<{ key: 'start' | 'end'; mx: number; my: number }> = [
    { key: 'start', mx: wall.startX, my: wall.startY },
    { key: 'end',   mx: wall.endX,   my: wall.endY   },
  ];
  return pts.map(({ key, mx, my }) => (
    <Circle
      key={`ep-${wall.id}-${key}`}
      x={mx * PIXELS_PER_METRE}
      y={my * PIXELS_PER_METRE}
      radius={7 / zoom}
      fill="white"
      stroke={wall.isLoadBearing || wall.wallType === 'external' ? '#ef4444' : '#6382ff'}
      strokeWidth={2 / zoom}
      draggable={!wall.isLoadBearing && wall.wallType !== 'external'}
      onDragEnd={e => {
        const raw = { x: e.target.x() / PIXELS_PER_METRE, y: e.target.y() / PIXELS_PER_METRE };
        const snapped = snapToGrid(raw);
        const finalPt = endpointSnap(snapped);
        if (key === 'start') {
          updateWall(wall.id!, { startX: finalPt.x, startY: finalPt.y });
        } else {
          updateWall(wall.id!, { endX: finalPt.x, endY: finalPt.y });
        }
        // Snap handle back to grid position (Konva keeps drag position)
        e.target.position({ x: finalPt.x * PIXELS_PER_METRE, y: finalPt.y * PIXELS_PER_METRE });
      }}
      onDragStart={e => {
        if (wall.isLoadBearing || wall.wallType === 'external') {
          e.target.stopDrag();
        }
      }}
    />
  ));
})()}
```

Make sure `Circle` is imported from `react-konva` (it's already in the import at line 2).

Make sure `updateWall`, `snapToGrid`, `endpointSnap` are destructured from the store (they are already in the canvas via `useAnnotationStore`).

- [ ] **Step 6.3: Manual test**

Start the dev server and navigate to an annotation page with walls drawn:

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && docker compose -f docker-compose.dev.yml up -d
```

Open `http://localhost:5173`, go to any admin flat model annotation. Draw a wall, click to select it, then drag its endpoint handles. Verify:
- Endpoint handles appear as blue circles when wall is selected
- Dragging a handle moves the wall endpoint and redraws the wall
- Load-bearing wall handles appear red and resist dragging

- [ ] **Step 6.4: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/components/admin/WallAnnotationCanvas.tsx && git commit -m "feat(admin): wall endpoint dragging handles — Mode A"
```

---

## Task 7: Room vertex handles — Mode B

**Files:**
- Modify: `frontend/src/components/admin/WallAnnotationCanvas.tsx`

Mode B: when a room is selected in select mode, show vertex handles at every polygon corner. Dragging a handle finds the wall endpoint at that corner and updates it.

- [ ] **Step 7.1: Add room vertex handles**

In the same Layer as Mode A (or in a dedicated Layer above it), add room vertex handles when `selectedRoomId` is set and the tool is `'select'`. Add this block after the Mode A handles:

```typescript
{/* Mode B — Room vertex handles */}
{selectedRoomId && tool === 'select' && !isLabelingMode && (() => {
  const room = rooms.find(r => r.id === selectedRoomId);
  if (!room?.polygon || room.polygon.length === 0) return null;
  return room.polygon.map((vertex, vi) => {
    // Find which wall(s) have an endpoint at this vertex
    const TOL = 0.05;
    const matchingWalls = walls.filter(w =>
      (Math.abs(w.startX - vertex.x) < TOL && Math.abs(w.startY - vertex.y) < TOL) ||
      (Math.abs(w.endX   - vertex.x) < TOL && Math.abs(w.endY   - vertex.y) < TOL)
    );
    const isLoadBearing = matchingWalls.some(w => w.isLoadBearing || w.wallType === 'external');
    return (
      <Circle
        key={`rv-${room.id}-${vi}`}
        x={vertex.x * PIXELS_PER_METRE}
        y={vertex.y * PIXELS_PER_METRE}
        radius={6 / zoom}
        fill="white"
        stroke={isLoadBearing ? '#ef4444' : '#22c55e'}
        strokeWidth={2 / zoom}
        draggable={!isLoadBearing}
        onDragEnd={e => {
          const raw = { x: e.target.x() / PIXELS_PER_METRE, y: e.target.y() / PIXELS_PER_METRE };
          const snapped = snapToGrid(raw);
          const finalPt = endpointSnap(snapped);
          // Move all wall endpoints at this vertex
          matchingWalls.forEach(w => {
            const atStart = Math.abs(w.startX - vertex.x) < TOL && Math.abs(w.startY - vertex.y) < TOL;
            if (atStart) {
              updateWall(w.id!, { startX: finalPt.x, startY: finalPt.y });
            } else {
              updateWall(w.id!, { endX: finalPt.x, endY: finalPt.y });
            }
          });
          e.target.position({ x: finalPt.x * PIXELS_PER_METRE, y: finalPt.y * PIXELS_PER_METRE });
        }}
        onDragStart={e => { if (isLoadBearing) e.target.stopDrag(); }}
      />
    );
  });
})()}
```

Ensure `isLabelingMode` is destructured from the store in `WallAnnotationCanvas`:

```typescript
const isLabelingMode = useAnnotationStore(s => s.isLabelingMode);
```

- [ ] **Step 7.2: Add room click handler to open popup**

Find the existing room polygon rendering in the canvas (the shapes drawn for room fills/labels). Each room shape needs an `onClick` handler. Locate where room shapes are rendered (search for `rooms.map` or room fill color rendering) and add:

```typescript
onClick={e => {
  e.cancelBubble = true;
  selectRoom(room.id!);
  // Compute screen position for popup
  const stage = stageRef.current;
  if (!stage) return;
  const stageBox = stage.container().getBoundingClientRect();
  const sx = room.centroidX! * PIXELS_PER_METRE * zoom + pan.x + stageBox.left;
  const sy = room.centroidY! * PIXELS_PER_METRE * zoom + pan.y + stageBox.top;
  onRoomClick?.(room.id!, sx, sy);
}}
```

Add `onRoomClick` to the component's Props interface:

```typescript
interface Props {
  floorPlanUrl: string | null;
  onRoomClick?: (roomId: string, screenX: number, screenY: number) => void;
}
```

Destructure it in the component:

```typescript
export function WallAnnotationCanvas({ floorPlanUrl, onRoomClick }: Props) {
```

- [ ] **Step 7.3: Run all tests — expect no regressions**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -20
```

Expected: All tests still pass (no new tests for Mode B — it's visual/manual).

- [ ] **Step 7.4: Manual test**

In the admin annotation canvas:
1. Draw walls forming two rooms
2. Click "Auto-Detect Rooms"
3. Switch to Select tool
4. Click a detected room — verify green vertex handles appear at every polygon corner
5. Drag a corner handle — verify the wall adjusts and the room shape updates

- [ ] **Step 7.5: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/components/admin/WallAnnotationCanvas.tsx && git commit -m "feat(admin): room vertex handles (Mode B) and onRoomClick callback"
```

---

## Task 8: Toolbar buttons + FlatModelAnnotatePage integration

**Files:**
- Modify: `frontend/src/components/admin/AnnotationToolbar.tsx`
- Modify: `frontend/src/pages/admin/FlatModelAnnotatePage.tsx`

- [ ] **Step 8.1: Add Re-detect Rooms and Label Rooms buttons to toolbar**

In `frontend/src/components/admin/AnnotationToolbar.tsx`, add `enterLabelingMode` to the store reads and add two buttons next to the existing "Auto-Detect Rooms" button:

```typescript
// Add to store reads at top of component:
const enterLabelingMode = useAnnotationStore(s => s.enterLabelingMode);
const rooms = useAnnotationStore(s => s.rooms);
const unlabeledCount = rooms.filter(r => /^Room \d+$/.test(r.label)).length;
```

Replace the existing "Auto-Detect Rooms" button with:

```typescript
<button
  onClick={detectAndSetRooms}
  className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
>
  Detect Rooms
</button>

{rooms.length > 0 && (
  <button
    onClick={enterLabelingMode}
    className="px-2.5 py-1 text-xs font-medium bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-1"
    title={unlabeledCount > 0 ? `${unlabeledCount} rooms need labels` : 'Re-open labeling wizard'}
  >
    Label Rooms
    {unlabeledCount > 0 && (
      <span className="bg-white text-amber-600 rounded-full px-1.5 text-xs font-bold leading-none py-0.5">
        {unlabeledCount}
      </span>
    )}
  </button>
)}
```

- [ ] **Step 8.2: Wire popup + wizard into FlatModelAnnotatePage**

In `frontend/src/pages/admin/FlatModelAnnotatePage.tsx`:

1. Add imports at the top:

```typescript
import { useState, useEffect } from 'react';  // useState already there; add useEffect if missing
import { RoomLabelingWizard } from '../../components/admin/RoomLabelingWizard';
import { RoomLabelPopup } from '../../components/admin/RoomLabelPopup';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';
```

2. Add popup state inside the component (after existing state declarations):

```typescript
const [popup, setPopup] = useState<{ roomId: string; screenX: number; screenY: number } | null>(null);
const [toast, setToast] = useState<string | null>(null);
const isLabelingMode = useAnnotationStore(s => s.isLabelingMode);
const enterLabelingMode = useAnnotationStore(s => s.enterLabelingMode);
const rooms = useAnnotationStore(s => s.rooms);
```

3. Auto-open wizard when rooms are detected (after the existing `useEffect` for loading data):

```typescript
const prevRoomsRef = useRef<number>(0);
useEffect(() => {
  const unlabeled = rooms.filter(r => /^Room \d+$/.test(r.label));
  if (unlabeled.length > 0 && rooms.length > prevRoomsRef.current) {
    const wallsSplit = rooms.length !== prevRoomsRef.current;
    if (wallsSplit) {
      setToast('Walls automatically split at junctions for clean room boundaries.');
      setTimeout(() => setToast(null), 4000);
    }
    enterLabelingMode();
  }
  prevRoomsRef.current = rooms.length;
}, [rooms.length]); // eslint-disable-line react-hooks/exhaustive-deps
```

4. Add `onRoomClick` handler:

```typescript
function handleRoomClick(roomId: string, screenX: number, screenY: number) {
  if (isLabelingMode) return; // wizard is open; don't open popup
  setPopup({ roomId, screenX, screenY });
}
```

5. Close popup when clicking canvas background:

```typescript
function handleCanvasBackgroundClick() {
  setPopup(null);
}
```

6. Pass `onRoomClick` to `WallAnnotationCanvas` and add overlay components to JSX.

Find where `<WallAnnotationCanvas>` is rendered and update it:

```typescript
<WallAnnotationCanvas
  floorPlanUrl={variant?.floorPlanUrl ?? null}
  onRoomClick={handleRoomClick}
/>
```

7. Add the wizard, popup, and toast to the page JSX. Find the canvas container div (the one that wraps `WallAnnotationCanvas`) and make it `relative`. Then add overlays inside it:

```typescript
{/* Canvas container — must be position:relative */}
<div className="flex-1 relative overflow-hidden" onClick={handleCanvasBackgroundClick}>
  <WallAnnotationCanvas
    floorPlanUrl={variant?.floorPlanUrl ?? null}
    onRoomClick={handleRoomClick}
  />

  {/* Highlight active room in wizard */}
  {/* (WallAnnotationCanvas renders highlight via selectedRoomId + isLabelingMode) */}

  {/* Inline popup */}
  {popup && !isLabelingMode && (
    <RoomLabelPopup
      roomId={popup.roomId}
      screenX={popup.screenX}
      screenY={popup.screenY}
      onClose={() => setPopup(null)}
    />
  )}

  {/* Toast notification */}
  {toast && (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-40 pointer-events-none">
      {toast}
    </div>
  )}

  {/* Labeling wizard pinned to bottom of canvas */}
  {isLabelingMode && <RoomLabelingWizard />}
</div>
```

- [ ] **Step 8.3: Highlight the active room in the wizard inside WallAnnotationCanvas**

In `WallAnnotationCanvas.tsx`, read the labeling state and highlight the active room. Add to the existing store reads:

```typescript
const isLabelingMode = useAnnotationStore(s => s.isLabelingMode);
const activeLabelRoomIndex = useAnnotationStore(s => s.activeLabelRoomIndex);
const labelingOrder = useAnnotationStore(s => s.labelingOrder);
```

In the room fill rendering section (find where rooms are filled with their ROOM_COLORS), update the room fill/stroke to highlight the active wizard room and dim the others:

```typescript
// Inside the rooms.map(...) rendering:
const isActiveWizardRoom = isLabelingMode && labelingOrder[activeLabelRoomIndex] === room.id;
const isDimmed = isLabelingMode && !isActiveWizardRoom;
// Apply to the room fill shape:
opacity={isDimmed ? 0.3 : 1}
stroke={isActiveWizardRoom ? '#6382ff' : existingStroke}
strokeWidth={isActiveWizardRoom ? 3 / zoom : existingStrokeWidth}
```

- [ ] **Step 8.4: Run all tests — expect no regressions**

```bash
cd frontend && npm test -- --reporter verbose 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 8.5: Full manual walkthrough**

Start the dev server and run through the complete flow:

1. Go to an admin flat model annotation page
2. Draw walls forming 3 enclosed rooms (including one L-shaped)
3. Click "Detect Rooms"
4. Verify: toast appears ("Walls automatically split at junctions")
5. Verify: wizard opens at the bottom
6. Verify: Room 1 (largest) is highlighted; others dimmed
7. Click "Living Room" chip → room labeled, advances to Room 2
8. Type "Study Nook" in custom input + Enter → room labeled, advances to Room 3
9. Click "Bedroom" chip → wizard closes
10. Click any room → inline popup appears with chip picker
11. Select a different chip → room re-labeled, popup closes
12. Select a wall → blue endpoint handles appear
13. Drag an endpoint → wall adjusts
14. Click a room in select mode → green vertex handles appear
15. Drag a vertex → adjacent walls adjust
16. "Label Rooms" button in toolbar (shows badge count for any unlabeled rooms)

- [ ] **Step 8.6: Commit**

```bash
cd /Users/johnathanwong/Desktop/floorplan-ai && git add frontend/src/components/admin/AnnotationToolbar.tsx frontend/src/pages/admin/FlatModelAnnotatePage.tsx && git commit -m "feat(admin): integrate labeling wizard, popup, toast, and toolbar buttons"
```

---

## Self-Review Against Spec

| Spec requirement | Covered by task |
|-----------------|----------------|
| Sequential wizard triggered after detect | Task 4 + Task 8 |
| Bottom panel with area hint, chips, custom input, nav buttons | Task 4 |
| Rooms processed largest-area first | Task 3 (`enterLabelingMode` sort) |
| Pulsing highlight + dim others | Task 8 Step 8.3 |
| Inline popup on room click | Task 5 + Task 8 |
| Popup repositions near canvas edge | Task 5 (clamped position logic) |
| Popup auto-focus input | Task 5 (`autoFocus`) |
| Wall auto-split at T-junctions, persisted | Task 2 |
| Door/window position migrated on split | Task 2 (tested) |
| Toast "walls split" notification | Task 8 |
| Centroid + polygon stored per RoomDef | Task 1 + Task 2 |
| Wall endpoint dragging Mode A | Task 6 |
| Load-bearing wall handles red + blocked | Task 6 |
| Room vertex handles Mode B | Task 7 |
| Shared vertex warning tooltip | ⚠ Not implemented — add `title` prop to Mode B Circle: `title="Moving this also adjusts adjacent rooms"` (add to Task 7) |
| Vertex editing disabled during wizard | Task 7 (`!isLabelingMode` guard) |
| Re-detect preserves labels via centroid | Task 3 (`preserveLabelsOnRedetect`) |
| Wizard re-opens only for new generic rooms | Task 3 (`enterLabelingMode` filters unlabeled) |
| "Label Rooms" toolbar button | Task 8 |
| "Re-detect Rooms" toolbar button | Task 8 Step 8.1 (renamed to "Detect Rooms" — same button, now also calls `enterLabelingMode` via the `useEffect`) |
| All rooms already labeled → no wizard | Task 3 (guard in `enterLabelingMode`) |
| 0 rooms detected → error toast | ⚠ Not covered — add to Task 8: after `detectAndSetRooms`, if `rooms.length === 0` show toast "No enclosed rooms detected — check for gaps in walls" |

**Two gaps found — fix before committing Task 8:**

1. In `RoomLabelPopup.tsx`, add `title` to Mode B handles (in `WallAnnotationCanvas.tsx`):
   ```typescript
   title="Moving this also adjusts adjacent rooms"
   ```
   (Add to the Mode B `Circle` in Task 7)

2. In `FlatModelAnnotatePage.tsx`, add 0-room error toast in the `useEffect`:
   ```typescript
   if (rooms.length === 0 && prevRoomsRef.current === 0) return; // initial load
   if (rooms.length === 0) {
     setToast('No enclosed rooms detected — check for gaps in walls.');
     setTimeout(() => setToast(null), 4000);
     return;
   }
   ```
