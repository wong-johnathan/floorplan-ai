## Wireframe: Admin Wall Annotation (Wall-Segment Based)

**Status:** ✅ Updated for wall-editing approach

### Design stance
Tool-like, functional. Maximizes canvas space for drawing wall segments. System auto-detects rooms from wall enclosures.

### Key choices
- **Layout:** Full canvas (70%) + wall properties panel (30%)
- **Color:** Dark theme (admin tool), accent colors for wall types
  - ═══ External walls (red accent)
  - 🧱 Load-bearing (amber hatched)
  - ─── Internal walls (default teal)
- **Interaction:** Toolbar at bottom (Draw Wall, Select, Door, Window, Delete, Toggle Load-Bearing)
- **Properties panel** shows: wall type, load-bearing toggle, thickness, height, length, adjacent rooms, doors/windows on this wall

### What it covers
- Floor plan canvas with **wall segments** overlaid (not room polygons)
- Color-coded wall types (external/load-bearing/internal)
- **Auto room detection** — rooms computed from wall enclosures
- After walls are drawn: click inside enclosure → label room type + name
- Door/window placement on walls with position slider
- Wall dimension auto-calculation display
- Toolbar with wall-drawing tools

### Compared to old polygon approach
- Was: Draw room polygons → manually fit rooms together
- Now: Draw wall segments → system detects rooms automatically
- Was: RoomConfig with vertices JSON
- Now: WallSegment[] + RoomDef[] with typed columns
