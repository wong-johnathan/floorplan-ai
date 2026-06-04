# Implementation Plan

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v2.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |
| **Previous** | v1.0 (initial 6-phase plan) |
| **Estimated Timeline** | 16 weeks (single dev) |

---

## 1. Revised Phases (Based on Wall-Editing Architecture)

The wall-editing pipeline (BTO → **Edit Floor Plan** → AI consultant → Furnish → Renders) adds a major new component. The admin annotation workflow also changes from polygon-drawing to wall-segment drawing with auto room detection.

| Phase | Weeks | Focus |
|-------|-------|-------|
| 0 | 1 | Project scaffold + infrastructure |
| 1 | 2-4 | Admin panel + wall-based BTO template system |
| 2 | 5-6 | 3D viewport + wall-segment mesh generation |
| 3 | 7-9 | AI design consultant (chat + brief) |
| 4 | 10-11 | User-facing floor plan editor |
| 5 | 12-14 | Furniture template system + Drag-to-place (LAVU-style) |
| 6 | 15 | SketchUp export/import |
| 7 | 16-17 | Photorealistic rendering (Gemini) |
| 8 | 18-19 | User features + polish |

---

## 2. Phase Details

### Phase 0 — Project Scaffold (Week 1)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 0.1 | Create Next.js 16 app with App Router, TypeScript, Tailwind | `package.json`, `next.config.ts` | `npm run dev` starts |
| 0.2 | Install deps: R3F, drei, zustand, react-konva, shadcn/ui, prisma, next-auth | `package.json` | All imports resolve |
| 0.3 | Init shadcn/ui + add components | `components/ui/` | Components render on test page |
| 0.4 | Set up Prisma schema + Supabase DB | `prisma/schema.prisma`, `.env` | `prisma db push` succeeds |
| 0.5 | Set up Cloudflare R2 bucket + CORS | `.env` (R2 keys) | Test upload via signed URL |
| 0.6 | Create all route stubs | All `/app/` route files | Routes render "Coming Soon" |
| 0.7 | GitHub → Vercel deployment pipeline | Vercel dashboard | Preview deployment green |

---

### Phase 1 — Admin Panel & BTO Template System (Week 2-3)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 1.1 | NextAuth with Google OAuth + admin role | `app/api/auth/[...nextauth]/route.ts` | Login with Google works |
| 1.2 | Admin login + dashboard layout | `app/admin/login/`, `app/admin/layout.tsx` | Protected admin routes |
| 1.3 | BTO project CRUD | `app/admin/bto/page.tsx`, API routes | Create, list, edit BTO projects |
| 1.4 | Flat model CRUD (within BTO project) | `app/admin/bto/[id]/models/` | Add 4-room/5-room variants |
| 1.5 | Floor plan upload → R2 → preview | `app/api/upload/route.ts` | Image uploads, preview renders |
| 1.6 | Wall annotation canvas (react-konva) | `components/admin/WallAnnotationCanvas.tsx` | Draw wall segments on floor plan |
| 1.7 | Auto room detection from wall enclosures | `lib/mesh/roomDetection.ts` | System computes rooms from wall loops |
| 1.8 | Room property panel (type, label, materials) | `components/admin/RoomPropertyPanel.tsx` | Label auto-detected rooms |
| 1.9 | Wall property panel (load-bearing, wall type) | `components/admin/WallPropertyPanel.tsx` | Mark load-bearing, external/party/internal |
| 1.10 | Door/window placement on walls | `components/admin/DoorWindowPlacement.tsx` | Markers on wall segments |
| 1.11 | Save + publish BTO project with all walls + rooms | API routes + DB | Published projects visible to users |

**Checkpoint:** Admin can add a BTO project, upload floor plan, annotate rooms, publish.

---

