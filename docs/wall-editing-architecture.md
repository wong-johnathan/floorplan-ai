# Wall Editing Architecture

## Flexible Floor Plan Editing for HDB Interiors

| Field | Value |
|-------|-------|
| **Status** | Draft v1.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |
| **Supersedes** | Sections of architecture.md (RoomConfig as fixed polygon), technical-specification.md (RoomConfig model) |

---

## 1. The Problem

The current architecture treats rooms as **fixed polygons** drawn by the admin. Users can style and furnish rooms, but cannot change the layout — no knocking down walls, no merging rooms, no open-concept conversions.

**Real Singapore use cases this blocks:**

| Scenario | Why It's Common | Current Limitation |
|----------|----------------|-------------------|
| 4-room → 3-room | Couple needs one less bedroom, wants larger living | Can't remove the wall between bedroom and living |
| Open-concept kitchen | Knock down kitchen wall for integrated living | Kitchen room is a fixed polygon |
| Expand MBR | Take space from adjacent room | Room boundaries are baked into the template |
| Create study nook | Subdivide large room | Can't add a new wall segment |
| Remove bomb shelter wall | Some homeowners open up bomb shelter into adjacent space | Can't touch fixed room boundaries |

---

## 2. Solution: Shared-Wall Data Model

The core change is from **room-based polygons** to **wall-based segments**. Rooms become derived from the walls that enclose them.

### 2.1 Concept

```
Current (rigid):
  ┌──────────┬──────────┐
  │          │          │
  │ Living   │ Bedroom  │  ← Rooms are independent polygons
  │ Room     │          │     Wall between them is implicit
  │          │          │
  └──────────┴──────────┘

Proposed (flexible):
  Wall A ──Wall B── Wall C
     │                 │
  Wall D    🔲        Wall E    ← Each wall is an entity
     │   (Door)       │         Rooms are derived from walls
  Wall F ──Wall G── Wall H
```

Each wall segment is a **shared edge**. It knows which rooms are on its left and right. Deleting a wall merges the adjacent rooms; adding a wall splits a room.

### 2.2 New Data Models

```prisma
// ─── Walls ──────────────────────────────────────────────────────

model WallSegment {
  id            String     @id @default(cuid())
  flatModelId   String
  flatModel     FlatModel  @relation(fields: [flatModelId], references: [id], onDelete: Cascade)

  // 2D coordinates on the floor plan (metres from origin)
  startX        Float
  startY        Float
  endX          Float
  endY          Float

  // Physical properties
  thickness     Float      @default(0.15)  // HDB internal wall: 150mm
  height        Float      @default(2.8)   // HDB ceiling height
  wallType      String     @default("internal") // "internal" | "external" | "party"
  isLoadBearing Boolean    @default(false)

  // Adjacency: which rooms are on each side
  // "positive" = right-hand side of directed edge (A→B)
  // "negative" = left-hand side of directed edge (A→B)
  positiveRoomId String?   // Room on the positive side
  negativeRoomId String?   // Room on the negative side

  // Openings in this wall
  doors         DoorOpening[]
  windows       WindowOpening[]

  // Admin metadata
  sortOrder     Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([flatModelId])
}

model DoorOpening {
  id            String      @id @default(cuid())
  wallSegmentId String
  wallSegment   WallSegment @relation(fields: [wallSegmentId], references: [id], onDelete: Cascade)

  // Position along the wall (percentage from start to end, 0.0-1.0)
  position      Float       // 0.0 = at startX/startY, 1.0 = at endX/endY
  width         Float       @default(0.9)  // metres
  height        Float       @default(2.1)  // metres
  swing         String      @default("in") // "in" | "out"

  @@index([wallSegmentId])
}

model WindowOpening {
  id            String      @id @default(cuid())
  wallSegmentId String
  wallSegment   WallSegment @relation(fields: [wallSegmentId], references: [id], onDelete: Cascade)

  position      Float       // 0.0-1.0 along wall
  width         Float       @default(1.2)
  height        Float       @default(1.2)
  sillHeight    Float       @default(1.0) // from floor
  windowType    String      @default("casement") // "casement" | "sliding" | "fixed"

  @@index([wallSegmentId])
}

// ─── Rooms (Derived from Walls) ────────────────────────────────

model RoomDef {
  id            String       @id @default(cuid())
  flatModelId   String
  flatModel     FlatModel    @relation(fields: [flatModelId], references: [id], onDelete: Cascade)
  
  label         String       // "Living Room", "Master Bedroom"
  roomType      String       // "living" | "bedroom_master" | "bedroom" | "kitchen" | "toilet" | "bomb_shelter" | "service_yard" | "hallway" | "balcony"
  originalRoomType String?   // What admin originally labelled (for reference after wall edits)

  // Material defaults (same as before)
  defaultWallColor  String   @default("#F5F5F0")
  defaultFloorType  String   @default("parquet")
  defaultFloorColor String   @default("#C4A882")

  sortOrder     Int          @default(0)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([flatModelId])
}
```

