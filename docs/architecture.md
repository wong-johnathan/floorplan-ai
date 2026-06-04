# Architecture Document

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v4.0 |
| **Date** | 2026-06-04 |
| **Author** | Johnathan Wong |
| **Previous** | v3.0 (Next.js monolith) |

> **Note:** This document describes the overall architecture. For the complete wall-editing subsystem (data models, shared-wall algorithm, floor plan editor, validation), see **[wall-editing-architecture.md](./wall-editing-architecture.md)** which supersedes RoomConfig-related sections.

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser — Vite + React 19)                     │
│                                                                           │
│  ┌────────────┐  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │ React SPA   │  │  3D Engine (R3F)      │  │ Floor Plan Editor       │   │
│  │             │  │  ┌────────────────┐   │  │ (react-konva)           │   │
│  │ Landing     │  │  │ Mesh Generator │   │  │ ┌──────────────────┐ │   │
│  │ Browse      │  │  │(Wall Segments) │   │  │ │ Wall Canvas      │ │   │
│  │ Studio      │  │  │ Material Swap  │   │  │ │ Select/Draw/Delete│ │   │
│  │ Gallery     │  │  │ Export/Import  │   │  │ │ Auto Room Detect │ │   │
│  │ Admin       │  │  │ Furniture      │   │  │ │ Structural Walls │ │   │
│  └────────────┘  │  │ Placement      │   │  │ │ Undo/Redo        │ │   │
│                  │  └────────────────┘   │  │ └──────────────────┘ │   │
│                  └──────────────────────┘  └────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Wall Annotation (react-konva) — Admin Only                        │   │
│  │  [Upload BTO Floor Plan] → [Draw Walls] → [Auto Detect Rooms]    │   │
│  │  → [Label Rooms + Mark Load-Bearing] → [Save]                     │   │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                              │ REST API (HTTP)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND (TypeScript, port 4000)                 │
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ BTO      │  │ Projects │  │ AI       │  │ Render   │  │ Auth     │  │
│  │ Projects │  │ CRUD     │  │ Consultant│  │ (Gemini  │  │ (JWT +   │  │
│  │ + Models │  │          │  │ (Chat    │  │  Imagen) │  │  Google  │  │
│  │ CRUD     │  │          │  │  + Brief)│  │          │  │  OAuth)  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │             │              │              │       │
└───────┼──────────────┼─────────────┼──────────────┼──────────────┼───────┘
        │              │             │              │              │
        ▼              ▼             ▼              ▼              ▼
┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│PostgreSQL │  │Cloudflare  │  │Google Gemini │  │ Google   │  │  Redis   │
│(local /  │  │R2 (Files)  │  │API 2.5 Pro   │  │Imagen    │  │ (cache)  │
│ managed) │  │            │  │(Consultant)  │  │(Renders) │  │          │
└──────────┘  └────────────┘  └──────────────┘  └──────────┘  └──────────┘
```

**Local development:** All services run via `docker compose -f docker-compose.dev.yml up`. Postgres and Redis run as containers; frontend and backend are volume-mounted for hot reload.

---

## 2. Core Components

### 2.0 The 2D Canvas (Primary Working Environment)

The 2D floor plan editor (react-konva) is the **primary interface** — users do all their layout work here. The key insight is that floor plans are naturally read and edited in 2D; 3D rendering is the final output reward, not the working canvas.

```
┌─────────────────────────────────────────────────────────────────────┐
│  2D CANVAS ARCHITECTURE (react-konva)                               │
│                                                                     │
│  Data Model (Zustand):                                              │
│  {                                                                  │
│    walls: WallSegment[],         ← from admin template             │
│    shapes: PlacedShape[],        ← furniture + fixtures            │
│    roomLabels: RoomLabel[],      ← user-assigned room names        │
│    history: CanvasSnapshot[],    ← undo/redo stack (100 steps)     │
│  }                                                                  │
│                                                                     │
│  Layers (bottom → top):                                             │
│  1. Grid layer (25cm grid, faint)                                   │
│  2. Wall layer (WallSegment shapes; structural = hatched)           │
│  3. Shape layer (placed furniture, doors, windows)                  │
│  4. Label layer (room name overlays after demarking)               │
│  5. Interaction layer (selection handles, resize grips, snapping)  │
│                                                                     │
│  Snap system:                                                       │
│  • Grid snap: round to nearest 25cm on drop                        │
│  • Wall snap: shapes within 20cm of a wall snap flush to it        │
│  • Furniture-to-furniture: align edges when nearby                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 AI Design Consultant

