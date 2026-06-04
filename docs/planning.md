# Implementation Plan

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v3.0 |
| **Date** | 2026-06-04 |
| **Author** | Johnathan Wong |
| **Previous** | v2.0 (Next.js monolith plan) |
| **Estimated Timeline** | 16 weeks (single dev) |

---

## 1. Phases

The core pipeline is: **BTO selection → 2D floor plan editor → room labelling → AI consultant → renders**. The 2D editor is the primary canvas; 3D rendering is the final output.

| Phase | Weeks | Focus |
|-------|-------|-------|
| 0 | 1 | Project scaffold + infrastructure ✅ |
| 1 | 2-4 | Admin panel + BTO template system (wall segments) |
| 2 | 5-7 | 2D floor plan editor (shape library + wall editing) |
| 3 | 8-9 | Room demarking + labelling |
| 4 | 10-12 | AI design consultant (chat + per-room brief) |
| 5 | 13-15 | Photorealistic rendering (Gemini Imagen, sample + batch) |
| 6 | 16-17 | Gallery, share links, breadcrumb navigation |
| 7 | 18-19 | Polish, mobile responsiveness, error states |

---

## 2. Phase Details

### Phase 0 — Project Scaffold (Week 1) ✅ Done

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 0.1 | ~~Create Next.js app~~ → Vite + React 19 + TypeScript scaffold | `frontend/package.json`, `vite.config.ts` | `npm run dev` starts ✅ |
| 0.2 | Express + TypeScript backend scaffold | `backend/package.json`, `backend/src/index.ts` | `npm run dev` starts ✅ |
| 0.3 | Docker Compose dev config (frontend, backend, Postgres, Redis) | `docker-compose.dev.yml` | `docker compose up` all green ✅ |
| 0.4 | Install frontend deps: R3F, drei, zustand, react-konva, shadcn/ui, prisma client, TanStack Query | `frontend/package.json` | All imports resolve |
| 0.5 | Init shadcn/ui + Tailwind CSS v4 | `frontend/src/components/ui/` | Components render on test page |
| 0.6 | Set up Prisma schema + local Postgres | `backend/prisma/schema.prisma`, `.env.dev` | `prisma db push` succeeds |
| 0.7 | Set up Cloudflare R2 bucket + CORS | `.env.dev` (R2 keys) | Test upload via signed URL |
| 0.8 | Create all page stubs (React Router routes) | `frontend/src/pages/` | Routes render "Coming Soon" |
| 0.9 | Create all Express route stubs | `backend/src/routes/` | Routes return `{ status: "ok" }` |

---

### Phase 1 — Admin Panel & BTO Template System (Week 2-3)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 1.1 | Google OAuth flow in Express + JWT issuance + admin role | `backend/src/routes/auth.ts` | Login with Google works, JWT returned |
| 1.2 | Auth guard middleware + admin role check | `backend/src/middleware/auth.ts` | Protected routes reject missing/invalid JWTs |
| 1.3 | BTO project CRUD (backend routes + frontend admin pages) | `backend/src/routes/bto.ts`, `frontend/src/pages/admin/` | Create, list, edit BTO projects |
| 1.4 | Flat model CRUD (within BTO project) | `backend/src/routes/models.ts` | Add 4-room/5-room variants |
| 1.5 | Floor plan upload → R2 → preview | `backend/src/routes/upload.ts` | Image uploads, preview renders |
| 1.6 | Wall annotation canvas (react-konva) | `frontend/src/components/admin/WallAnnotationCanvas.tsx` | Draw wall segments on floor plan |
| 1.7 | Auto room detection from wall enclosures | `frontend/src/lib/mesh/roomDetection.ts` | System computes rooms from wall loops |
| 1.8 | Room property panel (type, label, materials) | `frontend/src/components/admin/RoomPropertyPanel.tsx` | Label auto-detected rooms |
| 1.9 | Wall property panel (load-bearing, wall type) | `frontend/src/components/admin/WallPropertyPanel.tsx` | Mark load-bearing, external/party/internal |
| 1.10 | Door/window placement on walls | `frontend/src/components/admin/DoorWindowPlacement.tsx` | Markers on wall segments |
| 1.11 | Save + publish BTO project with all walls + rooms | Backend routes + Prisma | Published projects visible to users |

**Checkpoint:** Admin can add a BTO project, upload floor plan, annotate rooms, publish.

---

