## Wireframe: Admin — Add New BTO Project (Multi-Step Flow)

**Status:** New — wall-editing era

### Design stance
Wizard-style, step-by-step. Admin fills details, uploads floor plan, draws walls, labels auto-detected rooms, sets defaults, then publishes.

### Steps (vertical wizard)
| Step | Action |
|------|--------|
| **1. Project Details** | Name, slug, location, launch year, description, hero image |
| **2. Add Flat Model** | Model name, flat type, total area, upload floor plan |
| **3. Draw Walls** | Wall canvas: draw wall segments, snap-to-grid, mark load-bearing/external/party |
| **4. Auto-Detect Rooms** | System computes enclosures → admin labels each room (type + name) |
| **5. Set Defaults** | Per-room default wall color, floor type, floor color |
| **6. Preview & Publish** | 3D preview, room summary table, publish button |

### States
- **Step 1 incomplete** → Next button disabled
- **Floor plan uploading** → Progress bar
- **Drawing walls** → Grid visible, snap indicators, wall type legend
- **Rooms detected** → Show count + list before proceeding
- **Save as draft** → Can return later
- **Publish** → Model visible to all users
