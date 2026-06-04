# Architecture Document

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v3.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |
| **Previous** | v2.0 (pre-wall-editing) |

> **Note:** This document describes the overall architecture. For the complete wall-editing subsystem (data models, shared-wall algorithm, floor plan editor, validation), see **[wall-editing-architecture.md](./wall-editing-architecture.md)** which supersedes RoomConfig-related sections.

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                                 │
│                                                                           │
│  ┌────────────┐  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │ Next.js UI  │  │  3D Engine (R3F)      │  │ Floor Plan Editor       │   │
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
                              │ API Calls (HTTPS)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES (Vercel)                           │
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ BTO      │  │ Projects │  │ AI       │  │ Render   │  │ Auth     │  │
│  │ Projects │  │ CRUD     │  │ Consultant│  │ (Gemini  │  │ (NextAuth│  │
│  │ + Models │  │          │  │ (Chat    │  │  Imagen) │  │  + OAuth)│  │
│  │ CRUD     │  │          │  │  + Brief)│  │          │  │          │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │             │              │              │       │
└───────┼──────────────┼─────────────┼──────────────┼──────────────┼───────┘
        │              │             │              │              │
        ▼              ▼             ▼              ▼              ▼
┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│PostgreSQL │  │Cloudflare  │  │Google Gemini │  │ Google   │  │ NextAuth │
│ (Supabase) │  │R2 (Files)  │  │API 2.5 Pro   │  │Imagen    │  │ Session  │
│           │  │            │  │(Consultant)  │  │(Renders) │  │          │
└──────────┘  └────────────┘  └──────────────┘  └──────────┘  └──────────┘
```

---

## 2. Core Components

### 2.1 AI Design Consultant

The most architecturally significant component. It is a **stateful, conversational agent** that maintains a **Design Brief JSON** across multi-turn exchanges.

```
User: "I want Japandi overall"
        │
        ▼
┌──────────────────────────────────────────┐
│  API: POST /api/ai/consult                │
│  {                                        │
│    projectId: "abc",                      │
│    message: "I want Japandi overall",     │
│    chatHistory: [...],                    │
│    currentBrief: { rooms: {} }            │
│  }                                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│  Gemini 2.5 Pro                           │
│  System Prompt: Interior Design Consultant│
│  Input: chat history + current brief       │
│  Output: {                                 │
│    response: "Great! Light oak or dark    │
│              walnut for the floor?",      │
│    updatedBrief: { overall_vibe, rooms }  │
│  }                                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│  Response to client:                      │
│  {                                        │
│    message: "Great! Light oak...",        │
│    briefDiff: { rooms.living.floor },     │
│    fullBrief: { ... }                     │
│  }                                        │
│                                           │
│  Client: applies briefDiff to 3D viewport │
│  (real-time material preview)             │
└──────────────────────────────────────────┘
```

**Architecture decisions:**

| Decision | Rationale |
|----------|-----------|
| **Server-side chat state** | Design brief saved to DB after each turn. User can refresh or come back later. |
| **Streaming responses** | Use Gemini streaming for typing-effect in chat. Feels more conversational. |
| **Brief diff → 3D preview** | When the AI updates the brief (e.g. "floor = light oak"), client immediately applies it to the 3D model. User sees changes in real-time. |
| **No RAG** | The AI consultant doesn't need external knowledge — it's purely conversational + structured output. |

### 2.2 Design Brief Data Model

The Design Brief is the **single source of truth** for the entire project. It flows from the AI consultant → 3D material engine → Gemini render prompt.

```typescript
interface DesignBrief {
  overallVibe: string;           // "Japandi", "Industrial", etc.
  rooms: Record<string, RoomBrief>;
  createdAt: string;
  updatedAt: string;
}

interface RoomBrief {
  roomType: string;              // "living", "kitchen", "mbr"
  label: string;                 // "Living Room"
  style: string;                 // "Japandi", "Vintage", ""
  description: string;           // Full natural language description
  wallColor: string;             // hex color or material name
  wallFinish: string;            // "matte", "satin", "textured"
  floorType: string;             // "parquet", "tiles", "laminate", "vinyl"
  floorColor: string;            // "light oak", "dark walnut", "white marble"
  accentColor: string;           // hex or material name
  furnitureStyle: string;        // "minimal", "warm", "maximalist"
  lighting: string;              // "warm 2700K", "cool 4000K", "natural"
  specialNotes: string;          // "needs study corner", "play area for kids"
  renderPrompt: string;          // Auto-constructed from above fields
}