A **stateful, conversational agent** that receives the user's labelled room list as context and maintains a **Design Brief JSON** keyed by room label (not room type).

```
User: "I want Japandi overall"
        │
        ▼
┌──────────────────────────────────────────┐
│  POST /ai/consult                         │
│  {                                        │
│    projectId: "abc",                      │
│    message: "I want Japandi overall",     │
│    chatHistory: [...],                    │
│    currentBrief: { rooms: {} },           │
│    roomLabels: ["Master Bedroom",         │
│      "Kitchen", "Living Room", ...]       │
│  }                                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│  Gemini 2.5 Pro                           │
│  System Prompt: Interior Design Consultant│
│  Context: user's specific room labels    │
│  Output: {                                │
│    response: "Great! Light oak or dark   │
│              walnut for the floor?",     │
│    updatedBrief: { overall_vibe, rooms } │
│  }                                       │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│  Response to client:                      │
│  {                                        │
│    message: "Great! Light oak...",        │
│    briefDiff: { "Master Bedroom": {...} },│
│    fullBrief: { ... }                     │
│  }                                        │
│                                           │
│  Client: updates room summary panel       │
│  (no 3D update — 3D is output only)       │
└──────────────────────────────────────────┘
```

**Architecture decisions:**

| Decision | Rationale |
|----------|-----------|
| **Server-side chat state** | Design brief saved to DB after each turn. User can refresh or come back later. |
| **Streaming responses** | Use Gemini streaming for typing-effect in chat. Feels more conversational. |
| **Brief diff → room panel only** | AI updates the brief; the room summary panel updates. No 3D live preview — 3D is the final output. |
| **Room labels as brief keys** | Brief is keyed by the user's chosen label ("Master Bedroom"), not a system room type. This means users can create any room names they want. |
| **No RAG** | The AI consultant doesn't need external knowledge — purely conversational + structured output. |

### 2.2 Design Brief Data Model

The Design Brief is the **single source of truth**. It flows from: AI consultant → Gemini render prompt. Keys are the user-assigned room labels.

```typescript
interface DesignBrief {
  overallVibe: string;                    // "Japandi", "Industrial", etc.
  rooms: Record<string, RoomBrief>;       // keyed by user's room label
  createdAt: string;
  updatedAt: string;
}

interface RoomBrief {
  label: string;                 // User-assigned: "Master Bedroom", "Study", etc.
  style: string;                 // "Japandi", "Vintage", "Industrial", ""
  description: string;           // Full natural language description
  wallColor: string;             // hex or material name
  wallFinish: string;            // "matte", "satin", "textured"
  floorType: string;             // "parquet", "tiles", "laminate", "vinyl"
  floorColor: string;            // "light oak", "dark walnut", "white marble"
  accentColor: string;
  furnitureStyle: string;        // "minimal", "warm", "maximalist"
  lighting: string;              // "warm 2700K", "cool 4000K", "natural"
  specialNotes: string;          // "needs study corner", "play area for kids"
  renderPrompt: string;          // Auto-constructed from above fields
}

// The canvas state (separate from the brief)
interface CanvasState {
  walls: WallSegment[];
  shapes: PlacedShape[];          // 2D furniture + fixtures placed by user
  roomLabels: RoomLabel[];        // user-drawn area labels
}

interface PlacedShape {
  id: string;
  shapeType: string;              // "sofa-3seater", "bed-queen", "toilet", etc.
  category: string;               // "bedroom" | "living" | "kitchen" | "bathroom"
  x: number; y: number;           // canvas position (metres)
  rotation: number;               // degrees
  width: number; height: number;  // metres (may differ from default if resized)
}

interface RoomLabel {
  id: string;
  label: string;                  // "Master Bedroom"
  areaPolygon: Point[];           // outline of the labelled area
  centroid: Point;                // for label text placement
}
```

