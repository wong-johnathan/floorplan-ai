# User Experience Guide

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v2.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |

---

## 1. User Journey Map

```
┌────────────┐     ┌────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Sign Up    │ ──► │  BTO/Buy   │ ──► │  Edit Floor      │ ──► │  3D Model    │ ──► │  AI Design  │ ──► │  Furnish or  │ ──► │  Sample      │ ──► │  Final       │ ──► │  Gallery &  │
│  (OAuth)    │     │  Project   │     │  Plan (opt)      │     │  Preview    │     │  Consultant │     │  Export      │     │  Render      │     │  Render      │     │  Share      │
└────────────┘     └────────────┘     └──────────────────┘     └──────────────┘     └────────────┘     └─────────────┘     └─────────────┘     └──────────────┘     └──────────────┘
                        │                   │                       │                   │                   │                   │                    │
                    Search BTO         Decide: edit layout      See 3D model        Chat about          Pick furniture      1 room sample          All rooms,       View rendered
                    by project name    or skip to default?      from edited (or      style per room       template or          via Gemini            selected angles   gallery with
                        │             Always has skip            default) walls       │  export to       Imagen                batch render         angle toggle
                        ▼             button                    │              SketchUp ▼               │                       ▼                  ▼
                   Select flat         ┌──────────────────┐  Orbit / zoom /         │           ┌────────────────┐  Progress bar:           Download HD
                   type (4/5 rm)       │ 2D Floor Plan    │  walkthrough          AI asks Qs,  │ Template places │  "3 of 6 rooms"          share link
                        │             │ Wall segments     │  Real-time             user answers │ furniture in   │           │        before/after slider
                    Floor plan         │ Select/Draw/     │  material preview      brief builds  │ correct spots   │  Renders appear     │
                    preview            │ Delete wall      │  from brief changes    per room      │ per edited      │  in gallery     Shareable
                        │             │ Rooms auto-merge/│         │              │ rooms           │         │          public page
                   Ready to           │ split on edit    │         ▼              ▼           OR user exports     │              │
                   start styling?    │ Structural walls │   User says "I'm     Room labels     to SketchUp,       │         Go back to edit
                                      │ highlighted        │   happy!" → Brief   match edited   edits, re-import   │         any step
                        │             │ Live 3D preview  │         │           layout            │          via breadcrumb
                        ▼             │ Undo/Redo       │         ▼               ▼                   ▼
                   [Start Designing]  │ Reset to orig.  │   Brief finalized    Furniture           Gallery
                   → Skip to 3D       │ [Apply Changes] │                      placed              renders
                   [Edit Layout]      └──────────────────┘
                   → Enter editor
```

---

## 2. Screens & States

### Screen 1: Landing Page

| State | What User Sees |
|-------|---------------|
| **Default** | Hero: "Design your dream HDB home in minutes" + "Get Started" button |
| **Logged out** | "Sign in with Google" CTA |
| **Logged in** | "Continue to your projects" or "Start a new design" |

**Mobile:** Single column, hero image full-width, CTA prominent at bottom.

---

### Screen 2: BTO Project Discovery

| UI Element | Description |
|------------|-------------|
| **Search bar** | "Search your BTO project name..." with autocomplete |
| **Filter chips** | By year (2024, 2025, 2026), by location (Kallang, Queenstown, Jurong) |
| **Project cards** | Image thumbnail, project name, location, year, "N models available" badge |
| **Empty state** | "Can't find your project? Check back soon — we add new BTOs regularly" |
| **CTA** | Click card → expand to show available flat models |

**States:**

| State | Message |
|-------|---------|
| **Loading** | Skeleton cards × 4 |
| **No results** | "No BTO projects match your search. Try a different location or check back soon." |
| **Error** | "Couldn't load BTO projects. Check your connection and try again." |
| **Success** | Grid of project cards |

**Mobile:** Stacked cards, search at top, filter as horizontal scroll chips.

---

### Screen 3: Flat Model Selector