interface FurnitureTemplatePlacement {
  templateId: string;
  roomType: string;
  roomLabel: string;
  furniture: FurnitureItem[];
  applied: boolean;              // User accepted or declined
}
```

### 2.3 Furniture Template System with Drag-to-Place (LAVU-style)

A hybrid approach: **AI picks the starting layout** (Option C templates), then the user can **drag, swap, rotate, and add furniture** freely — like LAVU's table management but in 3D.

```
┌──────────────────────────────────────────────────────────────────────┐
│  FURNITURE WORKFLOW                                                   │
│                                                                       │
│  Step 1: AI selects template                                         │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  "Japandi Living Room Set"                                │        │
│  │  [Sofa] [Coffee Table] [Rug] [Floor Lamp] [TV Console]   │        │
│  │                          [Apply] [Customize Instead ▼]    │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  Step 2 (optional): Enter Tweak Mode                                  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │  3D Viewport:                                              │        │
│  │                                                           │        │
│  │      ┌────────────┐        ┌──────┐                      │        │
│  │      │   🛋️ Sofa   │〰️〰️〰️〰️│ 💡   │ ← Drag handle    │        │
│  │      │  dragging…  │        │ Lamp │                      │        │
│  │      └────────────┘        └──────┘                      │        │
│  │           ↕                                                │        │
│  │      Wall snap: [15cm from wall ✅]                       │        │
│  │      Collision: [None ✅]                                 │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                       │
│  Step 3: Swap or Add from Catalog                                     │
│  ┌──────────────────────────────────────────────┐                    │
│  │  🛋️ Furniture Catalog    │ 🔍 Search...      │                    │
│  │──────────────────────────────────────────────│                    │
│  │  Sofas      │ 🛋️ 3-Seater  │ 🛋️ Sectional   │                    │
│  │  Tables     │ 🛋️ Loveseat  │ 🛋️ Chaise      │ ← Drag into room  │
│  │  Lighting   │──────────────┴─────────────────│                    │
│  │  Decor      │  🛋️ Currently: "Japandi Sofa"  │                    │
│  │  Storage    │  [Swap] [Remove]               │                    │
│  └──────────────────────────────────────────────┘                    │
│                                                                       │
│  Step 4: Save Layout                                                  │
│  [Undo] [Redo] [Reset to Template] [Save as New Template]             │
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

### 2.4 Drag-to-Place Interaction System

Inspired by LAVU's table management — furniture items become draggable 3D objects with smart snapping.

#### Interaction Layer

```
┌─────────────────────────────────────────────────────────┐
│  DRAG-TO-PLACE ENGINE                                    │
│                                                          │
│  Input: Mouse/Pointer/Touch → Raycaster                  │
│  ────────────────────────────────────────────────────────│
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │  Pick &     │    │  Snap        │    │  Collision │  │
│  │  Drag       │───►│  System      │───►│  Detection │  │
│  │             │    │              │    │            │  │
│  │ Raycast to  │    │ Grid (25cm)  │    │ AABB check │  │
│  │ groundplane │    │ Wall (15cm)  │    │ vs all     │  │
│  │ Z-buffer    │    │ Furniture    │    │ other items│  │
│  │ depth       │    │ (align edges)│    │            │  │
│  └─────────────┘    └──────────────┘    └────────────┘  │
│                           │                   │         │
│                           ▼                   ▼         │
│                    ┌──────────────┐    ┌────────────┐  │
│                    │  Visual      │    │  Reject    │  │
│                    │  Feedback    │    │  Position  │  │
│                    │              │    │            │  │
│                    │ Green ghost  │    │ Red tint + │  │
│                    │ snap preview │    │ push-back  │  │
│                    └──────────────┘    └────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Snap Rules

| Rule | Implementation | Visual Feedback |
|------|---------------|-----------------|
| **Grid snap** | Round position to nearest 25cm on X/Z | Thin grid lines visible in tweak mode |
| **Wall snap** | If within 20cm of a wall, snap to 15cm gap | Wall glows + ghost shows snapped position |
| **Furniture-to-furniture** | Align edges of adjacent items (e.g. coffee table to sofa) | Matching edge highlights |
| **Rotation snap** | 45° increments; hold Shift for free rotation | Rotate ring with tick marks |
| **Floor constraint** | Y always = 0 (no floating furniture) | Ghost always projected to floor |

#### Swap & Catalog Interaction

```
User taps/right-clicks furniture item
        │
        ▼
┌────────────────────────────────────┐
│  Context Menu                      │
│  ───────────────────────────────── │
│  🖱️ Drag to Move                   │
│  🔄 Rotate                         │
│  🔄 Swap Item...                   │
│  ❌ Remove                         │
│  📋 Copy to Clipboard              │
└────────────────────────────────────┘
        │
        ▼  "Swap Item"
┌────────────────────────────────────┐
│  Furniture Catalog (Sheet Panel)    │
│  ───────────────────────────────── │
│  Current: "3-Seater Sofa"         │
│                                    │
│  [🛋️ Sectional Sofa] [🛋️ Loveseat]│
│  [🛋️ Chaise Lounge]  [🛋️ Sleeper] │
│                                    │
│  Category: [Seating ▼]            │
│  Style filter: [Japandi ▼]        │
└────────────────────────────────────┘
        │
        ▼  Pick replacement
