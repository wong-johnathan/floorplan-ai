## Wireframe: Admin — Draw Walls Detailed

**Status:** New — wall-editing era

### Design stance
Detailed view of the wall-drawing canvas in action. Shows snap behavior, wall selection, load-bearing toggling, and auto room detection feedback.

### Key elements
- **Canvas** with floor plan image as background
- **Wall segments** as thick lines with endpoint dots (snappable)
- **Color legend**: Red=external, Amber=l-hatched=load-bearing, Teal=internal, Grey=party
- **Snap indicators**: White dots at wall endpoints, green highlight when cursor within snap radius
- **Grid overlay** (togglable with G key)
- **Selected wall** properties in side panel
- **Auto room detection indicator** — rooms shown as translucent fills with border
- **Tool modes**: Draw (chain-click), Select (click wall), Door (click wall + drag position), Window, Load-bearing toggle, Delete

### Interaction states
| Action | Visual |
|--------|--------|
| Hover near wall endpoint | Green snap dot appears |
| Click start point | Dot turns cyan (locked) |
| Drag to endpoint | Live wall preview as dashed line |
| Snap to existing endpoint | Wall segment auto-connects |
| Right-click wall | Context menu: Properties, Mark Load-Bearing, Delete |
| Click auto-detected room | Room highlights, label prompt appears |

### Room detection feedback
- When a wall loop closes (all endpoints connected), the enclosed area flashes briefly
- Room label appears with auto-generated name: "Room 1", "Room 2"
- Admin clicks label to set proper name and type
- Room count updates in real-time