### Phase 2 — 3D Viewport & Mesh Generation (Week 4-5)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 2.1 | R3F Canvas with lighting + orbit controls | `components/viewport/Scene.tsx` | Empty scene renders |
| 2.2 | Wall mesh from 2D vertices → 3D at 2.8m | `lib/mesh/generateWalls.ts` | Walls visible |
| 2.3 | Floor + ceiling slabs | `lib/mesh/generateFloor.ts`, `generateCeiling.ts` | Slabs visible |
| 2.4 | Door cutouts (subtract from walls) | `lib/mesh/generateDoors.ts` | Door gaps in walls |
| 2.5 | Window cutouts + glass | `lib/mesh/generateWindows.ts` | Window gaps + transparent glass |
| 2.6 | Room component = walls + floor + ceiling | `components/viewport/Room.tsx` | Complete room renders |
| 2.7 | Building = all rooms merged | `components/viewport/Building.tsx` | Full flat visible |
| 2.8 | Room labels in 3D | `components/viewport/RoomLabels.tsx` | Names float above rooms |
| 2.9 | Viewport controls toolbar | `components/viewport/Controls.tsx` | Orbit, pan, zoom, walkthrough |
| 2.10 | Camera presets per room | `components/viewport/CameraPresets.tsx` | Click room → camera snaps to it |

**Checkpoint:** User selects flat type → complete 3D model renders in browser.

---

### Phase 3 — AI Design Consultant (Week 6-8)

*This is the most complex phase — allow extra time for prompt engineering.*

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 3.1 | Chat UI component | `components/consultant/ChatPanel.tsx` | Send message, receive reply |
| 3.2 | Chat message bubbles (user + AI) | `components/consultant/ChatMessage.tsx` | Styled, scrollable |
| 3.3 | SSE streaming for typing effect | `app/api/ai/consult/stream` route | Text streams character by character |
| 3.4 | Gemini 2.5 Pro integration | `lib/ai/consultant.ts` | API responds with JSON |
| 3.5 | Design Brief schema + validation | `types/designBrief.ts` | Brief parses correctly |
| 3.6 | System prompt: interior design consultant | `lib/ai/prompts/consultant.ts` | AI asks relevant questions |
| 3.7 | Per-room brief tracking | AI system prompt instructs per-room tracking | Room A ≠ Room B in brief |
| 3.8 | Brief → 3D material sync | When AI sets floor=oak, model updates in <500ms | Real-time preview |
| 3.9 | Room tab bar (switch which room to discuss) | `components/consultant/RoomTabBar.tsx` | Click "Kitchen" → chat focuses kitchen |
| 3.10 | Design summary panel | `components/consultant/DesignSummary.tsx` | Shows full brief at a glance |
| 3.11 | "I'm happy" flow | Chat concludes, brief finalized | Brief locked, proceed button enabled |
| 3.12 | Chat history persistence | Save to project in DB | Refresh page → chat resumes |
| 3.13 | Edge case: bad AI JSON → retry | Retry logic + fallback | AI recovers from malformed output |

**Checkpoint:** User chats with AI, brief accumulates per-room, 3D model updates in real-time.

---

### Phase 4 — User-Facing Floor Plan Editor (Week 10-11)

