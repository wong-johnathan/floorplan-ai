# User Experience Guide

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Status** | Draft v3.0 |
| **Date** | 2026-06-04 |
| **Author** | Johnathan Wong |

---

## 1. User Journey Map

```
┌──────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐
│ Sign Up   │► │ BTO Search &  │► │ Room Type +  │► │  2D Floor Plan        │► │ Room Demarking│► │ AI Design    │► │ Render &    │
│ (OAuth)   │  │ Selection     │  │ Model Select │  │  Editor (PRIMARY)     │  │ & Labelling  │  │ Consultant   │  │ Gallery     │
└──────────┘  └───────────────┘  └──────────────┘  └──────────────────────┘  └───────────────┘  └──────────────┘  └─────────────┘
                   │                   │                      │                        │                  │                 │
             Search by year,      Pick 2R/3R/4R/5R      Pre-loaded walls +        Label each        Overall vibe      Sample render
             name, location       then pick variant       shape library sidebar     enclosed area     or room by room   → approve
                   │              (bomb shelter pos,      Drag furniture 2D         Bedroom 1,        AI builds brief   → final batch
             Filter: year,        balcony side etc.)      Resize walls              Kitchen, etc.     per room label    Gallery +
             location             Preview + sqm           Move doors/windows        System suggests                     share link
                                                          Snap-to-grid 25cm         labels by area
                                                          Undo/redo
                                                          Structural walls blocked
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

### Screen 2: BTO Project Search & Selection

| UI Element | Description |
|------------|-------------|
| **Search bar** | "Search by project name..." with autocomplete |
| **Filter chips** | By year (2024, 2025, 2026), by location (Kallang, Queenstown, Jurong…) |
| **Project cards** | Thumbnail, project name, location, year, town |
| **Empty state** | "Can't find your project? Check back soon — we add new BTOs regularly" |

**States:**

| State | Message |
|-------|---------|
| **Loading** | Skeleton cards × 4 |
| **No results** | "No BTO projects match your search. Try a different location or year." |
| **Error** | "Couldn't load BTO projects. Check your connection and try again." |

**Mobile:** Stacked cards, search at top, filters as horizontal scroll chips.

---

### Screen 3: Room Type + Model Variant Selector

```
┌────────────────────────────────────────────────────┐
│  ← Back              Verandah Kallang 2024          │
│                                                      │
│  Step 1: Select room type                           │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │ 2-Room │  │ 3-Room │  │ 4-Room │  │ 5-Room │    │
│  └────────┘  └────────┘  └████████┘  └────────┘    │
│                            (selected)               │
│                                                      │
│  Step 2: Select model variant                       │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │  4-Room Model A   │  │  4-Room Model B   │        │
│  │  87 sqm           │  │  92 sqm           │        │
│  │  Bomb shelter:    │  │  Bomb shelter:    │        │
│  │  centre of flat   │  │  beside kitchen   │        │
│  │  [Floor plan ↓]   │  │  [Floor plan ↓]   │        │
│  └──────────────────┘  └──────────────────┘         │
│                                                      │
│  [Select & Start Editing →]                          │
└──────────────────────────────────────────────────────┘
```

**Key UX rule:** The variant description should call out the differences that matter to the user: bomb shelter position, balcony orientation, kitchen open vs. closed, bay window placement.

---

### Screen 4: 2D Floor Plan Editor (Primary Canvas)

This is the **core screen** — the draw.io-style design tool.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back    Verandah Kallang 2024 — 4-Room Model A    [Save] [↩] [↪]     │
├──────────────────┬───────────────────────────────────────────────────────┤
│                  │                                                        │
│  SHAPE LIBRARY   │              2D CANVAS                                 │
│  ┌────────────┐  │  ┌──────────────────────────────────────────────────┐ │
│  │ 🔍 Search  │  │  │  ┌─────────────────────┬─────────────────┐       │ │
│  └────────────┘  │  │  │                     │                 │       │ │
│                  │  │  │  [Bedroom area]      │  [MBR area]     │       │ │
│  Walls & Doors ▼ │  │  │                     │                 │       │ │
│  ┌──┐ ┌─┐ ┌─┐   │  │  ├───────┬─────────────┼─────────────────┤       │ │
│  └──┘ └─┘ └─┘   │  │  │       │             │                 │       │ │
│                  │  │  │[Kitch]│  [Living]   │  [Bed 2 area]   │       │ │
│  Bedroom ▼       │  │  │       │             │                 │       │ │
│  🛏 🚪 🗄 🪟    │  │  │       │             │                 │       │ │
│                  │  │  ├───────┴─────────────┴─────────────────┤       │ │
│  Living Room ▼   │  │  │           [Porch / Corridor]          │       │ │
│  🛋 📺 🪑 🌿   │  │  └──────────────────────────────────────┘       │ │
│                  │  │                                                    │ │
│  Kitchen ▼       │  │  Selected: Wall segment (Living ↔ Kitchen)        │ │
│  🍳 🧊 🚿       │  │  Type: Internal   Structural: No                  │ │
│                  │  │  Length: 3.2m   [Delete]  [Resize handles active] │ │
│  Dining ▼        │  └──────────────────────────────────────────────────┘ │
│  🍽 🪑🪑🪑🪑  │                                                        │
│                  │  ┌─ Properties panel (selected shape) ──────────────┐ │
│  Bathroom ▼      │  │  Shape: 3-seater sofa   Rotate: [90°] [180°]    │ │
│  🚿 🛁 🚽       │  │  Snap to: [Wall] [Grid] [None]                   │ │
│                  │  └──────────────────────────────────────────────────┘ │
│  [+ Custom]      │                                                        │
├──────────────────┴───────────────────────────────────────────────────────┤
│  [↩ Undo] [↪ Redo] [Reset to Template]        [Done — Label Rooms →]    │
└──────────────────────────────────────────────────────────────────────────┘
```