```
┌────────────────────────────────────────────────────┐
│  ← Back to projects                  Verandah Kallang 2024  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Floor Plan Preview (image)                         │    │
│  │                                                      │    │
│  │         [Living] [MBR] [Bed2] [Kitchen]              │    │
│  │         Room labels overlaid on floor plan           │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  Available Models:                                            │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ 4-Room Model A│  │ 4-Room Model B│                         │
│  │ 90 sqm       │  │ 92 sqm       │                           │
│  │ 3 bedrooms   │  │ 3 bedrooms   │                           │
│  │ Selected ████ │  │              │                           │
│  └──────────────┘  └──────────────┘                           │
│                                                               │
│  [Start Designing →]                                          │
└────────────────────────────────────────────────────────────────┘
```

**Key UX rule:** The user should be able to see the floor plan layout at a glance, with room labels clearly marked. This is their "ah, that's my flat" moment.

The flat model selector also presents two CTAs:
- **[Start Designing]** → skips floor plan editor, uses default layout
- **[Edit Layout First]** → enters the floor plan editor (Screen 4)

---

### Screen 4: Floor Plan Editor (Optional)

Shown after user selects a flat model. Two CTAs: "Start Designing" (skip — use default layout) and "Edit Layout" (enter editor).

```
┌────────────────────────────────────────────────────────────┐
│  ✏️ Edit Your Floor Plan         Verandah 4-Room Model A   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┬──────────────────────────────────────┐   │
│  │  Tools       │  2D Floor Plan Canvas                 │   │
│  │              │                                        │   │
│  │  🔍 Select   │   ┌───────┬──────────┐                │   │
│  │  📐 Draw     │   │       │          │                │   │
│  │  ❌ Delete   │   │Living │   MBR    │                │   │
│  │              │   │       │          │                │   │
│  │  🧱 Load-    │   ├───────┤──────────┤                │   │
│  │  bearing     │   │       │  Bed 2   │                │   │
│  │  (cannot     │   │Kitch  │          │                │   │
│  │   delete)    │   └───────┴──────────┘                │   │
│  │              │                                        │   │
│  │  Grid snap   │   Wall selected: Wall 3 (Living-MBR)  │   │
│  │  on          │   Type: Internal   Load-bearing: No   │   │
│  │  [25cm]      │   Length: 4.0m     [Delete Wall]      │   │
│  │              │                                        │   │
│  │  [↩ Undo]    ├────────────────────────────────────────┤   │
│  │  [↪ Redo]    │  🏠 Live 3D Preview                    │   │
│  │  [Reset]     │  ┌────────────────────────────────┐    │   │
│  │              │  │  Viewport shows current wall    │    │   │
│  │              │  │  state in real-time             │    │   │
│  │              │  └────────────────────────────────┘    │   │
│  └──────────────┴────────────────────────────────────────┘   │
│                                                             │
│           [Use Default Layout → Skip]                       │
│           [Apply Changes → Start Designing]                 │
└────────────────────────────────────────────────────────────┘
```

**States:**

| State | Message |
|-------|---------|
| **Default (no edits)** | "Your flat is ready. Make changes or start designing." |
| **Wall selected** | Wall highlighted in accent color; properties shown in panel |
| **Wall deleted (merge)** | Confirmation: "Merge Living Room and Bedroom 2? [Merge] [Cancel]" |
| **Wall drawn (split)** | "Name the new rooms: [________] [________] [Done]" |
| **Invalid edit** | "This wall cannot be deleted (load-bearing)" or "Room must be fully enclosed" |
| **Structural wall hovered** | Tooltip: "🧱 Load-bearing wall — cannot be removed" |
| **Editing in progress** | "Apply Changes" button active; Undo/Redo available |
| **Reset to original** | "Reset all edits? This cannot be undone. [Reset] [Cancel]" |
| **Mobile** | Simplified view — tools as bottom bar, canvas full-width, 3D preview hidden |

---

### Screen 5: 3D Studio (Main Design Screen)

