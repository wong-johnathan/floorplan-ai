## Wireframe: Top-Down Camera Angle Picker

**Status:** ✅ Updated for wall-editing approach

### Design stance
Simpler than 3D free-camera. User clicks directly on the 2D floor plan to place the camera, then drags to set direction. System auto-computes eye-level 3D coordinates.

### Key elements
- **Top-down floor plan overlay** in the render settings panel
- **Click to place** camera position (eye-level at 1.6m automatically)
- **Drag direction arrow** to set viewing angle
- **Preview thumbnail** shows what the 3D camera sees
- **Name field** to save the angle
- **Saved angles list** with auto-generated (per room) + custom sections

### UX flow
1. User clicks "📷 Add Custom Camera Angle" from Final Render config
2. 2D floor plan overlay appears with room labels
3. User clicks anywhere inside a room (blue dot = camera position)
4. User drags to set viewing direction (arrow shows where camera points)
5. System auto-computes: camera pos = clicked point at Y=1.6m, target = 3m ahead in dragged direction, FOV = 50°
6. Small 3D thumbnail preview appears in corner
7. User names the angle → saves
8. Appears in render angle checklist alongside auto-presets

### Auto-generated angles per room type

| Room | Angle 1 | Angle 2 | Angle 3 |
|------|---------|---------|---------|
| Living | Corner View | Entrance View | Window-side |
| MBR | Door View | Bedside View | — |
| Kitchen | Entrance View | Counter Close-up | — |
| Bedroom | Door View | Window-side | Desk Corner |
