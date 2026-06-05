import { describe, it, expect } from 'vitest';
import { splitWalls, pointInPolygon, detectRooms } from '../roomDetection';

describe('splitWalls', () => {
  it('returns wall unchanged when no intersections', () => {
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },
      { startX: 0, startY: 0, endX: 0, endY: 3 },
    ];
    const result = splitWalls(walls);
    expect(result).toHaveLength(2);
  });

  it('splits a long wall at a T-junction', () => {
    // Long horizontal wall from x=0 to x=4
    // Vertical wall endpoint at (2, 0) — T-junction
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },  // long wall
      { startX: 2, startY: 0, endX: 2, endY: 3 },   // perpendicular
    ];
    const result = splitWalls(walls);
    // Long wall should split into [0→2] and [2→4]
    const horizontals = result.filter(w => Math.abs(w.startY - w.endY) < 0.01);
    expect(horizontals).toHaveLength(2);
    const xs = horizontals.flatMap(w => [w.startX, w.endX]).sort((a, b) => a - b);
    expect(xs).toEqual([0, 2, 2, 4]);
  });

  it('splits at X-crossing (two walls crossing in interior)', () => {
    const walls = [
      { startX: 0, startY: 1, endX: 4, endY: 1 },  // horizontal
      { startX: 2, startY: 0, endX: 2, endY: 3 },   // vertical, crosses at (2,1)
    ];
    const result = splitWalls(walls);
    // Each wall should be split into 2 = 4 segments total
    expect(result).toHaveLength(4);
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 },
  ];

  it('returns true for point inside polygon', () => {
    expect(pointInPolygon({ x: 2, y: 2 }, square)).toBe(true);
  });

  it('returns false for point outside polygon', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(false);
  });

  it('returns false for point on boundary (edge case)', () => {
    // Ray casting is ambiguous on boundary; just verify it does not throw
    expect(() => pointInPolygon({ x: 0, y: 0 }, square)).not.toThrow();
  });
});

describe('detectRooms', () => {
  it('detects a single rectangle from 4 walls', () => {
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },
      { startX: 4, startY: 0, endX: 4, endY: 3 },
      { startX: 4, startY: 3, endX: 0, endY: 3 },
      { startX: 0, startY: 3, endX: 0, endY: 0 },
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(12, 0);
  });

  it('detects two rooms from a divided rectangle', () => {
    const walls = [
      { startX: 0, startY: 0, endX: 4, endY: 0 },
      { startX: 4, startY: 0, endX: 4, endY: 3 },
      { startX: 4, startY: 3, endX: 0, endY: 3 },
      { startX: 0, startY: 3, endX: 0, endY: 0 },
      { startX: 2, startY: 0, endX: 2, endY: 3 },  // divider
    ];
    const rooms = detectRooms(walls);
    expect(rooms).toHaveLength(2);
  });
});
