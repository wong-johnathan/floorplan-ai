import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from '../adminAnnotationStore';

beforeEach(() => {
  useAnnotationStore.getState().reset();
});

const RECT_WALLS = [
  { startX: 0, startY: 0, endX: 4, endY: 0 },
  { startX: 4, startY: 0, endX: 4, endY: 3 },
  { startX: 4, startY: 3, endX: 0, endY: 3 },
  { startX: 0, startY: 3, endX: 0, endY: 0 },
];

describe('detectAndSetRooms', () => {
  it('detects one room from a rectangle', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal', isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    const { rooms } = useAnnotationStore.getState();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].label).toBe('Room 1');
    expect(rooms[0].area).toBeCloseTo(12, 0);
  });

  it('stores centroid and polygon with each detected room', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal', isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    const room = useAnnotationStore.getState().rooms[0];
    expect(room.centroidX).toBeCloseTo(2, 1);
    expect(room.centroidY).toBeCloseTo(1.5, 1);
    expect(room.polygon).toBeDefined();
    expect(room.polygon!.length).toBeGreaterThanOrEqual(4);
  });

  it('splits a long wall at T-junctions and persists split segments', () => {
    // Rectangle with one long top wall and a vertical divider from the top
    const walls = [
      { id: 'top', startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'right', startX: 4, startY: 0, endX: 4, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'bottom', startX: 4, startY: 3, endX: 0, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'left', startX: 0, startY: 3, endX: 0, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'divider', startX: 2, startY: 0, endX: 2, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
    ];
    useAnnotationStore.getState().loadAnnotation(walls, []);
    // Initially 5 walls
    expect(useAnnotationStore.getState().walls).toHaveLength(5);
    useAnnotationStore.getState().detectAndSetRooms();
    const { walls: storedWalls } = useAnnotationStore.getState();
    // top wall (0→4) should split at x=2: [0→2] and [2→4] = 6 total
    expect(storedWalls.length).toBeGreaterThan(5);
  });

  it('migrates a door from a split wall to the correct sub-segment', () => {
    // Long wall from x=0 to x=4, door at position=0.25 (x=1), divider at x=2
    const longWall = {
      id: 'top', startX: 0, startY: 0, endX: 4, endY: 0,
      thickness: 0.1, height: 2.6, wallType: 'internal' as const,
      isLoadBearing: false,
      doors: [{ position: 0.25, width: 0.9, height: 2.1, swing: 'in' as const, hinge: 'left' as const, doorType: 'swing' as const, length: 0.9 }],
      windows: [],
    };
    const walls = [
      longWall,
      { id: 'right', startX: 4, startY: 0, endX: 4, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'bottom', startX: 4, startY: 3, endX: 0, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'left', startX: 0, startY: 3, endX: 0, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      { id: 'divider', startX: 2, startY: 0, endX: 2, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
    ];
    useAnnotationStore.getState().loadAnnotation(walls, []);
    useAnnotationStore.getState().detectAndSetRooms();
    const { walls: storedWalls } = useAnnotationStore.getState();
    // Door was at position 0.25 of [0→4] = x=1, which is on the [0→2] sub-segment
    // After migration it should be at position 0.5 of [0→2] (1/2 = 0.5)
    const leftHalf = storedWalls.find(w => Math.abs(w.startX - 0) < 0.01 && Math.abs(w.endX - 2) < 0.01);
    expect(leftHalf).toBeDefined();
    expect(leftHalf!.doors).toHaveLength(1);
    expect(leftHalf!.doors![0].position).toBeCloseTo(0.5, 2);
  });
});

describe('labeling mode', () => {
  it('enterLabelingMode sets isLabelingMode=true and builds labelingOrder from unlabeled rooms', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    useAnnotationStore.getState().enterLabelingMode();
    const { isLabelingMode, labelingOrder, rooms } = useAnnotationStore.getState();
    expect(isLabelingMode).toBe(true);
    expect(labelingOrder).toHaveLength(rooms.length);
  });

  it('exitLabelingMode sets isLabelingMode=false', () => {
    useAnnotationStore.getState().enterLabelingMode();
    useAnnotationStore.getState().exitLabelingMode();
    expect(useAnnotationStore.getState().isLabelingMode).toBe(false);
  });

  it('advanceLabelRoom increments activeLabelRoomIndex', () => {
    useAnnotationStore.getState().loadAnnotation(
      [
        { id: 'w0', startX: 0, startY: 0, endX: 4, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w1', startX: 4, startY: 0, endX: 4, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w2', startX: 4, startY: 3, endX: 0, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w3', startX: 0, startY: 3, endX: 0, endY: 0, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
        { id: 'w4', startX: 2, startY: 0, endX: 2, endY: 3, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] },
      ], []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    useAnnotationStore.getState().enterLabelingMode();
    expect(useAnnotationStore.getState().activeLabelRoomIndex).toBe(0);
    useAnnotationStore.getState().advanceLabelRoom();
    expect(useAnnotationStore.getState().activeLabelRoomIndex).toBe(1);
  });

  it('advanceLabelRoom closes wizard when all rooms labeled', () => {
    useAnnotationStore.getState().loadAnnotation(
      RECT_WALLS.map((w, i) => ({ ...w, id: `w${i}`, thickness: 0.1, height: 2.6, wallType: 'internal' as const, isLoadBearing: false, doors: [], windows: [] })),
      []
    );
    useAnnotationStore.getState().detectAndSetRooms();
    useAnnotationStore.getState().enterLabelingMode();
    // There is 1 room; label it
    const { rooms } = useAnnotationStore.getState();
    useAnnotationStore.getState().updateRoom(rooms[0].id!, { label: 'Living Room', roomType: 'living' });
    useAnnotationStore.getState().advanceLabelRoom();
    expect(useAnnotationStore.getState().isLabelingMode).toBe(false);
  });
});

describe('preserveLabelsOnRedetect', () => {
  it('inherits label when old room centroid falls inside new polygon', () => {
    const newPolygons = [
      {
        vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }],
        area: 12,
        centroid: { x: 2, y: 1.5 },
      },
    ];
    const oldRooms = [
      {
        id: 'r1', label: 'Living Room', roomType: 'living',
        centroidX: 2, centroidY: 1.5, area: 12,
      },
    ];
    const result = useAnnotationStore.getState().preserveLabelsOnRedetect(newPolygons, oldRooms);
    expect(result[0].label).toBe('Living Room');
    expect(result[0].roomType).toBe('living');
  });

  it('assigns generic label when no old room contains the new centroid', () => {
    const newPolygons = [
      {
        vertices: [{ x: 10, y: 10 }, { x: 14, y: 10 }, { x: 14, y: 13 }, { x: 10, y: 13 }],
        area: 12,
        centroid: { x: 12, y: 11.5 },
      },
    ];
    const oldRooms = [
      {
        id: 'r1', label: 'Living Room', roomType: 'living',
        centroidX: 2, centroidY: 1.5, area: 12,
      },
    ];
    const result = useAnnotationStore.getState().preserveLabelsOnRedetect(newPolygons, oldRooms);
    expect(result[0].label).toMatch(/^Room \d+/);
  });
});
