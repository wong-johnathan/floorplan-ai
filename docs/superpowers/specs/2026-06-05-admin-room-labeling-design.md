# Admin Room Labeling System — Design Spec

| Field | Value |
|-------|-------|
| **Status** | Draft v1.0 |
| **Date** | 2026-06-05 |
| **Author** | Johnathan Wong |
| **Scope** | Admin annotation flow only (user-facing room demarking is a separate spec) |

---

## 1. Problem

After an admin draws walls on a BTO floor plan and runs "Detect Rooms", each detected area receives a generic label (`Room 1`, `Room 2`, …). The admin must then click each room in turn and manually type a label and pick a room type from the sidebar property panel — slow and error-prone for 6–10 rooms per flat model.

Additionally:
- There is no guided prompt ensuring every room gets labeled before publishing.
- Wall endpoints cannot be dragged to adjust room shapes after drawing.
- The `splitWalls()` function splits walls at T-junctions internally for detection, but does not persist those split segments — meaning vertex handles are missing at junction points.

---

## 2. Goals

- Fast, guided first-pass labeling via a sequential wizard.
- Click-to-correct inline popup for any room at any time.
- Vertex editing: drag wall endpoints (wall mode) and room polygon vertex handles (select mode).
- Auto-split stored walls at T-junctions on detect, so every stored segment is atomic and vertex editing is clean.
- Re-detect rooms without losing existing labels where possible.

---

## 3. Room Shape Model

Room polygons are always **derived from wall segments** via the half-edge algorithm in `roomDetection.ts`. There is no independent polygon vertex store.

| Shape | Behavior |
|-------|----------|
| L-shaped room | 6-vertex polygon detected automatically from walls |
| T-shaped room | 8-vertex polygon detected automatically from walls |
| Open-plan (no physical wall) | Use the existing **virtual divider** tool (`wallType: 'virtual'`) to create a conceptual boundary |
| Wrong detection | Fix the underlying walls, then re-detect |

Room polygon vertices are never edited directly — editing a vertex means moving the corresponding wall endpoint.

---

## 4. Wall Auto-Split on Detect

**Current behaviour:** `splitWalls()` runs inside `detectRooms()` and is discarded. A long wall spanning 3 rooms is stored as one segment with only 2 draggable endpoints.

**New behaviour:** When `detectAndSetRooms()` runs, the split segments are written back into `annotationStore.walls`, replacing any wall that was split. Every stored wall becomes an atomic segment with exactly 2 endpoints.

**Door/window migration:** Openings stored as a `position` (0.0–1.0 fraction along the wall) must be remapped to the correct sub-segment after splitting:

```
sub-segment covers [t_start, t_end] of the original wall
opening.position = t  →  belongs to sub-segment where t_start ≤ t ≤ t_end
remapped position = (t - t_start) / (t_end - t_start)
```

**UX:** A toast notification informs the admin: *"Walls automatically split at junctions for clean room boundaries."*

---

## 5. Labeling Flow

```
Draw walls  →  Detect Rooms  →  Label Wizard (first pass)  →  All rooms labeled
                                                                      ↓
                                                          Click any room → Inline popup (correction)
                                                                      ↓
                                                          Fix walls if needed → Re-detect → wizard for new rooms only
```

### 5.1 Label Wizard (sequential — triggered after detect)

- Triggers automatically when `detectAndSetRooms()` produces rooms with generic labels.
- A bottom panel pins to the canvas (height ~60px). Canvas shrinks to accommodate it.
- Rooms with generic labels are processed one at a time in polygon area order (largest first — typically living room).
- The current room pulses with a highlighted border; all others are dimmed to 40% opacity.
- Bottom panel shows:
  - **Room N of M** counter + thin progress bar above the panel
  - Area hint: `Area: 22.4 m²`
  - Room type chips (one row): Living Room · Master BR · Bedroom · Kitchen · Toilet · Balcony · Bomb Shelter · Service Yard · Hallway
  - Custom name text input (for non-standard labels)
  - **← Back** · **Skip** · **Next →** navigation buttons
  - **Done** button (exits wizard with remaining rooms left as-is)
- Selecting a chip or confirming a custom name immediately advances to the next unlabeled room.
- Skipped rooms return at the end of the sequence.
- Wizard closes when all rooms are labeled or admin clicks Done.

### 5.2 Inline Popup (correction — available at any time)

- Clicking any detected room (labeled or still generic) while in select mode opens a floating popup at the room's centroid.
- Popup contains: current label display, room type chips, custom text input, ✓ confirm button.
- Dismiss: click elsewhere on canvas, or press Escape.
- The popup repositions if the centroid is too close to a canvas edge.

