# Admin Panel UX Guide

## Managing BTO Projects, Floor Plans & Content

| Field | Value |
|-------|-------|
| **Status** | Draft v2.0 |
| **Date** | 2026-06-03 |
| **Author** | Johnathan Wong |
| **Intended Admin** | You — Johnathan — the only person managing templates |

---

## 1. Admin Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  🏠 Admin Panel                        Johnathan ▼          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Dashboard                            Welcome back!   │    │
│  │  ─────────────────────────────────                    │    │
│  │                                                       │    │
│  │  📊 Overview                                           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│    │
│  │  │ 12       │  │ 24       │  │ 8        │  │ 156    ││    │
│  │  │ BTO      │  │ Flat     │  │ Furniture│  │ Users  ││    │
│  │  │ Projects │  │ Models   │  │ Templates│  │        ││    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘│    │
│  │                                                       │    │
│  │  🏗️ BTO Projects          See all →                  │    │
│  │  ┌────────────────────────────────────────────────┐   │    │
│  │  │ Verandah Kallang 2024    4 models  ✅ Published │   │    │
│  │  │ Queenstown 2024          3 models  ✅ Published │   │    │
│  │  │ Clementi Ridges 2025     2 models  ⏳ Draft     │   │    │
│  │  │ Tampines Greenwalk 2025  3 models  ✅ Published │   │    │
│  │  │ [+ Add New BTO Project]                         │   │    │
│  │  └────────────────────────────────────────────────┘   │    │
│  │                                                       │    │
│  ├─── Sidebar ───────────────────────────────────────────┤    │
│  │  📊 Dashboard                                         │    │
│  │  🏗️ BTO Projects                                     │    │
│  │  🪑 Furniture Templates                               │    │
│  │  📦 Furniture Catalog                                 │    │
│  │  🎨 Style Presets                                     │    │
│  │  👥 Users                                             │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. BTO Project Management

### 2.1 BTO Project List

```
┌──────────────────────────────────────────────────────────────┐
│  🏗️ BTO Projects                    [+ New BTO Project]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Search: [🔍 Search projects...]                              │
│  Filter: [All Years ▼]  [All Locations ▼]  [All Status ▼]   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Verandah Kallang 2024  │ Kallang  │ 4 models │ ✅ Pub │⏎ │
│  │────────────────────────────────────────────────────────│  │
│  │ Queenstown 2024        │ Queenstown│ 3 models │ ✅ Pub │⏎ │
│  │────────────────────────────────────────────────────────│  │
│  │ Clementi Ridges 2025   │ Clementi │ 2 models │ ⏳ Draft│⏎ │
│  │────────────────────────────────────────────────────────│  │
│  │ Tampines Greenwalk 2025│ Tampines │ 3 models │ ✅ Pub │⏎ │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Each row:                                                    │
│  ⏎ = Click to see flat models inside this BTO project         │
│  ⋮ = Context menu: Edit, Duplicate, Delete                    │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Create/Edit BTO Project Form

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to BTO Projects        New BTO Project              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Project Name *                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Verandah Kallang 2024                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Slug (auto-generated from name, editable)           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ verandah-kallang-2024                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Location *                  Launch Year *            │
│  ┌──────────────────────┐   ┌────────────────────┐   │
│  │ Kallang               │   │ 2024               │   │
│  └──────────────────────┘   └────────────────────┘   │
│                                                       │
│  Description (shown on user browse page)              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ A premium BTO project in the Kallang area,       │ │
│  │ located near the Kallang Riverside Park.         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Hero Image (shown on browse page, 16:9)             │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [Drop image here or click to upload]              │ │
│  │                                                   │ │
│  │ Supported: PNG, JPG  Max: 5MB                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│           [Cancel]           [Save & Add Models →]    │
└──────────────────────────────────────────────────────┘
```

---

## 3. Flat Model Wall Annotation (The Core Workflow)

This is the **most important admin screen**. You'll spend the most time here — one per layout per BTO project.

