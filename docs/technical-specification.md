# Technical Specification

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v3.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |
| **Repo** | github.com/wong-johnathan/interior-design |

> **Note:** This specification includes the wall-editing subsystem. For the complete design rationale and data model details, see **[wall-editing-architecture.md](./wall-editing-architecture.md)**. The old `RoomConfig` model is replaced by `WallSegment` + `RoomDef` models.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Database Schema](#2-database-schema)
3. [AI Models & Prompt Engineering](#3-ai-models--prompt-engineering)
4. [3D Engine Configuration](#4-3d-engine-configuration)
5. [API Reference](#5-api-reference)
6. [Component Architecture](#6-component-architecture)
7. [File Storage Strategy](#7-file-storage-strategy)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Security Architecture](#9-security-architecture)
10. [Performance Budgets](#10-performance-budgets)
11. [Testing Strategy](#11-testing-strategy)
12. [Browser Compatibility](#12-browser-compatibility)
13. [Cost Analysis](#13-cost-analysis)

---

## 1. Tech Stack

### 1.1 Frontend

| Technology | Version | Purpose | Justification |
|-----------|---------|---------|---------------|
| **Next.js** | 16 (App Router) | Full-stack framework | SSR for landing, API routes, React Server Components, Vercel-native |
| **React** | 19 | UI library | Peer dep for Next.js; concurrent features for smooth 3D interactions |
| **TypeScript** | 5.7+ | Type safety | Catch errors at compile time; better DX for complex state shapes |
| **Three.js** | r172+ | 3D rendering | Industry-standard WebGL library; BufferGeometry, Raycaster, CSG |
| **@react-three/fiber** | 9.x | React renderer for Three.js | Declarative 3D scene management; React hooks for lifecycle |
| **@react-three/drei** | 10.x | R3F utilities | OrbitControls, DragControls, Text, Environment, BBAnchor |
| **@react-three/postprocessing** | 3.x | Post-processing effects | Bloom for lighting, SSAO for depth, DepthOfField for renders |
| **three-mesh-bvh** | Latest | BVH acceleration | Faster raycasting for drag interactions |
| **three-stdlib** | Latest | Three.js addons | ColladaLoader, ColladaExporter, OBJLoader, OBJExporter, GLTFLoader |
| **Zustand** | 5.x | State management | Lightweight, works outside React tree (R3F compatible), middleware for undo/redo |
| **Immer** | 10.x | Immutable state updates | Powering Zustand middleware for undo/redo history snapshots |
| **react-konva** | 19.x | 2D canvas | Floor plan annotation in admin panel (room polygon drawing) |
| **shadcn/ui** | Latest | UI component library | Consistent design system; accessible; Tailwind CSS-included |
| **Tailwind CSS** | 4.x | Utility CSS | Rapid styling; consistent design tokens |
| **next-auth** | 5.x | Authentication | Google OAuth + session management; edge-compatible |
| **@prisma/client** | 6.x | Database ORM | Type-safe queries; migrations; connection pooling |
| **@tanstack/react-query** | 5.x | Server state | API call caching, deduplication, retry logic |
| **react-hot-toast** | 3.x | Notifications | Lightweight toast system for confirmations/errors |
| **zustand/middleware** | Built-in | History stack | `temporal` middleware for undo/redo of furniture placements |

### 1.2 Backend (Next.js API Routes)

| Technology | Purpose |
|-----------|---------|
| **Next.js API Routes** | All backend logic — no separate server |
| **Prisma** | Database ORM + migrations |
| **@google/genai** | Gemini 2.5 Pro + Imagen API client |
| **@aws-sdk/client-s3** | Cloudflare R2 (S3-compatible) SDK |
| **@aws-sdk/s3-request-presigner** | Signed URL generation for R2 uploads/downloads |
| **next-auth** | Session management, JWT callbacks |
| **nanoid** | URL-safe ID generation (project slugs, share links) |
| **zod** | API request validation — every endpoint validated |

### 1.3 Infrastructure

| Service | Plan | Purpose |
|---------|------|---------|
| **Vercel** | Pro ($20/mo) | Hosting, serverless functions, edge network, preview deploys |
| **Supabase** | Free tier → Pro ($25/mo) | PostgreSQL database with built-in PgBouncer pooling, auto-backups, Singapore region |
| **Cloudflare R2** | Free (10GB storage, 1M ops/mo) | File storage — floor plans, 3D models, renders, textures |
| **Google AI** | Pay-as-you-go | Gemini 2.5 Pro (chat) + Imagen (renders) |
| **Google Cloud** | Free tier | OAuth client ID for NextAuth |

### 1.4 Why This Stack Over Alternatives

| Alternative | Why Not |
|-------------|---------|
| **Python FastAPI backend** | Unnecessary — all 3D ops are client-side. Adds deployment complexity (separate server, domain, scaling). |
| **Redis / BullMQ** | Not needed for MVP — Gemini renders are fast enough (3-10s) for synchronous proxy. Add in v2 for batch rendering. |
| **Supabase** | User's preference | We don't need real-time or auth from Supabase — it's pure Postgres. NextAuth handles auth. Supabase chosen for managed Postgres with built-in pooling, daily backups, and generous free tier. |
| **AWS S3** | More expensive egress. R2 has zero egress fees — important for users downloading renders/3D models. |
| **Blender (bpy)** | Heavy server-side dependency for operations we do client-side in Three.js. |
| **WebSocket / Socket.io** | Not needed — SSE streaming for AI chat is simpler, Vercel-compatible. |

---

## 2. Database Schema

### 2.1 Full Prisma Schema

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")       // Pooled:   postgresql://user:***@aws-0.ap-southeast-1.pooler.supabase.com:6543/postgres
  directUrl  = env("DIRECT_URL")         // Direct:   postgresql://user:***@aws-0.ap-southeast-1.pooler.supabase.com:5432/postgres
  extensions = [pg_trgm, uuid_ossp]
}

// ─── Auth ───────────────────────────────────────────────────────────

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String?
  avatarUrl      String?
  emailVerified  DateTime?
  role           String    @default("user") // "user" | "admin"
  accounts       Account[]
  sessions       Session[]
  projects       Project[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([email])
  @@index([role])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── BTO Projects & Templates ───────────────────────────────────────

model BTOProject {
  id          String      @id @default(cuid())
  name        String      // "Verandah Kallang 2024"
  slug        String      @unique // "verandah-kallang-2024"
  description String?
  location    String      // "Kallang", "Queenstown"
  launchYear  Int         // 2024, 2025
  developer   String      @default("HDB")
  imageUrl    String?     // Hero image for browse page
  models      FlatModel[]
  published   Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([published, launchYear])
  @@index([slug])
  @@index([location])
}

model FlatModel {
  id            String       @id @default(cuid())
  btoProject    BTOProject   @relation(fields: [btoProjectId], references: [id], onDelete: Cascade)
  btoProjectId  String
  name          String       // "4-Room Model A", "5-Room Premium"
  flatType      String       // "3-room" | "4-room" | "5-room" | "executive" | "2-room-flexi"
  floorPlanUrl  String?      // R2 URL for floor plan image
  thumbnailUrl  String?
  totalArea     Float?       // square metres
  roomCount     Int?         // Number of rooms (excluding bathrooms/hallway)
  walls         WallSegment[]
  roomDefs      RoomDef[]
  published     Boolean      @default(false)
  sortOrder     Int          @default(0)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([btoProjectId, published])
  @@index([flatType])
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
  
  // Room adjacency
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

  @@index([flatModelId])
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

  @@index([flatModelId])
}

// ─── User Projects ──────────────────────────────────────────────────

model Project {
  id              String        @id @default(cuid())
  user            User?         @relation(fields: [userId], references: [id])
  userId          String?
  name            String        @default("My Project")
  flatModelId     String?
  
  // Wall edit state (patch list — undoable, resettable)
  wallEdits       Json?         // [{action: "DELETE_WALL", wallId}, ...]
  
  // Design state
  designBrief     Json?         // Full DesignBrief JSON — per-room styles
  chatHistory     Json?         // [{role, content, timestamp}, ...]
  furnitureState  Json?         // [{furnitureItemId, position, rotation, scale, accepted}, ...]
  furnitureApplied Boolean      @default(false)

  // Cached 3D snapshot for quick reload
  modelSnapshot   Json?         // Material assignments, camera position, room visibility

  renders         Render[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([userId])
  @@index([updatedAt])
}

model Render {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId   String
  roomType    String   // "living" | "mbr" | "kitchen" | etc.
  roomLabel   String   // "Living Room"
  angleLabel  String   // "Corner View" | "Entrance View" | custom name
  angleType   String   @default("auto") // "auto" | "custom"
  imageUrl    String   // R2 URL
  prompt      String   @db.Text // Full prompt used
  resolution  String   @default("1024x1024")
  tier        String   @default("final") // "sample" | "final" — whether this was a sample or final render
  status      String   @default("completed") // "pending" | "processing" | "completed" | "failed"
  errorMsg    String?  // If failed
  createdAt   DateTime @default(now())

  @@index([projectId])
  @@index([createdAt])
}

model CustomAngle {
  id          String   @id @default(cuid())
  projectId   String
  roomType    String   // "living" | "mbr" | etc.
  label       String   // "My breakfast bar view"
  position    Json     // { x, y, z } camera position
  target      Json     // { x, y, z } look-at point
  isCustom    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([projectId, roomType])
}

// ─── Content Library ────────────────────────────────────────────────

model FurnitureTemplate {
  id           String   @id @default(cuid())
  name         String   // "Scandi Living Room Set"
  category     String   // "living" | "bedroom" | "dining" | "kitchen"
  styleTag     String?  // "scandinavian" | "japandi" | "industrial" | null (universal)
  roomType     String   // "living" | "bedroom_master" | "bedroom" | "dining"
  furniture    Json     // [{type, label, defaultPosition, defaultRotation, defaultScale, modelUrl, dimensions, category, wallAnchor, floorOnly, minClearance}, ...]
  thumbnailUrl String?
  published    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([category, styleTag])
  @@index([roomType, styleTag])
}

model FurnitureCatalogItem {
  id          String   @id @default(cuid())
  type        String   // "sofa" | "bed" | "table" | "chair" | "lamp" | "rug" | "cabinet" | "decor"
  label       String   // "3-Seater Sofa"
  category    String   // "seating" | "tables" | "lighting" | "decor" | "storage"
  styleTag    String?  // "scandinavian" | "japandi" | "industrial" | "modern" | null (universal)
  modelUrl    String   // GLB file in R2
  thumbnailUrl String?
  dimensions  Json     // {w, h, d} in metres
  wallAnchor  String?  // "against" | "facing" | "center" | null
  floorOnly   Boolean  @default(true)
  minClearance Float   @default(5) // cm
  published   Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([category, styleTag])
  @@index([type])
}

model StylePreset {
  id            String   @id @default(cuid())
  name          String   @unique // "Scandinavian", "Japandi", "Industrial"
  description   String
  palette       Json     // { floorType, floorColor, wallColor, accentColor, trimColor, lighting }
  promptHint    String   // "Scandinavian interior with light oak flooring and white walls..."
  furnitureTags String[] // Template styleTags this preset pairs with
  createdAt     DateTime @default(now())
}
```

### 2.2 Indexes & Query Patterns

| Query | Index | Frequency |
|-------|-------|-----------|
| `SELECT * FROM BTOProject WHERE published = true ORDER BY launchYear DESC` | `[published, launchYear]` | Every page load |
| `SELECT * FROM FlatModel WHERE btoProjectId = $1 AND published = true` | `[btoProjectId, published]` | BTO selection |
| `SELECT * FROM WallSegment WHERE flatModelId = $1 ORDER BY sortOrder` | `[flatModelId]` | 3D model load |
| `SELECT * FROM RoomDef WHERE flatModelId = $1 ORDER BY sortOrder` | `[flatModelId]` | Room labelling |
| `SELECT * FROM Project WHERE userId = $1 ORDER BY updatedAt DESC` | `[userId]`, `[updatedAt]` | Dashboard |
| `SELECT * FROM Render WHERE projectId = $1 ORDER BY createdAt` | `[projectId]` | Render gallery |
| `SELECT * FROM FurnitureTemplate WHERE roomType = $1 AND (styleTag = $2 OR styleTag IS NULL)` | `[roomType, styleTag]` | Template matching |
| `FULLTEXT SEARCH ON BTOProject(name)` | GIN trgm index on `name` | BTO search |

### 2.3 JSON Column Shapes

**WallSegment data** is stored in typed columns (startX, startY, endX, endY, thickness, height, wallType, isLoadBearing) — no JSON needed. Doors and windows are separate models (DoorOpening, WindowOpening) with typed fields.

**RoomDef** has typed columns (label, roomType, defaultWallColor, etc.) — no JSON needed.

**Legacy note:** Old RoomConfig.vertices/doors/windows JSON columns are replaced. Migration script converts polygon data to wall segments on first deploy.

**Project.wallEdits:**
```json
[
  { "action": "DELETE_WALL", "wallId": "cm123..." },
  { "action": "ADD_WALL", "wall": { "startX": 5.0, "startY": 0, "endX": 5.0, "endY": 4.0, "thickness": 0.15, "height": 2.8 } },
  { "action": "MODIFY_ROOM", "roomId": "cm456...", "updates": { "label": "Living + Study" } }
]
```

**DesignBrief:**
```json
{
  "overallVibe": "Japandi",
  "rooms": {
    "living": {
      "roomType": "living",
      "label": "Living Room",
      "style": "Japandi",
      "description": "Light oak flooring, warm white matte walls, minimal Japanese furniture",
      "wallColor": "#F5F0E8",
      "wallFinish": "matte",
      "floorType": "parquet",
      "floorColor": "light oak",
      "accentColor": "#2D5A27",
      "furnitureStyle": "minimal",
      "lighting": "warm 2700K",
      "specialNotes": "need a reading corner by the window",
      "renderPrompt": "Photorealistic interior render of a Japandi-style living room in a Singapore HDB flat..."
    }
  }
}
```

**FurnitureState (project.furnitureState):**
```json
[
  {
    "catalogItemId": "sofa-japandi-01",
    "label": "Low Wooden Sofa",
    "position": { "x": 1.5, "y": 0, "z": 2.3 },
    "rotation": { "x": 0, "y": 90, "z": 0 },
    "scale": { "x": 1, "y": 1, "z": 1 },
    "roomType": "living",
    "accepted": true,
    "snapped": true,
    "source": "template" // "template" | "catalog_add" | "sketchup_import"
  }
]
```

---

## 3. AI Models & Prompt Engineering

### 3.1 Model Selection

| Model | Version | Use Case | Max Input | Max Output | Cost |
|-------|---------|----------|-----------|------------|------|
| **Gemini 2.5 Pro** | `gemini-2.5-pro-exp-03-25` | AI design consultant (multi-turn chat) | 1M tokens | 64K tokens | $1.25-2.50/1M input, $5-10/1M output |
| **Imagen** | `imagen-3.0-generate-001` | Photorealistic interior renders | 1 image + text prompt | 1 image | Per-image pricing (~$0.03-0.05/image) |

### 3.2 AI Design Consultant — System Prompt

```markdown
You are an AI interior design consultant for Singapore HDB flats.
You help users design their home room-by-room through friendly conversation.

## RULES
1. Start broad — ask about their overall desired vibe/style first
2. Never ask more than 1-2 questions per response
3. Always offer specific choices — never "what colour do you want?" but "light oak or dark walnut?"
4. After every 2-3 exchanges, briefly summarize what you've noted
5. Track per-room preferences independently — do NOT apply living room choices to the kitchen
6. Use Singapore-appropriate materials: vinyl, laminate, homogeneous tiles, solid surface, quartz
7. Reference real HDB constraints: room dimensions, ceiling height (2.8m), window positions
8. When user says "I'm happy" or "looks good", present the full design brief for confirmation
9. If the user is vague ("make it nice"), ask 1-2 clarifying questions then make a confident suggestion

## OUTPUT FORMAT
Respond with a JSON object. The "message" is shown to the user.
The "brief" is the full updated DesignBrief — always include it.
The "briefDiff" contains only fields that changed this turn (used for real-time 3D preview).

{
  "message": "Your conversational response here... Include emoji ☺️ when feeling celebratory.",
  "brief": { "overallVibe": "...", "rooms": { ... } },
  "briefDiff": { ... }
}

## KNOWN ROOMS
The user's flat has these rooms: {roomList}
```

### 3.3 Design Brief → Render Prompt Construction

```typescript
function buildRenderPrompt(roomKey: string, brief: DesignBrief, room: RoomConfig): string {
  const rb = brief.rooms[roomKey];
  if (!rb) return "";

  const parts = [
    `Photorealistic interior render of a ${rb.label} in a Singapore HDB flat.`,
    `Style: ${rb.style}.`,
    rb.description,
    `Flooring: ${rb.floorType}, ${rb.floorColor}.`,
    `Walls: ${rb.wallColor}, ${rb.wallFinish} finish.`,
    rb.accentColor ? `Accent color: ${rb.accentColor}.` : "",
    rb.furnitureStyle ? `Furniture style: ${rb.furnitureStyle}.` : "",
    `Lighting: ${rb.lighting} tone.`,
    rb.specialNotes ? `Special: ${rb.specialNotes}.` : "",
    `Camera at eye level, wide angle lens. Professional interior photography lighting.`,
    `High resolution, realistic textures, natural shadows, depth of field.`,
  ].filter(Boolean).join("\n");

  return parts;
}

// Example output:
// "Photorealistic interior render of a Living Room in a Singapore HDB flat.
// Style: Japandi.
// Light oak flooring, warm white matte walls, minimal Japanese furniture.
// Flooring: parquet, light oak.
// Walls: #F5F0E8, matte finish.
// Accent color: #2D5A27.
// Furniture style: minimal.
// Lighting: warm 2700K tone.
// Special: need a reading corner by the window.
// Camera at eye level, wide angle lens. Professional interior photography lighting.
// High resolution, realistic textures, natural shadows, depth of field."
```

### 3.4 Gemini API Usage Patterns

```typescript
// ─── AI Consultant Chat ──────────────────────────────────────────
// POST /api/ai/consult
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function consult(
  message: string,
  history: ChatMessage[],
  currentBrief: DesignBrief,
  rooms: RoomDef[]
): Promise<ConsultResponse> {
  const systemPrompt = getSystemPrompt(rooms);

  const result = await ai.models.generateContent({
    model: "gemini-2.5-pro-exp-03-25",
    contents: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I am ready to help design this HDB flat." }] },
      ...history.map(m => ({
        role: m.role === "ai" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ],
    config: {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(result.text);
}

// ─── Render Generation ───────────────────────────────────────────
// POST /api/render

async function renderRoom(
  baseImage: Buffer,      // PNG screenshot of 3D viewport
  prompt: string,         // From buildRenderPrompt()
  resolution: string      // "1024x1024" | "2048x2048"
): Promise<Buffer> {
  const result = await ai.models.generateContent({
    model: "imagen-3.0-generate-001",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: baseImage.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      safetySettings: [{ category: "HARM_CATEGORY_DEROGATORY", threshold: "BLOCK_ONLY_HIGH" }],
      generationConfig: {
        // Imagen-specific config
        aspectRatio: "1:1", // Square for room renders
        numberOfImages: 1,
      },
    },
  });

  // Extract image from response
  const imageData = result.candidates[0].content.parts[0].inlineData?.data;
  return Buffer.from(imageData, "base64");
}
```

### 3.5 Cost Projections (Updated for 3-Tier)

| Service | Usage Estimate | Monthly Cost |
|---------|---------------|--------------|
| **Gemini 2.5 Pro (chat)** | 50 chats/user × 5 turns × 500 users = 125K turns | ~$15-30 |
| **Imagen (sample renders)** | 5 samples/user × 500 users = 2.5K images | ~$75-125 |
| **Imagen (final renders)** | 1 final batch/user × 6 angles × 500 users = 3K images | ~$90-150 |
| **Supabase DB** | Free tier (500MB, 50K auth users) → Pro ($25/mo) | $0 → $25 |
| **Cloudflare R2** | 10GB storage, ~100K ops/month | $0 |
| **Vercel Pro** | 1TB bandwidth, 5000 serverless hrs | $20 |
| **Total (MVP)** | 500 active users | **~$200-350/mo** |

---

## 4. 3D Engine Configuration

### 4.1 Three.js Renderer Settings

```typescript
// Scene setup
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
  stencil: false,        // Not needed — saves GPU memory
  depth: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Camera
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
// 50° FOV = natural human vision for interiors
// 0.1 near plane = close objects visible in walkthrough
// 100 far plane = plenty for HDB unit depth
```

### 4.2 Mesh Generation Pipeline (Wall-Segment Based)

The old approach extruded room polygons. The new approach generates 3D walls as box geometries from wall segments.

```typescript
// 1. Wall segment → 3D box geometry (replaces old polygon extrusion)
function generateWallMesh(wall: WallSegment): THREE.Mesh {
  const dx = wall.endX - wall.startX;
  const dy = wall.endY - wall.startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  const geo = new THREE.BoxGeometry(length, wall.height, wall.thickness);
  const mesh = new THREE.Mesh(geo, getWallMaterial(wall));
  
  // Position at segment midpoint
  mesh.position.set(
    (wall.startX + wall.endX) / 2,
    wall.height / 2,
    (wall.startY + wall.endY) / 2
  );
  mesh.rotation.y = -angle;
  
  // Apply door/window cutouts
  for (const door of wall.doorOpenings) {
    cutOpening(mesh, door, 'door');
  }
  for (const window of wall.windowOpenings) {
    cutOpening(mesh, window, 'window');
  }
  
  return mesh;
}

// 2. Floor slab from wall enclosure loop
function generateFloor(vertices: Vec2[]): THREE.BufferGeometry {
  const shape = new THREE.Shape(vertices.map(v => new THREE.Vector2(v.x, v.y)));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2); // Lay flat
  return geometry;
}

// 3. Door/window cutouts (CSG approach)
function cutOpening(wallGeometry: BufferGeometry, opening: Opening): BufferGeometry {
  // Use Three.js CSG (Constructive Solid Geometry)
  // Subtract a box representing the door/window from the wall mesh
  const csgWall = CSG.fromGeometry(wallGeometry);
  const csgOpening = CSG.fromGeometry(new THREE.BoxGeometry(opening.width, opening.height, 0.3));
  csgOpening.translate(opening.position.x, opening.position.y, 0);
  const result = csgWall.subtract(csgOpening);
  return CSG.toGeometry(result);
}

// 4. Merge all rooms into single mesh
function mergeBuilding(rooms: RoomMesh[]): THREE.BufferGeometry {
  const geometries = rooms.map(r => r.mesh.geometry);
  return BufferGeometryUtils.mergeGeometries(geometries, false);
}
```

### 4.3 Material System

```typescript
// PBR Material for walls
function createWallMaterial(color: string, finish: string): THREE.MeshStandardMaterial {
  const roughnessMap = {
    matte: 0.9,
    satin: 0.6,
    textured: 0.85,
  };

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: roughnessMap[finish] ?? 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.3,        // Subtle environment reflections
  });
}

// PBR Material for flooring
function createFloorMaterial(type: string, color: string): THREE.MeshStandardMaterial {
  const materialConfigs = {
    parquet: { roughness: 0.6, metalness: 0.0, map: textureLoader.load("/textures/oak-floor.jpg") },
    tiles:   { roughness: 0.3, metalness: 0.05, map: textureLoader.load("/textures/white-tile.jpg") },
    laminate:{ roughness: 0.5, metalness: 0.0, map: textureLoader.load("/textures/laminate.jpg") },
    vinyl:   { roughness: 0.4, metalness: 0.0, map: textureLoader.load("/textures/vinyl.jpg") },
    marble:  { roughness: 0.2, metalness: 0.1, map: textureLoader.load("/textures/marble.jpg") },
  };

  const config = materialConfigs[type] ?? materialConfigs.parquet;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: config.roughness,
    metalness: config.metalness,
    map: config.map,
    map: config.map?.clone() ?? undefined, // Clone to avoid shared texture
  });
}
```

### 4.4 Furniture Drag System

```typescript
// Using @react-three/drei DragControls
// Each furniture item wraps in <Dragable> component

function DragableFurniture({ item, onDrop }: Props) {
  const meshRef = useRef<Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [snapFeedback, setSnapFeedback] = useState<"valid" | "invalid" | null>(null);

  return (
    <Dragable
      meshRef={meshRef}
      onDragStart={() => setIsDragging(true)}
      onDrag={(position) => {
        // Run snap + collision checks every frame during drag
        const snapped = snapToGrid(position, GRID_SIZE);
        const wallSnapped = snapToWall(snapped, roomWalls);
        const collision = checkCollisions(wallSnapped, otherItems);

        setSnapFeedback(collision ? "invalid" : "valid");
        return collision ? position : wallSnapped; // Return snapped position or reject
      }}
      onDragEnd={(finalPosition) => {
        setIsDragging(false);
        onDrop(finalPosition);
      }}
    >
      <mesh ref={meshRef}>
        <primitive object={item.model} />
        {isDragging && (
          <GhostMesh
            position={/* snapped position */}
            opacity={0.4}
            tint={snapFeedback === "invalid" ? "red" : "green"}
          />
        )}
      </mesh>
    </Dragable>
  );
}

// Snap to grid
function snapToGrid(pos: Vec3, gridSize: number): Vec3 {
  return {
    x: Math.round(pos.x / gridSize) * gridSize,
    y: 0, // Always floor
    z: Math.round(pos.z / gridSize) * gridSize,
  };
}

// Snap to wall
function snapToWall(pos: Vec3, walls: Wall[], threshold = 0.2): Vec3 {
  for (const wall of walls) {
    const dist = distanceToWall(pos, wall);
    if (dist < threshold) {
      // Snap to 15cm from wall
      return projectToWall(pos, wall, 0.15);
    }
  }
  return pos;
}

// AABB collision check
function checkCollisions(pos: Vec3, others: FurnitureItem[]): boolean {
  const myBox = new THREE.Box3().setFromCenterAndSize(pos, currentItem.dimensions);
  for (const other of others) {
    const otherBox = new THREE.Box3().setFromCenterAndSize(
      other.position,
      other.dimensions
    );
    if (myBox.intersectsBox(otherBox)) return true;
  }
  return false;
}
```

### 4.5 LOD Strategy

| Distance | Model Detail | Polygon Budget |
|----------|-------------|----------------|
| < 3m | Full detail | 100% vertices |
| 3-8m | Medium LOD | 50% vertices, skip small details |
| > 8m | Low LOD | 25% vertices, no doors/windows cutouts |

All furniture models target ≤ 5K triangles per item.

---

## 5. API Reference

### 5.1 Endpoint Summary

| Method | Path | Auth | Rate Limit | Purpose |
|--------|------|------|------------|---------|
| GET | `/api/bto` | Public | 60/min | List published BTO projects |
| GET | `/api/bto/[slug]` | Public | 60/min | BTO project detail + models |
| GET | `/api/bto/[id]/models` | Public | 60/min | Flat models for a BTO project |
| POST | `/api/bto` | Admin | 10/min | Create BTO project |
| PUT | `/api/bto/[id]` | Admin | 10/min | Update BTO project |
| DELETE | `/api/bto/[id]` | Admin | 5/min | Delete BTO project |
| POST | `/api/bto/[id]/models` | Admin | 10/min | Create flat model |
| PUT | `/api/models/[id]` | Admin | 10/min | Update flat model + rooms |
| DELETE | `/api/models/[id]` | Admin | 5/min | Delete flat model |
| GET | `/api/models/[id]/walls` | Public | 60/min | Get wall segments + room defs for a flat model |
| POST | `/api/projects` | User | 30/min | Create new project |
| GET | `/api/projects/[id]` | User | 60/min | Get project state |
| PUT | `/api/projects/[id]` | User | 60/min | Update project |
| PUT | `/api/projects/[id]/brief` | User | 60/min | Update design brief |
| PUT | `/api/projects/[id]/walls` | User | 30/min | Save wall edits (patch list) |
| GET | `/api/projects/[id]/walls` | User | 60/min | Get current wall state after edits |
| POST | `/api/walls/validate` | User | 30/min | Validate wall edit before applying |
| GET | `/api/projects/[id]/chat` | User | 60/min | Get chat history |
| POST | `/api/ai/consult` | User | 30/min | Send message to AI consultant |
| POST | `/api/render/sample` | User | 15/min | Generate sample render (1 room) |
| POST | `/api/render/final` | User | 5/min | Generate final renders (all rooms, all angles) |
| GET | `/api/render/[id]` | User | 30/min | Get render result |
| POST | `/api/render/angles` | User | 10/min | Save custom camera angle |
| GET | `/api/render/angles` | User | 30/min | List auto + custom angles for project |
| POST | `/api/export` | User | 10/min | Generate Collada/OBJ export |
| POST | `/api/import` | User | 10/min | Re-upload and parse .dae/.obj |
| POST | `/api/upload` | User | 10/min | Get signed URL for file upload |
| GET | `/api/furniture/templates` | User | 30/min | List furniture templates |
| POST | `/api/furniture/apply` | User | 30/min | Apply template to project |
| GET | `/api/furniture/catalog` | User | 30/min | Browse furniture catalog |
| GET | `/api/presets` | Public | 60/min | List style presets |

### 5.2 Key Request/Response Shapes

```
POST /api/ai/consult
Request:
{
  "projectId": "abc123",
  "message": "I want Japandi overall, but the kitchen should be vintage green tiles"
}

Response:
{
  "message": "Great choices! I've set the main areas to Japandi...",
  "brief": { /* full DesignBrief */ },
  "briefDiff": {
    "rooms.living.style": "Japandi",
    "rooms.kitchen.style": "vintage",
    "rooms.kitchen.accentColor": "#2D5A27"
  }
}
```

```
POST /api/render
Request:
{
  "projectId": "abc123",
  "roomType": "living",
  "resolution": "1024x1024"
}

Response:
{
  "renderId": "rnd_xyz",
  "status": "processing"
}

// Poll:
GET /api/render/rnd_xyz
Response:
{
  "renderId": "rnd_xyz",
  "status": "completed",
  "imageUrl": "https://r2.example.com/renders/abc123/living_1024.png",
  "roomType": "living",
  "roomLabel": "Living Room",
  "prompt": "Photorealistic interior render of a Living Room...",
  "createdAt": "2026-06-03T12:00:00Z"
}
```

```
POST /api/export
Request:
{
  "projectId": "abc123",
  "format": "collada",
  "includeFurniture": true
}

Response:
{
  "downloadUrl": "https://r2.example.com/exports/abc123/export.dae",
  "expiresAt": "2026-06-03T12:15:00Z",   // 15 min signed URL
  "filename": "verandah-kallang-4rm-model-a.dae",
  "sizeBytes": 4200000
}
```

### 5.3 Zod Validation Schemas

```typescript
const consultSchema = z.object({
  projectId: z.string().cuid(),
  message: z.string().min(1).max(2000),
});

const renderSchema = z.object({
  projectId: z.string().cuid(),
  roomType: z.enum(["living", "mbr", "bedroom", "kitchen", "dining", "toilet"]),
  resolution: z.enum(["1024x1024", "2048x2048"]).default("1024x1024"),
});

const exportSchema = z.object({
  projectId: z.string().cuid(),
  format: z.enum(["collada", "obj"]).default("collada"),
  includeFurniture: z.boolean().default(true),
});

const furnitureApplySchema = z.object({
  projectId: z.string().cuid(),
  roomType: z.string(),
  templateId: z.string().cuid().optional(), // Omit for auto-select
});
```

---

## 6. Component Architecture

### 6.1 Route-Based Code Splitting

```
/                      → app/page.tsx              Landing page (Server Component)
/browse                → app/browse/page.tsx        BTO project list (Server + Client)
/browse/[slug]         → app/browse/[slug]/page.tsx BTO detail + model selector (Client)
/share/[id]            → app/share/[id]/page.tsx    Public render gallery (Server)

/studio/[projectId]    → app/studio/[projectId]/page.tsx  Main SPA (fully Client)
                        Contains: 3D viewport, chat, furniture, gallery
                        All Three.js code lazy-loaded here — never loaded on landing

/edit/[projectId]      → app/edit/[projectId]/page.tsx  Floor Plan Editor (Client)
                        Contains: react-konva canvas, wall tools, live 3D preview

/admin/*               → app/admin/**/*              Admin panel (Client, auth-guarded)

/api/*                 → app/api/**/*                API routes
```

### 6.2 Bundle Splitting Strategy

| Route | Initial JS | Lazy-Loaded |
|-------|-----------|-------------|
| `/` (landing) | ~50KB | None |
| `/browse` | ~80KB | None |
| `/browse/[slug]` | ~100KB | None |
| `/studio/[id]` | ~180KB | Three.js (~200KB) lazy-loaded via `next/dynamic` |
| `/admin` | ~120KB | react-konva (~100KB) lazy-loaded |
| `/share/[id]` | ~60KB | None |

### 6.3 State Management Architecture

```
Zustand Store Hierarchy:

┌─────────────────────────────────────────────────────┐
│                      App Store                        │
│  - user (session data)                               │
│  - projects (project list)                           │
│  - currentProjectId                                  │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │   Project Store      │  │    Viewport Store       │ │
│  │  - flatModel         │  │  - cameraPosition      │ │
│  │  - rooms[]           │  │  - activeRoom           │ │
│  │  - designBrief       │  │  - mode (view|tweak)   │ │
│  │  - chatHistory       │  │  - gridVisible         │ │
│  │  - furnitureState[]  │  │  - snapEnabled         │ │
│  │  - renders[]         │  │                        │ │
│  └─────────┬───────────┘  └────────────────────────┘ │
│            │                                          │
│            ▼                                          │
│  ┌─────────────────────┐                              │
│  │   Furniture Store    │  ←── temporal middleware    │
│  │  (undo/redo)         │      (history stack)        │
│  │  - past[]            │                              │
│  │  - present (items)  │                              │
│  │  - future[]          │                              │
│  │  - undo(), redo()    │                              │
│  └─────────────────────┘                              │
└─────────────────────────────────────────────────────┘
```

### 6.4 Key Component Dependencies

```
StudioPage
├── Scene (R3F Canvas)
│   ├── Building (flat 3D model)
│   │   ├── Room[] (walls + floor + ceiling)
│   │   ├── Doors[]
│   │   └── Windows[]
│   ├── Furniture[]
│   │   └── DragableFurniture[]  ←─ DragControls
│   ├── DragGhost (preview)
│   ├── RoomLabels[]
│   ├── GridHelper (tweak mode)
│   ├── Controls (OrbitControls)
│   └── CameraPresets
│
├── ChatPanel (collapsible side panel)
│   ├── RoomTabBar
│   ├── ChatMessage[]
│   ├── ChatInput
│   ├── TypingIndicator
│   └── DesignSummary
│
├── ActionBar (bottom toolbar)
│   ├── TweakModeToggle
│   ├── FurnitureBtn → CatalogSheet
│   │   ├── CatalogSheet (shadcn sheet)
│   │   │   ├── SearchInput
│   │   │   ├── CategoryFilter
│   │   │   └── CatalogGrid
│   │   │       └── CatalogItem[]
│   │   └── ContextMenu (shadcn popover)
│   ├── ExportBtn → ExportPanel
│   └── RenderBtn → RenderButton
│
└── RenderGallery (bottom panel)
    ├── RoomRenderSelector
    ├── RenderCard[]
    └── RenderLightbox
```

---

## 7. File Storage Strategy

### 7.1 R2 Bucket Structure

```
bucket: hdb-interior-design
│
├── floor-plans/
│   ├── bto-abc123/           # Per BTO project
│   │   ├── floor-plan.png    # Uploaded floor plan image
│   │   └── thumbnail.jpg     # Generated thumbnail
│   └── ...
│
├── textures/
│   ├── flooring/
│   │   ├── oak-parquet.jpg
│   │   ├── white-tile.jpg
│   │   ├── laminate.jpg
│   │   ├── vinyl.jpg
│   │   └── marble.jpg
│   ├── walls/
│   │   ├── matte-white.jpg
│   │   └── textured-plaster.jpg
│   └── hdri/
│       └── interior-studio.hdr   # Environment map for PBR lighting
│
├── furniture/
│   ├── models/
│   │   ├── sofa-japandi-01.glb
│   │   ├── bed-scandi-01.glb
│   │   ├── coffee-table-01.glb
│   │   └── ...
│   └── thumbnails/
│       ├── sofa-japandi-01.jpg
│       └── ...
│
├── renders/
│   ├── project-abc123/
│   │   ├── living_1024.png
│   │   ├── living_2048.png
│   │   ├── mbr_1024.png
│   │   └── ...
│   └── ...
│
├── exports/
│   ├── project-abc123/
│   │   ├── export.dae
│   │   ├── export.obj
│   │   └── export.mtl
│   └── ...
│
└── public/
    ├── brand-logo.svg
    └── og-image.jpg          # Open Graph image for share links
```

### 7.2 File Access Patterns

| Directory | Access | TTL | CDN |
|-----------|--------|-----|-----|
| `public/` | Public | 1 year | R2 public + Cloudflare CDN |
| `textures/` | Public | 1 year | R2 public + Cloudflare CDN |
| `furniture/models/` | Public | 1 year | R2 public + Cloudflare CDN |
| `furniture/thumbnails/` | Public | 1 year | R2 public + Cloudflare CDN |
| `floor-plans/` | Signed URL (15 min) | N/A | Direct R2 |
| `renders/` | Signed URL (1 week) | N/A | Direct R2 |
| `exports/` | Signed URL (15 min) | N/A | Direct R2 |

### 7.3 Signed URL Generation

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function getUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(r2, new PutObjectCommand({
    Bucket: "hdb-interior-design",
    Key: key,
    ContentType: contentType,
  }), { expiresIn: 900 }); // 15 minutes
}

async function getDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: "hdb-interior-design",
    Key: key,
  }), { expiresIn: 900 }); // 15 minutes
}
```

---

## 8. Deployment & Infrastructure

### 8.1 Vercel Configuration

```json5
// vercel.json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "regions": ["sin1"],          // Singapore region — critical for low latency
  "functions": {
    "app/api/ai/consult/route.ts": {
      "memory": 1024,           // Gemini SDK needs memory
      "maxDuration": 30          // AI responses can take 10-15s
    },
    "app/api/render/route.ts": {
      "memory": 1024,
      "maxDuration": 60          // Imagen can take 20-30s
    },
    "app/api/upload/route.ts": {
      "memory": 512,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### 8.2 Environment Variables

```bash
# === Required ===
DATABASE_URL="postgresql://user:***@aws-0.ap-southeast-1.pooler.supabase.com:6543/postgres"
GEMINI_API_KEY="AIzaSy..."
R2_ACCOUNT_ID="abc123def456"
R2_ACCESS_KEY_ID="abc123"
R2_SECRET_ACCESS_KEY="xyz789"
R2_BUCKET_NAME="hdb-interior-design"

# === NextAuth ===
NEXTAUTH_URL="https://interior-design.vercel.app"
NEXTAUTH_SECRET="your-generated-secret"
AUTH_GOOGLE_ID="abc123.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-..."

# === Optional ===
NEXT_PUBLIC_APP_URL="https://interior-design.vercel.app"
NEXT_PUBLIC_R2_PUBLIC_URL="https://pub-abc123.r2.dev"
```

### 8.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run type-check    # tsc --noEmit
      - run: npm run lint          # eslint
      - run: npm run test          # vitest

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 8.4 Supabase Configuration for Vercel

Supabase requires **connection pooling** for Vercel serverless functions:

```
DATABASE_URL (pooled, port 6543) → Used by Next.js API routes at runtime
DIRECT_URL    (direct, port 5432) → Used by Prisma migrations only
```

**Important:** Enable "Connection Pooling" in Supabase dashboard → Database → Connection pooling. This uses PgBouncer to manage serverless connection spikes.

### 8.5 Waitlist System ("Notify Me When Added")

When a user searches for a BTO project not yet in the library, they can register interest:

```
┌──────────────────────────────────────────────────────────────┐
│  "This BTO isn't in our library yet."                        │
│                                                               │
│  We're adding new projects regularly.                        │
│  Get notified when "{project name}" becomes available.       │
│                                                               │
│  [Notify Me →]                                                │
│                                                               │
│  (Stored to WaitlistEntry table. Admin sees in dashboard.)    │
└──────────────────────────────────────────────────────────────┘
```

**Prisma model:**
```prisma
model WaitlistEntry {
  id          String   @id @default(cuid())
  email       String   // User's email (from auth or manual input)
  userId      String?  // If logged in
  projectName String   // What they searched for
  location    String?  // Optional, from search context
  notified    Boolean  @default(false) // True once admin adds it + notification sent
  createdAt   DateTime @default(now())

  @@index([email])
  @@index([notified, createdAt])
}
```

**Admin dashboard integration:**
- Admin Dashboard shows: "📋 3 waitlist entries — projects not yet added"
- Click → list of all entries grouped by `projectName`
- When admin publishes a matching BTO project, they click "Notify All" → sends email (via Resend / SendGrid)
- Mark `notified: true` once sent

---

## 9. Security Architecture

### 9.1 Authentication Flow

```
User clicks "Sign in with Google"
         │
         ▼
Google OAuth consent screen
         │
         ▼ (redirect with code)
NextAuth callback: /api/auth/callback/google
         │
         ├── Verify ID token (cryptographic)
         ├── Create/lookup user in Postgres
         ├── Create session (JWT in httpOnly cookie)
         └── Redirect to app
```

### 9.2 Authorization

```typescript
// Admin route guard
export async function requireAdmin(): Promise<User> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
  return session.user;
}

// Project ownership guard
export async function requireProjectOwner(projectId: string): Promise<Project> {
  const session = await auth();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== session?.user?.id) {
    throw new Error("Unauthorized: you don't own this project");
  }
  return project;
}
```

### 9.3 Rate Limiting

```typescript
// Vercel Edge middleware-based rate limiting
// Uses Vercel KV or in-memory (per-region)

const rateLimit = {
  "POST /api/ai/consult": { window: 60_000, max: 30 },  // 30 per minute
  "POST /api/render":     { window: 60_000, max: 10 },  // 10 per minute
  "POST /api/upload":     { window: 60_000, max: 10 },  // 10 per minute
  "GET /api/bto":         { window: 60_000, max: 60 },  // 60 per minute (public)
  "POST /api/auth/*":     { window: 60_000, max: 5 },   // 5 login attempts
};
```

### 9.4 Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
    # 'unsafe-eval' needed for Three.js shader compilation
    # 'unsafe-inline' needed for Next.js dev mode (remove in prod)
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://pub-*.r2.dev https://*.googleapis.com blob: data:;
    # R2 CDN for textures, Google APIs for avatar
  connect-src 'self' https://generativelanguage.googleapis.com https://*.r2.dev;
    # Gemini API + R2 API
  frame-src 'self' https://accounts.google.com;
    # Google OAuth popup
  font-src 'self' data:;
  object-src 'none';
```

### 9.5 File Upload Security

```typescript
// Server-side validation before generating signed URL
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "model/vnd.collada+xml",   // .dae
  "model/obj",                 // .obj
  "model/gltf-binary",        // .glb
];

const MAX_FILE_SIZES = {
  "floor-plan": 50 * 1024 * 1024,     // 50 MB — high-res scans
  "model-import": 50 * 1024 * 1024,   // 50 MB — furniture models
  "furniture-model": 10 * 1024 * 1024,// 10 MB — GLB files
  "texture": 20 * 1024 * 1024,        // 20 MB — texture images
};
```

---

## 10. Performance Budgets

### 10.1 Loading Performance

| Metric | Budget | Measurement |
|--------|--------|-------------|
| **First Contentful Paint** | < 1.5s | Lighthouse, mobile 3G |
| **Largest Contentful Paint** | < 2.5s | Lighthouse, mobile 3G |
| **Time to Interactive** | < 3.0s | Lighthouse, mobile 3G |
| **Total Bundle (initial)** | < 200KB JS | Webpack bundle analyzer |
| **Three.js Lazy Load** | < 400KB | Loaded only on /studio/[id] |
| **API Response (chat)** | < 3s | First token <500ms, full <3s |
| **API Response (render)** | < 15s | Per room (target: 10s) |

### 10.2 Runtime Performance

| Scenario | Target | Strategy |
|----------|--------|----------|
| **3D model load** | < 2s | Pre-merged geometry; glTF; lazy textures |
| **Material swap** | < 500ms | Only swap material references; no re-mesh |
| **Furniture drag** | 60fps | AABB collision (cheap); ghost with low-poly proxy |
| **Room switch (camera)** | < 300ms | Pre-calculated camera positions; smooth lerp |
| **Viewport resize** | < 100ms | Throttle resize handler; debounced re-render |

### 10.3 Lighthouse Targets

| Category | Target |
|----------|--------|
| **Performance** | ≥ 85 |
| **Accessibility** | ≥ 95 |
| **Best Practices** | ≥ 90 |
| **SEO** | ≥ 95 |

### 10.4 Network Payload Budgets

| Resource | Budget | Notes |
|----------|--------|-------|
| HTML (first page) | < 30KB | Server-rendered, minimal hydration |
| CSS | < 50KB | Tailwind purged, shadcn tree-shaken |
| JS (initial) | < 200KB | No Three.js, no react-konva on landing |
| JS (/studio) | < 600KB | Three.js + R3F + drei + furniture store |
| Images | < 500KB | First-view images lazy-loaded or blurred placeholder |
| 3D models (GLB) | < 5MB each | Draco compressed; LOD variants |
| Textures | < 1MB each | JPEG at 80% quality; mip-mapped |

---

## 11. Testing Strategy

### 11.1 Test Pyramid

```
         ╱─────╲
        ╱  E2E  ╲           Playwright — 5 critical paths
       ╱──────────╲
      ╱Integration ╲        Vitest + MSW — API routes, Prisma
     ╱──────────────╲
    ╱    Unit Tests   ╲     Vitest — mesh gen, export, AI prompt builders
   ╱────────────────────╲
  ╱   TypeScript (Types)  ╲  tsc --noEmit — compile-time checks
 ╱──────────────────────────╲
╱ Manual (Visual QA) ────────╲  Human review — renders, 3D, SketchUp flows
```

### 11.2 Unit Test Coverage

| Module | Test Cases |
|--------|-----------|
| **Mesh generation** | Rectangle room → 4 walls; L-shaped room → correct wall count; Door cutout → opening exists; Window cutout → sill at correct height; Adjacent rooms share wall |
| **Export** | Collada export contains all mesh nodes; Textures referenced correctly; OBJ export creates .obj + .mtl; Re-import preserves geometry |
| **Snap system** | Snap-to-grid rounds to nearest 25cm; Wall snap activates within 20cm; Collision detection catches overlaps; Rotation snap at 45° increments |
| **AI prompt builder** | Empty room → no prompt; Full brief → complete prompt; Per-room fields reflected correctly; Special notes included |
| **Furniture matching** | Room type filter works; Style tag filter works; Universal templates match any style; Tie-breaking by dimension fit |

### 11.3 Integration Test Coverage

| Endpoint | Tests |
|----------|-------|
| `POST /api/ai/consult` | Returns valid JSON; Updates design brief; Returns diff; Handles empty message |
| `POST /api/render` | Returns renderId; Image stored to R2; Record created in DB; Invalid project → 404 |
| `POST /api/export` | Collada file generated; File uploaded to R2; With/without furniture; OBJ fallback |
| `POST /api/furniture/apply` | Template matched correctly; Items added to project state; Invalid template → error |
| `POST /api/upload` | Signed URL returned; Valid MIME types accepted; Invalid type rejected; File size limit enforced |

### 11.4 E2E Test Paths (Playwright)

```typescript
// Critical path 1: Full user journey
test("user goes from login to first render", async ({ page }) => {
  await page.goto("/");
  await page.click("text=Sign in with Google");
  // ... mock OAuth ...
  await page.click("text=Verandah Kallang 2024");
  await page.click("text=4-Room Model A");
  await page.waitForSelector("canvas"); // 3D loaded
  await page.click("text=Chat");
  await page.type("textarea", "Japandi overall");
  await page.click("button:has-text('Send')");
  await page.waitForSelector("text=Light oak"); // AI responds
  await page.click("text=I'm happy");
  await page.click("text=Auto-Furnish");
  await page.waitForSelector("text=Sofa placed");
  await page.click("text=Render Living Room");
  await page.waitForSelector("img.render-complete");
});

// Critical path 2: Admin creates BTO project
test("admin creates new BTO project", async ({ page }) => {
  // ... login as admin ...
  await page.goto("/admin");
  await page.click("text=New BTO Project");
  await page.type("input[name=name]", "Test BTO 2025");
  await page.setInputFiles('input[type="file"]', "test-floor-plan.png");
  await page.waitForSelector("canvas"); // annotation canvas loads
  // Draw room...
  await page.click("text=Save & Publish");
  await page.waitForSelector("text=Published");
});

// Critical path 3: Tweak mode
test("user drags furniture in tweak mode", async ({ page }) => {
  // ... project loaded with furniture ...
  await page.click("text=Tweak Mode");
  const sofa = page.locator("canvas").first(); // or specific 3D selector
  await sofa.dragTo(page.locator("canvas"), { targetPosition: { x: 100, y: 50 } });
  await page.waitForSelector("text=Snapped to wall"); // toast
});
```

### 11.5 AI Quality Testing

```typescript
// Manual + semi-automated evaluation for Gemini outputs

interface AITestCase {
  input: string;
  expectedBrief: Partial<DesignBrief>;
  expectedQuestions: string[];  // AI should ask about these
  shouldNotMention: string[];   // AI should not say these
}

const testCases: AITestCase[] = [
  {
    input: "I want Japandi overall",
    expectedBrief: { overallVibe: "Japandi" },
    expectedQuestions: ["flooring", "wall color"],
    shouldNotMention: ["I cannot", "I'm not able to"],
  },
  {
    input: "Kitchen should be vintage green tiles, rest modern",
    expectedBrief: {
      rooms: {
        kitchen: { style: "vintage", accentColor: expect.any(String) },
      },
    },
    expectedQuestions: ["cabinet color", "countertop"],
  },
];
```

### 11.6 Performance Testing

| Test | Tool | Cadence |
|------|------|---------|
| Lighthouse CI | Lighthouse bot | Every PR |
| Bundle size | webpack-bundle-analyzer | Every merge to main |
| API response times | Vercel Analytics | Weekly review |
| 3D frame rate | Chrome DevTools Performance | Manual per major change |
| Load testing | k6 (20 concurrent users) | Pre-launch |

---

## 12. Browser Compatibility

| Browser | Support | Known Issues |
|---------|---------|--------------|
| **Chrome 120+** | ✅ Full | None |
| **Edge 120+** | ✅ Full | None (Chromium-based) |
| **Safari 17+** | ✅ Full | WebGL 2.0 required; no `EXT_disjoint_timer_query` |
| **Firefox 120+** | ✅ Full | WebGL performance slightly lower |
| **Samsung Internet** | ✅ Full | Tested on S24+; pinch-to-zoom conflicts with orbit controls |
| **Chrome Android** | ✅ Full | Same as Samsung |
| **Safari iOS** | ⚠️ Partial | WebGL limitations on older devices (< A14 Bionic) |

### 12.1 WebGL Support Detection

```typescript
export function checkWebGLSupport(): { supported: boolean; issues: string[] } {
  const issues: string[] = [];

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
      issues.push("WebGL 2.0 not supported");
    } else {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer?.includes("SwiftShader") || renderer?.includes("llvmpipe")) {
          issues.push("Software renderer detected — 3D performance will be poor");
        }
      }
    }
  } catch {
    issues.push("WebGL detection failed");
  }

  return { supported: issues.length === 0, issues };
}
```

---

## 13. Cost Analysis

### 13.1 Monthly Operating Costs

| Item | Plan | Monthly | Notes |
|------|------|---------|-------|
| **Vercel** | Pro | $20 | Includes 1TB bandwidth, 5000 serverless hrs |
| **Supabase** | Free → Pro | $0 → $25 | Free: 500MB, 50K auth users. Pro: 8GB, daily backups, built-in PgBouncer |
| **Cloudflare R2** | Free | $0 | 10GB storage free, 1M Class A ops free |
| **Gemini API** | Pay-as-you-go | ~$15-30 | Chat: ~$15/mo at 500 users |
| **Imagen** | Pay-as-you-go | ~$150-250 | Renders: ~$0.04/image × 5K images |
| **Domain** | Cloudflare | ~$10/yr | interior-design.sg or similar |
| **Total (500 users)** | | **~$200-320/mo** | Scales linearly with users |

### 13.2 One-Time Setup Costs

| Item | Cost | Notes |
|------|------|-------|
| **3D furniture models** | $0-500 | Use free models (Poly Haven, SketchFab) or commission |
| **PBR textures** | $0 | Poly Haven CC0 textures |
| **HDR environment** | $0 | Poly Haven HDRIs |
| **Furniture template design** | Your time | ~2 weeks of 3D layout work |

### 13.3 Scaling Projections

| Users | Monthly Cost | Bottleneck |
|-------|-------------|-----------|
| 100 | ~$100 | Imagen renders |
| 500 | ~$300 | Imagen renders + Vercel functions |
| 2,000 | ~$800 | Imagen ($600+) + Supabase upgrade ($25) + Vercel Pro → Team |
| 10,000 | ~$3,500 | Need ComfyUI self-hosted (GPU); Supabase → Enterprise ($599/mo) |

At 10K+ users, it becomes cost-effective to self-host a Stable Diffusion / ComfyUI pipeline on a GPU instance (~$200/mo for A10G on RunPod) rather than paying per-image for Imagen.

---

## Appendix A: Dependency Version Lock

```json
{
  "next": "^16.0.0",
  "react": "^19.0.0",
  "three": "^0.172.0",
  "@react-three/fiber": "^9.0.0",
  "@react-three/drei": "^10.0.0",
  "zustand": "^5.0.0",
  "immer": "^10.0.0",
  "react-konva": "^19.0.0",
  "konva": "^9.0.0",
  "@prisma/client": "^6.0.0",
  "next-auth": "^5.0.0",
  "@google/genai": "^1.0.0",
  "@aws-sdk/client-s3": "^3.0.0",
  "@aws-sdk/s3-request-presigner": "^3.0.0",
  "zod": "^3.23.0",
  "nanoid": "^5.0.0",
  "@tanstack/react-query": "^5.0.0",
  "react-hot-toast": "^3.0.0"
}
```

## Appendix B: Key Third-Party Assets

| Asset | Source | License | Use |
|-------|--------|---------|-----|
| PBR textures (flooring) | Poly Haven (polyhaven.com) | CC0 | Floor materials |
| PBR textures (walls) | Poly Haven | CC0 | Wall materials |
| HDR environment map | Poly Haven | CC0 | 3D scene lighting |
| Furniture 3D models | SketchFab Free Collection | Various (CC) | Starting template library |
| Example floor plans | HDB Public Portal | Public | Admin reference |
| shadcn/ui components | shadcn/ui (MIT) | MIT | UI components |