This is the **core screen** where most time is spent. It has a 3-panel layout on desktop:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Studio Header: Project name | Save | Room selector dropdown | ...  │
├────────────────┬─────────────────────────────────────────────────────┤
│                │                                                      │
│  CHAT PANEL    │              3D VIEWPORT                              │
│  (collapsible) │                                                       │
│                │                                                       │
│  ┌──────────┐  │       ┌─────────────────────────────────┐            │
│  │ AI: "I   │  │       │  [🧑‍🦱 Orbit Controls]            │            │
│  │ love the │  │       │                                 │            │
│  │ Scandi   │  │       │    🏠 Building in 3D             │            │
│  │ look!    │  │       │                                 │            │
│  │ Light    │  │       │   [Living]   [MBR]              │            │
│  │ oak or   │  │       │   ┌────┐    ┌────┐              │            │
│  │ dark     │  │       │   │    │    │    │              │            │
│  │ walnut?  │  │       │   └────┘    └────┘              │            │
│  └──────────┘  │       │                                 │            │
│                │       │   [Kitchen]                     │            │
│  ┌──────────┐  │       │                                 │            │
│  │ You:     │  │       └─────────────────────────────────┘            │
│  │ "Light   │  │                                                       │
│  │ oak,     │  │  ┌──────────────────────────────────────────┐        │
│  │ but      │  │  │  DESIGN BRIEF SUMMARY                      │        │
│  │ kitchen  │  │  │  Living: Japandi 🌿  Kitchen: Vintage 🪴   │        │
│  │ green"   │  │  │  MBR: Japandi        Bed 2: Kid/Colorful  │        │
│  └──────────┘  │  └──────────────────────────────────────────┘        │
│                │                                                       │
│  [Input...]    │  [Auto-Furnish] [Export] [Render] [Gallery]          │
├────────────────┴─────────────────────────────────────────────────────┤
│  Action Bar: Chat (expand) | Furnish | Export | Render | Gallery     │
└──────────────────────────────────────────────────────────────────────┘
```

**Mobile Layout:**

```
┌─────────────────────────────────────┐
│  Studio Header                      │
├─────────────────────────────────────┤
│                                     │
│   3D VIEWPORT (full width)          │
│                                     │
│  [Orbit Controls — floating]        │
│                                     │
├─────────────────────────────────────┤
│  Design Summary (collapsed bar)     │
│  Living: Japandi | Kitchen: Vintage │
├─────────────────────────────────────┤
│  [💬 Chat] [🪑 Furnish] [📷 Render] │
└─────────────────────────────────────┘
 → Chat opens as bottom sheet overlay
 → Tap room on 3D → camera snaps to it
```

**States:**

| State | Message |
|-------|---------|
| **Loading 3D** | "Generating your BTO flat..." spinner |
| **3D Ready** | Full interactive model visible |
| **Chat waiting** | AI consultant typing indicator |
| **Brief updating** | Brief summary panel animates change |
| **Furniture placing** | "Furnishing rooms with [Style] templates..." |
| **Exporting** | Progress bar + "Preparing your SketchUp file..." |
| **Rendering** | "AI is creating your photorealistic render (~10s)" |

---

### Screen 6: AI Consultant Chat

**Visual design principles:**

- Chat bubbles: AI is left-aligned with avatar (interior designer icon), user is right-aligned
- AI messages always end with a question (2-3 choices max)
- When the AI updates the design brief, a small animated preview shows the material change in the 3D viewport
- "I'm happy" button appears once at least all rooms have a minimal style defined

**Example conversation:**

```
┌─ AI ─────────────────────────────────────┐
│  Welcome! Let's design your Verandah     │
│  Kallang 4-Room flat. What overall       │
│  vibe are you going for?                 │
│                                          │
│  [🌿 Japandi] [🏭 Industrial] [❄️ Minimalist] │
│  [🌊 Coastal] [🪴 Describe yourself...] │
└──────────────────────────────────────────┘

┌─ You ────────────────────────────────────┐
│ I want Japandi overall, but the kitchen  │
│ should be vintage green tiles            │
└──────────────────────────────────────────┘
    ↻ Brief updates in background
    ↻ Living room walls → warm white
    ↻ Brief summary flashes change