### Phase 2 — 2D Floor Plan Editor (Week 5-7)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 2.1 | react-konva canvas setup + layer structure (grid, walls, shapes, labels) | `frontend/src/components/editor/FloorPlanCanvas.tsx` | Empty canvas renders with grid |
| 2.2 | Load wall segments from flat model + render as Konva shapes | `frontend/src/components/editor/WallLayer.tsx` | Template walls visible on canvas |
| 2.3 | Structural wall visual style (hatched, non-selectable for delete) | `frontend/src/components/editor/StructuralWallMarker.tsx` | Structural walls look distinct |
| 2.4 | Wall select + properties panel (type, length) | `frontend/src/components/editor/EditorPropertiesPanel.tsx` | Click wall → panel shows details |
| 2.5 | Wall resize by dragging endpoints | `frontend/src/components/editor/WallLayer.tsx` | Drag wall endpoint → wall resizes |
| 2.6 | Add wall tool (click start → click end) | `frontend/src/components/editor/EditorToolbar.tsx` | New wall segment drawn |
| 2.7 | Delete non-structural wall | Wall delete in canvas | Selected wall removed on Delete key |
| 2.8 | Door/window: move along parent wall | `frontend/src/components/editor/PlacedShape.tsx` | Drag door → stays on wall |
| 2.9 | Shape library sidebar (categorised shapes) | `frontend/src/components/editor/ShapeLibrarySidebar.tsx` | All categories visible, shapes draggable |
| 2.10 | Drag shape from library → place on canvas with snap | `frontend/src/lib/editor/snapping.ts` | Shape snaps to grid on drop |
| 2.11 | Move placed shape | Konva draggable | Shape moves to new position |
| 2.12 | Rotate placed shape (handle + 90° button) | `frontend/src/components/editor/PlacedShape.tsx` | Shape rotates correctly |
| 2.13 | Delete placed shape | Right-click → Remove / Delete key | Shape removed from canvas |
| 2.14 | Snap-to-wall for shapes (within 20cm → flush) | `frontend/src/lib/editor/snapping.ts` | Bed shape snaps against wall |
| 2.15 | Undo/redo (100 step history, Ctrl+Z / Ctrl+Y) | `frontend/src/lib/editor/history.ts` | Every action reversible |
| 2.16 | Reset to template | Reset button + confirmation | Canvas returns to admin template state |
| 2.17 | Save canvas state to backend | `PUT /projects/:id/canvas` | State persists across page refresh |

**Checkpoint:** User can load an admin template, drag furniture shapes, edit walls, and save their 2D floor plan.

---

### Phase 3 — Room Demarking & Labelling (Week 8-9)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 3.1 | Room demarking screen — show floor plan with enclosed areas highlighted | `frontend/src/components/demarking/RoomDemarcation.tsx` | Unlabelled areas shown with amber border |
| 3.2 | Area detection: compute enclosed polygons from wall segments | `frontend/src/lib/editor/areaDetection.ts` | System finds all enclosed rooms from wall graph |
| 3.3 | Tap/click area → label picker (quick chips + free text) | `frontend/src/components/demarking/LabelPicker.tsx` | Click area → picker appears |
| 3.4 | System suggests label based on area + shape heuristics | `frontend/src/lib/editor/labelSuggestion.ts` | Small square area → suggests "Toilet" |
| 3.5 | Duplicate label guard ("Toilet 2?" auto-suggestion) | Label state in Zustand | Can't have two identical labels |
| 3.6 | Progress indicator (N of M areas labelled) | Progress bar in demarking screen | Counter updates as areas get labelled |
| 3.7 | [Done] gated until all areas labelled | Button disabled state | Can't proceed with unlabelled areas |
| 3.8 | Save room labels to backend | `PUT /projects/:id/labels` | Labels persist; AI can use them as context |

**Checkpoint:** All enclosed areas have user-assigned names; labels saved and ready for AI consultant.

---

### Phase 4 — AI Design Consultant (Week 10-12)

