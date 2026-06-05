export interface Point { x: number; y: number; }
export interface WallInput { startX: number; startY: number; endX: number; endY: number; }
export interface RoomPolygon { vertices: Point[]; area: number; centroid: Point; }

interface HalfEdge { startX: number; startY: number; endX: number; endY: number; used: boolean; }

const TOL = 0.01;

function key(p: Point): string { return `${p.x.toFixed(4)},${p.y.toFixed(4)}`; }
function dist(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function ptOnSegment(p: Point, a: Point, b: Point): boolean {
  const d = dist(a, b); if (d < TOL) return false;
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (d * d);
  if (t < TOL / d || t > 1 - TOL / d) return false;
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }) < TOL;
}
function signedArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return area / 2;
}

/** 2D cross product */
function cross(a: Point, b: Point): number { return a.x * b.y - a.y * b.x; }

/**
 * Find the intersection point of two line segments, if they cross
 * in their interiors (not just touching at endpoints).
 * Returns the intersection point, or null if they don't cross.
 */
function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const da: Point = { x: a2.x - a1.x, y: a2.y - a1.y };
  const db: Point = { x: b2.x - b1.x, y: b2.y - b1.y };
  const crossProd = cross(da, db);
  if (Math.abs(crossProd) < 1e-10) return null; // parallel or collinear

  const dAB: Point = { x: b1.x - a1.x, y: b1.y - a1.y };
  const s = cross(dAB, db) / crossProd;
  const t = cross(dAB, da) / crossProd;

  // Strict interior check: exclude endpoints (T-junctions handled separately)
  if (s <= TOL || s >= 1 - TOL || t <= TOL || t >= 1 - TOL) return null;

  return { x: a1.x + s * da.x, y: a1.y + s * da.y };
}

/**
 * Split walls at all intersection points so the half-edge graph
 * has vertices at every wall junction (T-junctions and X-crossings).
 */
function splitWalls(walls: WallInput[]): WallInput[] {
  // Step 1: Collect all split points per wall
  const wallList = walls.map((w, i) => ({ ...w, idx: i }));
  const splitPts: Point[][] = wallList.map(() => []);

  for (let i = 0; i < wallList.length; i++) {
    for (let j = i + 1; j < wallList.length; j++) {
      const a1: Point = { x: wallList[i].startX, y: wallList[i].startY };
      const a2: Point = { x: wallList[i].endX, y: wallList[i].endY };
      const b1: Point = { x: wallList[j].startX, y: wallList[j].startY };
      const b2: Point = { x: wallList[j].endX, y: wallList[j].endY };

      // Check for X-crossing (interior intersection)
      const crossing = segmentIntersection(a1, a2, b1, b2);
      if (crossing) {
        splitPts[i].push(crossing);
        splitPts[j].push(crossing);
      }

      // Check for T-junctions: endpoints of one wall on the other
      for (const p of [b1, b2]) {
        if (ptOnSegment(p, a1, a2)) splitPts[i].push({ ...p });
      }
      for (const p of [a1, a2]) {
        if (ptOnSegment(p, b1, b2)) splitPts[j].push({ ...p });
      }
    }
  }

  // Step 2: Split each wall at its collected split points
  const result: WallInput[] = [];
  for (let i = 0; i < wallList.length; i++) {
    const w = wallList[i];
    const pts = splitPts[i];
    if (pts.length === 0) {
      result.push({ startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY });
      continue;
    }

    // Sort split points along the wall direction
    const dx = w.endX - w.startX;
    const dy = w.endY - w.startY;
    pts.sort((a, b) => {
      const ta = dx !== 0 ? (a.x - w.startX) / dx : (a.y - w.startY) / dy;
      const tb = dx !== 0 ? (b.x - w.startX) / dx : (b.y - w.startY) / dy;
      return ta - tb;
    });

    // Create segments between consecutive points
    let prev: Point = { x: w.startX, y: w.startY };
    for (const p of pts) {
      if (dist(prev, p) > TOL) {
        result.push({ startX: prev.x, startY: prev.y, endX: p.x, endY: p.y });
      }
      prev = p;
    }
    if (dist(prev, { x: w.endX, y: w.endY }) > TOL) {
      result.push({ startX: prev.x, startY: prev.y, endX: w.endX, endY: w.endY });
    }
  }

  return result;
}