### 3.1 Layout: Three-Panel Split

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to BTO Projects         Verandah Kallang 2024        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Add Model Details                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Model Name *     Flat Type *     Total Area (sqm)    │    │
│  │ ┌──────────────┐ ┌──────────┐   ┌──────────────┐    │    │
│  │ │ 4-Room Model │ │ 4-room  │   │ 90           │    │    │
│  │ └──────────────┘ └──────────┘   └──────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  Step 2: Upload Floor Plan                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  [Drop floor plan image here or click to upload]      │    │
│  │                                                       │    │
│  │  Supported: PNG, JPG, PDF     Max: 50MB              │    │
│  │  Recommended: PNG at 2048px wide                      │    │
│  │                                                       │    │
│  │  Tip: Use HDB's official floor plan PDFs.             │    │
│  │  Convert to PNG with clean contrast.                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  Step 3: Draw Walls & Auto-Detect Rooms                      │
│  ┌─────────────── Canvas ──────────────┬── Properties ─────┐ │
│  │                                      │                    │ │
│  │    ═══ External     🧱 Load-bearing │ Wall: Wall 3      │ │
│  │    ─── Internal                      │ (selected ▲)      │ │
│  │                                      │────────────────── │ │
│  │    ┌───────────┬──────────┐          │ Wall Type:         │ │
│  │    │           │          │          │ [Internal ▼]       │ │
│  │    │  Living   │   MBR    │          │ Load-bearing:      │ │
│  │    │   Room    │          │          │ [No ▼]            │ │
│  │    │           │          │          │ Thickness:         │ │
│  │    └───────────┴──────────┘          │ [0.15] m          │ │
│  │  ┌──────────┐ 🚪 🪟                  │ Height:            │ │
│  │  │ Kitchen  │                        │ [2.8] m           │ │
│  │  │          │                        │ Length: 4.0m      │ │
│  │  └──────────┘                        │                    │ │
│  │            🚪                        │ Adjacent Rooms:    │ │
│  │                                      │ Left: Living       │ │
│  │                                      │ Right: MBR         │ │
│  │                                      │                    │ │
│  │                                      │ Doors on this wall:│ │
│  │                                      │ 🚪 1 (pos 0.45)   │ │
│  │                                      │ Windows: 0         │ │
│  │                                      │                    │ │
│  │                                      │ [Add Door]         │ │
│  │                                      │ [Add Window]       │ │
│  │                                      │ [Delete Wall]      │ │
│  ├─────── Toolbar ──────────────────────┴───────────────────┤ │
│  │  [✏️ Draw] [✋ Select] [🚪 Door] [🪟 Window] [🗑️ Delete]  │ │
│  │  [🏷️ Room Type] [🧱 Toggle Load-Bearing]                  │ │
│  │  [🔍 Zoom In] [🔍 Zoom Out] [🔲 Fit to Screen]            │ │
│  │                                    [Save] [Preview 3D]    │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Drawing Walls — Step by Step

| Step | Action | What Happens |
|------|--------|-------------|
| **1** | Click **Draw** tool | Cursor changes to crosshair, snappable endpoints on existing walls highlight |
| **2** | Click on floor plan or snap to existing wall endpoint | First point placed (dot appears) |
| **3** | Click next point | Wall segment line draws between points |
| **4** | Continue clicking to chain walls | Connected wall segments form the outline |
| **5** | Snap to existing wall endpoint to close | Wall loop closes; system detects enclosed area as a room |
| **6** | New room appears in properties panel | Auto-detected room shown with auto-calculated area |
| **7** | Click **Room Type** dropdown | Sets icon, default materials for the detected room |
| **8** | Click **Label** to customise | e.g. "Master Bedroom" vs "Bedroom 2" |
| **9** | Repeat for all walls | Each wall drawn adds to the segment list; rooms detected automatically |
| **10** | Click **Save** | Walls + rooms stored in database |