*Allow extra time for prompt engineering and brief quality.*

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 4.1 | Chat UI component + message bubbles | `frontend/src/components/consultant/ChatPanel.tsx` | Send message, receive reply |
| 4.2 | Room brief summary sidebar (per-label status) | `frontend/src/components/consultant/RoomBriefSummary.tsx` | Shows each room label + current style |
| 4.3 | Mode toggle: "Overall vibe" vs "Room by room" | `frontend/src/components/consultant/ModeToggle.tsx` | Toggle changes AI conversation strategy |
| 4.4 | SSE streaming for typing effect | `backend/src/routes/ai.ts` | Text streams character by character |
| 4.5 | Gemini 2.5 Pro integration | `backend/src/lib/ai/consultant.ts` | API responds with JSON |
| 4.6 | Design Brief schema (keyed by room label) | `frontend/src/types/designBrief.ts` + backend | Brief parses correctly with any label name |
| 4.7 | System prompt: inject user's room labels as context | `backend/src/lib/ai/prompts/consultant.ts` | AI references "Master Bedroom", not "mbr" |
| 4.8 | Per-label brief tracking | AI system prompt + DB save after each turn | Room A brief ≠ Room B brief |
| 4.9 | Brief diff → room summary panel update | Frontend Zustand store | Panel animates when AI updates a room |
| 4.10 | "I'm happy" button (active when all labels have a style) | Chat UI | Button enables; AI summarises full brief |
| 4.11 | Chat history persistence | Save via backend to DB | Refresh → chat resumes where it left off |
| 4.12 | Edge case: bad AI JSON → retry | Retry logic + fallback | AI recovers; fallback to style preset picker |

**Checkpoint:** User chats with AI, brief accumulates per labelled room, proceeds to renders.

---

### Phase 5 — Photorealistic Rendering (Week 13-15)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 5.1 | FurnitureTemplate Prisma model | `backend/prisma/schema.prisma` | DB table created |
| 5.2 | Admin: furniture template CRUD | `backend/src/routes/furniture.ts` + admin pages | Create template with furniture list |
| 5.3 | Admin: upload 3D furniture models (GLB) to R2 | `backend/src/routes/upload.ts` | Furniture files stored |
| 5.4 | Template matching engine (roomType + styleTag) | `frontend/src/lib/furniture/matcher.ts` | Returns correct template |
| 5.5 | Furniture placement logic (scale + anchor) | `frontend/src/lib/furniture/placer.ts` | Sofa against wall, bed centered |
| 5.6 | Furniture 3D component (load GLB, position) | `frontend/src/components/viewport/Furniture.tsx` | Furniture visible in scene |
| 5.7 | Furniture selector UI | `frontend/src/components/furniture/FurnitureSelector.tsx` | Shows matching templates |
| 5.8 | Accept/reject per item | `frontend/src/components/furniture/PlacementToggle.tsx` | Toggle individual furniture pieces |
| 5.9 | Seed templates: 6 room×style combinations | Data file / DB seed | Templates available |
| 5.10 | DragControls integration (LAVU-style) | `frontend/src/components/viewport/DraggableFurniture.tsx` | Furniture items are pickable and draggable |
| 5.11 | Ground plane raycast for drag | `frontend/src/lib/furniture/raycaster.ts` | Items stay on floor (Y=0) during drag |
| 5.12 | Snap-to-grid system (25cm) | `frontend/src/lib/furniture/snapping.ts` | Furniture snaps on release |
| 5.13 | Wall snap detection | `frontend/src/lib/furniture/wallSnap.ts` | Within 20cm → snaps to 15cm gap |
| 5.14 | Collision detection (AABB) | `frontend/src/lib/furniture/collision.ts` | Red ghost when overlapping |
| 5.15 | Ghost preview during drag | `frontend/src/components/viewport/DragGhost.tsx` | Transparent ghost follows cursor |
| 5.1 | Export canvas region for a room label as PNG | `backend/src/lib/render/canvasExport.ts` | Backend exports PNG of a specific room area |
| 5.2 | Build render prompt from DesignBrief[roomLabel] | `backend/src/lib/ai/renderPrompt.ts` | Prompt accurately describes room style |
| 5.3 | Gemini Imagen API integration | `backend/src/lib/ai/gemini.ts` | API returns image URL |
| 5.4 | Sample render route (`POST /render/sample`) | `backend/src/routes/render.ts` | 1 room renders, stored in R2 |
| 5.5 | Sample render UI (room picker → generated image → tweak) | `frontend/src/components/renders/SampleRender.tsx` | Pick room → see result → regenerate if needed |
| 5.6 | Final render route (`POST /render/final`) + SSE progress | `backend/src/routes/render.ts` | Batch renders all rooms; progress events fire |
| 5.7 | Render progress UI (checklist + progress bar) | `frontend/src/components/renders/RenderProgress.tsx` | "Rendering Room 3 of 6" live |
| 5.8 | Render gallery (tabs by room label + image grid) | `frontend/src/components/renders/RenderGallery.tsx` | Each room tab shows its renders |
| 5.9 | Before/after slider (empty floor plan vs. rendered) | `frontend/src/components/renders/BeforeAfterSlider.tsx` | Slider works on desktop + mobile |
| 5.10 | Stale render detection (brief/canvas changes → badge) | `frontend/src/lib/render/staleDetection.ts` | Renders marked stale when brief or canvas changes |

