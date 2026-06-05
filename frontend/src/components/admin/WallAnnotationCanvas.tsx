import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Image as KonvaImage, Rect, Group, Arc, Shape, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { FurnitureOutlines } from '../../lib/furnitureOutlines';

interface Props {
  floorPlanUrl: string | null;
  onRoomClick?: (roomId: string, screenX: number, screenY: number) => void;
}

const PIXELS_PER_METRE = 100; // Default: 100px = 1 metre
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const VERTEX_MATCH_TOL = 0.05;

const ROOM_COLORS: Record<string, string> = {
  living: '#F5F0E8', bedroom_master: '#E8ECF5', bedroom: '#EEF5EA',
  kitchen: '#FFF5EA', toilet: '#EAF0F5', bomb_shelter: '#F0EAEA',
  service_yard: '#F5F5F0', hallway: '#F8F8F5', balcony: '#EAF5F0',
};

export function WallAnnotationCanvas({ floorPlanUrl, onRoomClick }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 1200, h: 800 });
  const [ortho, setOrtho] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snapTarget, setSnapTarget] = useState<{ x: number; y: number } | null>(null);
  const [activelyPanning, setActivelyPanning] = useState(false);
  const [hoveredFurn, setHoveredFurn] = useState<string | null>(null);

  const walls = useAnnotationStore(s => s.walls);
  const rooms = useAnnotationStore(s => s.rooms);
  const tool = useAnnotationStore(s => s.tool);
  const selectedWallId = useAnnotationStore(s => s.selectedWallId);
  const selectedRoomId = useAnnotationStore(s => s.selectedRoomId);
  const isDrawing = useAnnotationStore(s => s.isDrawing);
  const drawStart = useAnnotationStore(s => s.drawStart);
  const drawPreview = useAnnotationStore(s => s.drawPreview);
  const snapToGrid = useAnnotationStore(s => s.snapToGrid);
  const orthoSnap = useAnnotationStore(s => s.orthoSnap);
  const endpointSnap = useAnnotationStore(s => s.endpointSnap);
  const showBackground = useAnnotationStore(s => s.showBackground);
  const showFurniture = useAnnotationStore(s => s.showFurniture);
  const showFurnitureLabels = useAnnotationStore(s => s.showFurnitureLabels);
  const wallOpacity = useAnnotationStore(s => s.wallOpacity);
  const furniture = useAnnotationStore(s => s.furniture);
  const selectedFurnitureId = useAnnotationStore(s => s.selectedFurnitureId);
  const placingFurnitureType = useAnnotationStore(s => s.placingFurnitureType);
  const addFurniture = useAnnotationStore(s => s.addFurniture);
  const updateFurniture = useAnnotationStore(s => s.updateFurniture);
  const removeFurniture = useAnnotationStore(s => s.removeFurniture);
  const selectFurniture = useAnnotationStore(s => s.selectFurniture);
  const setPlacingFurnitureType = useAnnotationStore(s => s.setPlacingFurnitureType);
  const isLabelingMode = useAnnotationStore(s => s.isLabelingMode);
  const activeLabelRoomIndex = useAnnotationStore(s => s.activeLabelRoomIndex);
  const labelingOrder = useAnnotationStore(s => s.labelingOrder);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedFurnitureId) {
      const node = stage.findOne(`#${selectedFurnitureId}`);
      if (node) { tr.nodes([node]); tr.getLayer()?.batchDraw(); return; }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedFurnitureId, furniture]);

  const addWall = useAnnotationStore(s => s.addWall);
  const selectWall = useAnnotationStore(s => s.selectWall);
  const selectRoom = useAnnotationStore(s => s.selectRoom);
  const deleteWall = useAnnotationStore(s => s.deleteWall);
  const addDoor = useAnnotationStore(s => s.addDoor);
  const addWindow = useAnnotationStore(s => s.addWindow);
  const setTool = useAnnotationStore(s => s.setTool);
  const setDrawStart = useAnnotationStore(s => s.setDrawStart);
  const setDrawPreview = useAnnotationStore(s => s.setDrawPreview);
  const setIsDrawing = useAnnotationStore(s => s.setIsDrawing);
  const undo = useAnnotationStore(s => s.undo);
  const redo = useAnnotationStore(s => s.redo);

  // Refs to avoid stale closures in memoized callbacks
  const snapRef = useRef({ snapToGrid, orthoSnap, endpointSnap });
  snapRef.current = { snapToGrid, orthoSnap, endpointSnap };

  const scale = PIXELS_PER_METRE;

  // Resize
  useEffect(() => {
    function resize() {
      setStageSize({ w: window.innerWidth, h: window.innerHeight - 80 });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Auto-center on content when first loaded
  const hasAutoCentered = useRef(false);
  useEffect(() => {
    if (hasAutoCentered.current) return;
    const hasContent = walls.length > 0 || furniture.length > 0;
    if (!hasContent) return;
    // Small delay to ensure stage is sized and rendered
    const timer = setTimeout(() => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const w of walls) {
        minX = Math.min(minX, w.startX, w.endX);
        minY = Math.min(minY, w.startY, w.endY);
        maxX = Math.max(maxX, w.startX, w.endX);
        maxY = Math.max(maxY, w.startY, w.endY);
      }
      for (const f of furniture) {
        minX = Math.min(minX, f.x - f.width / 2);
        minY = Math.min(minY, f.y - f.height / 2);
        maxX = Math.max(maxX, f.x + f.width / 2);
        maxY = Math.max(maxY, f.y + f.height / 2);
      }
      if (!isFinite(minX)) return;
      const pad = 1.5;
      const cw = maxX - minX + pad * 2;
      const ch = maxY - minY + pad * 2;
      const fit = Math.min((stageSize.w - 60) / toScreen(cw), (stageSize.h - 60) / toScreen(ch), 1.5);
      setZoom(fit);
      setPan({
        x: stageSize.w / 2 - toScreen((minX + maxX) / 2) * fit,
        y: stageSize.h / 2 - toScreen((minY + maxY) / 2) * fit,
      });
      hasAutoCentered.current = true;
    }, 200);
    return () => clearTimeout(timer);
  }, [walls, furniture, stageSize]);

  // Load bg image
  useEffect(() => {
    if (floorPlanUrl) {
      const img = new window.Image(); img.crossOrigin = 'anonymous'; img.src = floorPlanUrl;
      img.onload = () => { setBgImage(img); };
    }
  }, [floorPlanUrl]);

  function toScreen(m: number) { return m * scale; }
  function toMetres(px: number) { return px / scale; }

  function getPointer(_e: Konva.KonvaEventObject<MouseEvent>) {
    const s = stageRef.current; if (!s) return null;
    const pos = s.getPointerPosition(); if (!pos) return null;
    const contentX = (pos.x - pan.x) / zoom;
    const contentY = (pos.y - pan.y) / zoom;
    return { x: toMetres(contentX), y: toMetres(contentY) };
  }

  function fullSnap(from: Point | null, raw: Point): { snapped: Point; target: Point | null } {
    const { snapToGrid: sg, orthoSnap: os, endpointSnap: es } = snapRef.current;
    let p = sg(raw);
    if (from && ortho) p = os(from, p);
    const snapped = es(p);
    const target = (snapped.x !== p.x || snapped.y !== p.y) ? snapped : null;
    return { snapped, target };
  }

  type Point = { x: number; y: number };

  function nearestOnWall(point: Point) {
    let best = { wallId: '', pos: 0.5, dist: Infinity };
    for (const w of walls) {
      const dx = w.endX - w.startX, dy = w.endY - w.startY;
      const len = Math.hypot(dx, dy); if (len < 0.01) continue;
      const t = Math.max(0, Math.min(1, ((point.x - w.startX) * dx + (point.y - w.startY) * dy) / (len * len)));
      const px = w.startX + t * dx, py = w.startY + t * dy;
      const d = Math.hypot(point.x - px, point.y - py);
      if (d < best.dist) best = { wallId: w.id!, pos: t, dist: d };
    }
    return best.dist < 0.5 ? best : null;
  }

  // Refs to avoid stale closures in memoized handlers
  const selWallRef = useRef(selectedWallId); selWallRef.current = selectedWallId;
  const selFurnRef = useRef(selectedFurnitureId); selFurnRef.current = selectedFurnitureId;
  const furnRef = useRef(furniture); furnRef.current = furniture;

  // Keyboard
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'Shift') setOrtho(true);
      if (!e.metaKey && !e.ctrlKey && document.activeElement === document.body) {
        if (e.key === 'w') setTool('draw-wall');
        if (e.key === 's') setTool('select');
        if (e.key === 'v') setTool('divider');
        if (e.key === 'h') setTool('pan');
        if (e.key === 'Escape') { setIsDrawing(false); setDrawStart(null); setDrawPreview(null); setPlacingFurnitureType(null); if (tool !== 'select') setTool('select'); }
        if (e.key === 'Delete' || e.key === 'Backspace') { if (selFurnRef.current) removeFurniture(selFurnRef.current); else if (selWallRef.current) deleteWall(selWallRef.current); }
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'Shift') setOrtho(false);
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [tool, deleteWall, removeFurniture, setIsDrawing, setDrawStart, setDrawPreview, setPlacingFurnitureType, setTool, undo, redo]);

  // Zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const s = stageRef.current; if (!s) return;
    const pointer = s.getPointerPosition(); if (!pointer) return;
    const oldZoom = zoom;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * (1 + direction * 0.1)));
    const mousePointTo = { x: (pointer.x - pan.x) / oldZoom, y: (pointer.y - pan.y) / oldZoom };
    setZoom(newZoom);
    setPan({ x: pointer.x - mousePointTo.x * newZoom, y: pointer.y - mousePointTo.y * newZoom });
  }, [zoom, pan]);

  // Pan state
  const panStartRef = useRef({ x: 0, y: 0, active: false });
  const isPanning = tool === 'pan';

  // Drawing tools
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Panning: middle mouse button or left-click in pan mode
    if (e.evt.button === 1 || (e.evt.button === 0 && isPanning)) {
      panStartRef.current = { x: e.evt.clientX - pan.x, y: e.evt.clientY - pan.y, active: true };
      setActivelyPanning(true);
      e.evt.preventDefault();
      return;
    }
    const raw = getPointer(e); if (!raw) return;
    const { snapped, target } = fullSnap(null, raw);
    setSnapTarget(target);

    if (tool === 'draw-wall' || tool === 'divider') {
      if (!isDrawing) {
        setDrawStart(snapped); setIsDrawing(true); setDrawPreview(snapped);
      } else if (drawStart) {
        const endResult = fullSnap(drawStart, snapped);
        const len = Math.hypot(endResult.snapped.x - drawStart.x, endResult.snapped.y - drawStart.y);
        if (len > 0.05) { addWall(drawStart, endResult.snapped); setDrawStart(endResult.snapped); setDrawPreview(endResult.snapped); }
      }
      return;
    }
    if (tool === 'add-door' || tool === 'add-window') {
      const hit = nearestOnWall(snapped);
      if (hit && hit.dist < 1) {
        if (tool === 'add-door') addDoor(hit.wallId, hit.pos);
        else addWindow(hit.wallId, hit.pos);
      }
      return;
    }
    if (tool === 'place-furniture' && placingFurnitureType) {
      const def = FURNITURE_CATALOG.find(f => f.type === placingFurnitureType);
      if (def) {
        addFurniture({
          itemType: def.type, x: snapped.x, y: snapped.y,
          width: def.defaultW, height: def.defaultH, rotation: 0,
        });
        setPlacingFurnitureType(null);
      }
      return;
    }
    if (tool === 'select') {
      const t = e.target; const name = t.name?.();
      const targetId = t.id?.();
      if (targetId && furnRef.current.some(f => f.id === targetId)) { selectFurniture(targetId); return; }
      if (name?.startsWith('door-')) { const [, wallId] = name.split('-'); useAnnotationStore.setState({ selectedWallId: wallId, selectedRoomId: null }); return; }
      if (name?.startsWith('win-')) { const [, wallId] = name.split('-'); useAnnotationStore.setState({ selectedWallId: wallId, selectedRoomId: null }); return; }
      if (e.target === e.target.getStage()) { selectWall(null); selectRoom(null); selectFurniture(null); }
    }
  }, [tool, isDrawing, drawStart, addWall, setDrawStart, setIsDrawing, setDrawPreview, nearestOnWall, addDoor, addWindow, selectWall, selectRoom, walls]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Panning
    if (panStartRef.current.active) {
      setPan({ x: e.evt.clientX - panStartRef.current.x, y: e.evt.clientY - panStartRef.current.y });
      return;
    }
    const raw = getPointer(e); if (!raw) return;
    if ((tool === 'draw-wall' || tool === 'divider') && isDrawing && drawStart) {
      const result = fullSnap(drawStart, raw);
      setDrawPreview(result.snapped);
      setSnapTarget(result.target);
    } else {
      const result = fullSnap(null, raw);
      setSnapTarget(result.target);
    }
  }, [tool, isDrawing, drawStart, setDrawPreview]);

  const handleMouseUp = useCallback(() => {
    if (panStartRef.current.active) {
      panStartRef.current.active = false;
      setActivelyPanning(false);
    }
  }, []);

  const handleDblClick = useCallback(() => {
    if (tool === 'draw-wall' || tool === 'divider') { setIsDrawing(false); setDrawStart(null); setDrawPreview(null); }
  }, [tool, setIsDrawing, setDrawStart, setDrawPreview]);

  // Visual helpers
  /** Get wall segments with gaps for door openings.
   *  First segment always starts at wall start, last always ends at wall end,
   *  so corners between walls stay aligned. */
  function wallSegs(w: typeof walls[0]): { x1: number; y1: number; x2: number; y2: number }[] {
    const dx = w.endX - w.startX, dy = w.endY - w.startY;
    const len = Math.hypot(dx, dy);
    // Collect door + window openings as fractional gaps along the wall
    const openings: { t0: number; t1: number }[] = [];
    for (const d of (w.doors ?? [])) {
      const frac = (d.length ?? d.width ?? 0.9) / len;
      let t0: number, t1: number;
      if ((d.doorType ?? 'swing') === 'swing') {
        if (d.hinge === 'right') { t0 = d.position - frac; t1 = d.position; }
        else { t0 = d.position; t1 = d.position + frac; }
      } else {
        t0 = d.position - frac / 2;
        t1 = d.position + frac / 2;
      }
      openings.push({ t0: Math.max(0.005, t0), t1: Math.min(0.995, t1) });
    }
    for (const win of (w.windows ?? [])) {
      const frac = (win.width ?? 1.2) / len;
      const t0 = Math.max(0.005, win.position - frac / 2);
      const t1 = Math.min(0.995, win.position + frac / 2);
      openings.push({ t0, t1 });
    }
    if (!openings.length) return [{ x1: w.startX, y1: w.startY, x2: w.endX, y2: w.endY }];
    const gaps = openings.filter(g => g.t1 - g.t0 > 0.005).sort((a, b) => a.t0 - b.t0);
    if (!gaps.length) return [{ x1: w.startX, y1: w.startY, x2: w.endX, y2: w.endY }];
    // Build segments: start → gap1, gap1_end → gap2, ..., gapN_end → end
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    let t = 0;
    for (const g of gaps) {
      segs.push({ x1: w.startX + dx * t, y1: w.startY + dy * t, x2: w.startX + dx * g.t0, y2: w.startY + dy * g.t0 });
      t = g.t1;
    }
    segs.push({ x1: w.startX + dx * t, y1: w.startY + dy * t, x2: w.endX, y2: w.endY });
    return segs;
  }

  function labelCoords(f: typeof furniture[0], lw: number) {
    const gap = 4;
    const hw = toScreen(f.width) / 2, hh = toScreen(f.height) / 2;
    const cx = toScreen(f.x), cy = toScreen(f.y);
    const pos = f.labelPosition ?? 'center';
    switch (pos) {
      // Corner positions — label extends outward from the edge
      case 'top-right':     return { lx: cx + hw + gap,      ly: cy - hh - 18 - gap };
      case 'top-left':      return { lx: cx - hw - lw - gap, ly: cy - hh - 18 - gap };
      case 'bottom-right':  return { lx: cx + hw + gap,      ly: cy + hh + gap };
      case 'bottom-left':   return { lx: cx - hw - lw - gap, ly: cy + hh + gap };
      // Edge-center positions
      case 'top-center':    return { lx: cx - lw / 2,        ly: cy - hh - 18 - gap };
      case 'bottom-center': return { lx: cx - lw / 2,        ly: cy + hh + gap };
      case 'middle-right':  return { lx: cx + hw + gap,      ly: cy - 9 };
      case 'middle-left':   return { lx: cx - hw - lw - gap, ly: cy - 9 };
      // Center position — inside the shape
      case 'center':        return { lx: cx - lw / 2,        ly: cy - 9 };
      default:              return { lx: cx + hw + gap,      ly: cy - hh - 18 - gap };
    }
  }

  function wallColor(w: typeof walls[0]) {
    if (w.wallType === 'virtual') return '#63B3ED';
    if (w.isLoadBearing || w.wallType === 'external') return '#000000';
    if (w.wallType === 'party') return '#4A5568';
    return '#A0AEC0';
  }
  function wallW(w: typeof walls[0]) {
    if (w.wallType === 'virtual') return toScreen(0.02);
    return toScreen(w.thickness ?? (w.isLoadBearing || w.wallType === 'external' ? 0.22 : 0.1));
  }
  function wallDash(w: typeof walls[0]) { return w.wallType === 'virtual' ? [toScreen(0.1), toScreen(0.08)] : []; }

  function getRoomPolygon(roomId: string): Point[] | null {
    const rWalls = walls.filter(w => w.positiveRoomId === roomId || w.negativeRoomId === roomId);
    if (rWalls.length < 3) return null;
    const pts: Point[] = []; let current = rWalls[0];
    const start = { x: current.startX, y: current.startY }; pts.push(start);
    let end = { x: current.endX, y: current.endY };
    const remaining = new Set(rWalls.map(w => w.id)); remaining.delete(current.id!);
    for (let i = 0; i < rWalls.length + 1; i++) {
      const next = rWalls.find(w => remaining.has(w.id!) && ((Math.abs(w.startX - end.x) < 0.01 && Math.abs(w.startY - end.y) < 0.01) || (Math.abs(w.endX - end.x) < 0.01 && Math.abs(w.endY - end.y) < 0.01)));
      if (!next) break; remaining.delete(next.id!);
      end = (Math.abs(next.endX - end.x) < 0.01 && Math.abs(next.endY - end.y) < 0.01) ? { x: next.startX, y: next.startY } : { x: next.endX, y: next.endY };
      pts.push(end);
      if (Math.abs(end.x - start.x) < 0.01 && Math.abs(end.y - start.y) < 0.01 && pts.length >= 3) break;
    }
    return pts.length >= 3 ? pts : null;
  }

  // Grid
  const storeGridSize = useAnnotationStore(s => s.gridSize);
  const storeGridSnap = useAnnotationStore(s => s.gridSnap);
  const gridSize = storeGridSnap ? storeGridSize : 0.5; // Show coarser grid when snap off
  const gridExtent = 100; // metres to cover
  const gridCount = Math.ceil(gridExtent / gridSize);
  const gridLines = [];
  for (let i = -gridCount; i <= gridCount; i++) {
    const pos = i * gridSize;
    gridLines.push(<Line key={`gh${i}`} points={[toScreen(-gridExtent), toScreen(pos), toScreen(gridExtent), toScreen(pos)]} stroke="#e8e8e8" strokeWidth={0.5} listening={false} />);
    gridLines.push(<Line key={`gv${i}`} points={[toScreen(pos), toScreen(-gridExtent), toScreen(pos), toScreen(gridExtent)]} stroke="#e8e8e8" strokeWidth={0.5} listening={false} />);
  }

  function fireRoomClick(room: typeof rooms[0]) {
    if (!onRoomClick || room.centroidX == null || room.centroidY == null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const stageBox = stage.container().getBoundingClientRect();
    const sx = room.centroidX * PIXELS_PER_METRE * zoom + pan.x + stageBox.left;
    const sy = room.centroidY * PIXELS_PER_METRE * zoom + pan.y + stageBox.top;
    onRoomClick(room.id!, sx, sy);
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden min-w-0">
      {/* Zoom controls — bottom center */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/90 rounded-md border border-zinc-200 px-2 py-1 shadow-sm">
        <button onClick={() => { setZoom(z => Math.min(MAX_ZOOM, z * 1.2)); }} className="px-1.5 text-sm font-bold text-zinc-600 hover:text-zinc-900">+</button>
        <span className="text-xs text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => { setZoom(z => Math.max(MIN_ZOOM, z / 1.2)); }} className="px-1.5 text-sm font-bold text-zinc-600 hover:text-zinc-900">−</button>
        <button onClick={() => {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const w of walls) {
            minX = Math.min(minX, w.startX, w.endX);
            minY = Math.min(minY, w.startY, w.endY);
            maxX = Math.max(maxX, w.startX, w.endX);
            maxY = Math.max(maxY, w.startY, w.endY);
          }
          for (const f of furniture) {
            minX = Math.min(minX, f.x - f.width/2);
            minY = Math.min(minY, f.y - f.height/2);
            maxX = Math.max(maxX, f.x + f.width/2);
            maxY = Math.max(maxY, f.y + f.height/2);
          }
          if (isFinite(minX)) {
            setPan({
              x: stageSize.w / 2 - toScreen((minX + maxX) / 2) * zoom,
              y: stageSize.h / 2 - toScreen((minY + maxY) / 2) * zoom,
            });
          }
        }} className="px-1.5 text-xs text-zinc-500 hover:text-zinc-700 border-l border-zinc-200 ml-1 pl-2" title="Center view">Center</button>
      </div>

      <Stage ref={stageRef} width={stageSize.w} height={stageSize.h}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onDblClick={handleDblClick}
        onWheel={handleWheel}
        style={{ background: '#fafaf9', cursor: activelyPanning ? 'grabbing' : isPanning ? 'grab' : tool === 'draw-wall' || tool === 'divider' ? 'crosshair' : tool === 'place-furniture' ? 'copy' : 'default' }}>

        {/* Content layer with pan & zoom */}
        <Layer x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>

        {/* Background image */}
        {bgImage && showBackground && <KonvaImage image={bgImage} x={0} y={0} width={bgImage.naturalWidth} height={bgImage.naturalHeight} opacity={0.35} listening={false} />}
        {gridLines}

        <Group opacity={wallOpacity}>
        {/* Walls — split into segments around door openings */}
        {walls.filter(w => w.isLoadBearing || w.wallType === 'external').map(w =>
          wallSegs(w).map((s, si) => (
            <Line key={`hatch-${w.id}-${si}`} points={[toScreen(s.x1), toScreen(s.y1), toScreen(s.x2), toScreen(s.y2)]}
              stroke="#1A202C" strokeWidth={toScreen((w.thickness ?? 0.22) + 0.04)} lineCap="butt" listening={false} opacity={0.4} />
          ))
        )}
        {walls.map(w => {
          const sel = selectedWallId === w.id;
          const segs = wallSegs(w);
          return segs.map((s, si) => (
            <Line key={`${w.id}-${si}`} wallId={w.id} name={`wall-${w.id}`}
              points={[toScreen(s.x1), toScreen(s.y1), toScreen(s.x2), toScreen(s.y2)]}
              stroke={sel ? '#2563EB' : wallColor(w)} strokeWidth={wallW(w)} lineCap="butt"
              dash={wallDash(w)} hitStrokeWidth={toScreen(0.35)}
              onClick={() => { selectWall(w.id ?? null); }} />
          ));
        })}

        {/* Doors */}
        {walls.map(w => (w.doors ?? []).map((door, i) => {
          const dx = w.endX - w.startX, dy = w.endY - w.startY, len = Math.hypot(dx, dy);
          if (len < 0.01) return null;
          const wx = w.startX + dx * door.position, wy = w.startY + dy * door.position;
          const wallAngle = Math.atan2(dy, dx);
          const swingOut = door.swing === 'out';
          const hingeRight = door.hinge === 'right';
          const dw = door.width ?? 0.9;
          const dl = door.length ?? dw; // visual extension from wall
          const isFolding = door.doorType === 'folding';

          if (isFolding) {
            // Folding door: V-shape. Width = tip height, Length = base width
            const foldDir = swingOut ? -1 : 1;
            const perpX = -Math.sin(wallAngle) * foldDir;
            const perpY = Math.cos(wallAngle) * foldDir;
            const baseHalf = dl * 0.5;
            const tipHeight = dw;
            const tx = Math.cos(wallAngle);
            const ty = Math.sin(wallAngle);
            const p1x = wx - tx * baseHalf, p1y = wy - ty * baseHalf;
            const p2x = wx + tx * baseHalf, p2y = wy + ty * baseHalf;
            const tipX = wx + perpX * tipHeight, tipY = wy + perpY * tipHeight;
            return (
              <Line key={`door-${w.id}-${i}`} name={`door-${w.id}-${i}`}
                points={[toScreen(p1x), toScreen(p1y), toScreen(tipX), toScreen(tipY), toScreen(p2x), toScreen(p2y)]}
                stroke="#8B4513" strokeWidth={1.5}
                closed fill="rgba(139,69,19,0.15)" />
            );
          }

          // Swing door: line from hinge + quarter-circle arc
          let arcRotation: number;
          if (!hingeRight && !swingOut) arcRotation = wallAngle;
          else if (!hingeRight && swingOut) arcRotation = wallAngle - Math.PI / 2;
          else if (hingeRight && !swingOut) arcRotation = wallAngle + Math.PI / 2;
          else arcRotation = wallAngle + Math.PI;
          const arcDeg = arcRotation * 180 / Math.PI;
          // Thin line along wall from hinge to show closed edge
          const hingeAlong = hingeRight ? wallAngle + Math.PI : wallAngle;
          const lineEndX = wx + Math.cos(hingeAlong) * dl * 0.3;
          const lineEndY = wy + Math.sin(hingeAlong) * dl * 0.3;
          return (
            <Group key={`door-${w.id}-${i}`} name={`door-${w.id}-${i}`}>
              <Line points={[toScreen(wx), toScreen(wy), toScreen(lineEndX), toScreen(lineEndY)]}
                stroke="#8B4513" strokeWidth={1} />
              <Arc x={toScreen(wx)} y={toScreen(wy)}
                innerRadius={0} outerRadius={toScreen(dl)}
                angle={90} rotation={arcDeg}
                fill="rgba(139,69,19,0.15)" stroke="#8B4513" strokeWidth={1} />
            </Group>
          );
        }))}

        {/* Windows — rotated to align with wall direction */}
        {walls.map(w => (w.windows ?? []).map((win, i) => {
          const dx = w.endX - w.startX, dy = w.endY - w.startY, len = Math.hypot(dx, dy);
          if (len < 0.01) return null;
          const mx = w.startX + dx * win.position, my = w.startY + dy * win.position;
          const hw = toScreen((win.width ?? 1.2) / 2);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <Rect key={`win-${w.id}-${i}`} name={`win-${w.id}-${i}`}
              x={toScreen(mx)} y={toScreen(my)} width={hw * 2} height={6}
              fill="rgba(135,206,235,0.5)" stroke="#87CEEB" strokeWidth={1}
              offsetX={hw} offsetY={3} rotation={angle} />
          );
        }))}
        </Group>

        {/* Furniture — custom-drawn outlines */}
        {showFurniture && furniture.map(f => {
          const sx = toScreen(f.x), sy = toScreen(f.y);
          const sw = toScreen(f.width), sh = toScreen(f.height);
          const renderer = FurnitureOutlines[f.itemType];
          return (
            <Group key={f.id} id={f.id} name={`furn-${f.id}`}
              x={sx} y={sy} offsetX={sw / 2} offsetY={sh / 2}
              rotation={f.rotation}
              draggable={true}
              onClick={() => { selectFurniture(f.id ?? null); }}
              onTap={() => { selectFurniture(f.id ?? null); }}
              onMouseEnter={() => setHoveredFurn(f.id ?? null)}
              onMouseOut={() => setHoveredFurn(null)}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                updateFurniture(f.id!, { x: toMetres(e.target.x()), y: toMetres(e.target.y()) });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                const scaleX = node.scaleX(), scaleY = node.scaleY();
                node.scaleX(1); node.scaleY(1);
                updateFurniture(f.id!, {
                  x: toMetres(node.x()), y: toMetres(node.y()),
                  width: Math.max(0.1, f.width * scaleX),
                  height: Math.max(0.1, f.height * scaleY),
                  rotation: node.rotation(),
                });
              }}>
              <Rect width={sw} height={sh}
                fill="rgba(255,255,255,0.01)" strokeEnabled={false}
                perfectDrawEnabled={false} />
              <Shape width={sw} height={sh}
                sceneFunc={renderer ? (ctx: any) => {
                  const raw = ctx._context;
                  raw.save();
                  const origFill = raw.fill.bind(raw);
                  raw.fill = () => {};
                  renderer(raw, sw, sh);
                  raw.fill = origFill;
                  raw.restore();
                } : undefined}
                strokeEnabled={false}
                listening={false} />
            </Group>
          );
        })}

        <Transformer ref={transformerRef}
          rotateEnabled={true} resizeEnabled={true}
          borderEnabled={true} borderStroke="#2563EB" borderStrokeWidth={1} borderDash={[4, 3]}
          anchorFill="white" anchorStroke="#2563EB" anchorStrokeWidth={1}
          anchorSize={8} anchorCornerRadius={4}
          rotateAnchorOffset={16}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)} />

        {/* Furniture labels — always visible when toggled, hover-only otherwise */}
        {showFurnitureLabels
          ? furniture.map(f => {
              const def = FURNITURE_CATALOG.find(d => d.type === f.itemType);
              const label = f.label || def?.label || f.itemType;
              const lw = label.length * 7 + 16;
              const { lx, ly } = labelCoords(f, lw);
              return (
                <Group key={`label-${f.id}`} x={lx} y={ly} listening={false}>
                  <Rect x={0} y={0} width={lw} height={18}
                    fill="rgba(255,255,255,0.5)" cornerRadius={3}
                    stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
                  <Text x={0} y={0} width={lw} height={18}
                    text={label} fontSize={11} fontFamily="sans-serif"
                    fill="#333" align="center" verticalAlign="middle"
                    listening={false} />
                </Group>
              );
            })
          : hoveredFurn && (() => {
              const hf = furniture.find(f => f.id === hoveredFurn);
              if (!hf) return null;
              const def = FURNITURE_CATALOG.find(d => d.type === hf.itemType);
              const label = hf.label || def?.label || hf.itemType;
              const lw = label.length * 7 + 16;
              const { lx, ly } = labelCoords(hf, lw);
              return (
                <Group key="hover-label" x={lx} y={ly} listening={false}>
                  <Rect x={0} y={0} width={lw} height={18}
                    fill="rgba(255,255,255,0.5)" cornerRadius={3}
                    stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
                  <Text x={0} y={0} width={lw} height={18}
                    text={label} fontSize={11} fontFamily="sans-serif"
                    fill="#333" align="center" verticalAlign="middle"
                    listening={false} />
                </Group>
              );
            })()
        }


        {/* Mode A — Endpoint handles for selected wall */}
        {selectedWallId && (() => {
          const wall = walls.find(w => w.id === selectedWallId);
          if (!wall) return null;
          const pts: Array<{ key: 'start' | 'end'; mx: number; my: number }> = [
            { key: 'start', mx: wall.startX, my: wall.startY },
            { key: 'end',   mx: wall.endX,   my: wall.endY   },
          ];
          return pts.map(({ key, mx, my }) => (
            <Circle
              key={`ep-${wall.id}-${key}`}
              x={toScreen(mx)}
              y={toScreen(my)}
              radius={7 / zoom}
              fill="white"
              stroke={wall.isLoadBearing || wall.wallType === 'external' ? '#ef4444' : '#6382ff'}
              strokeWidth={2 / zoom}
              draggable={!wall.isLoadBearing && wall.wallType !== 'external'}
              onDragEnd={e => {
                const rawX = toMetres(e.target.x());
                const rawY = toMetres(e.target.y());
                const snapped = snapToGrid({ x: rawX, y: rawY });
                const finalSnapped = endpointSnap(snapped);
                if (key === 'start') {
                  useAnnotationStore.getState().updateWall(wall.id!, { startX: finalSnapped.x, startY: finalSnapped.y });
                } else {
                  useAnnotationStore.getState().updateWall(wall.id!, { endX: finalSnapped.x, endY: finalSnapped.y });
                }
                e.target.position({ x: toScreen(finalSnapped.x), y: toScreen(finalSnapped.y) });
              }}
              onDragStart={e => {
                if (wall.isLoadBearing || wall.wallType === 'external') {
                  e.target.stopDrag();
                }
              }}
            />
          ));
        })()}

        {/* Mode B — Room vertex handles */}
        {selectedRoomId && tool === 'select' && !isLabelingMode && (() => {
          const room = rooms.find(r => r.id === selectedRoomId);
          if (!room?.polygon || room.polygon.length === 0) return null;
          return room.polygon.map((vertex, vi) => {
            // Find which wall(s) have an endpoint at this vertex
            const matchingWalls = walls.filter(w =>
              (Math.abs(w.startX - vertex.x) < VERTEX_MATCH_TOL && Math.abs(w.startY - vertex.y) < VERTEX_MATCH_TOL) ||
              (Math.abs(w.endX   - vertex.x) < VERTEX_MATCH_TOL && Math.abs(w.endY   - vertex.y) < VERTEX_MATCH_TOL)
            );
            const isLoadBearing = matchingWalls.some(w => w.isLoadBearing || w.wallType === 'external');
            return (
              <Circle
                key={`rv-${room.id}-${vi}`}
                x={vertex.x * PIXELS_PER_METRE}
                y={vertex.y * PIXELS_PER_METRE}
                radius={6 / zoom}
                fill="white"
                stroke={isLoadBearing ? '#ef4444' : '#22c55e'}
                strokeWidth={2 / zoom}
                draggable={!isLoadBearing}
                title={matchingWalls.length > 2 ? 'Moving this also adjusts adjacent rooms' : undefined}
                onDragEnd={e => {
                  const raw = { x: e.target.x() / PIXELS_PER_METRE, y: e.target.y() / PIXELS_PER_METRE };
                  const snapped = snapToGrid(raw);
                  const finalPt = endpointSnap(snapped);
                  // Move all wall endpoints at this vertex
                  matchingWalls.forEach(w => {
                    const atStart = Math.abs(w.startX - vertex.x) < VERTEX_MATCH_TOL && Math.abs(w.startY - vertex.y) < VERTEX_MATCH_TOL;
                    if (atStart) {
                      useAnnotationStore.getState().updateWall(w.id!, { startX: finalPt.x, startY: finalPt.y });
                    } else {
                      useAnnotationStore.getState().updateWall(w.id!, { endX: finalPt.x, endY: finalPt.y });
                    }
                  });
                  e.target.position({ x: finalPt.x * PIXELS_PER_METRE, y: finalPt.y * PIXELS_PER_METRE });
                }}
                onDragStart={e => { if (isLoadBearing) e.target.stopDrag(); }}
              />
            );
          });
        })()}

        {/* Room polygons with fill + highlight */}
        {rooms.map(room => {
          const poly = getRoomPolygon(room.id!);
          if (!poly) return null;
          const flat = poly.flatMap(p => [toScreen(p.x), toScreen(p.y)]);
          const cx = room.centroidX ?? poly.reduce((s, p) => s + p.x, 0) / poly.length;
          const cy = room.centroidY ?? poly.reduce((s, p) => s + p.y, 0) / poly.length;
          const isActiveWizardRoom = isLabelingMode && labelingOrder[activeLabelRoomIndex] === room.id;
          const isDimmed = isLabelingMode && !isActiveWizardRoom;
          return (
            <Group key={`room-${room.id}`}>
              {/* Fill polygon */}
              <Line
                points={flat}
                closed
                fill={ROOM_COLORS[room.roomType ?? 'bedroom'] || '#eee'}
                stroke={isActiveWizardRoom ? '#6382ff' : '#d4d4d4'}
                strokeWidth={isActiveWizardRoom ? 3 / zoom : 1}
                opacity={isDimmed ? 0.3 : 0.5}
                listening={!isLabelingMode}
                onClick={() => {
                  selectRoom(room.id ?? null);
                  fireRoomClick(room);
                }}
              />
              {/* Room label text */}
              <Group onClick={() => {
                selectRoom(room.id ?? null);
                fireRoomClick(room);
              }}>
                <Text
                  x={toScreen(cx) - 55}
                  y={toScreen(cy) - 12}
                  text={room.label}
                  fontSize={12}
                  fontStyle="bold"
                  fill={selectedRoomId === room.id ? '#2563EB' : '#374151'}
                  align="center"
                  width={110}
                  opacity={isDimmed ? 0.5 : 1}
                />
                {room.area && (
                  <Text
                    x={toScreen(cx) - 55}
                    y={toScreen(cy) + 2}
                    text={`${room.area} sqm`}
                    fontSize={9}
                    fill="#888"
                    align="center"
                    width={110}
                    opacity={isDimmed ? 0.5 : 1}
                  />
                )}
              </Group>
            </Group>
          );
        })}

        {/* Snap indicator */}
        {snapTarget && (
          <Group listening={false}>
            <Circle x={toScreen(snapTarget.x)} y={toScreen(snapTarget.y)} radius={7}
              fill="transparent" stroke="#2563EB" strokeWidth={2} dash={[3, 2]} />
            <Line points={[toScreen(snapTarget.x) - 4, toScreen(snapTarget.y), toScreen(snapTarget.x) + 4, toScreen(snapTarget.y)]}
              stroke="#2563EB" strokeWidth={1.5} />
            <Line points={[toScreen(snapTarget.x), toScreen(snapTarget.y) - 4, toScreen(snapTarget.x), toScreen(snapTarget.y) + 4]}
              stroke="#2563EB" strokeWidth={1.5} />
          </Group>
        )}

        {/* Drawing preview */}
        {isDrawing && drawStart && (
          <>
            <Circle x={toScreen(drawStart.x)} y={toScreen(drawStart.y)} radius={5} fill="#2563EB" listening={false} />
            {drawPreview && (
              <>
                <Line points={[toScreen(drawStart.x), toScreen(drawStart.y), toScreen(drawPreview.x), toScreen(drawPreview.y)]} stroke="#2563EB" strokeWidth={tool === 'divider' ? 1.5 : 2} dash={tool === 'divider' ? [5, 5] : [4, 4]} listening={false} />
                <Text x={toScreen((drawStart.x + (drawPreview.x || drawStart.x)) / 2) + 10} y={toScreen((drawStart.y + (drawPreview.y || drawStart.y)) / 2) - 16}
                  text={`${(Math.hypot((drawPreview.x || drawStart.x) - drawStart.x, (drawPreview.y || drawStart.y) - drawStart.y) * 100).toFixed(0)} cm`} fontSize={11} fill="#2563EB" listening={false} />
              </>
            )}
          </>
        )}
        </Layer>
      </Stage>
    </div>
  );
}