┌─ AI ─────────────────────────────────────┐
│  Great choices! I've set the main areas   │
│  to Japandi: light oak flooring, warm    │
│  white walls.                            │
│                                          │
│  For the kitchen with vintage green      │
│  tiles — should the cabinets be dark     │
│  wood or white?                          │
│                                          │
│  [Dark wood] [White] [Something else...] │
└──────────────────────────────────────────┘
```

**States:**

| State | What Happens |
|-------|-------------|
| **AI typing** | Animated dots in AI bubble |
| **Brief update** | 3D viewport material changes smoothly |
| **User idle > 30s** | AI suggests: "Would you like me to suggest some styles?" |
| **All rooms styled** | "I'm Happy!" button becomes active |
| **User says "I'm happy"** | AI summarizes full brief, shows final render preview prompts |

---

### Screen 7: Furniture Selection & Tweak Mode

Two modes: **Quick Apply** (AI places everything) or **Tweak Mode** (drag-to-place, LAVU-style).

#### Mode A: Quick Apply

```
┌────────────────────────────────────────────────┐
│  Furniture: Living Room                        │
│  Style: Japandi                                │
│                                                │
│  Recommended Template:                         │
│  ┌────────────────────────────────────────┐    │
│  │  Japandi Living Room Set                │    │
│  │  [Preview image of furniture in room]   │    │
│  │                                          │    │
│  │  ✅ Low wooden sofa                      │    │
│  │  ✅ Oval coffee table                    │    │
│  │  ✅ Tatami rug                           │    │
│  │  ✅ Floor lamp                           │    │
│  │  ✅ TV console                           │    │
│  │                                          │    │
│  │  [Apply & Continue]  [Tweak Mode ▼]     │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Alternative:                                  │
│  [Minimalist Living Set] [Export to SketchUp]  │
└────────────────────────────────────────────────┘
```

#### Mode B: Tweak Mode (Drag-to-Place)

When user enters Tweak Mode, the 3D viewport transforms:

```
┌───────────────────────────────────────────────────────────────┐
│  [Done Tweaking] [Undo] [Redo] [Reset]          Living Room   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│            ┌──────────────────────┐                           │
│            │          Wall snap ──│─── [15cm ✅]             │
│            │     🛋️               │                           │
│            │    Sofa  ← dragging  │  💡 Floor Lamp           │
│            │                      │                           │
│            │         ┌──────┐     │                           │
│            │         │ Table│     │  🪴 Plant                │
│            │         └──────┘     │                           │
│            └──────────────────────┘                           │
│                       ════ Grid overlay (25cm)                │
│                                                               │
│  Room dims: 5.2m × 4.8m                                      │
├───────────────────────────────────────────────────────────────┤
│  [🛋️ Catalog ➜]    Tap furniture to move. Drag handles.      │
└───────────────────────────────────────────────────────────────┘
```

**Interaction states:**

| Action | Visual Feedback |
|--------|----------------|
| **Hover over furniture** | Glow outline + cursor change to grab |
| **Start dragging** | Ghost preview (40% opacity) at current position; original stays as reference |
| **Snap preview** | Ghost snaps to nearest grid/wall position; green tint = valid, red = collision |
| **Drop in invalid position** | Furniture returns to original position; red flash |
| **Drop in valid position** | Furniture slides to snapped position; green checkmark toast |
| **Rotate** | Rotation ring appears; snap at 45° increments |
| **Long-press / right-click** | Context menu with: Swap, Remove, Rotate, Copy |

#### Furniture Catalog Panel

```
┌──────────────────────────────────────────────┐
│  🛋️ Furniture Catalog        🔍 Search...   │
│──────────────────────────────────────────────│
│                                              │
│  Seating   │  🛋️ 3-Seater Sofa     [4]     │
│            │  🛋️ Sectional Sofa    [2]     │
│  Tables    │  🛋️ Loveseat         [3]     │
│            │  🛋️ Chaise Lounge     [1]     │
│  Lighting  │────────────────────────────────│
│            │  Filter by style: [Japandi ▼]  │
│  Decor     │  Sort by: [Popularity ▼]       │
│            │                                │
│  Storage   │  Drag any item into the room   │
│            │  to place it!                  │
└──────────────────────────────────────────────┘
```

**Swap flow:**
1. Right-click sofa → "Swap Item"
2. Catalog panel opens filtered to Seating category
3. Click sectional sofa → preview in place (ghost)
4. Confirm → old sofa removed, new one appears
5. Fine-tune position by dragging

**Add new flow:**
1. Open catalog panel
2. Drag "Floor Lamp" from panel into 3D viewport
3. Ghost appears at cursor position on floor
4. Release to place; snap to nearest valid position

### Screen 8: Export Options

```
┌────────────────────────────────────────────┐
│  Export Your Model                          │
│                                             │
│  What to export:                            │
│  ○ Empty shell (walls only)                 │
│  ● With furniture (current design)          │
│  ○ With current materials only              │
│                                             │
│  Format:                                     │
│  ● Collada (.dae) — SketchUp Pro            │
│  ○ OBJ (.obj) — Universal                   │
│                                             │
│  [Download ↓]                               │
│                                             │
│  ┌─ Tips ────────────────────────────────┐  │
│  │  • Opens directly in SketchUp Pro     │  │
│  │  • Each room is a named group          │  │
│  │  • Furniture is separate group layer   │  │
│  │  • Don't rename or delete rooms        │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ┌─ Re-import ──────────────────────────┐   │
│  │  [Upload your edited .dae here]       │   │
│  │  Drag & drop or click to browse       │   │
│  │  - or -                               │   │
│  │  [Continue with current design]       │   │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