**Checkpoint:** Sample → approve → batch render all rooms → gallery populated.

---

### Phase 6 — Gallery, Share & Breadcrumb (Week 16-17)

| # | Task | Key Files | Verification |
|---|------|-----------|-------------|
| 6.1 | Breadcrumb navigation (Floor Plan > Labels > Brief > Renders) | `frontend/src/components/layout/StudioBreadcrumb.tsx` | Click completed step → state preserved |
| 6.2 | Download HD render | Render gallery download button | Downloads full-res PNG from R2 |
| 6.3 | Shareable public render page (no login) | `frontend/src/pages/SharePage.tsx` | Public URL shows gallery with before/after |
| 6.4 | User project dashboard (list saved projects) | `frontend/src/pages/DashboardPage.tsx` | Shows all projects; click to resume |
| 6.5 | Project save/restore (full canvas + labels + brief + renders) | `GET /projects/:id` | Revisit project → exact state restored |

**Checkpoint:** Full project can be saved, resumed, and shared.

---

### Phase 7 — Polish & Mobile (Week 18-19)

| # | Task | Verification |
|---|------|-------------|
| 7.1 | Landing page (hero + CTA) | Professional first impression |
| 7.2 | Mobile responsive: editor (shape library as bottom drawer, pinch zoom) | Editor usable on phone |
| 7.3 | Mobile responsive: chat (bottom sheet) | Chat works on phone |
| 7.4 | Mobile responsive: gallery (single-column) | Renders viewable on phone |
| 7.5 | Error boundaries + friendly error states for all screens | All errors show helpful messages |
| 7.6 | Performance audit + Lighthouse | Score ≥ 85 |
| 7.7 | Accessibility: keyboard nav, ARIA labels, focus rings | Screen reader + keyboard usable |

---

## 3. Key Dependencies

| Depends On | Phase | Why |
|------------|-------|-----|
| R2 bucket + Prisma schema | Phase 0 | All file + DB operations depend on these |
| BTO projects in DB | Phase 1 → Phase 2 | Editor needs admin wall segments to load |
| Admin walls in DB | Phase 1 → Phase 2 | Canvas pre-loads admin template |
| Canvas save working | Phase 2 → Phase 3 | Labelling needs saved wall geometry for area detection |
| Room labels saved | Phase 3 → Phase 4 | AI consultant uses labels as context |
| Design brief complete | Phase 4 → Phase 5 | Render prompts built from brief |
| Sample approved | Phase 5 | Final batch render only after sample approval |

---

## 4. Phased Rollout Strategy

```
Week 1:      Scaffold done → Docker Compose runs all services locally ✅
Week 2-4:    Admin can create BTO projects → Seed initial library
Week 5-7:    2D editor works → Internal demo (drag shapes, edit walls)
Week 8-9:    Room labelling works → Complete flow to AI consultant
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

- [x] GitHub repo: `wong-johnathan/interior-design`
- [x] Docker Compose dev environment (frontend + backend + Postgres + Redis)
- [ ] Cloudflare R2 bucket + access keys
- [ ] Google Cloud project with Gemini API enabled
- [ ] Gemini API key (with Imagen access)
- [ ] Google OAuth client ID (for backend auth flow)
- [ ] 2D shape SVG/PNG assets for shape library (beds, sofas, toilets, etc.) — needed for Phase 2
- [ ] HDB floor plans — separate phase, not a blocker for MVP

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini returns poor render quality | Medium | High — renders don't wow | Iterate prompt engineering; include canvas crop as visual context |
| 2D canvas crop loses room context | Medium | Medium — renders look wrong | Crop with padding; include room label in prompt header |
| AI consultant generates bad brief JSON | Medium | Medium — chat breaks | Retry with "fix your format"; fallback to style preset picker |
| Area detection misses rooms | Medium | Medium — labelling step broken | Fallback: user draws room boundaries manually |
| react-konva performance on large layouts | Low | Medium — editor feels sluggish | Layer management + offscreen rendering for static elements |
| User overwhelmed by open-ended chat | Medium | Low — churn risk | AI always offers 2-3 choices; never open-ended "what do you want?" |
| Shape assets missing for some furniture types | Low | Low — visual gap | Show placeholder outline shape; add assets incrementally |