### 2.3 Relationship Between Rooms and Walls

Rooms are **not stored with wall references** — instead, they are derived from wall adjacency:

```
Given all WallSegments with flatModelId = X:

Room "Living Room" exists because:
  - Wall A has negativeRoomId = "living"
  - Wall B has positiveRoomId = "living"  
  - Wall C has negativeRoomId = "living"
  - These walls form a closed loop

When a wall is deleted, the wall's positiveRoomId and negativeRoomId
are used to determine which rooms merge.
```

**On every wall edit, the client recomputes rooms by:**

1. Start with any wall that has `positiveRoomId = "living"` (or the room in question)
2. Walk the wall graph following the shared edge
3. Collect walls until the loop closes
4. If no loop closes → rooms need recomputation (merge/split)

This is essentially a **half-edge / winged-edge mesh** data structure applied to floor plans.

---

## 3. User Workflow

### 3.1 New Step in the Pipeline

```
Current:  BTO Select → AI Style → Furnish → Render

New:      BTO Select → EDIT FLOOR PLAN → AI Style → Furnish → Render
                              ↑
                          New step
```

### 3.2 Full User Journey

```
Step 1: User selects their BTO project + flat model
        "Verandah Kallang 2024 — 4-Room Type A"

Step 2: 2D Floor Plan Editor loads
        ┌──────────────────────────────────────────────┐
        │  ✏️ Edit Floor Plan        [Apply Changes]   │
        ├──────────────────────────────────────────────┤
        │                                              │
        │    ┌───────────┬──────────┐                  │
        │    │           │          │                  │
        │    │  Living   │  MBR     │    ← Click wall │
        │    │   (5.0m×   │  (4.0m× │      to select  │
        │    │    4.0m)  │   3.5m) │                  │
        │    │           │          │                  │
        │    ├───────────┤──────────┤                  │
        │    │           │  Bed 2   │                  │
        │    │  Kitchen  │  (3.5m×  │                  │
        │    │   (4.0m×  │   3.0m)  │                  │
        │    │    2.5m)  │          │                  │
        │    └───────────┴──────────┘                  │
        │                                              │
        │  🔍 Search   📐 Draw Wall   ❌ Delete      │
        │  🚫 Cannot delete (load-bearing)             │
        └──────────────────────────────────────────────┘

Step 3: User selects wall between Living and Bed 2 → Delete
        ┌──────────────────────────────────────────────┐
        │  ⚡ Merge "Living Room" + "Bedroom 2"?       │
        │                                              │
        │  These rooms will be combined into one       │
        │  open space [door on this wall will be       │
        │  removed].                                   │
        │                                              │
        │  New room name: [Living + Study Area    ▼]   │
        │  New room type: [Living Room           ▼]   │
        │                                              │
        │  [Merge Rooms] [Cancel]                      │
        └──────────────────────────────────────────────┘

Step 4: Result — 4-room → 3-room conversion
        ┌──────────────────────────────────────────────┐
        │  ✏️ Edit Floor Plan        [Apply Changes]   │
        ├──────────────────────────────────────────────┤
        │                                              │
        │    ┌───────────┬──────────┐                  │
        │    │           │          │                  │
        │    │  Living   │  MBR     │                  │
        │    │  + Study  │          │     ← Wall gone │
        │    │   (8.5m×  │          │                  │
        │    │    4.0m)  │          │                  │
        │    │           │          │                  │
        │    ├───────────┤──────────┤                  │
        │    │           │  Bed 2   │                  │
        │    │  Kitchen  │          │                  │
        │    │           │          │                  │
        │    └───────────┴──────────┘                  │
        │                                              │
        │  [↩ Undo]  [↪ Redo]  [Reset to Original]    │
        └──────────────────────────────────────────────┘

Step 5: User clicks [Apply Changes]
        → 3D scene regenerates from edited wall set
        → Proceeds to AI Design Consultant

Step 6+: Same as before — AI consultant, furniture, renders
```