### Screen 9: Breadcrumb Navigation

Persistent across the entire studio, accessible at the top of every screen:

```
┌──────────────────────────────────────────────────────────┐
│  🏠 My Project                             [Save Draft]  │
│                                                           │
│  Design Brief  >  Floor Plan  >  Furniture  >  Renders                  │
│       ✓               ✓              ✓           ◉ (you are here)       │
│                                                           │
│  ═══════════════════════════════════════════════════════  │
│                                                           │
│  (Click any breadcrumb to go back and edit)               │
│  → Brief: chat re-opens, furniture gets "update?" prompt  │
│  → Furniture: tweak mode re-activates                     │
│  → Renders: gallery (current view)                        │
│  → Changes mark existing renders as "stale"              │
└──────────────────────────────────────────────────────────┘
```

**State preservation across breadcrumbs:**

| Action | What happens |
|--------|-------------|
| Click **Design Brief** | Chat panel re-opens with full history. User can add more messages. Brief updates in real-time. Wall edits preserved. |
| Click **Floor Plan** | Floor plan editor re-opens with current wall edits. User can modify, then re-apply and proceed. Furniture gets: "Layout changed — reposition furniture?" |
| Click **Furniture** | Tweak mode reactivates. All previous furniture positions preserved. Stale renders get: "Out of date — regenerate?" badge. |
| Click **Renders** | Returns to gallery. Current state displayed. |
| Modify chat → new brief | Auto-furniture shows "Update" prompt. Manual furniture stays unless user chooses to re-apply. |
| Modify furniture | Existing renders marked stale with "Regenerate" button. |

---

### Screen 10: Sample Render (Tier 2)

The quality gate before committing to a full batch. Generates 1 image to validate the AI understands the user's style.