### 2.3 2D Shape Library & Drag-to-Place

Users drag 2D top-down furniture shapes from the library sidebar onto the canvas. This is the primary way to populate rooms — no 3D interaction required.

```
┌──────────────────────────────────────────────────────────────────────┐
│  2D SHAPE LIBRARY WORKFLOW                                            │
│                                                                       │
│  Shape sidebar categories:                                            │
│  • Walls & Doors  (wall segments, door arcs, windows)                │
│  • Bedroom        (beds, wardrobes, dressers, study desks)           │
│  • Living Room    (sofas, TV consoles, coffee tables, rugs)          │
│  • Kitchen        (counters, appliances, island, stools)             │
│  • Dining         (dining tables, chairs in sets)                    │
│  • Bathroom       (toilet, sink, shower, bathtub)                    │
│  • Others         (plants, lamps, misc)                              │
│                                                                       │
│  Interaction:                                                         │
│  1. Drag shape from sidebar → ghost appears at cursor                 │
│  2. Drop onto canvas → snaps to nearest grid or wall                 │
│  3. Select placed shape → resize handles, rotation handle            │
│  4. Right-click → context menu: Rotate 90°, Flip, Remove, Duplicate  │
│  5. Drag placed shape to reposition                                   │
│                                                                       │
│  All furniture is represented as flat 2D top-down symbols            │
│  (like draw.io / SmartDraw floor plan shapes).                       │
│  The 2D layout is what gets passed to Gemini Imagen as context.      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Template Schema

```typescript
interface FurnitureTemplate {
  id: string;
  name: string;                    // "Scandi Living Room Set"
  category: "living" | "bedroom" | "dining" | "kitchen";
  styleTag: string | null;         // "scandinavian" | "japandi" | null (universal)
  roomType: string;                // "living" | "bedroom_master" | "bedroom"
  furniture: FurnitureItem[];
  thumbnailUrl: string;
}

interface FurnitureItem {
  type: string;                    // "sofa", "bed", "table", "lamp"
  label: string;                   // "3-Seater Sofa"
  modelUrl: string;                // R2 GLB path
  category: string;                // "seating", "tables", "lighting", "decor", "storage"

  // Default position (template placement)
  defaultPosition: Vec3;
  defaultRotation: Vec3;
  defaultScale: Vec3;

  // Constraints
  wallAnchor: "against" | "facing" | "center" | null;  // Preferred wall relationship
  floorOnly: boolean;              // Must stay on floor (no floating)
  minClearance: number;            // Minimum cm from walls/other furniture