*The ability to knock down walls, merge rooms, split rooms, and customize layouts before styling.*

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 4.1 | 2D floor plan canvas (react-konva) | `components/flooreditor/FloorPlanCanvas.tsx` | Wall segments render on floor plan overlay |
| 4.2 | Wall data model from flat model (load wall segments) | `lib/flooreditor/wallData.ts` | Admin's walls loaded into editor |
| 4.3 | Select mode — click wall to highlight, show properties | `components/flooreditor/SelectMode.tsx` | Wall highlights on click |
| 4.4 | Delete mode — selected wall + confirmation dialog | `components/flooreditor/DeleteWallDialog.tsx` | Wall removed, rooms auto-merge |
| 4.5 | Draw wall mode — click existing wall → drag to another wall (snap) | `components/flooreditor/DrawMode.tsx` | New wall appears, room splits |
| 4.6 | Auto room recomputation after every edit | `lib/flooreditor/roomEngine.ts` | Rooms recalculated from wall graph |
| 4.7 | Structural wall visual style (hatched/colored, non-selectable for delete) | `components/flooreditor/StructuralWallOverlay.tsx` | Load-bearing walls look different |
| 4.8 | Door/window shift on wall move (openings follow their wall) | `lib/flooreditor/doorShift.ts` | Doors stay on wall when wall endpoint moves |
| 4.9 | Room label + type picker (user names merged/split rooms) | `components/flooreditor/RoomLabelEditor.tsx` | Prompt after each wall change |
| 4.10 | Undo/redo stack (patch list approach, 50+ steps) | `lib/flooreditor/history.ts` | Ctrl+Z reverts last wall action |
| 4.11 | Reset to original layout | `components/flooreditor/ResetButton.tsx` | All wall edits cleared |
| 4.12 | Live 3D preview panel (side panel shows updated 3D scene) | `components/flooreditor/LivePreview3D.tsx` | R3F renders current wall state |
| 4.13 | Validation on apply (enclosed rooms, no orphan walls) | `lib/flooreditor/validation.ts` | Errors shown before proceeding |
| 4.14 | "Use Default Layout" skip button | Entry point in flow | User skips to AI consultant directly |
| 4.15 | Save wallEdits to project + proceed pipeline | `app/api/projects/[id]/walls/route.ts` | Wall edits persisted, flow continues |

**Checkpoint:** User can select flat → edit walls → see updated 3D → proceed to AI consultant.

---

### Phase 5 — Furniture Template System (Week 12-14)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 5.1 | FurnitureTemplate Prisma model | `prisma/schema.prisma` | DB table created |
| 5.2 | Admin: furniture template CRUD | `app/admin/furniture/` | Create template with furniture list |
| 5.3 | Admin: upload 3D furniture models (GLB) to R2 | `app/api/upload/route.ts` | Furniture files stored |
| 5.4 | Template matching engine (roomType + styleTag) | `lib/furniture/matcher.ts` | Returns correct template |
| 5.5 | Furniture placement logic (scale + anchor) | `lib/furniture/placer.ts` | Sofa against wall, bed centered |
| 5.6 | Furniture 3D component (load GLB, position) | `components/viewport/Furniture.tsx` | Furniture visible in scene |
| 5.7 | Furniture selector UI | `components/furniture/FurnitureSelector.tsx` | Shows matching templates |
| 5.8 | Accept/reject per item | `components/furniture/PlacementToggle.tsx` | Toggle individual furniture pieces |
| 5.9 | Seed templates: 6 room×style combinations | Data file | Templates available |
| 5.10 | DragControls integration (LAVU-style) | `components/viewport/DragableFurniture.tsx` | Furniture items are pickable and draggable |
| 5.11 | Ground plane raycast for drag | `lib/furniture/raycaster.ts` | Items stay on floor (Y=0) during drag |
| 5.12 | Snap-to-grid system (25cm) | `lib/furniture/snapping.ts` | Furniture snaps on release |
| 5.13 | Wall snap detection | `lib/furniture/wallSnap.ts` | Within 20cm → snaps to 15cm gap |
| 5.14 | Collision detection (AABB) | `lib/furniture/collision.ts` | Red ghost when overlapping |
| 5.15 | Ghost preview during drag | `components/viewport/DragGhost.tsx` | Transparent ghost follows cursor |
| 5.16 | Context menu (swap, remove, rotate) | `components/furniture/ContextMenu.tsx` | Right-click → menu appears |
| 5.17 | Furniture catalog panel | `components/furniture/CatalogPanel.tsx` | Search, filter, drag-into-room |
| 5.18 | Swap item flow | `lib/furniture/swapper.ts` | Pick catalog item → replaces in place |
| 5.19 | Undo/redo for furniture state | Zustand middleware + history stack | Ctrl+Z reverts last action |
| 5.20 | Tweak mode toggle (Quick Apply vs. Tweak) | UI mode switch in viewport | Seamless switch between modes |

**Seed templates (MVP):**