**Tips for accurate wall drawing:**
- Draw walls as complete edges between room corners
- Every shared wall between two rooms should be a single wall segment (system handles both sides)
- After all walls are drawn, click "Auto-Detect Rooms" button to verify all enclosures are found
- Mark external walls as `wallType: "external"` — they form the flat boundary
- Mark party walls as `wallType: "party"` — shared with neighbour
- Check that load-bearing walls are correctly flagged before publishing
- Use the grid overlay (toggle with `G`) for precise perpendicular walls

### 3.3 Placing Doors & Windows

```
Doors and windows are placed ON wall segments (not rooms):

Door Placement:
1. Click **Select** tool, then click a wall segment → "Add Door" button
2. Click "Add Door" → dialog slides down
3. Set: Width (default 0.9m), Height (2.1m), Swing direction, Position along wall (drag slider 0.0-1.0)
4. The door symbol appears on the wall with a swing arc
5. Click away to confirm

Window Placement:
1. Click a wall segment → "Add Window" appears
2. Click "Add Window" → dialog appears
3. Set: Width (1.2m), Height (1.2m), Sill Height (1.0m), Window type
4. Position along wall using drag slider
5. Click away to confirm

Visual feedback:
- Door: arch symbol on wall edge, shows swing arc, width scales visually
- Window: rectangle on wall, shows sill line
- Both can be dragged along the wall to fine-tune position
- External walls can have windows; internal walls typically have doors only
```

### 3.4 Room Types & Visual Mapping

| Room Type | Icon | Default Wall Colour | Default Floor |
|-----------|------|--------------------|---------------|
| **Living Room** | 🛋️ | `#F5F5F0` Warm White | Parquet, Light Oak |
| **Master Bedroom** | 🛏️ | `#F0EDE6` Off White | Laminate, Light Walnut |
| **Bedroom** | 🛌 | `#F0EDE6` Off White | Laminate, Light Walnut |
| **Kitchen** | 🍳 | `#FFFFFF` White | Tiles, White |
| **Toilet** | 🚿 | `#E8E8E8` Light Grey | Tiles, Grey |
| **Bomb Shelter** | 🛡️ | `#D0D0D0` Grey | Vinyl, Grey |
| **Service Yard** | 🧺 | `#E0E0E0` Silver | Tiles, Grey |
| **Balcony** | 🌿 | `#E8E0D8` Warm Grey | Tiles, Stone |
| **Hallway** | 🚪 | `#F5F5F0` Warm White | Vinyl, Beige |

### 3.5 After All Walls Are Drawn

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ All walls annotated for Verandah 4-Room Model A          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Room Summary (Auto-Detected from Wall Enclosures)    │    │
│  │  ─────────────                                       │    │
│  │  # │ Room          │ Type     │ Area    │ Doors│Win  │    │
│  │  ───┼──────────────┼──────────┼─────────┼──────┼─────│    │
│  │  1 │ Living Room   │ living   │ 24.96m² │ 1   │ 1   │    │
│  │  2 │ Master BR     │ mbr      │ 16.40m² │ 1   │ 1   │    │
│  │  3 │ Bedroom 2     │ bedroom  │ 12.30m² │ 1   │ 1   │    │
│  │  4 │ Kitchen       │ kitchen  │ 9.60m²  │ 1   │ 0   │    │
│  │  5 │ Toilet 1      │ toilet   │ 4.20m²  │ 1   │ 0   │    │
│  │  6 │ Toilet 2      │ toilet   │ 3.80m²  │ 1   │ 0   │    │
│  │  7 │ Bomb Shelter  │ bomb_    │ 4.00m²  │ 1   │ 0   │    │
│  │  8 │ Hallway       │ hallway  │ 5.50m²  │ 0   │ 0   │    │
│  │  ────────────────────────────────────────────────────│    │
│  │  Total: 8 rooms      80.76m²                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  [← Back to Edit Rooms]     [Preview in 3D 🏠]  [Save Draft] │
│                                                     [Publish] │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 3D Preview

When you click "Preview in 3D", it opens the same viewport users see — but with an admin badge:

