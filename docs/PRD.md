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
| **Frontend Framework** | Next.js 16 (App Router) | User's established stack, SSR for landing, API routes |
| **3D Engine** | React Three Fiber (R3F) + Three.js | Declarative 3D for React; full control over mesh generation |
| **UI Components** | shadcn/ui + Tailwind CSS v4 | User's preferred library; rapid, consistent UI |
| **Chat Interface** | Custom component (shadcn-based) | Multi-turn conversational AI design consultant |
| **State Management** | Zustand | Lightweight, R3F-compatible, no boilerplate |
| **Floor Plan Annotation** | react-konva (Canvas overlay) | Admin panel wall-drawing tool |
| **Database** | PostgreSQL (Supabase) + Prisma ORM | Users, projects, BTO projects, templates, design briefs, renders |
| **File Storage** | Cloudflare R2 | S3-compatible, zero egress fees |
| **3D Export** | Three.js ColladaExporter / OBJExporter | Client-side export; no backend needed |
| **AI Design Consultant** | Gemini 2.5 Pro | Multi-turn chat → structured Design Brief JSON |
| **AI Rendering** | Gemini Imagen | Photorealistic per-room renders from 3D base + design brief |
| **Authentication** | NextAuth.js (Auth.js) | Google OAuth only |
| **Deployment** | Vercel (frontend + API routes) | Zero-config, edge functions |
| **Queue** | None (MVP) → BullMQ + Redis (v2) | Not needed until batch operations |

### 3.1 Why No Separate Python Backend?

All heavy 3D operations (mesh generation, format export/import) are handled **client-side in the browser** using Three.js. Gemini API calls are proxied through Next.js API routes. This eliminates the need for a separate Python/FastAPI server or Redis queue.

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
1. Sign Up (Google OAuth)
       │
2. BTO Project Discovery
   │ Select your BTO project: "Verandah Kallang 2024"
   │ If not found: "This project isn't in our library yet — check back soon!"
       │
3. Select Flat Model
   │ 4-Room / 5-Room variant within the BTO project
   │ Shows floor plan preview + unit stats (sqm, room count)
       │
       ├── [Start Designing → Default Layout] ──────────────────┐
       │                                                       │
       ▼                                                        │
4. **Edit Floor Plan** (optional)                               │
   │ 2D floor plan editor with wall segments                    │
   │ Tools: Select, Draw Wall, Delete Wall                      │
   │ 🧱 Load-bearing walls highlighted — cannot delete          │
   │ Knock down a wall → rooms merge automatically              │
   │ Draw a new wall → room splits                              │
   │ Doors/windows shift with their walls                       │
   │ Structural walls visually distinct, non-deletable          │
   │ Snap-to-wall, grid snapping, undo/redo                    │
   │ Live 3D preview of changes in side panel                   │
   │ [↩ Undo] [↪ Redo] [Reset to Original] [Apply Changes]     │
       │                                                       │
       ▼                                                        │
5. **3D Model Loads** (from edited or default wall set)         │
   │ Empty shell (walls, floors, windows, doors)               │
   │ Interactive viewport — orbit, zoom, room labels           │
   │ Room labels reflect the user's edited layout              │
       │                                                       │
6. AI Design Consultant (Chat)                                  │
   │ "I'd like a Japandi feel overall"                         │
   │ "I'd like a Japandi feel overall"
   │ AI: "Great choice! Light oak or dark walnut flooring for the living?"
   │ User: "Light oak. But kitchen should be vintage green tiles"
   │ AI: "Got it! Kitchen: green subway tile. MBR continue Japandi or different?"
   │ ... iterative until user says "I'm happy" ──────────────────┐
       │                                                         │
       ▼ Design Brief JSON accumulates per-room:                 │
   { overall: "Japandi"                                          │
     rooms: { living: {...}, kitchen: {...}, mbr: {...} } }      │
       │                                                         │
7. [Auto-Furnish with Templates]  or  [Export to SketchUp]
   │ Furniture placed in 3D viewport (PBR materials visible)
   │ Real-time style preview — no AI render needed
       │
8. Generate Sample Render
   │ 1 room (Living Room by default) → Gemini Imagen
   │ Cost: ~$0.04 per sample
   │ User reviews: "Does this match your vision?"
       │
   ├── [Looks Great!] ──────────────────────────────────────┐
   │                                                        │