| Template | Rooms | Items |
|----------|-------|-------|
| Living - Scandi | Living | Sofa, coffee table, rug, lamp, TV console, plant |
| Living - Japandi | Living | Low sofa, wood coffee table, tatami rug, floor lamp |
| Living - Industrial | Living | Leather sofa, metal table, industrial lamp, shelf |
| MBR - Scandi | MBR | Bed, nightstand×2, wardrobe, rug, lamp |
| MBR - Japandi | MBR | Low platform bed, nightstand, sliding wardrobe |
| Dining | Dining/Kitchen | Table, chairs×4, pendant light |

---

### Phase 6 — SketchUp Export/Import (Week 15)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 5.1 | Collada exporter via Three.js | `lib/export/exportCollada.ts` | .dae file downloads |
| 5.2 | Texture bundling in export | Collada texture refs | Textures load in SketchUp |
| 5.3 | Export UI (with/without furniture options) | `components/export/ExportPanel.tsx` | User chooses export mode |
| 5.4 | OBJ fallback exporter | `lib/export/exportOBJ.ts` | .obj + .mtl download |
| 5.5 | Collada importer (re-upload) | `lib/export/importModel.ts` | Parses uploaded .dae |
| 5.6 | Import dropzone | `components/export/ImportDropzone.tsx` | Drag-and-drop re-upload |
| 5.7 | Mesh merge (furniture into scene) | `lib/export/importModel.ts` | User's furniture appears |
| 5.8 | Diff highlight (new objects highlighted) | `components/viewport/Furniture.tsx` | New objects in different colour |

**Checkpoint:** Full export → SketchUp → re-import cycle works end-to-end.

---

### Phase 7 — Photorealistic Rendering with 3-Tier System (Week 16-17)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 7.1 | Offscreen room screenshot capture | `lib/ai/renderRoom.ts` | PNG of room from best angle |
| 7.2 | Construct per-room render prompt from brief | `lib/ai/renderPrompt.ts` | Prompt describes room accurately |
| 7.3 | Gemini Imagen API integration | `lib/ai/gemini.ts` | API returns image |
| 7.4 | Camera presets per room type (auto angles) | `lib/render/cameraPresets.ts` | 2-3 auto angles per room type |
| 7.5 | Sample render API route (`/api/render/sample`) | `app/api/render/sample/route.ts` | 1 room rendered, tier=sample |
| 7.6 | Final render API route (`/api/render/final`) | `app/api/render/final/route.ts` | Batch render all rooms at selected angles |
| 7.7 | Sample render UI (room picker + review + tweak) | `components/renders/SampleRender.tsx` | Pick room → see result → tweak prompt |
| 7.8 | Top-down camera angle picker (click floor plan → drag direction) | `components/renders/CameraAnglePicker.tsx` | User clicks 2D floor plan, drags direction, system computes eye-level 3D camera |
| 7.9 | Angle selection for final render | `components/renders/AngleSelector.tsx` | Checkbox grid per room |
| 7.10 | Render progress bar + sequential queue | `components/renders/RenderProgress.tsx` | "Rendering Room 3 of 6" |
| 7.11 | Render gallery with room tabs + angle toggle | `components/renders/RenderGallery.tsx` | Tab per room, toggle angles |
| 7.12 | Stale render detection + "Regenerate" badge | `lib/renders/staleDetection.ts` | Renders marked stale when brief/furniture changes |
| 7.13 | Before/after slider | `components/renders/BeforeAfterSlider.tsx` | Slide between empty and styled |
| 7.14 | Breadcrumb navigation + state preservation | `components/layout/StudioBreadcrumb.tsx` | Click breadcrumb → state preserved |

**Checkpoint:** 3-tier render flow works: Preview (viewport) → Sample (1 room, iterate) → Final (all rooms, selected angles, batch progress).

---

### Phase 8 — User Features & Polish (Week 18-19)