export function detectRooms(walls: WallInput[]): RoomPolygon[] {
  // Step 1: Split walls at intersection points
  const split = splitWalls(walls);
  if (split.length < 3) return [];

  // Step 2: Build half-edge array (forward + reverse for each wall segment)
  // Assign each half-edge a unique index so we can map to its twin
  const halfEdges: (HalfEdge & { id: number; twinId: number })[] = [];
  let nextId = 0;
  for (const w of split) {
    const fwdId = nextId++;
    const revId = nextId++;
    halfEdges.push({ id: fwdId, twinId: revId, startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY, used: false });
    halfEdges.push({ id: revId, twinId: fwdId, startX: w.endX, startY: w.endY, endX: w.startX, endY: w.startY, used: false });
  }

  // Step 3: Index half-edges by start point, and sort each bucket by outgoing angle
  const edgeMap = new Map<string, (typeof halfEdges)[0][]>();
  for (const he of halfEdges) {
    const k = key({ x: he.startX, y: he.startY });
    const list = edgeMap.get(k) || [];
    list.push(he);
    edgeMap.set(k, list);
  }

  // Sort each bucket by outgoing angle
  for (const [, list] of edgeMap) {
    list.sort((a, b) => {
      const angA = Math.atan2(a.endY - a.startY, a.endX - a.startX);
      const angB = Math.atan2(b.endY - b.startY, b.endX - b.startX);
      return angA - angB;
    });
  }

  // Step 4: Build a "next edge" map for face traversal.
  // For each half-edge h = (u→v), the next edge in the face is:
  // at vertex v, find the twin edge (v→u), then take the next edge
  // in clockwise order (i.e., the previous edge in the sorted angular order,
  // since edges are sorted CCW and we want the one CW from the twin).
  const nextEdge = new Map<number, typeof halfEdges[0]>();

  for (const he of halfEdges) {
    const vKey = key({ x: he.endX, y: he.endY });
    const outgoing = edgeMap.get(vKey) || [];
    if (outgoing.length === 0) continue;

    // The twin edge goes from v → u (back along the same segment)
    const twin = halfEdges[he.twinId];
    // Incoming direction to v (from u): angle(u→v)
    // To find the next clockwise edge: we want the edge whose outgoing angle
    // is the NEXT one CLOCKWISE from the twin's outgoing angle.
    // Since edges are sorted CCW, CW-next = one position BEFORE in sorted order.
    const twinAngle = Math.atan2(twin.endY - twin.startY, twin.endX - twin.startX);

    // Find the twin's position in the sorted list at vertex v
    let twinIdx = outgoing.findIndex(e => e.id === twin.id);
    if (twinIdx === -1) twinIdx = outgoing.findIndex(e =>
      Math.abs(e.startX - twin.startX) < TOL &&
      Math.abs(e.startY - twin.startY) < TOL &&
      Math.abs(e.endX - twin.endX) < TOL &&
      Math.abs(e.endY - twin.endY) < TOL
    );

    if (twinIdx === -1) {
      // Fallback: find by angle
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < outgoing.length; i++) {
        const ang = Math.atan2(outgoing[i].endY - outgoing[i].startY, outgoing[i].endX - outgoing[i].startX);
        let diff = ang - twinAngle;
        if (diff < 0) diff += 2 * Math.PI;
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      }
      twinIdx = bestIdx;
    }

    // The next clockwise edge is the one BEFORE twinIdx in sorted (CCW) order
    const nextIdx = (twinIdx - 1 + outgoing.length) % outgoing.length;
    nextEdge.set(he.id, outgoing[nextIdx]);
  }

  // Step 5: Walk each unused half-edge following the next-edge map
  const rooms: RoomPolygon[] = [];
  const MAX_STEPS = halfEdges.length * 2;

  for (const startEdge of halfEdges) {
    if (startEdge.used) continue;

    const vertices: Point[] = [{ x: startEdge.startX, y: startEdge.startY }];
    let current = startEdge;
    current.used = true;
    let closed = false;
    let steps = 0;

    while (steps < MAX_STEPS) {
      steps++;
      const nextPoint: Point = { x: current.endX, y: current.endY };
      vertices.push(nextPoint);

      if (key(nextPoint) === key(vertices[0])) { closed = true; break; }

      const next = nextEdge.get(current.id);
      if (!next || next.used) break;
      current = next;
      current.used = true;
    }

    if (closed && vertices.length >= 4) {
      const poly = vertices.slice(0, -1);
      const area = signedArea(poly);
      // Positive area (CCW) = room interior. Negative (CW) = outer boundary.
      // Only keep positive-area faces (interior rooms).
      if (area > 0.01) {
        rooms.push({ vertices: poly, area, centroid: polygonCentroid(poly) });
      }
    }
  }

  return rooms;
}

function polygonCentroid(vertices: Point[]): Point {
  let cx = 0, cy = 0;
  for (const v of vertices) { cx += v.x; cy += v.y; }
  return { x: cx / vertices.length, y: cy / vertices.length };
}