9. Tweak & Iterate (if needed)                              │
   │ User adjusts: style prompt, furniture, materials       │
   │ → [Regenerate Sample] until satisfied                  │
   │ Cost: ~$0.04 per iteration                              │
       │                                                    │
10. Final Render                                             │
   │ All rooms, multiple auto-calculated angles             │
   │ User can also add custom camera angles                 │
   │ Cost: ~$0.30-0.50 for full HDB unit                     │
   │ Progress: "Rendering Room 3 of 8..."                   │
       │                                                    │
11. Gallery & Share                                         │
    │ View all renders by room  │  Download HD
    │ Share link with slider    │  Add custom angles
    │ Breadcrumb: Brief > Furniture > Renders
    │ Click any breadcrumb to go back and edit
```

---

## 6. Features & Prioritization

### P0 — MVP (Must Have)

| Feature | Description | Acceptance Criteria |
|---------|-------------|-------------------|
| **OAuth Login** | Sign up with Google; auto-fill profile | User logs in with Google, name/email populated |
| **BTO Project Discovery** | Search/select from pre-configured BTO projects | Show BTO list; indicate if not yet available |
| **Flat Model Selector** | Pick specific 4-room/5-room layout for selected BTO | Shows floor plan preview, room count, sqm |
| **Floor Plan Wall Editor** | Interactive 2D floor plan editor — select, delete, and draw wall segments | Knock down a wall → rooms auto-merge. Draw a wall → room splits. Doors shift with walls. |
| **3D Model Generation** | Generate HDB-standard 3D model from wall segments (not just polygons) | Walls at 2.8m, correct room layout, doors/windows properly placed |
| **3D Viewport** | Interactive browser 3D view | Orbit, pan, zoom, room labels, walkthrough mode |
| **AI Design Consultant (Chat)** | Multi-turn conversational AI that builds a per-room design brief | User types "Japandi feel" → AI asks follow-ups → all rooms styled |
| **Per-Room Design Brief** | Each room tracked independently | Living room can be Japandi, kitchen can be vintage, renders reflect both |
| **Auto-Furnish (Room Templates)** | Pre-designed furniture layouts per room type × style | "Japandi living room" template places sofa, coffee table, rug, etc. |
| **SketchUp Export** | Download furnished/unfurnished 3D model as Collada (.dae) | Opens in SketchUp Pro with correct room geometry |
| **SketchUp Re-import** | Upload edited .dae back | Furniture merges into scene |
| **Photorealistic Renders** | Gemini Imagen generates per-room realistic images from 3D view + design brief | One render per room; downloadable |
| **Render Gallery** | View all room renders in a grid | Thumbnails + full-size view |
| **Admin: BTO Project Management** | Create/edit BTO projects with floor plan upload | Full admin CRUD |
| **Admin: Room Annotation** | Draw wall segments on floor plan, system auto-detects rooms; label rooms, mark load-bearing walls | Wall drawing + auto room detection + property panel |

### P1 — Next Phase (Should Have)

| Feature | Description |
|---------|-------------|
| **History & iterations** | Save multiple design briefs per project; compare |
| **Shareable render pages** | Public before/after link; client can share with family |
| **Render quality tiers** | Standard (free, 1024px) vs. HD (paid, 2048px) vs. 4K (premium, 4096px) |
| **Batch render** | Render all rooms in one click; progress tracking |
| **Furniture swap** | User picks individual furniture pieces from library; replaces AI-chosen ones |
| **Custom floor plan upload** | User uploads their own floor plan (non-BTO units) for manual annotation |

### P2 — Nice to Have

| Feature | Description |
|---------|-------------|
| **360° Panorama renders** | VR-style walkthrough of the entire flat |
| **AR preview** | Point phone camera at empty room → see rendered design overlaid |
| **Mood board from reference image** | Upload a Pinterest photo → AI extracts palette + style → applies to model |
| **Renovation cost estimator** | Estimate costs from selected materials + room dimensions |
| **Multi-user collaboration** | Couple can both work on the same project |
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
2. **Render credit model** — Free X renders/month? Or unlimited but low-res?
3. **Competition landscape** — Are there Singapore-specific competitors in this space?
4. **BTO project data** — Scope: all HDB BTO projects from **2025 onwards**. Do you have floor plans for Verandah Kallang, Queenstown, and upcoming 2025 launches?
5. **Pricing** — Freemium (limited renders) vs subscription vs one-off per project?
6. **Brand name** — Do you have a name in mind for the app?