### 3.3 Draw Wall Mode

```
User clicks [📐 Draw Wall]
─────────────────────────────

1. Click on an existing wall (snap)
   → Wall highlights, shows "🟢 Start point"
   
2. Drag to another wall (snap to endpoint or midpoint)
   → Live preview of new wall segment shown as dashed line
   → Shows "Room will split" indicator

3. Release → New wall created
   → Original room splits into two
   → Prompt: "Name the new rooms"
     [Current: Living Room → split into]
     [Living Room Part 1]  [Living Room Part 2]
     [Kitchen/Dining ▼]    [Study Room ▼]
   
4. New WallSegment created:
   - startX/Y, endX/Y from user drag
   - positiveRoomId = new room 1
   - negativeRoomId = new room 2
   - thickness/height = HDB defaults
```

### 3.4 Structural Wall Handling

```
Walls that CANNOT be deleted:
  ⚠️  External walls (wallType: "external")
  ⚠️  Party walls (wallType: "party")  
  ⚠️  Load-bearing walls (isLoadBearing: true)

UI treatment:
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │  🏠 External Wall (cannot delete)  ===== solid line     │
  │  🧱 Load-bearing (cannot delete)  ██████ hatched line   │
  │  🚪 Internal Wall (selectable)    ─ ─ ─ dashed        │
  │                                                         │
  │  When user clicks a load-bearing wall:                  │
  │    Tooltip: "⚠️ Structural wall — HDB approval          │
  │              required. Cannot be removed here."         │
  │                                                         │
  └─────────────────────────────────────────────────────────┘

Admin responsibility:
  - Mark walls as load-bearing during annotation
  - Mark wallType correctly (internal/external/party)
  - Users cannot override these flags
```

---

## 4. Impact on 3D Mesh Generation

### 4.1 From Room Polygons to Wall Segments

**Before (current plan):**
```typescript
// Generate 3D mesh from RoomConfig.vertices (room polygon)
function generateRoomMesh(room: RoomConfig): BufferGeometry {
  // Extrude polygon upward to create 3D room
  const shape = new THREE.Shape(room.vertices);
  const extrudeSettings = { depth: 2.8, bevelEnabled: false };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}
```

**After (revised):**
```typescript
// Generate 3D mesh from WallSegments
function generateWallMeshes(walls: WallSegment[]): Mesh[] {
  return walls.map(wall => {
    const dx = wall.endX - wall.startX;
    const dy = wall.endY - wall.startY;
    const length = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    
    // Wall is a 3D box
    const geo = new THREE.BoxGeometry(length, wall.height, wall.thickness);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    
    // Position at midpoint
    mesh.position.set(
      (wall.startX + wall.endX) / 2,
      wall.height / 2,  // centered vertically
      (wall.startY + wall.endY) / 2
    );
    mesh.rotation.y = -angle;
    
    // Cut holes for doors/windows
    applyOpenings(mesh, wall.doors, wall.windows);
    
    return mesh;
  });
}

// Floor generation from wall loop
function generateFloorMesh(roomWalls: WallSegment[]): Mesh {
  // Compute convex hull from wall endpoints
  // Generate flat shape, no extrusion
}
```

### 4.2 Room Labeling in 3D