  // Visual
  dimensions: Vec3;                // { w, h, d } in metres
  snapPoints: SnapPoint[];         // Points to snap to grid/walls
  ghostWhenDragging: boolean;      // Show transparent ghost at target position
}
```

#### Initial Template Library (2025+ BTO projects)

**Scope:** All HDB BTO projects from **2025 onwards**. Admin seeds the initial library with major 2024-2025 launches, then adds new projects as HDB announces BTO sales exercises.

| BTO Project | Location | Flat Types | Est. Layouts |
|-------------|----------|------------|--------------|
| Verandah Kallang 2024 | Kallang | 4R, 5R | 2-3 |
| Queenstown Project 2024 | Queenstown | 3R, 4R, 5R | 3-4 |
| Plus all 2025 HDB BTO launches | Various | 2R Flexi → 5R | 10-15/year |

**Strategy:** Admin configures each BTO project's floor plans as templates. Users select their BTO → see exactly their flat's layout. No generic "4-room" — it's "Verandah Kallang 2024 4-Room Model A".

---

### 2.4 2D Canvas Snap System

| Rule | Implementation | Visual Feedback |
|------|---------------|-----------------|
| **Grid snap** | Round to nearest 25cm on drop | Faint grid visible while dragging |
| **Wall snap** | Within 20cm of a wall → snap flush against it | Wall highlights; ghost shows snapped position |
| **Furniture-to-furniture** | Align edges of adjacent shapes (sofa back to wall) | Edge highlight on both shapes |
| **Rotation snap** | 45° increments; hold Shift for free rotation | Rotation handle with tick marks |

#### Technology

| Need | Solution |
|------|----------|
| **Canvas rendering** | `react-konva` — 2D shapes, event handling, layers |
| **Drag & drop** | Konva `Transformer` + `draggable` props on shapes |
| **Snap-to-grid** | `Math.round(pos / gridSize) * gridSize` on `dragend` |
| **Wall snap** | Check distance to all wall segments on `dragend`; snap if < 20cm |
| **Collision** | Bounding rect overlap check; prevent drop if overlapping structural element |
| **Ghost on drag** | Konva shape with `opacity: 0.4` following cursor |
| **Undo/redo** | Zustand snapshot stack (100 steps); serialize full canvas state |

### 2.5 Render Pipeline (2-Tier)

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1: SAMPLE (Low cost, ~$0.04)                                │
│  ─────────────────────────────────────                           │
│  → User picks one room label to test                              │
│  → Backend: export canvas region for that room → PNG             │
│  → Build render prompt from DesignBrief[roomLabel]               │
│  → Gemini Imagen: canvas PNG + text prompt → photorealistic image │
│  → User reviews: "Does this match your vision?"                  │
│  → Can tweak prompt and regenerate before committing             │
│                                                                   │
│  TIER 2: FINAL RENDER (Full cost, ~$0.30-0.50)                   │
│  ─────────────────────────────────────                           │
│  → All labelled rooms rendered sequentially                       │
│  → Triggered only after sample is approved                        │
│  → Progress: "Rendering Room 3 of 6..."                           │
│  → Each render: canvas region crop + DesignBrief[roomLabel]       │
└──────────────────────────────────────────────────────────────────┘
```

#### Render Flow

```
User clicks [Generate Sample]
        │
        ▼ Pick room label to sample
POST /render/sample
{ projectId, roomLabel: "Living Room" }
        │
        ▼
Backend:
  1. Fetch project canvas state from DB
  2. Crop canvas region to room polygon (from RoomLabel.areaPolygon)
  3. Export cropped region as PNG (node-canvas or sharp)
  4. Build render prompt from DesignBrief["Living Room"]
  5. Call Gemini Imagen: { image: PNG, prompt }
  6. Save result to R2
  7. Return render URL
        │
        ▼
[Sample image] → User approves → [Render All Rooms]
        │
POST /render/final
{ projectId }
        │
Sequential per room label:
  Repeat steps 1-6 for each labelled room
  Emit progress via SSE: { room, done, total }
        │
Gallery populates as each render completes

#### Final Render Flow

```
User clicks [Final Render]
        │
        ▼
┌──────────────────────────────────────────────┐
│  Final Render — Select Angles                │
│                                              │
│  Living: ☑ Corner View  ☑ Entrance  ☐ Window│
│  MBR:    ☑ Door View    ☑ Bedside           │
│  Kitchen:☑ Entrance     ☑ Close-up          │
│  Bed 2:  ☑ Door View    ☐ Custom [+ Add]   │
│                                              │
│  6 renders total  ~$0.24                     │
│                                              │
│  [Generate All 6]                            │
└──────────────────────────────────────────────┘
        │
        ▼