```
┌──────────────────────────────────────────────────────────────┐
│  ⬅️ Back to Studio           Breadcrumb: ⋯ > ⋯ > Sample    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Pick a room to sample                                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Which room should we render as a sample?             │    │
│  │                                                       │    │
│  │  ● Living Room (recommended — shows most detail)     │    │
│  │  ○ Master Bedroom                                     │    │
│  │  ○ Kitchen                                            │    │
│  │                                                       │    │
│  │  [Generate Sample (~$0.04)]                           │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  Step 2: Review your sample                                   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │  Living Room — Sample Render                          │    │
│  │  ┌──────────────────────────────────────────────┐    │    │
│  │  │                                                │    │    │
│  │  │         [AI-generated photorealistic           │    │    │
│  │  │          interior image]                       │    │    │
│  │  │                                                │    │    │
│  │  └──────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  │  Does this match your vision?                         │    │
│  │                                                       │    │
│  │  [Looks Great! → Final Render 🚀]                     │    │
│  │  [Tweak Prompt 🔄]                                    │    │
│  │                                                       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─ Tweak Prompt ───────────────────────────────────────┐    │
│  │  "Make the space warmer, add more plants,            │    │
│  │   and change the sofa to beige"                      │    │
│  │                                                       │    │
│  │  [🔄 Regenerate Sample]                               │    │
│  │  (Cost: ~$0.04 per regeneration. Current: 1 of 5)    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**States:**

| State | Message |
|-------|---------|
| **No sample yet** | "Generate a sample to preview how the AI will interpret your style." |
| **Generating** | Spinner + "AI is creating your preview render..." |
| **Sample ready** | "Does this match your vision?" prompt appears |
| **User says "Looks Great!"** | Transition to Final Render screen (Screen 10) |
| **User regenerates** | New sample generated; counter increments |
| **Max iterations reached (5)** | "You've regenerated 5 times. Would you like to proceed to final render or start fresh with a different style?" |

---

### Screen 11: Final Render Configuration & Gallery (Tier 3)

Triggered only after sample is approved. User selects angles per room, then batch-renders.

```
┌──────────────────────────────────────────────────────────────┐
│  ⬅️ Back to Sample     Breadcrumb: ⋯ > ⋯ > Final Render    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Final Render — Select Angles Per Room                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Living Room (Japandi)                                │    │
│  │  ☑ [Corner View]    ☑ [Entrance View]                │    │
│  │  ☐ [Window-side]                                      │    │
│  │                                                       │    │
│  │  Master Bedroom (Japandi)                             │    │
│  │  ☑ [Door View]       ☑ [Bedside View]                │    │
│  │                                                       │    │
│  │  Kitchen (Vintage)                                    │    │
│  │  ☑ [Entrance View]   ☑ [Counter Close-up]            │    │
│  │                                                       │    │
│  │  Bedroom 2 (Japandi)                                  │    │
│  │  ☑ [Door View]       ☐ [Custom + Add...]             │    │
│  │                                                       │    │
│  │  ─────────────────────────────────────────────        │    │
│  │  6 renders selected   Estimated cost: ~$0.24          │    │
│  │                                                       │    │
│  │  [🖼️ Generate All 6 Renders]    [← Back to Sample]   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─ Custom Camera Angle ────────────────────────────────┐    │
│  │  Add your own angle from the floor plan:             │    │
│  │                                                       │    │
│  │  → Click [📷 Add Camera Angle]                        │    │
│  │  → 2D floor plan overlay appears                      │    │
│  │  → Click anywhere inside a room (eye-level position) │    │
│  │  → Drag to set the viewing direction                 │    │
│  │  → Name it: "Kitchen Breakfast Bar"                  │    │
│  │  → System computes 3D camera coordinates             │    │
│  │  → Appears in the list above as "Custom +"           │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  Render Progress                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ■■■■■■■■■□□□□□□□□□  40%                            │    │
│  │  Rendering Room 3 of 6: Kitchen — Entrance View      │    │
│  │                                                       │    │
│  │  ✅ Living Room — Corner View                         │    │
│  │  ✅ Living Room — Entrance View                       │    │
│  │  ⏳ Kitchen — Entrance View    (currently rendering)  │    │
│  │  ⏳ Kitchen — Close-up        (queued)                │    │
│  │  ⏳ MBR — Door View            (queued)               │    │
│  │  ⏳ MBR — Bedside View         (queued)               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  Render Gallery (after completion)                            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  [Living Room] [MBR] [Kitchen] [Bed 2] [All ▼]      │    │
│  │                                                       │    │
│  │  ┌────────┐ ┌────────┐                               │    │
│  │  │Corner  │ │Entrance│                               │    │
│  │  │  View  │ │  View  │                               │    │
│  │  │        │ │        │                               │    │
│  │  │   🖼️   │ │   🖼️   │                               │    │
│  │  └────────┘ └────────┘                               │    │
│  │                                                       │    │
│  │  ┌─ Before/After Slider ──────────────────────────┐  │    │
│  │  │   Empty         Styled                          │  │    │
│  │  │   ┌──────┐  ◄──►  ┌──────┐                      │  │    │
│  │  │   └──────┘       └──────┘                      │  │    │
│  │  │                                                 │  │    │
│  │  │  [Download HD] [Share Link] [Regenerate Angle]  │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**States:**

| State | Message |
|-------|---------|
| **No renders yet** | "Approve the sample render first to proceed to final rendering." |
| **Rendering** | Progress bar + per-room status + ETA |
| **Render complete** | Gallery with room tabs + angle toggle |
| **Single angle failed** | "This view couldn't be rendered. Try adjusting the camera or regenerate." |
| **Batch completed** | Toast: "🎉 All 6 renders ready! View gallery." |
| **Renders stale** | "Design has changed since renders were generated. Regenerate?" badge plus per-angle Regenerate button |

---

### Screen 12: Studio Top Bar (Persistent Breadcrumb)

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                    Save    Share  ⋮     │
│                                                               │
│  🏠 Verandah Kallang 2024 — 4-Room Model A                   │
│                                                               │
│  Design Brief  >  Furniture  >  Renders                      │
│       ✓               ✓           ◉                           │
│                                                               │
│  (Each breadcrumb section is clickable. Active = ◉)           │
│  ✓ means that stage has been completed at least once.        │
│  Missing stage = dimmed until previous stage is done.        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Error States & Edge Cases

