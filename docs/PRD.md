# Product Requirements Document (PRD)

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v2.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |
| **Previous** | v1.0 (initial draft) |

---

## 1. Executive Summary

A web application that lets HDB homeowners bring their future flat to life — from BTO selection to photorealistic renders. Users sign up via OAuth, select their BTO project and flat type, then optionally **edit the floor plan** (knock down walls, merge rooms, or split rooms) before working with an **AI design consultant** through a conversational chat to define the look and feel of every room. The system generates a 3D model with HDB-standard dimensions from the edited wall layout, optionally auto-furnishes rooms using curated templates, and lets users export to SketchUp for custom furniture placement. Once satisfied, AI (Gemini Imagen) produces photorealistic room renders reflecting the user's design brief.

---

## 2. Business Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Make interior design accessible to non-designers | Time from signup to first render | < 10 minutes |
| Eliminate floor plan complexity | Floor plans requiring manual setup | Zero (admin-curated BTO template library) |
| Enable per-room, conversational design | Users who iterate on design brief via chat | > 60% |
| Reduce reliance on expensive interior designers | Renders used for renovation planning | > 50% of users export or share renders |

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend Framework** | Vite + React 19 + TypeScript | Fast HMR, SPA architecture, no SSR needed for this app |
| **3D Engine** | React Three Fiber (R3F) + Three.js | Declarative 3D for React; full control over mesh generation |
| **UI Components** | shadcn/ui + Tailwind CSS v4 | Rapid, consistent UI; works with any React setup |
| **Chat Interface** | Custom component (shadcn-based) | Multi-turn conversational AI design consultant |
| **State Management** | Zustand | Lightweight, R3F-compatible, no boilerplate |
| **Data Fetching** | TanStack Query | Server state, caching, request deduplication |
| **Routing** | React Router v7 | Client-side routing |
| **Floor Plan Annotation** | react-konva (Canvas overlay) | Wall-drawing tool for both admin and user editor |
| **Backend** | Express + TypeScript | REST API; proxies Gemini calls, handles DB access |
| **Database** | PostgreSQL + Prisma ORM | Users, projects, BTO templates, design briefs, renders |
| **File Storage** | Cloudflare R2 | S3-compatible, zero egress fees |
| **3D Export** | Three.js ColladaExporter / OBJExporter | Client-side export; no backend needed |
| **AI Design Consultant** | Gemini 2.5 Pro | Multi-turn chat → structured Design Brief JSON |
| **AI Rendering** | Gemini Imagen | Photorealistic per-room renders from 3D base + design brief |
| **Authentication** | JWT via Express | Google OAuth flow proxied through backend |
| **Local Dev** | Docker Compose | Frontend + backend + Postgres + Redis in one command |
| **Queue** | None (MVP) → BullMQ + Redis (v2) | Not needed until batch render volume grows |

### 3.1 Frontend/Backend Split

All heavy 3D operations (mesh generation, format export/import) are handled **client-side in the browser** using Three.js. The Express backend handles database access, Gemini API proxying, file upload signing, and authentication. This split is orchestrated locally via Docker Compose.

---

## 4. User Personas

### 4.1 HDB Homeowner (Primary)

| Attribute | Detail |
|-----------|--------|
| **Needs** | Visualize their BTO flat before keys are collected; experiment with styles freely |
| **Pain points** | Can't afford ID; overwhelmed by material/colour choices; doesn't know what styles exist |
| **Tech level** | Low-medium — comfortable with web apps and chat interfaces |
| **Conversion trigger** | "I just got my BTO appointment date and want to see what my future home could look like" |
| **Behavior** | Will iterate via chat; wants to see options before committing |

### 4.2 Interior Designer (Secondary)

| Attribute | Detail |
|-----------|--------|
| **Needs** | Generate client proposals rapidly without modeling from scratch |
| **Pain points** | SketchUp is slow for initial concepts; clients can't visualize from mood boards alone |
| **Tech level** | Medium — uses SketchUp, may still want export |
| **Behavior** | Will use AI consultant for initial concept, then export to SketchUp for refinement |

### 4.3 Admin / Content Curator (You)

| Attribute | Detail |
|-----------|--------|
| **Needs** | Add new BTO projects and flat layouts as HDB releases them |
| **Pain points** | HDB releases 2-3 BTO sales exercises per year with new layouts |
| **Workflow** | Login → create BTO project → upload floor plan → draw rooms → publish |