For each room:
  For each selected angle:
    1. Position camera to preset position
    2. Capture viewport to PNG (offscreen canvas)
    3. Build render prompt from DesignBrief[room]
    4. Call Gemini Imagen (image + prompt → render)
    5. Save to R2, store record in DB
        │
        ▼
Display in gallery with progress bar
```

#### Camera Presets (Auto-Calculated)

```typescript
const CAMERA_PRESETS: Record<string, CameraAngle[]> = {
  living: [
    { label: "Corner View",     position: [4.5, 1.6, 5.0], target: [2.5, 1.2, 2.5] },
    { label: "Entrance View",   position: [0.5, 1.6, 0.5], target: [3.0, 1.2, 2.0] },
    { label: "Window-side",     position: [4.0, 1.6, 1.0], target: [2.0, 1.2, 2.5] },
  ],
  mbr: [
    { label: "Door View",       position: [0.5, 1.6, 0.5], target: [2.5, 1.0, 2.0] },
    { label: "Bedside View",    position: [3.5, 1.6, 3.0], target: [2.0, 0.8, 3.5] },
  ],
  kitchen: [
    { label: "Entrance View",   position: [0.5, 1.6, 3.0], target: [2.5, 1.2, 1.5] },
    { label: "Counter Close-up",position: [2.0, 1.6, 0.5], target: [2.0, 1.4, 1.5] },
  ],
  // ... bedroom, toilet, balcony
};
```

#### Custom Camera Angle

```typescript
interface CustomAngle {
  id: string;
  projectId: string;
  roomType: string;          // "living", "mbr", etc.
  label: string;             // "My breakfast bar view"
  position: Vec3;            // Camera position in world space
  target: Vec3;              // Look-at point
  isCustom: boolean;         // true
}

// UI: Camera Mode
// User enters "Camera Mode" in viewport
// → Controls switch from Orbit to Free Camera
// → Position camera freely
// → Click [📷 Capture This Angle]
// → Name it: "Kitchen Breakfast Bar"
// → Saved to project → rendered in final batch
```

---

## 3. Key Architecture Decisions

| Decision | Choice | Alternative Considered | Why Chosen |
|----------|--------|----------------------|------------|
| **Primary canvas** | 2D floor plan editor (react-konva) | 3D viewport as working environment | Users think in 2D; lower learning curve; faster on any device |
| **3D role** | Final rendered output only (Gemini Imagen) | Interactive 3D working viewport | Removes WebGL dependency from core flow; 3D is the reward, not the tool |
| **Furniture in editor** | 2D top-down shapes | 3D furniture drag-and-drop | Simpler, faster, works on mobile; consistent with 2D floor plan metaphor |
| **Room labelling** | User-driven after editing | Admin pre-labelled rooms | Users know their own layout intent; supports any room name |
| **Design Brief keys** | User-assigned room labels | Fixed system room types | Flexible — supports "Study nook", custom room names |
| **AI Consultant state** | Server-side (DB) | Client-only in-memory | User can refresh/return; shared history |
| **Render input** | 2D canvas crop + text prompt | 3D viewport screenshot | No Three.js/WebGL needed for renders; canvas export is straightforward |
| **Render engine** | Gemini Imagen (img2img) | Stable Diffusion + ControlNet | Native image conditioning; simpler API |
| **Chat protocol** | Streaming SSE | WebSocket | Simpler infra; works over standard HTTP |
| **BTO data model** | Admin-curated wall segments | Scrape HDB website | Reliable quality; no stale/broken data |

---

## 4. API Routes

All routes are Express handlers on the backend (`localhost:4000`). The frontend calls them via TanStack Query.

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/google` | GET | Initiate Google OAuth flow |
| `/auth/google/callback` | GET | OAuth callback → issue JWT |
| `/auth/me` | GET | Verify JWT, return user |
| `/bto` | GET | List published BTO projects |
| `/bto` | POST | Create BTO project (admin) |
| `/bto/:id` | GET/PUT/DELETE | Single BTO project CRUD |
| `/bto/:id/models` | GET | List flat models for a BTO project |
| `/bto/:id/models` | POST | Create flat model (admin) |
| `/models/:id` | GET | Flat model with wall segments + rooms |
| `/models/:id/rooms` | PUT | Update room configs (admin) |
| `/projects` | POST | Create new user project |
| `/projects/:id` | GET/PUT | Get/update project |
| `/projects/:id/canvas` | GET/PUT | Get/save full canvas state (walls + shapes) |
| `/projects/:id/labels` | GET/PUT | Get/save room label assignments |
| `/projects/:id/brief` | PUT | Update design brief |
| `/projects/:id/chat` | GET/DELETE | Chat history |
| `/ai/consult` | POST | Send message to AI consultant |
| `/ai/consult/stream` | GET | SSE stream for typing effect |
| `/render/sample` | POST | Generate sample render for one room label |
| `/render/final` | POST | Batch render all labelled rooms |
| `/render/:id` | GET | Get render result |
| `/upload` | POST | R2 signed URL for direct upload |
| `/shapes` | GET | List available 2D shape definitions |