- Room labels are computed from wall adjacency, not stored per-mesh
- After user modifies walls, rooms are recomputed and the 3D scene regenerates
- User's design brief (wall colors, floor types) maps to the new room set
- Rooms that didn't exist before (from splits) get default materials

### 4.3 Impact on Camera Presets

Camera presets are position-based, which depends on room dimensions. When walls move:
- Auto-camera presets recalculate from new room geometry
- Existing custom angles become invalid if the room changed → UI shows "⚠️ Reload camera"
- Users can re-capture angles after wall edits

---

## 5. Impact on Existing Architecture

### 5.1 Data Migration

| Old Model | New Model | Migration |
|-----------|-----------|-----------|
| `RoomConfig.vertices` (Polygon) | `WallSegment[]` + `RoomDef[]` | Each pair of adjacent vertices becomes a WallSegment. Adjacency detected by shared edges between room polygons. |
| `RoomConfig.doors` (JSON on room) | `DoorOpening[]` (on wall) | Doors reassigned to the wall they belong to (based on position). |
| `RoomConfig.windows` (JSON on room) | `WindowOpening[]` (on wall) | Same reassignment logic. |
| `BTOProject.roomCount` | Computed from RoomDef count | Remove; compute on the fly. |

**Migration Algorithm (admin templates → wall-based):**

```
Given: Room A with vertices [v1, v2, v3, v4]
       Room B with vertices [v2, v5, v6, v3]
       (Room B shares edge v2→v3 with Room A)

For each room:
  For each adjacent vertex pair (vi, vi+1):
    Check if this edge is shared with any other room
    If shared → create ONE WallSegment (positiveRoomId=RoomA, negativeRoomId=RoomB)
    If not shared → create WallSegment (positiveRoomId=RoomA, negativeRoomId=null = external)
    
For doors/windows:
  Find which WallSegment they belong to (position on shared edge)
  Create DoorOpening/WindowOpening on that wall
```

### 5.2 Changes to Existing Models

**FlatModel** — add relation:
```prisma
model FlatModel {
  // ... existing fields ...
  walls    WallSegment[]  // NEW
  roomDefs RoomDef[]      // replaces rooms relation from RoomConfig
}
```

**Project** — add wall edit state:
```typescript
model Project {
  // ... existing fields ...
  wallEdits Json?  // NEW: [{wallId, action: "delete" | "add", ...}]
                   // Stored as a patch list — user can undo/redo
}
```

- `wallEdits` stores a sequence of operations: `DELETE_WALL w123`, `ADD_WALL {start, end, ...}`
- Apply operations to the original wall set to get the current edited layout
- Zero-cost undo/redo: just replay or revert operations
- User can reset to original by clearing the patch list

### 5.3 Admin Workflow Changes

**Admin annotation tool** needs to switch from "draw room polygons" to:

1. **Draw wall segments** (click-drag to place walls)
2. **Tag wall properties** (load-bearing, external/party/internal)
3. **Assign rooms** (click inside an enclosed area → name it + set type)
4. **Place doors/windows** on walls

This is actually simpler and more intuitive than the current polygon approach:

```
Admin Panel — New Annotation Tool:

┌────────────────────────────────────────────────────────────┐
│  🏗️ Floor Plan Editor — Verandah Kallang 4-Room Type A    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │   ═══ External wall         🧱 Load-bearing wall      │  │
│  │   ─── Internal wall         🚪 Door   🪟 Window       │  │
│  │                                                       │  │
│  │   ┌══════════════════╦══════════════════╗             │  │
│  │   ║                  ║                  ║             │  │
│  │   ║   Living Room    ║  Master Bedroom  ║             │  │
│  │   ║    5.0m × 4.0m  ║   4.0m × 3.5m   ║             │  │
│  │   ║                  ║  🚪              ║  🪟         │  │
│  │   ╠══════════════════╬══════════════════╣             │  │
│  │   ║                  ║                  ║             │  │
│  │   ║    Kitchen       ║   Bedroom 2      ║             │  │
│  │   ║    4.0m × 2.5m  ║   3.5m × 3.0m   ║             │  │
│  │   ║                  ║                  ║             │  │
│  │   ╚══════════════════╩══════════════════╝             │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Tools: [🏗️ Draw Wall] [🚪 Add Door] [🪟 Add Window]      │
│         [✏️ Rename Room] [🏷️ Wall Properties]              │
│                                                             │
│  Selected Wall: Wall between Living & Kitchen              │
│    Type: Internal    Load-bearing: No                      │
│    Length: 4.0m     Thickness: 0.15m                      │
│    [Toggle Load-Bearing]                                   │
└────────────────────────────────────────────────────────────┘
```