---

## 5. Full User Flow

```
1. Sign Up / Log In (Google OAuth)
       │
2. BTO Project Search & Selection
   │ Search by: year, project name, location
   │ Filter chips: year (2024, 2025, 2026), town (Kallang, Queenstown...)
   │ If not found: "Not in our library yet — check back soon"
       │
3. Room Type + Model Variant Selection
   │ Select room count: 2-Room / 3-Room / 4-Room / 5-Room / Executive
   │ Select model variant within room type
   │   → Different variants = different layouts (bomb shelter position,
   │     balcony side, kitchen orientation, etc.)
   │ Preview thumbnail + stats (sqm, room count)
       │
       ▼
4. 2D Floor Plan Editor  ← PRIMARY CANVAS
   │ Pre-loaded: walls, doors, windows from admin template
   │ Shape library sidebar (categorised by room type):
   │   Walls & Doors | Bedroom | Living | Kitchen | Dining | Bathroom
   │ What the user can do:
   │   • Drag 2D furniture shapes from library onto canvas
   │   • Resize walls (drag endpoints)
   │   • Move doors and windows along a wall
   │   • Add or delete non-structural walls
   │   • 🧱 Structural walls are highlighted — cannot be removed
   │   • Snap-to-grid (25cm), snap-to-wall for furniture
   │   • [↩ Undo] [↪ Redo] [Reset to Template]
       │
       ▼
5. Room Demarking / Labelling
   │ User assigns a label to each enclosed area:
   │   Bedroom 1, Bedroom 2, Master Bedroom, Kitchen,
   │   Living Room, Dining, Study, Toilet 1, Toilet 2,
   │   Bomb Shelter, Yard, Balcony, Storeroom…
   │ System suggests labels based on room shape + area
   │ User confirms or overrides each label
   │ [Done — Start Designing]
       │
       ▼
6. AI Design Consultant (Chat)
   │ Starts with labelled rooms from Step 5 as context
   │ Two modes:
   │   [Overall Vibe] → AI designs all rooms in one style
   │   [Room by Room] → User styles each labelled room individually
   │ AI: "You have 3 bedrooms, a living room, and an open kitchen.
   │       What overall feel are you going for?"
   │ User: "Japandi overall, but kitchen with vintage green tiles"
   │ AI asks follow-ups one room / one decision at a time
   │ Design Brief JSON builds per labelled room:
   │   { overall: "Japandi", rooms: { "Master Bedroom": {...},
   │     "Kitchen": { style: "Vintage", wallTile: "green subway" } } }
   │ [I'm Happy → Generate Renders]
       │
       ▼
7. 3D Render Generation
   │ The 2D floor plan + design brief → Gemini Imagen
   │ Sample render first: 1 room (~$0.04), user reviews
   │ Tweak prompt if needed → regenerate
   │ Final batch: all labelled rooms at auto-calculated angles
   │ Progress: "Rendering Room 3 of 6..."
   │ Cost: ~$0.30–0.50 for full flat
       │
       ▼
8. Gallery & Share
   │ View renders by room label  │  Download HD
   │ Before/after slider (empty flat vs. styled)
   │ Shareable public link
   │ Click any breadcrumb to go back and edit
```

**Key principle:** The 2D floor plan editor is the primary working canvas. Users think and plan in 2D (the way floor plans are naturally read). 3D rendering is the final output — a photorealistic reward for completing the design, not the working environment.

---

## 6. Features & Prioritization

### P0 — MVP (Must Have)