---

## 5. Component Tree

```
src/
├── main.tsx                         # React entry point
├── App.tsx                          # Router setup
│
├── pages/
│   ├── LandingPage.tsx              # Public landing
│   ├── BrowsePage.tsx               # BTO project browser
│   ├── BTODetailPage.tsx            # BTO + flat model selector
│   ├── LoginPage.tsx                # Google OAuth login
│   ├── DashboardPage.tsx            # User's project list
│   ├── StudioPage.tsx               # Main studio (viewport + chat + gallery)
│   ├── ExportPage.tsx               # Export/import page
│   ├── SharePage.tsx                # Public render gallery (no login)
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── BTOListPage.tsx
│       ├── BTOEditPage.tsx
│       ├── FlatModelAnnotatePage.tsx # Room annotation canvas
│       └── FurnitureTemplatePage.tsx

components/
├── ui/                              # shadcn/ui components
├── layout/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── BottomNav.tsx               # Mobile
├── auth/
│   ├── LoginButton.tsx
│   ├── UserMenu.tsx
│   └── AuthGuard.tsx
├── discovery/                       # BTO project discovery
│   ├── BTOSearch.tsx
│   ├── BTOProjectCard.tsx
│   ├── FlatModelSelector.tsx
│   └── FloorPlanPreview.tsx
├── editor/                            # 2D floor plan editor (PRIMARY)
│   ├── FloorPlanEditor.tsx            # Main editor layout (sidebar + canvas)
│   ├── FloorPlanCanvas.tsx            # react-konva canvas — walls, shapes, labels
│   ├── ShapeLibrarySidebar.tsx        # Categorised shape drag source
│   ├── ShapeLibraryCategory.tsx       # Expandable category (Bedroom, Living, etc.)
│   ├── PlacedShape.tsx                # Individual draggable shape on canvas
│   ├── WallLayer.tsx                  # Wall segment rendering + selection
│   ├── StructuralWallMarker.tsx       # Hatched overlay for structural walls
│   ├── GridLayer.tsx                  # Background grid (25cm)
│   ├── EditorToolbar.tsx              # Undo/redo/reset/zoom controls
│   └── EditorPropertiesPanel.tsx      # Context panel (selected shape/wall)
├── demarking/                         # Room labelling (step after editor)
│   ├── RoomDemarcation.tsx            # Main labelling screen
│   ├── AreaHighlight.tsx              # Unlabelled area pulse overlay
│   └── LabelPicker.tsx                # Quick-select chips + free text input
├── consultant/                        # AI design consultant
│   ├── ChatPanel.tsx                  # Chat interface + room summary sidebar
│   ├── ChatMessage.tsx                # Single message bubble
│   ├── ChatInput.tsx                  # Text input + send
│   ├── RoomBriefSummary.tsx           # Per-room brief status panel
│   └── ModeToggle.tsx                 # "Overall vibe" vs "Room by room" toggle
├── renders/                           # AI render gallery
│   ├── RenderScreen.tsx               # Sample → approve → final batch
│   ├── SampleRender.tsx               # Room picker + generated image + tweak
│   ├── RenderProgress.tsx             # Batch progress bar + per-room checklist
│   ├── RenderGallery.tsx              # Tab by room label + image grid
│   ├── RenderCard.tsx
│   ├── BeforeAfterSlider.tsx
│   └── RenderLightbox.tsx
└── admin/                             # Admin components
    ├── BTOProjectForm.tsx
    ├── FlatModelForm.tsx
    ├── WallAnnotationCanvas.tsx        # Admin wall-drawing tool (react-konva)
    ├── WallPropertyPanel.tsx
    ├── RoomPropertyPanel.tsx
    ├── DoorWindowPlacement.tsx
    └── AdminDashboard.tsx
```