---

## 6. UI Component: Floor Plan Editor

### 6.1 Technology

| Need | Solution |
|------|----------|
| **2D floor plan canvas** | `react-konva` (existing dependency) |
| **Wall rendering** | Konva.Line with configurable strokeWidth, color per type |
| **Wall selection** | Konva hit detection on Line elements |
| **Snap-to-wall** | Distance check on pointer move; snap within 0.2m radius |
| **Room labels** | Konva.Text positioned at centroid of wall loop |
| **Live 3D preview** | Side panel with R3F showing current wall state |

### 6.2 Modes

| Mode | Description | Keyboard Shortcut |
|------|-------------|-------------------|
| **Select** | Click wall to highlight, Delete to remove | `V` or default |
| **Draw Wall** | Click start point on existing wall → drag to end point | `W` |
| **Pan** | Drag canvas to navigate | `Space` + drag |
| **Zoom** | Scroll wheel, pinch zoom | Mouse wheel |

### 6.3 State Management

```typescript
interface FloorPlanEditorState {
  // Original data (loaded once)
  originalWalls: WallSegment[];
  originalRooms: RoomDef[];
  
  // Current edits (patches applied to original)
  edits: WallEdit[];
  
  // Computed from originalWalls + edits
  get currentWalls(): WallSegment[];
  get currentRooms(): RoomDef[];
  
  // UI state
  mode: 'select' | 'draw' | 'pan';
  selectedWallId: string | null;
  hoveredWallId: string | null;
  drawState: { startPoint: Point | null; endPoint: Point | null };
  
  // Undo/redo
  history: WallEdit[][];
  historyIndex: number;
}

type WallEdit = 
  | { type: 'DELETE_WALL'; wallId: string }
  | { type: 'ADD_WALL'; wall: Omit<WallSegment, 'id' | 'flatModelId'> }
  | { type: 'MODIFY_ROOM'; roomId: string; updates: Partial<RoomDef> };
```

---

## 7. Validation & Constraints

### 7.1 What Users CAN Do

| Action | Allowed? | Notes |
|--------|----------|-------|
| Delete internal wall | ✅ | If not load-bearing |
| Merge two rooms | ✅ | Results in one combined room |
| Split a room with new wall | ✅ | Results in two rooms |
| Add a door/window | ✅ | On internal walls only |
| Move a door along a wall | ✅ | Position percentage changes |
| Delete a door/window | ✅ | Wall remains, opening removed |

### 7.2 What Users CANNOT Do

| Action | Blocked? | Why |
|--------|----------|-----|
| Delete external wall | 🚫 | HDB regulation — structural boundary |
| Delete party wall | 🚫 | Adjacent flat is on other side |
| Delete load-bearing wall | 🚫 | Requires HDB structural engineer approval |
| Move an external wall | 🚫 | Changes flat footprint |
| Delete all walls in a room | 🚫 | Every room must have at least 3 walls |
| Leave orphan walls | 🚫 | Every wall must belong to at least one room |

### 7.3 Validation on Save