| Feature | Description | Acceptance Criteria |
|---------|-------------|-------------------|
| **OAuth Login** | Sign up with Google; auto-fill profile | User logs in with Google, name/email populated |
| **BTO Project Search** | Search by year, project name, location; filter chips | BTO list loads; empty state if not found |
| **Room Type + Model Selector** | Pick room count (2–5 room) then specific model variant | Shows thumbnail, sqm, variant description |
| **2D Floor Plan Editor** | Primary canvas — drag furniture shapes, resize walls, move doors/windows | Shape library sidebar; snap-to-grid; undo/redo; structural walls blocked |
| **Furniture Shape Library** | Categorised 2D shapes (Bedroom, Living, Kitchen, Dining, Bathroom, Walls & Doors) | Drag shapes from sidebar onto canvas; shapes scale correctly |
| **Room Demarking / Labelling** | User assigns a label to each enclosed area | All areas labelled; labels drive AI context and render prompts |
| **AI Design Consultant (Chat)** | Multi-turn chat building a per-labelled-room design brief; overall vibe or room-by-room modes | "Japandi feel" → AI asks follow-ups → brief complete for all rooms |
| **Photorealistic Renders** | Gemini Imagen generates per-room renders from 2D plan + design brief | Sample render (1 room) → approve → batch all rooms |
| **Render Gallery** | View all room renders by label; before/after slider | Thumbnails + full-size; download HD |
| **Admin: BTO Project Management** | Create BTO projects, upload floor plan image, draw wall segments, mark structural walls | Admin can publish a BTO project in < 20 min |

### P1 — Next Phase (Should Have)

| Feature | Description |
|---------|-------------|
| **History & iterations** | Save multiple design briefs per project; compare |
| **Shareable render pages** | Public before/after link; share with family/partner |
| **Batch render** | Render all rooms in one click; progress tracking |
| **Custom floor plan upload** | User uploads their own floor plan (non-BTO units) |
| **SketchUp export** | Download 2D floor plan as DXF or 3D shell as Collada (.dae) |
| **Render quality tiers** | Standard (1024px) vs. HD (2048px) |

### P2 — Nice to Have

| Feature | Description |
|---------|-------------|
| **360° Panorama renders** | VR-style walkthrough of the rendered flat |
| **Mood board from reference image** | Upload a Pinterest photo → AI extracts palette + style |
| **Renovation cost estimator** | Estimate costs from selected materials + room dimensions |
| **Multi-user collaboration** | Couple can both work on the same project |
| **AR preview** | Point phone camera at empty room → see rendered design overlaid |
| **Contractor marketplace** | Find IDs/contractors who work in the chosen style |

---