---

## 6. Data Flows

### 6.1 AI Consultant Chat

```
Client                    Next.js API               Gemini API            DB
  │                          │                         │                   │
  │  POST /api/ai/consult    │                         │                   │
  │  { msg, projectId }      │                         │                   │
  │ ──────────────────────►  │                         │                   │
  │                          │  [Load chatHistory +    │                   │
  │                          │   currentBrief from DB] │                   │
  │                          │ ─────────────────────────────────────────►  │
  │                          │ ◄─────────────────────────────────────────  │
  │                          │                         │                   │
  │                          │  POST Gemini 2.5 Pro    │                   │
  │                          │  System + History + Msg │                   │
  │                          │ ──────────────────────► │                   │
  │                          │  ◄── response + brief ──│                   │
  │                          │                         │                   │
  │                          │  [Save chat + brief]    │                   │
  │                          │ ─────────────────────────────────────────►  │
  │                          │                         │                   │
  │ ◄── SSE stream: ────────│                         │                   │
  │  { msg: "Light oak...",  │                         │                   │
  │    brief: { rooms:... }, │                         │                   │
  │    diff: { floor } }     │                         │                   │
  │                          │                         │                   │
  │  [Apply diff to 3D]      │                         │                   │
```

### 6.2 Render Generation

```
Client                    Next.js API               R2             Gemini Imagen
  │                          │                       │                   │
  │  POST /api/render        │                       │                   │
  │  { projectId, room }     │                       │                   │
  │ ──────────────────────►  │                       │                   │
  │                          │  [Capture viewport]   │                   │
  │                          │  ── render to PNG ──► │  (offscreen)      │
  │                          │                       │                   │
  │                          │  [Construct prompt]   │                   │
  │                          │  DesignBrief.rooms[r] │                   │
  │                          │  + Furniture in room  │                   │
  │                          │                       │                   │
  │                          │  POST imagen-3.0      │                   │
  │                          │  { image, prompt }    │                   │
  │                          │ ───────────────────────────────────────►  │
  │                          │                       │                   │
  │                          │  [Save to R2]         │                   │
  │                          │  ◄── output image ────│────────────────────│
  │                          │ ────────────────────► │                   │
  │                          │                       │                   │
  │                          │  [Save render record] │                   │
  │  ←── renderUrl + id ─────│                       │                   │
```

---

## 7. AI System Prompts

### 7.1 Design Consultant (Gemini 2.5 Pro)

```
You are an AI interior design consultant for Singapore HDB flats.
You help users design their home room-by-room through friendly conversation.

RULES:
1. Start broad: ask about their overall desired vibe/style
2. Never ask more than 1-2 questions at once
3. Offer specific choices ("light oak or dark walnut flooring?") — never "what floor do you want?"
4. After every 2-3 exchanges, briefly summarize what you've noted
5. Track per-room preferences independently
6. Use Singapore-appropriate materials: vinyl, laminate, homogeneous tiles, solid surface, quartz
7. Reference real HDB constraints: "Most HDB living rooms are ~4m×5m, so a 2.5m sofa fits well"
8. When user says "I'm happy" or "looks good", present the full design brief for confirmation

OUTPUT FORMAT (respond in JSON):
{
  "message": "Your conversational response here...",
  "brief": { /* full updated DesignBrief JSON */ },
  "briefDiff": { /* only changed fields from previous brief */ }
}
```