**What users can do:**

| Action | How |
|--------|-----|
| **Add furniture** | Drag shape from library onto canvas; snaps to grid (25cm) |
| **Move furniture** | Click + drag any placed shape |
| **Rotate furniture** | Select shape → rotate handle or property panel |
| **Delete furniture** | Select → Delete key or right-click → Remove |
| **Resize a wall** | Click wall → drag endpoint handle |
| **Move a door/window** | Click door → drag along its parent wall |
| **Add a wall** | Draw Wall tool → click start point → click end point |
| **Delete a wall** | Select wall → Delete key (blocked if structural) |
| **Zoom/pan** | Scroll to zoom; space+drag to pan |
| **Undo/redo** | Ctrl+Z / Ctrl+Y; up to 100 steps |

**States:**

| State | Message |
|-------|---------|
| **Default (no selection)** | "Drag shapes from the library or click any element to edit it." |
| **Shape selected** | Properties panel shows: position, rotation, snap options |
| **Wall selected** | Properties show: type (internal/structural), length, delete button |
| **Structural wall hovered** | Tooltip: "🧱 Structural wall — cannot be removed" |
| **Structural wall delete attempt** | "This wall is structural and cannot be removed." (toast, no change) |
| **Unsaved changes** | "Save" button highlights; browser unload prompt if changes present |
| **Mobile** | Shape library as bottom drawer; canvas full-width; pinch to zoom |

---

### Screen 5: Room Demarking & Labelling

Triggered when user clicks **[Done — Label Rooms]** from the editor.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to Editor           Label Your Rooms                  [Done →]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Tap each enclosed area and give it a name.                              │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌──────────────────┬───────────────────┐                         │  │
│  │  │                  │                   │                         │  │
│  │  │  Master Bedroom  │   Bedroom 1       │  ← labelled             │  │
│  │  │      ✓           │      ✓            │                         │  │
│  │  ├──────┬───────────┼───────────────────┤                         │  │
│  │  │      │           │                   │                         │  │
│  │  │  ?   │  Living   │   Bedroom 2       │  ← ? = not yet labelled │  │
│  │  │      │   Room ✓  │      ✓            │                         │  │
│  │  └──────┴───────────┴───────────────────┘                         │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Tap "?" areas to label them:                                            │
│                                                                           │
│  ┌──────────────────────────────────────────────────┐                   │
│  │  What is this area?                               │                   │
│  │                                                   │                   │
│  │  [Kitchen] [Toilet] [Study] [Bomb Shelter]        │                   │
│  │  [Yard] [Balcony] [Storeroom] [Hallway]           │                   │
│  │  [Type your own...]                               │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                           │
│  3 of 7 areas labelled                                                   │
│  ━━━━━━━━━━━━━━━━░░░░░░░░░░░  43%                                        │
│                                                                           │
│  [Done →]  (enabled only when all areas are labelled)                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**States:**

| State | Message |
|-------|---------|
| **Area unlabelled** | Shows "?" badge on the area; highlighted with amber dashed border |
| **Area tapped** | Label picker appears (quick-select chips + free text) |
| **Suggested label** | System pre-suggests based on area size/shape; user confirms or changes |
| **Duplicate label** | "You already have a 'Toilet'. Name this Toilet 2?" |
| **All labelled** | "Done →" button activates; summary list shows all room names |
| **Small area warning** | "This area is quite small (1.2 sqm). Is it a bomb shelter or storeroom?" |