## 7. Data Schema (Prisma)

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  avatarUrl       String?
  role            String    @default("user") // "user" | "admin"
  projects        Project[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model BTOProject {
  id              String        @id @default(cuid())
  name            String        // "Verandah Kallang 2024"
  slug            String        @unique // "verandah-kallang-2024"
  description     String?
  launchYear      Int           // 2024
  location        String        // "Kallang"
  developer       String        @default("HDB")
  models          FlatModel[]
  published       Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model FlatModel {
  id              String        @id @default(cuid())
  btoProject      BTOProject    @relation(fields: [btoProjectId], references: [id], onDelete: Cascade)
  btoProjectId    String
  name            String        // "4-Room Model A", "5-Room Premium"
  flatType        String        // "3-room" | "4-room" | "5-room" | "executive"
  floorPlanUrl    String?       // R2 URL for floor plan image
  totalArea       Float?        // square metres
  thumbnailUrl    String?
  walls           WallSegment[] // NEW: wall-based geometry
  roomDefs        RoomDef[]     // NEW: room definitions derived from walls
  published       Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// ─── Wall Segments (Editable Geometry) ─────────────────────────

model WallSegment {
  id            String         @id @default(cuid())
  flatModel     FlatModel      @relation(fields: [flatModelId], references: [id], onDelete: Cascade)
  flatModelId   String
  
  // 2D line segment (metres from origin)
  startX        Float
  startY        Float
  endX          Float
  endY          Float
  
  // Physical properties
  thickness     Float          @default(0.15)  // HDB internal wall: 150mm
  height        Float          @default(2.8)   // HDB ceiling height
  wallType      String         @default("internal") // "internal" | "external" | "party"
  isLoadBearing Boolean        @default(false)
  
  // Room adjacency (which rooms are on each side of this wall)
  positiveRoom  RoomDef?       @relation(name: "positiveRoom", fields: [positiveRoomId], references: [id])
  positiveRoomId String?
  negativeRoom  RoomDef?       @relation(name: "negativeRoom", fields: [negativeRoomId], references: [id])
  negativeRoomId String?
  
  // Openings
  doorOpenings  DoorOpening[]
  windowOpenings WindowOpening[]
  
  sortOrder     Int            @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model DoorOpening {
  id            String       @id @default(cuid())
  wallSegment   WallSegment  @relation(fields: [wallSegmentId], references: [id], onDelete: Cascade)
  wallSegmentId String
  
  position      Float        // 0.0-1.0 along the wall segment
  width         Float        @default(0.9)
  height        Float        @default(2.1)
  swing         String       @default("in") // "in" | "out"
}

model WindowOpening {
  id            String       @id @default(cuid())
  wallSegment   WallSegment  @relation(fields: [wallSegmentId], references: [id], onDelete: Cascade)
  wallSegmentId String
  
  position      Float        // 0.0-1.0 along the wall segment
  width         Float        @default(1.2)
  height        Float        @default(1.2)
  sillHeight    Float        @default(1.0)
  windowType    String       @default("casement")
}

// ─── Rooms (Derived from Wall Enclosures) ─────────────────────

model RoomDef {
  id                String       @id @default(cuid())
  flatModel         FlatModel    @relation(fields: [flatModelId], references: [id], onDelete: Cascade)
  flatModelId       String
  
  label             String       // "Living Room", "Master Bedroom"
  roomType          String       // "living" | "bedroom_master" | "bedroom" | "kitchen" | "toilet" | "bomb_shelter" | "service_yard" | "hallway" | "balcony"
  originalRoomType  String?      // What admin originally labelled (for reference after user edits)

  // Material defaults
  defaultWallColor  String       @default("#F5F5F0")
  defaultFloorType  String       @default("parquet")
  defaultFloorColor String       @default("#C4A882")
  
  sortOrder         Int          @default(0)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

model Project {
  id              String       @id @default(cuid())
  user            User?        @relation(fields: [userId], references: [id])
  userId          String?
  name            String       @default("My Project")
  flatModelId     String?
  
  // Wall edit state (patch list — undoable, resetable)
  wallEdits       Json?        // [{action: "DELETE_WALL", wallId}, ...] or [{action: "ADD_WALL", ...}]
  
  // Design state
  designBrief     Json?        // The full Design Brief JSON (per-room styles)
  furnitureState  Json?        // Which furniture templates placed
  chatHistory     Json?        // Full conversation with AI consultant
  modelData       Json?        // Cached 3D model state
  renders         Render[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Render {
  id              String     @id @default(cuid())
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId       String
  roomType        String     // "living", "mbr", "kitchen", etc.
  roomLabel       String     // "Living Room"
  imageUrl        String     // R2 URL
  prompt          String     // The full prompt used for this render
  resolution      String     @default("1024x1024")
  createdAt       DateTime   @default(now())
}

model FurnitureTemplate {
  id              String     @id @default(cuid())
  name            String     // "Scandi Living Room Set"
  category        String     // "living" | "bedroom" | "dining" | "kitchen"
  styleTag        String?    // "scandinavian" | "japandi" | "industrial" | null (universal)
  roomType        String     // "living" | "bedroom_master" | "bedroom" | "dining"
  furniture       Json       // [{ type, label, position, rotation, scale, modelUrl }, ...]
  thumbnailUrl    String?
  createdAt       DateTime   @default(now())
}

model StylePreset {
  id              String     @id @default(cuid())
  name            String     @unique // "Scandinavian", "Japandi", "Industrial"
  description     String
  palette         Json       // { floorType, floorColor, wallColor, accentColor }
  promptHint      String     // Used as seed for AI consultant
  furnitureTags   String[]   // Which furniture templates match this style
  createdAt       DateTime   @default(now())
}
```

---

## 8. Prompt Engineering: AI Design Consultant

The AI consultant is the most critical UX element. Here is the system prompt structure:

### System Prompt (Design Consultant)

```
You are an HDB interior design consultant. Your role is to help the user design their
HDB flat room by room through conversation. You are friendly, patient, and creative.

RULES:
- Never overwhelm — ask about ONE room at a time, or ONE decision at a time
- Always offer 2-3 clear options, not open-ended "what do you want?"
- Adapt to the user's language: if they say "cozy Japandi" you know the palette
- After each user input, update the Design Brief JSON and confirm it briefly
- If the user says "I'm happy" or "looks good", stop and summarize the full brief

The user has a {flatType} flat with these rooms: {roomList}.
Start by asking about their overall vibe, then drill into each room.
When suggesting styles, reference real materials: "Light oak parquet flooring"
or "Warm white matte walls" — be specific.

DESIGN BRIEF JSON (you maintain this silently, showing only diffs):
{
  "overall_vibe": "",
  "rooms": {
    "living": { "style": "", "description": "", "wall_color": "", "floor_type": "", "floor_color": "", "furniture_style": "" },
    ...
  }
}
```

### Render Prompt Construction

When user hits "Generate Renders", the system constructs per-room prompts:

```
Room: Living Room
Style: Japandi
Description: Light oak flooring, warm white walls, minimal Japanese furniture, bamboo accents
Room Geometry: 5.2m × 4.8m, 2.8m ceiling, one window on west wall
Furniture: Low-profile wooden sofa, oval coffee table, tatami-style rug, floor lamp

→ Gemini Imagen Prompt: "Photorealistic interior render of a Japandi-style living room,
   light oak engineered wood flooring, warm white matte walls, low-profile wooden sofa,
   oval coffee table, tatami rug, floor lamp. Soft natural light from window.
   Camera at eye level, wide angle. Singapore HDB apartment."
```

---

## 9. Non-Functional Requirements

### 9.1 Performance

| Metric | Target |
|--------|--------|
| 3D model load from template | < 2 seconds |
| AI consultant response time | < 3 seconds per message |
| Style material swap in viewport | < 500ms |
| Gemini render generation | < 10 seconds per room |
| Collada export download | < 5 MB |
| Lighthouse score | ≥ 85 |

### 9.2 Mobile Responsiveness (Hard Requirement)

| Requirement | Detail |
|-------------|--------|
| **Viewport** | 3D viewport fills mobile screen; controls float as overlay |
| **Chat** | Chat panel slides up as bottom sheet on mobile |
| **Thumb targets** | All interactive elements ≥ 44px |
| **Breakpoints** | Single column ≤ 768px; side panel ≥ 1024px |
| **Gestures** | Pinch-to-zoom, two-finger orbit in 3D; swipe to switch rooms |
| **Render gallery** | Single column cards on mobile; grid on tablet+ |

### 9.3 Compatibility

| Requirement | Support |
|-------------|---------|
| **Browsers** | Chrome, Firefox, Safari, Edge (last 2 versions) |
| **SketchUp** | SketchUp Pro 2022+ (Collada import/export) |
| **File formats** | Upload: .png, .jpg, .pdf. Export: .dae, .obj. Re-import: .dae, .obj |

---

## 10. Success Criteria

- [ ] New user can go from signup → first sample render in under 10 minutes
- [ ] AI consultant produces coherent per-room design brief after ≤ 5 chat turns
- [ ] Sample render costs < $0.05 per iteration
- [ ] User can iterate on sample render at least 3 times before finalizing
- [ ] Final render batch produces all rooms at configured angles
- [ ] At least 5 completed projects on the platform before public launch
- [ ] Collada export → SketchUp open → re-import works without errors
- [ ] All flows work on mobile (viewport, chat, render gallery)
- [ ] Admin can add a new BTO project + configure all walls + rooms in under 20 minutes
- [ ] User can knock down a wall → rooms auto-merge within 1 second
- [ ] User can draw a new wall → room splits with correct labels
- [ ] Load-bearing walls cannot be deleted (visually distinct, blocked action)
- [ ] Doors and windows shift correctly when their wall is moved
- [ ] Breadcrumb navigation allows revisiting any stage without losing progress
- [ ] Undo/redo works for wall edits (at least 50 history steps)

---

## 11. Future Considerations

| Feature | Trigger to Build |
|---------|-----------------|
| Redis/BullMQ rendering queue | When render generation volume exceeds 50 renders/day |
| Python/FastAPI backend | If advanced 3D boolean ops or procedural furniture gen needed |
| Payment integration | When user base > 100 active projects |
| ComfyUI self-hosted (Synology GPU) | If Gemini costs exceed budget |
| Multi-user collaboration | When couples request shared projects |
| BTO floor plan scraper | Automated import of new HDB BTO releases |

---

## 12. Open Questions (To Be Decided)

1. **Furniture templates scope** — How many room template variations per style? (5? 10? 20?)
2. **Competition landscape** — Are there Singapore-specific competitors in this space? (See `competitive-analysis.md`)