---

## 6. Vertex Editing (A + B)

Both modes move the same underlying wall endpoint. They coexist — the admin uses whichever is natural.

### 6.1 Mode A — Wall-centric (in wall-drawing / select mode)

- Clicking a wall segment selects it and shows two circular endpoint handles.
- Dragging a handle repositions that wall endpoint with grid and wall snapping applied.
- All rooms adjacent to that wall auto-update after drag end.

### 6.2 Mode B — Room-centric (in select / label mode)

- Clicking a room in select mode shows circular vertex handles at every polygon corner.
- Dragging a handle moves the corresponding wall endpoint(s) at that corner.
- A warning tooltip appears on shared vertices: *"Moving this also adjusts [adjacent room name]'s corner."*
- All affected rooms auto-update after drag end.

### 6.3 Shared behaviour

- Vertex editing is disabled while the label wizard is open — admin must close or finish the wizard first.
- Snapping: grid snap (configurable) + wall endpoint snap (within `snapDistance`).
- Load-bearing walls and external walls: endpoint dragging is blocked; handles shown in red with a lock icon.
- After any vertex drag, rooms are NOT automatically re-detected — the moved wall endpoint reshapes the polygon directly by updating the stored wall coordinates.

---

## 7. Re-detect with Label Preservation

When admin clicks "Re-detect Rooms" after modifying walls:

1. Run `splitWalls()` + `detectRooms()` on the current wall set.
2. For each newly-detected polygon, compute its centroid.
3. Check if the centroid falls inside any existing labeled room polygon (using point-in-polygon test).
4. If yes → inherit the existing label and roomType.
5. If no → assign a new generic `Room N` label.
6. Update stored walls with split segments (migrating openings).
7. If any rooms received generic labels → auto-open the wizard for those rooms only.

---

## 8. New & Modified Files

### New files

| File | Purpose |
|------|---------|
| `frontend/src/components/admin/RoomLabelingWizard.tsx` | Bottom panel wizard component |
| `frontend/src/components/admin/RoomLabelPopup.tsx` | Floating inline popup component |

### Modified files

| File | Changes |
|------|---------|
| `frontend/src/stores/adminAnnotationStore.ts` | Add `isLabelingMode`, `activeLabelRoomIndex`, `labelingOrder[]`, `preserveLabelsOnRedetect()`, persist split walls in `detectAndSetRooms()` |
| `frontend/src/components/admin/WallAnnotationCanvas.tsx` | Room click → open popup; room vertex handles in select mode; wall endpoint dragging; door/window position migration on split |
| `frontend/src/components/admin/AnnotationToolbar.tsx` | Add "Re-detect Rooms" button and "Label Rooms" button (to re-enter wizard manually) |
| `frontend/src/pages/admin/FlatModelAnnotatePage.tsx` | Mount `RoomLabelingWizard`; wire wizard open/close; show split toast |

---

## 9. Store Shape (additions to adminAnnotationStore)

```typescript
// New state fields
isLabelingMode: boolean;          // wizard is open
activeLabelRoomIndex: number;     // which room in labelingOrder is current
labelingOrder: string[];          // room IDs in labeling sequence (largest area first)

// New actions
enterLabelingMode: () => void;    // open wizard, set labelingOrder to unlabeled rooms
exitLabelingMode: () => void;     // close wizard
advanceLabelRoom: () => void;     // move to next in labelingOrder
preserveLabelsOnRedetect: (
  newPolygons: RoomPolygon[],
  oldRooms: RoomDef[]
) => RoomDef[];                   // centroid-match and return merged room list
```

---

## 10. Edge Cases

| Scenario | Handling |
|----------|---------|
| Room too small for popup centroid | Popup repositions to nearest canvas edge with 8px margin |
| All rooms already labeled when detect runs | Wizard does not open; show toast "All rooms already labeled" |
| Admin closes wizard early | Remaining rooms keep generic labels; "Label Rooms" button re-enters wizard for unlabeled rooms only |
| Detect produces 0 rooms (walls don't form closed areas) | Show error toast: "No enclosed rooms detected — check for gaps in walls" |
| Load-bearing wall endpoint drag attempted | Block drag; show toast "Load-bearing walls cannot be reshaped" |
| Door on a wall that gets split | Remapped to correct sub-segment automatically (position fraction adjusted) |
| Multiple walls exactly collinear (duplicate wall) | `splitWalls()` deduplicates via TOL check; no duplicate segments stored |