---

### Screen 6: AI Design Consultant (Chat)

The chat knows the user's labelled rooms and starts with that context.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back         Design Consultant         [Floor Plan] [Room Summary]    │
├───────────────────────────────────────────────┬──────────────────────────┤
│                                               │                          │
│  CHAT                                         │  YOUR ROOMS              │
│                                               │                          │
│  ┌─ AI ─────────────────────────────────────┐ │  ✓ Master Bedroom        │
│  │  Hi! I can see you have a 4-room flat    │ │  ✓ Bedroom 1             │
│  │  with:                                  │ │  ✓ Bedroom 2             │
│  │  • Master Bedroom                       │ │  ✓ Living Room           │
│  │  • 2 Bedrooms                           │ │  ✓ Kitchen               │
│  │  • Living Room + Kitchen                │ │  ✓ Toilet 1              │
│  │  • 2 Toilets + Bomb Shelter             │ │  ✓ Toilet 2              │
│  │                                         │ │  ✓ Bomb Shelter          │
│  │  How do you want to approach the        │ │                          │
│  │  design?                                │ │  Mode:                   │
│  │                                         │ │  ● Overall vibe first    │
│  │  [Overall vibe first]                   │ │  ○ Room by room          │
│  │  [Room by room]                         │ │                          │
│  └─────────────────────────────────────────┘ │                          │
│                                               │  Design brief:           │
│  ┌─ You ────────────────────────────────────┐ │  MBR: Japandi ✓         │
│  │  Overall Japandi feel, but kitchen       │ │  Living: Japandi ✓      │
│  │  with vintage green tiles                │ │  Kitchen: Vintage 🔄    │
│  └─────────────────────────────────────────┘ │  Bedroom 1: —           │
│                                               │  Bedroom 2: —           │
│  ┌─ AI ─────────────────────────────────────┐ │                          │
│  │  Love that mix! For the kitchen —        │ │                          │
│  │  dark wood or white cabinets to          │ │                          │
│  │  complement the green tiles?            │ │                          │
│  │                                         │ │                          │
│  │  [Dark wood] [White] [Something else…]  │ │                          │
│  └─────────────────────────────────────────┘ │                          │
│                                               │                          │
│  ┌─────────────────────────────────────────┐  │                          │
│  │  Type a message…                   [→]  │  │                          │
│  └─────────────────────────────────────────┘  │                          │
│                                               │                          │
│  [I'm Happy → Generate Renders]              │                          │
│  (enabled once all rooms have a style)        │                          │
└───────────────────────────────────────────────┴──────────────────────────┘
```

**States:**

| State | What Happens |
|-------|-------------|
| **AI typing** | Animated dots in AI bubble |
| **Brief update** | Room summary panel animates; room ticks green |
| **All rooms styled** | "I'm Happy!" button activates |
| **User says "I'm happy"** | AI summarises full brief; transition to render screen |
| **User idle > 30s** | AI gently asks: "Want me to suggest a style for the remaining rooms?" |

---

### Screen 7: Render Generation & Gallery

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to Chat          Renders                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Step 1 — Sample Render                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Generate a sample for one room to check the AI understands      │    │
│  │  your style before running the full batch.                       │    │
│  │                                                                  │    │
│  │  ● Living Room (recommended)                                     │    │
│  │  ○ Master Bedroom   ○ Kitchen                                    │    │
│  │                                                                  │    │
│  │  [Generate Sample (~$0.04)]                                      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ─── After sample generated ───────────────────────────────────────────  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Living Room — Sample Render                                     │    │
│  │  ┌────────────────────────────────────────────────────────────┐  │    │
│  │  │              [AI-generated image]                          │  │    │
│  │  └────────────────────────────────────────────────────────────┘  │    │
│  │                                                                  │    │
│  │  Does this match your vision?                                    │    │
│  │                                                                  │    │
│  │  [Looks Great! → Render All Rooms 🚀]                           │    │
│  │  [Tweak: _________________________________ 🔄 Regenerate]       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ─── After "Render All Rooms" ─────────────────────────────────────────  │
│                                                                           │
│  ■■■■■■■░░░░░░░░  48%   Rendering Room 3 of 6: Kitchen                   │
│  ✅ Living Room   ✅ Master Bedroom   ⏳ Kitchen   ⏳ Bedroom 1 …         │
│                                                                           │
│  ─── Gallery (after completion) ───────────────────────────────────────  │
│                                                                           │
│  [Living] [MBR] [Kitchen] [Bed 1] [Bed 2] [All ▼]                        │
│                                                                           │
│  ┌────────┐ ┌────────┐   ← before/after slider on click                 │
│  │   🖼️   │ │   🖼️   │                                                    │
│  └────────┘ └────────┘                                                    │
│                                                                           │
│  [Download HD]  [Share Link]  [← Back to Edit]                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**States:**

| State | Message |
|-------|---------|
| **No renders yet** | "Generate a sample render first." |
| **Generating sample** | Spinner + "AI is creating your preview (~10s)" |
| **Sample ready** | "Does this match your vision?" |
| **Batch rendering** | Progress bar + per-room status checklist |
| **All done** | Toast: "All renders ready!" + gallery appears |
| **Render failed** | "This room couldn't be rendered. Tap to retry." |
| **Stale renders** | "Your floor plan or brief has changed. Regenerate?" badge |

---

### Screen 8: Breadcrumb Navigation (Persistent)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Dashboard          Verandah Kallang — 4-Room Model A    [Save]│
│                                                                   │
│  Floor Plan  >  Label Rooms  >  Design Brief  >  Renders         │
│      ✓               ✓               ✓             ◉             │
│                                                                   │
│  Click any completed step (✓) to go back and edit.               │
│  Changes to floor plan or brief mark renders as stale.           │
└──────────────────────────────────────────────────────────────────┘
```

| Click breadcrumb | What happens |
|-----------------|-------------|
| **Floor Plan** | Editor reopens with current state. Changes mark labels + renders as stale. |
| **Label Rooms** | Labelling screen reopens. Relabelling a room updates AI brief context. |
| **Design Brief** | Chat reopens with full history. User can continue or adjust. |
| **Renders** | Gallery (current view). |

---

## 3. Error States & Edge Cases

| Scenario | UX Response |
|----------|-------------|
| **BTO project not found** | "Not in our library yet. Check back soon." + "Notify me" button |
| **Structural wall delete attempt** | "🧱 Structural wall — cannot be removed." Toast only; no state change |
| **Unlabelled area at labelling step** | "Done" button disabled; "?" badges pulse on unlabelled areas |
| **Duplicate room label** | "You already have a Toilet. Name this Toilet 2?" auto-suggestion |
| **AI consultant stuck** | "Having trouble — could you rephrase?" After 3 retries: show style preset picker |
| **Gemini render fails** | "This render failed. Try again with a simpler description." |
| **User refreshes mid-chat** | Chat history + brief restored from DB; AI continues from last turn |
| **All areas not enclosed** | "This area isn't fully enclosed by walls. Close the boundary before labelling." |
| **Room below minimum size** | Warning (non-blocking): "This area is very small. Is it a bomb shelter or storeroom?" |
| **Mobile + large canvas** | Pinch-to-zoom; shape library as collapsible bottom drawer |

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
| **Structural wall** | Warm grey + hatch | `#6B7280` with diagonal stripes |
| **Unlabelled area** | Amber dashed border | `#D97706` dashed |

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
| **Progress** | Step breadcrumb + completion indicators |
| **Undo** | Ctrl+Z in editor; "Undo" snackbar for non-keyboard users (5s) |
| **Confirm** | "Are you sure?" only for destructive actions (delete project, reset to template) |
| **Onboarding** | First visit: tooltip tour — shape library, canvas, label button |
| **Shape snap feedback** | Green tint when valid snap; red tint when collision |

---

## 5. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| **Keyboard navigation** | Tab through all interactive elements; Enter to activate; Escape to close modals |
| **Screen readers** | aria-labels on canvas regions; alt text on renders |
| **Colour contrast** | All text meets WCAG AA (4.5:1 ratio) |
| **Focus indicators** | Visible focus ring on all interactive elements |
| **Reduced motion** | Respect `prefers-reduced-motion` for animations |

---

## 6. Copy Guide (Tone of Voice)

| Context | Tone | Example |
|---------|------|---------|
| **Landing page** | Excited, aspirational | "Plan your BTO before you even get the keys." |
| **Floor plan editor** | Functional, friendly | "Drag shapes onto your floor plan to get started." |
| **Room labelling** | Encouraging, clear | "Tap each area to name it — this helps your AI designer get it right." |
| **AI consultant** | Warm, patient, knowledgeable | "I love that choice! Should the Japandi feel continue into the bedrooms?" |
| **Error messages** | Helpful, not blame-y | "Something went wrong. We've noted it — try again?" |
| **Success moments** | Celebratory | "Your renders are ready!" |
| **Admin panel** | Functional, clear | "Draw wall segments on the floor plan. Mark structural walls before publishing." |
| **Empty states** | Encouraging, clear next step | "No renders yet. Finish the design brief to generate your first one." |