```
┌──────────────────────────────────────────────┐
│  ⚙️ Admin Preview —     [Edit Rooms] [Pub]  │
│  (read-only 3D of current annotation)        │
├──────────────────────────────────────────────┤
│                                              │
│           🏠 3D Viewport                      │
│                                              │
│   💡 Tip: Click a room to inspect it.        │
│   Check wall heights, door positions,        │
│   and window sills match the HDB floor       │
│   plan.                                      │
│                                              │
│  [Looks good → Publish] [Needs fixes ←]     │
└──────────────────────────────────────────────┘
```

---

## 4. Managing Multiple Models Per BTO

HDB projects often have 2-4 different layouts per flat type.

```
BTO Project: Verandah Kallang 2024
│
├── 4-Room Models (3 variants)
│   ├── Model A (90sqm)          ← You annotate each separately
│   ├── Model B (92sqm)
│   └── Model C (88sqm, corner unit)
│
├── 5-Room Models (2 variants)
│   ├── Model A (110sqm)
│   └── Model B (108sqm)
│
└── 3-Room Models (1 variant)
    └── Model A (72sqm)
```

**Workflow summary for one BTO project:**
1. Create BTO project (2 min)
2. Add Model A (1 min)
3. Upload floor plan (30s)
4. Draw 8 rooms + place doors/windows (15 min)
5. Set room properties (5 min)
6. Preview 3D → fix issues (5 min)
7. Publish (1 click)
8. Repeat for Model B, C...

**Total: ~30 min per layout. ~2-3 hours for an entire BTO project.**

---

## 5. Furniture Template Management

### 5.1 Template List

```
┌──────────────────────────────────────────────────────────────┐
│  🪑 Furniture Templates                [+ New Template]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Filter: [All Rooms ▼]  [All Styles ▼]  [Published ▼]       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🛋️ Scandi Living     │ Living │ Scandi     │ ✅ Pub  │  │
│  │  🛋️ Japandi Living    │ Living │ Japandi    │ ✅ Pub  │  │
│  │  🛋️ Industrial Living │ Living │ Industrial │ ✅ Pub  │  │
│  │  🛏️ Scandi MBR        │ MBR    │ Scandi     │ ✅ Pub  │  │
│  │  🛏️ Japandi MBR       │ MBR    │ Japandi    │ ✅ Pub  │  │
│  │  🍽️ Universal Dining  │ Dining │ —          │ ⏳ Draft│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Click template → see furniture layout + item list            │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Creating a Furniture Template

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Templates           New Furniture Template       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Template Name *                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Scandi Living Room Set                           │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Room Category *          Style Tag                          │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │ Living ▼          │    │ Scandinavian ▼   │               │
│  └──────────────────┘    └──────────────────┘               │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│  Furniture Items                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [+ Add Item from Catalog]                              │    │
│  │                                                        │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ 🛋️ 3-Seater Sofa         [× Remove]  [🔽 Edit]  │  │    │
│  │  │    Default position: Against north wall          │  │    │
│  │  │    Wall anchor: against                          │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                        │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ 🪑 Oval Coffee Table     [× Remove]  [🔽 Edit]  │  │    │
│  │  │    Default position: Center of room              │  │    │
│  │  │    Wall anchor: center                           │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  │                                                        │    │
│  │  ┌─────────────────────────────────────────────────┐  │    │
│  │  │ 🟫 Tatami-style Rug        [× Remove]  [🔽 Edit]│  │    │
│  │  │    Default position: Under coffee table          │  │    │
│  │  │    Wall anchor: —                                │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  [Save Draft]  [Publish]                                      │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Positioning Furniture (2D Overhead View)

When editing an item's position, a simplified 2D overhead view appears:

```
┌──────────────────────────────────────────────────────────────┐
│  Position: 3-Seater Sofa          [Done]                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │      🛋️ ← Drag to move                               │    │
│  │      Sofa                                             │    │
│  │      (2.0m × 0.9m)                                    │    │
│  │                                                       │    │
│  │         🪑                                            │    │
│  │      Coffee Table                                     │    │
│  │      (1.2m × 0.7m)                                    │    │
│  │                                                       │    │
│  │  ════≡ Room boundary (5.2m × 4.8m)                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  Wall Anchor: [Against north wall ▼]                         │
│  X Offset: [0.5] m from wall                                 │
│  Rotation: [0° ▼]                                            │
│                                                               │
│  Note: All positions are relative to room center (0,0)       │
│  and auto-scaled when placed in different-sized rooms.       │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Furniture Catalog Management

