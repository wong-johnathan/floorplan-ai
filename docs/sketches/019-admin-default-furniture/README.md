## Wireframe: Admin — Default Furniture Placement

**Status:** New — wall-editing era

### Design stance
Admin creates furniture templates by placing items on a 2D overhead floor plan. Items snap to walls and grid. Templates auto-match to room type + style.

### Key elements
- **Template header**: Name, room category, style tag, publish status
- **2D overhead room view**: A selected room shown from above with walls outline
- **Furniture items** shown as scaled rectangles with icons
- **Side panel**: Catalog of available furniture with drag-into-room interaction
- **Per-item settings**: Position (drag), rotation (45° snap), wall anchor

### Flow
1. Admin selects **room type** (Living, MBR, Kitchen, etc.)
2. Selects **style tag** (Scandi, Japandi, Industrial, or Universal)
3. Drags furniture items from catalog into the room view
4. Positions each item: drag to move, rotate with dial
5. Sets wall anchor rule: against wall, facing wall, center
6. Saves template → available for AI matching during user sessions

### Visual representation
- Sofa: 2.0m × 0.9m rectangle with 🛋️ icon
- Coffee table: 1.2m × 0.7m rectangle with 🪑 icon
- Bed: 2.0m × 1.8m rectangle with 🛏️ icon
- Rug: 2.4m × 1.6m rectangle with 🟫 fill
- All items have dashed line to nearest wall showing anchor relationship
- Red outline = collision/overlap warning
- Green outline = valid position

### States
| State | Behaviour |
|-------|-----------|
| **Dragging item** | Ghost preview at 40% opacity; snap to grid/wall |
| **Item selected** | Blue outline + rotation handle |
| **Two items overlapping** | Both show red outline + warning icon |
| **Template complete** | "Publish" button becomes active |
| **Published** | Template available in user-facing matcher |