```typescript
function validateFloorPlan(walls: WallSegment[]): ValidationResult {
  const errors: string[] = [];
  
  // 1. Every wall belongs to at least one room
  walls.forEach(w => {
    if (!w.positiveRoomId && !w.negativeRoomId) {
      errors.push(`Wall ${w.id} is orphaned (no room adjacency)`);
    }
  });
  
  // 2. Every external wall is intact
  walls.filter(w => w.wallType === 'external').forEach(w => {
    // External walls cannot be deleted (already handled by edit constraints)
  });
  
  // 3. All rooms are enclosed (wall loop closes)
  rooms.forEach(room => {
    if (!isEnclosed(room, walls)) {
      errors.push(`${room.label} is not fully enclosed`);
    }
  });
  
  // 4. No room has area below minimum (5 sqm for habitable rooms)
  rooms.forEach(room => {
    const area = computeRoomArea(room, walls);
    if (area < 5 && isHabitable(room.roomType)) {
      errors.push(`${room.label} is too small (${area.toFixed(1)} sqm)`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}
```

---

## 8. Implementation Plan

### Phase 0a: Data Model Migration
- Rewrite Prisma models: add WallSegment, DoorOpening, WindowOpening, RoomDef
- Remove old RoomConfig model (or keep for backward compat during migration)
- Write migration script for existing admin templates
- Update FlatModel to use wall-based room references

### Phase 0b: Admin Annotation Tool (Revised)
- Rewrite admin floor plan editor to wall-drawing mode
- Admin draws walls → assigns rooms → places doors/windows
- Mark load-bearing walls and wall types

### Phase 1: Floor Plan Editor (User-Facing)
- New step in user pipeline between BTO selection and AI consultant
- 2D floor plan view (react-konva) with Select/Draw modes
- Wall deletion with merge confirmation dialog
- Wall drawing with snap-to-wall behavior
- Room auto-labelling after edits
- 3D preview in side panel (regenerated on every edit)
- Undo/redo for wall edits
- Validation on save

### Phase 2: 3D Engine Update
- Rewrite mesh generator to work from wall segments (not room polygons)
- Generate walls as 3D boxes with door/window cutouts
- Floor/ceiling generation from wall loops
- Room material assignment (wall color, floor type derived from room label/type)
- Auto-recalculate camera presets after wall edits

### Phase 3: AI Consultant Integration
- AI consultant receives edited wall set (not original template)
- Design brief maps to the user's current room set (may differ from original)
- AI aware of structural constraints ("This used to be a bedroom but now it's part of the living room")
- Room labels in chat reflect user's actual edited layout

---

## 9. Design Brief Changes

The Design Brief now needs to account for user-modified layouts:

```typescript
interface DesignBrief {
  overallVibe: string;
  originalFlatModelId: string;
  
  // The edited wall set (computed from original + edits)
  walls: EditedWall[];    
  
  // Rooms the user actually has (may differ from template)
  rooms: Record<string, RoomBrief>;
  
  // Knowledge for the AI
  editHistory: string[];  
  // ["Knocked down wall between Living Room and Bedroom 2",
  //  "Merged into Living + Study Area"]
  
  createdAt: string;
  updatedAt: string;
}
```

The AI consultant's system prompt includes the edit history:
```
"The user has made the following layout changes:
 - Knocked down wall between 'Living Room' and 'Bedroom 2'
 - The new combined space is 'Living + Study Area' (8.5m × 4.0m)
 - The door between them has been removed

Consider this new layout when giving design advice.
The merged room has a window on the east wall from the original bedroom."
```

---

## 10. Open Questions

| Question | Options | Recommendation |
|----------|---------|---------------|
| **Multi-storey** — walls on floor 1 vs floor 2? | (a) Separate floor plan per storey | Defer to v2 |
| **Curved walls** — some HDB have curved facade | (a) Ignore (rare) (b) Use multiple short straight segments | (b) for rare cases |
| **Bay windows** — HDB standard feature | (a) Treat as wall protrusion (b) Separate geometry | (a) Defer to admin template |
| **Columns/beams** — structural pillars inside rooms | (a) Ignore (b) Add as non-removable obstacles | (b) useful, defer to v2 |
| **Sloped ceilings** — some loft units | (a) Ignore (b) WallSegment gets topY | Defer to v2 |
| **Template migration** — existing admin templates need rewriting | (a) Manual (b) Auto-conversion from RoomConfig | (b) Auto-conversion with manual review |