### 6.1 Catalog List

```
┌──────────────────────────────────────────────────────────────┐
│  📦 Furniture Catalog                  [+ Add Item]          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Search: [🔍 Search items...]                                 │
│  Filter: [All Categories ▼]  [All Styles ▼]                  │
│                                                               │
│  ┌──────┬────────────────────┬──────────┬─────────┬────────┐ │
│  │  🛋️ │ 3-Seater Sofa      │ Seating  │ Japandi │ 2.0m   │ │
│  │  🛋️ │ Sectional Sofa     │ Seating  │ Modern  │ 2.8m   │ │
│  │  🛏️ │ King Bed           │ Beds     │ Scandi  │ 2.0m   │ │
│  │  🪑  │ Oval Coffee Table  │ Tables   │ Japandi │ 1.2m   │ │
│  │  💡  │ Floor Lamp         │ Lighting │ —       │ 0.4m   │ │
│  │  🪴  │ Monstera Plant     │ Decor    │ —       │ 0.5m   │ │
│  │  🗄️ │ TV Console          │ Storage  │ Scandi  │ 1.8m   │ │
│  └──────┴────────────────────┴──────────┴─────────┴────────┘ │
│                                                               │
│  Items: 24 total    Page 1 of 3    [← Prev] [1] [2] [3] [Next →]│
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Adding a Catalog Item

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Catalog              Add Furniture Item          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Item Name *                                                 │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 3-Seater Sofa                                    │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Type *                 Category *                  │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ sofa ▼            │   │ seating ▼         │                │
│  └──────────────────┘   └──────────────────┘                │
│                                                               │
│  Style Tag (optional)   Dimensions (metres) *               │
│  ┌──────────────────┐   W: ┌──────┐ H: ┌──────┐ D: ┌──────┐│
│  │ japandi ▼         │   │ 2.0  │   │ 0.8  │   │ 0.9  ││
│  └──────────────────┘   └──────┘   └──────┘   └──────┘│
│                                                               │
│  Wall Anchor (optional)     Min Clearance (cm)               │
│  ┌──────────────────┐       ┌──────────────────┐            │
│  │ against ▼         │       │ 5                │            │
│  └──────────────────┘       └──────────────────┘            │
│                                                               │
│  3D Model (GLB) *                                            │
│  ┌──────────────────────────────────────────────────┐       │
│  │ [Drop GLB file here or click to upload]           │       │
│  │                                                   │       │
│  │ Max: 10MB    Format: GLB (Draco compressed)      │       │
│  │ Max triangles: 5,000                              │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Thumbnail Image                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ [Drop image here or click to upload]              │       │
│  │ Max: 1MB   Recommended: 512×512px                │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│           [Cancel]                     [Save Item]            │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Style Presets Management

```
┌──────────────────────────────────────────────────────────────┐
│  🎨 Style Presets                        [+ New Preset]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Scandinavian                                            │  │
│  │ ───────────────────────────                             │  │
│  │ Floor: Parquet, Light Oak                               │  │
│  │ Walls: Warm White, Matte                                │  │
│  │ Accent: Sage Green (#7A9B7A)                            │  │
│  │ Lighting: Warm 2700K                                    │  │
│  │ Furniture Tags: scandinavian                             │  │
│  │ AI Hint: "Scandinavian interior with light oak flooring │  │
│  │ and warm white walls..."                                │  │
│  │ [Edit] [Delete]                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Japandi                                                 │  │
│  │ ───────────────────────────                             │  │
│  │ Floor: Parquet, Medium Walnut                           │  │
│  │ Walls: Cream, Matte                                     │  │
│  │ Accent: Forest Green (#2D5A27)                          │  │
│  │ ...                                                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. User Management

```
┌──────────────────────────────────────────────────────────────┐
│  👥 Users                              Total: 156           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Search: [🔍 Search by name or email...]                      │
│                                                               │
│  ┌──────┬────────────────────┬──────────────┬────────┬─────┐ │
│  │ Name │ Email              │ Projects     │ Joined │Role │ │
│  ├──────┼────────────────────┼──────────────┼────────┼─────┤ │
│  │ John │ wong.j...@gmail   │ 3            │ 2 Jun  │Admin│ │
│  │ Sarah│ sarah@example.com │ 1            │ 1 Jun  │User │ │
│  │ ...  │                    │              │        │     │ │
│  └──────┴────────────────────┴──────────────┴────────┴─────┘ │
│                                                               │
│  Actions: Promote to Admin, Suspend, Delete                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Complete Admin Workflow Reference

### 9.1 Adding a New BTO Project (End-to-End)

```
Total time: ~30 min per layout

Step 1: Create BTO Project                           (2 min)
   └→ Navigate to Admin → BTO Projects → New
   └→ Fill name, location, year, description
   └→ Upload hero image
   └→ Save

Step 2: Add First Flat Model                         (1 min)
   └→ Click into BTO project → "Add Flat Model"
   └→ Name: "4-Room Model A"
   └→ Type: 4-room, Area: 90sqm
   └→ Upload floor plan image
   └→ Save

Step 3: Draw Walls & Auto-Detect Rooms                    (20 min)
   └→ Click "Annotate Walls"
   └→ Use Draw tool: click to place wall segments around each room
   └→ System auto-detects enclosed areas as rooms
   └→ Set room type → Living, MBR, Kitchen, etc.
   └→ Mark load-bearing walls (they won't be deletable by users)
   └→ Mark wall types (internal/external/party)
   └→ Place doors on wall segments (drag slider for position)
   └→ Place windows on external wall segments
   └→ Save

Step 4: Preview & Fix                                (5 min)
   └→ Click "Preview 3D"
   └→ Check: wall heights, door positions, window sills
   └→ Fix any issues → back to annotation

Step 5: Publish                                      (1 min)
   └→ Click "Publish"
   └→ Model is now available to all users

Step 6: Repeat for Model B, C...                   (30 min each)
```

### 9.2 Adding Furniture After Publishing

```
Step 1: Create Furniture Templates                  (15 min each)
   └→ Admin → Furniture Templates → New
   └→ Pick room type + style
   └→ Add items from catalog
   └→ Position in 2D overhead view
   └→ Set wall anchor rules
   └→ Publish

Step 2: Populate Furniture Catalog                  (per item)
   └→ Admin → Furniture Catalog → Add Item
   └→ Upload GLB model
   └→ Set dimensions, category, style tag
   └→ Save

Step 3: Update Style Presets                        (5 min)
   └→ Admin → Style Presets → Edit
   └→ Link furniture tags to style
   └→ Save
```

---

## 10. Mobile Considerations

The admin panel is **desktop-first**. Mobile is not a priority since this is your tool only.

| Requirement | Desktop | Mobile |
|-------------|---------|--------|
| **Dashboard** | ✅ Full layout | ✅ Simplified cards |
| **Room annotation** | ✅ Canvas + properties side-by-side | ❌ Not supported (too complex) |
| **BTO project forms** | ✅ Full | ✅ Usable |
| **Furniture templates** | ✅ Full | ✅ View only |
| **User management** | ✅ Full | ✅ Table scrolls |

**Recommendation:** Room annotation on mobile is not feasible with the polygon-drawing canvas. Always use desktop for annotation work.

---

## 11. Data Entry Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo last point while drawing |
| `Double-click` | Close polygon |
| `Esc` | Cancel current drawing |
| `Delete` / `Backspace` | Delete selected room/door/window |
| `Ctrl+S` | Save current model |
| `+` / `-` | Zoom in/out on canvas |
| `1` | Select Draw tool |
| `2` | Select Select/Edit tool |
| `3` | Select Door tool |
| `4` | Select Window tool |