| Scenario | UX Response |
|----------|-------------|
| **BTO project not found** | "This BTO isn't in our library yet. Check back soon — we add new projects regularly." + "Notify me when added" button |
| **No matching furniture template** | "We don't have a furniture set for this combination yet. You can export to SketchUp and add your own." |
| **AI consultant stuck** | "I'm having trouble understanding. Could you rephrase?" After 3 retries: fallback to style preset picker |
| **Gemini render fails** | "Render failed. We've logged the issue. Try again with a simpler description." |
| **User refreshes mid-chat** | Chat history restored from DB; AI picks up where it left off |
| **WebGL not supported** | Fallback: 2D floor plan view with room colors; no 3D |
| **Wall edit invalid** | "This edit would leave a room unenclosed. Walls must form a closed loop." |
| **Structural wall deletion blocked** | "🧱 This is a load-bearing wall and cannot be removed. HDB approval is required for structural changes." |
| **Room below minimum size** | Warning (not blocking): "This room is quite small. Consider expanding it into the adjacent space." |
| **Orphan wall detected** | "This wall segment is not attached to any room. Add walls to form an enclosed space or delete it." |
| **SketchUp file too large** | "File too large (max 50MB). Try exporting fewer rooms at once." |
| **Re-imported file unrecognized** | "Couldn't read this file. Make sure it was exported from this system and hasn't been heavily modified." |
| **Mobile + 3D performance** | Show simplified model (lower polygon count); show "Performance mode" toggle |

---

## 4. Visual Design Guide

### Colour Palette

| Role | Colour | Hex |
|------|--------|-----|
| **Primary** | Warm teal | `#0D9488` (teal-600) |
| **Secondary** | Slate | `#475569` (slate-600) |
| **Accent** | Amber | `#D97706` (amber-600) |
| **Background** | White / slate-50 | `#FFFFFF` / `#F8FAFC` |
| **Surface** | White | `#FFFFFF` |
| **Text** | Slate-900 | `#0F172A` |
| **Muted** | Slate-500 | `#64748B` |
| **Success** | Emerald | `#059669` |
| **Error** | Red | `#DC2626` |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| **H1** | 3rem / 48px | Bold |
| **H2** | 1.875rem / 30px | Semibold |
| **H3** | 1.25rem / 20px | Semibold |
| **Body** | 0.938rem / 15px | Normal |
| **Small** | 0.813rem / 13px | Normal |
| **Button** | 0.938rem / 15px | Medium |

### Key UX Patterns

| Pattern | Implementation |
|---------|---------------|
| **Loading** | Skeleton screens over spinners |
| **Errors** | Inline error + toast notification + retry button |
| **Empty states** | Illustration + helpful message + CTA |
| **Progress** | Step indicator for multi-step flows |
| **Undo** | "Undo" snackbar for 5 seconds after changes |
| **Confirm** | "Are you sure?" for destructive actions (delete project) |
| **Onboarding** | First visit: overlay tooltip pointing to chat, viewport, action bar |

---

## 5. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| **Keyboard navigation** | Tab through all interactive elements; Enter to activate; Escape to close modals |
| **Screen readers** | aria-labels on 3D viewport controls; alt text on renders |
| **Colour contrast** | All text meets WCAG AA (4.5:1 ratio) |
| **Focus indicators** | Visible focus ring on all interactive elements |
| **Reduced motion** | Respect `prefers-reduced-motion` for animations |

---

## 6. Copy Guide (Tone of Voice)

| Context | Tone | Example |
|---------|------|---------|
| **Landing page** | Excited, aspirational | "Turn your BTO into a home you'll love, before you even get the keys." |
| **AI consultant** | Warm, patient, knowledgeable | "I love that choice! To complement the Japandi vibe in your living room..." |
| **Error messages** | Helpful, not blame-y | "Something went wrong. We've noted it — try again?" |
| **Success moments** | Celebratory | "Your render is ready! It looks amazing 😊" |
| **Admin panel** | Functional, clear | "Draw room boundaries on the floor plan. Double-click to close a polygon." |
| **Empty states** | Encouraging, clear next step | "Your gallery is empty. Generate your first render to see your design come to life!" |