Replace in same position + rotation
Old item returns to catalog
```

#### Technology

| Need | Solution |
|------|----------|
| **Drag in 3D** | `@react-three/drei` `DragControls` — built-in, works with R3F |
| **Ground plane raycast** | Three.js `Raycaster` against invisible floor plane |
| **Bounding box collision** | Three.js `Box3` — cheap AABB overlap checks per frame during drag |
| **Snap-to-grid** | `Math.round(pos / gridSize) * gridSize` on drag release |
| **Wall snap** | Pre-calculate wall edge positions from room vertices; distance check |
| **Ghost preview** | Clone mesh with `opacity: 0.4`, `depthWrite: false` |
### 2.5 Render Pipeline (3-Tier)

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1: PREVIEW (Free, instant)                                 │
│  ─────────────────────────────────────                           │
│  → The 3D viewport with PBR materials                            │
│  → No Gemini API call needed                                     │
│  → User sees material/colour changes in real-time                │
│  → Screenshot quality — good enough to judge layout               │
│                                                                   │
│  TIER 2: SAMPLE (Low cost, ~$0.04)                                │
│  ─────────────────────────────────────                           │
│  → 1 room (Living Room by default) → Gemini Imagen               │
│  → User judges: "Do I like how the AI interprets my style?"      │
│  → Can regenerate with tweaked prompts                           │
│  → Quality gate before committing to full batch                   │
│                                                                   │
│  TIER 3: FINAL RENDER (Full cost, ~$0.30-0.50)                   │
│  ─────────────────────────────────────                           │
│  → All rooms, selected angles per room                            │
│  → Triggered only when user says "Finalize"                       │
│  → Progress: "Rendering Room 3 of 8..."                           │
│  → Each render uses DesignBrief per-room + camera angle           │
└──────────────────────────────────────────────────────────────────┘
```

#### Sample Render Flow

```
User clicks [Generate Sample]
        │
        ▼
┌──────────────────────────────────────────────┐
│  Pick room to sample:                        │
│  ● Living Room (recommended)                 │
│  ○ Master Bedroom                            │
│  ○ Kitchen                                   │
│                                              │
│  [Generate Sample (~$0.04)]   [Cancel]       │
└──────────────────────────────────────────────┘
        │
        ▼
POST /api/render/sample
{ projectId, roomType: "living", resolution: "1024x1024" }
        │
        ▼
┌──────────────────────────────────────────────┐
│  Sample Render — Living Room                  │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │  [AI-generated image]               │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  "Does this match your vision?"              │
│                                              │
│  [Looks Great! → Final Render 🚀]            │
│  [Tweak Prompt 🔄]                           │
│                                              │
│  ┌─ Tweak ───────────────────────────┐      │
│  │ "Make it warmer, more plants,     │      │
│  │  and change sofa to beige"        │      │
│  └───────────────────────────────────┘      │
└──────────────────────────────────────────────┘
```

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
| AI Consultant state | Server-side (DB) | Client-only in-memory | User can refresh/return; shared history |
| Design Brief source | AI consultant output | User fills form directly | Conversational is faster, more creative |
| Furniture system | Curated templates | AI-generated layout | Reliable, controllable, faster MVP |
| Render engine | Gemini Imagen (img2img) | Stable Diffusion + ControlNet | Gemini has native image conditioning; simpler API |
| 3D geometry | Client-side wall-segment mesh (wall-as-box) | Server-side Python (trimesh) | No backend needed; supports wall editing |
| Chat protocol | Streaming SSE | WebSocket | Simpler infrastructure; Vercel-compatible |
| BTO data model | Admin-curated | Scrape HDB website | Reliable, curated quality; no stale data |

---

## 4. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/bto` | GET | List published BTO projects |
| `/api/bto` | POST | Create BTO project (admin) |
| `/api/bto/[id]` | GET/PUT/DELETE | Single BTO project CRUD |
| `/api/bto/[id]/models` | GET | List flat models for a BTO project |
| `/api/bto/[id]/models` | POST | Create flat model (admin) |
| `/api/models/[id]` | GET | Flat model with room configs |
| `/api/models/[id]/rooms` | PUT | Update room configs (admin) |
| `/api/projects` | POST | Create new user project |
| `/api/projects/[id]` | GET/PUT | Get/update project |
| `/api/projects/[id]/brief` | PUT | Update design brief |
| `/api/projects/[id]/chat` | * | Chat history CRUD |
| `/api/ai/consult` | POST | Send msg to AI consultant |
| `/api/ai/consult/stream` | GET | SSE stream for typing effect |
| `/api/render` | POST | Trigger Gemini render for a room |
| `/api/render/[id]` | GET | Get render result |
| `/api/export` | POST | Generate Collada/OBJ download URL |
| `/api/import` | POST | Re-upload and parse .dae/.obj |
| `/api/upload` | POST | Upload file to R2 (signed URL) |
| `/api/furniture/templates` | GET | List furniture templates |
| `/api/furniture/apply` | POST | Apply furniture template to project |