### 7.2 Render Prompts (Gemini Imagen)

```
For each room, construct a prompt like:

"Photorealistic interior render of a {roomLabel} in a Singapore HDB flat.
Style: {style}.
{description}
Floor: {floorType}, {floorColor}.
Walls: {wallColor}, {wallFinish} finish.
Accent color: {accentColor}.
Furniture: {furnitureStyle} style with {furniture description from template}.
Lighting: {lighting} tone.
Natural light from window on {window wall}.
Camera: eye level, wide angle lens. Professional photography lighting.
High resolution, realistic textures, depth of field."
```

---

## 8. Furniture Template System Detail

### Template Design

Furniture templates are pre-designed room layouts that the AI matches to the user's room + style.

```
Template Matching Logic:
  1. Filter by roomType === current room's roomType
  2. Filter by styleTag === current room's style (or null for universal)
  3. Score by: dimension fit (room area vs template total footprint)
  4. Pick highest-scoring template
  5. Scale furniture positions proportionally to room dimensions
  6. Anchor furniture to walls:
     - sofa: back to wall, 10cm gap
     - bed: headboard to wall, 50cm side clearance
     - dining: center of room, 90cm from walls for chairs

Fallback: If no matching template, show empty room with note "No
furniture template available for this style yet"
```

### Initial Template Scope (MVP)

| Room Type | Style | Items |
|-----------|-------|-------|
| Living - Scandi | Scandinavian | Sofa, coffee table, rug, floor lamp, TV console, plant |
| Living - Japandi | Japandi | Low sofa, wooden coffee table, tatami rug, floor lamp, screen |
| Living - Industrial | Industrial | Leather sofa, metal coffee table, industrial lamp, shelf |
| MBR - Scandi | Scandinavian | Bed, nightstand ×2, wardrobe, rug, floor lamp |
| MBR - Japandi | Japandi | Low bed platform, nightstand, sliding wardrobe, paper lamp |
| Dining | Universal | Dining table, chairs ×4, pendant light |
| Kitchen | Universal | Kitchen island (if space), stool ×2 |

---

## 9. Performance

| Area | Target | Strategy |
|------|--------|----------|
| 3D model load | < 2s | Pre-merged geometry; glTF with Draco; lazy texture load |
| Chat response | < 3s | Gemini streaming; first token in < 500ms |
| Material swap | < 500ms | Only update material references; no re-mesh |
| Render generation | < 10s/room | Parallel room renders; progress callbacks |
| Collada export | < 3s | Web Worker off main thread |
| Initial bundle | < 200KB JS | Dynamic import R3F; code-split by route |

---

## 10. Security

1. **API keys**: Vercel environment variables only (Gemini, R2)
2. **OAuth**: NextAuth with Google provider; HTTPS-only cookies
3. **Admin routes**: Session-based role guard (`role: "admin"`)
4. **File uploads**: R2 signed URLs with 15-minute expiry
5. **Rate limits**: Render: 10/min/session; Chat: 30/min/session; Upload: 5/min/session
6. **CSP**: Strict Content Security Policy headers

---

## 11. Failure Modes

| Mode | Impact | Mitigation |
|------|--------|------------|
| Gemini API down | Consultant + renders fail | Show "Service unavailable, try again later"; cache last brief |
| Gemini returns bad JSON | Consultant breaks | Retry with "Please format as valid JSON"; fallback to text-only mode |
| WebGL not supported | 3D viewport blank | Detect on load; show 2D floor plan view as fallback |
| SketchUp export fails | File corrupt | Retry with OBJ format; show user-friendly error |
| Furniture template doesn't fit room | Objects clip through walls | Auto-scale to 90% of room size; add margin check |