| # | Task | Verification |
|---|------|-------------|
| 7.1 | Landing page (hero + CTA + feature tour) | Professional first impression |
| 7.2 | User project dashboard | Shows saved projects, create new |
| 7.3 | Project save/restore (full state) | Revisit → exact state restored |
| 7.4 | BTO discovery page (browse projects) | Searchable, filterable |
| 7.5 | Shareable render page with before/after | Public URL, no login needed |
| 7.6 | Mobile responsive: viewport | 3D controls work on phone |
| 7.7 | Mobile responsive: chat | Bottom sheet on mobile |
| 7.8 | Mobile responsive: gallery | Single-column responsive |
| 7.9 | Performance audit + Lighthouse | Score ≥ 85 |
| 7.10 | Error boundaries + error states | All errors show friendly messages |

---

## 3. Key Dependencies

| Depends On | Phase | Why |
|------------|-------|-----|
| R2 bucket setup | Phase 0 | All file operations need storage |
| Prisma schema finalized | Phase 0 | All CRUD operations depend on it |
| BTO projects in DB | Phase 1 → Phase 2 | 3D model needs wall + room data |
| Admin walls + rooms saved | Phase 1 → Phase 4 | Floor plan editor needs wall segment geometry |
| 3D engine working | Phase 2 → Phase 4 | Live preview needs working wall-segment mesher |
| Template + rooms saved | Phase 2 → Phase 3 | Chat needs room list from template |
| AI consultant working | Phase 3 → Phase 5 | Furniture needs style from brief |
| Wall edits applied | Phase 4 → Phase 3+ | AI consultant receives the edited layout |
| Brief finalized | Phase 3 → Phase 6 | Export includes styled model |
| Brief + furniture placed | Phase 5 → Phase 7 | Render needs both |

---

## 4. Phased Rollout Strategy

```
Week 1-4:    Admin can create BTO projects → You seed initial library
Week 5-6:    3D model works → Internal demo
Week 7-9:    AI consultant works → Dogfood with friends
Week 10-11:  Floor plan editor works → Users can modify layouts
Week 12-14:  Furniture templates + drag-to-place → Closer to real product
Week 15:     SketchUp cycle → Power user workflow verified
Week 16-17:  Renders work → First "wow" moment
Week 18-19:  Polish → Beta launch
```

---

## 5. Testing Strategy

| Level | Scope | Tool | Who |
|-------|-------|------|-----|
| **TypeScript** | Types compile | `tsc --noEmit` | Pre-commit |
| **Unit** | Mesh gen, export/import, AI prompt builders | Vitest | Per feature |
| **Integration** | API routes, Prisma queries, R2 upload | Vitest + MSW | Per phase |
| **AI testing** | Chat responses, render quality | Manual + prompt eval | Phase 3+ |
| **E2E** | Full user flow (smoke test) | Playwright | Pre-launch |
| **Manual** | SketchUp export/import, render quality | Human | Each phase |

---

## 6. Prerequisites Checklist

- [ ] GitHub repo: `wong-johnathan/interior-design` ✅
- [ ] Vercel account connected to GitHub
- [ ] Supabase Postgres database (free tier → Pro at scale)
- [ ] Cloudflare R2 bucket + access keys
- [ ] Google Cloud project with Gemini API enabled
- [ ] Gemini API key (with Imagen access)
- [ ] Google OAuth client ID (for NextAuth)
- [ ] Sample HDB floor plans from **2025+ BTO projects** (Verandah Kallang, Queenstown, etc.)
- [ ] Sample 3D furniture models (GLB format)

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini returns poor render quality | Medium | High — renders don't wow | Iterate prompt engineering; fall back to SD |
| AI consultant generates bad brief JSON | Medium | Medium — chat breaks | Retry with "fix your format"; parse fallback |
| Three.js CSG fails on complex layouts | Low | Medium — wall gaps wrong | Use simpler cutout (wall panels with gaps) |
| SketchUp Collada import fails | Low | High — export cycle broken | Test with SketchUp Pro; OBJ as fallback |
| WebGL unsupported on device | Medium | High — 3D doesn't work | Show 2D floor plan + fallback message |
| Furniture templates wrong size for room | Medium | Low — visual but fixable | Auto-scale to 90% room dimensions |
| User overwhelmed by open-ended chat | Medium | Low — churn risk | AI always offers choices; never blank "what do you want?" |