---

## 5. Component Tree

```
app/
├── (public)/
│   ├── page.tsx                     # Landing page
│   ├── browse/page.tsx              # BTO project browser
│   ├── browse/[slug]/page.tsx       # BTO + flat model selector
│   └── share/[id]/page.tsx          # Public render gallery
│
├── (auth)/
│   └── login/page.tsx               # Google OAuth login
│
├── (dashboard)/
│   ├── layout.tsx                   # Auth-protected layout
│   ├── page.tsx                     # User's project list
│   └── project/
│       └── [id]/
│           ├── page.tsx             # Main studio page (viewport + chat + gallery)
│           └── export/page.tsx      # Export/import page
│
├── admin/
│   ├── login/page.tsx               # Admin login
│   ├── layout.tsx                   # Protected admin layout
│   ├── page.tsx                     # Dashboard
│   ├── bto/
│   │   ├── page.tsx                 # BTO project list
│   │   ├── new/page.tsx             # New BTO project form
│   │   └── [id]/
│   │       ├── edit/page.tsx         # Edit BTO project details
│   │       └── models/
│   │           ├── new/page.tsx      # New flat model
│   │           └── [modelId]/
│   │               └── annotate/page.tsx  # Room annotation canvas
│   └── furniture/
│       └── page.tsx                 # Furniture template manager

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
├── flooreditor/                       # Floor plan editor (user-facing)
│   ├── FloorPlanEditor.tsx            # Main editor layout
│   ├── FloorPlanCanvas.tsx            # react-konva canvas
│   ├── SelectMode.tsx                 # Wall selection tool
│   ├── DrawMode.tsx                   # Wall drawing tool
│   ├── DeleteWallDialog.tsx           # Merge confirmation
│   ├── RoomLabelEditor.tsx            # Name rooms after merge/split
│   ├── StructuralWallOverlay.tsx      # Load-bearing highlights
│   ├── LivePreview3D.tsx              # Side panel 3D preview
│   ├── FloorPlanToolbar.tsx           # Toolbar (modes, undo/redo)
│   └── FloorPlanHistory.tsx           # Undo/redo state
├── viewport/                          # 3D viewport
│   ├── Studio.tsx                   # Main studio layout (viewport + panels)
│   ├── Scene.tsx                    # R3F Canvas
│   ├── Building.tsx                 # Flat 3D model
│   ├── Room.tsx                     # Single room mesh
│   ├── Doors.tsx                    # Door geometries
│   ├── Windows.tsx                  # Window geometries
│   ├── Flooring.tsx                 # Per-room floor material
│   ├── Furniture.tsx                # Placed furniture objects
│   ├── RoomLabels.tsx               # 3D room name labels
│   ├── Controls.tsx                 # Orbit, walkthrough
│   └── CameraPresets.tsx            # Per-room camera positions
├── consultant/                      # AI design consultant
│   ├── ChatPanel.tsx                # Chat interface
│   ├── ChatMessage.tsx              # Single message bubble
│   ├── ChatInput.tsx                # Text input + send
│   ├── StylePreview.tsx             # Real-time material preview
│   ├── DesignSummary.tsx            # Current brief summary
│   └── RoomTabBar.tsx               # Switch between rooms in chat
├── furniture/                       # Furniture system
│   ├── FurnitureSelector.tsx        # Template picker
│   ├── FurnitureTemplateCard.tsx
│   ├── FurnitureItemList.tsx        # Items in selected template
│   └── PlacementToggle.tsx          # Accept/reject individual items
├── export/
│   ├── ExportPanel.tsx
│   ├── ExportButton.tsx
│   ├── ImportDropzone.tsx
│   └── FormatSelector.tsx
├── renders/                         # AI render gallery
│   ├── RenderGallery.tsx
│   ├── RenderCard.tsx
│   ├── RenderButton.tsx
│   ├── RenderLightbox.tsx
│   ├── BeforeAfterSlider.tsx
│   └── RoomRenderSelector.tsx       # Which room to render
└── admin/                           # Admin components
    ├── BTOProjectForm.tsx
    ├── FlatModelForm.tsx
    ├── WallAnnotationCanvas.tsx
    ├── WallPropertyPanel.tsx
    ├── RoomPropertyPanel.tsx
    ├── DoorWindowPlacement.tsx
    ├── FurnitureTemplateForm.tsx
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
