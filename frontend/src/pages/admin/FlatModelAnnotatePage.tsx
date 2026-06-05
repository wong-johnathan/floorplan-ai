import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getVariant, saveAnnotation, publishVariant } from '../../lib/api';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';
import { WallAnnotationCanvas } from '../../components/admin/WallAnnotationCanvas';
import { AnnotationToolbar } from '../../components/admin/AnnotationToolbar';
import { WallPropertyPanel } from '../../components/admin/WallPropertyPanel';
import { RoomPropertyPanel } from '../../components/admin/RoomPropertyPanel';
import { FurnitureSidebar } from '../../components/admin/FurnitureSidebar';
import { FurniturePropertyPanel } from '../../components/admin/FurniturePropertyPanel';

export function FlatModelAnnotatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [furnWidth, setFurnWidth] = useState(192);
  const [inspWidth, setInspWidth] = useState(280);
  const resizeRef = useRef<'furn' | 'insp' | null>(null);

  const store = useAnnotationStore(s => s);
  const { loadAnnotation, walls, rooms, furniture, selectedWallId, selectedRoomId, selectedFurnitureId, reset } = store;
  const undoCount = store.undoStack.length;

  const { data: variant, isLoading } = useQuery({
    queryKey: ['variant', id], queryFn: () => getVariant(id!), enabled: Boolean(id),
  });

  useEffect(() => {
    if (variant) loadAnnotation(variant.walls ?? [], variant.roomDefs ?? [], (variant as any).furniture ?? []);
    return () => reset();
  }, [variant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: () => saveAnnotation(id!, { walls, rooms, furniture }),
    onSuccess: () => setSaved(true),
    onError: (err: Error) => alert(`Save failed: ${err.message}`),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishVariant(id!),
    onSuccess: () => { alert('Published!'); navigate(`/admin/bto/${variant?.flatType?.btoProjectId}`); },
    onError: (err: Error) => alert(`Publish failed: ${err.message}`),
  });

  // Resize panels — must be before any early return (rules of hooks)
  const startResize = useCallback((panel: 'furn' | 'insp') => (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = panel;
    const startX = e.clientX;
    const startW = panel === 'furn' ? furnWidth : inspWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (resizeRef.current === 'furn') setFurnWidth(Math.max(120, Math.min(400, startW + delta)));
      else setInspWidth(Math.max(200, Math.min(800, startW - delta)));
    };
    const onUp = () => { resizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [furnWidth, inspWidth]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><p className="text-zinc-500">Loading...</p></div>;

  const isPublished = variant?.published ?? false;
  const ft = variant?.flatType;
  const project = ft?.btoProject;

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Top bar */}
      <div className="flex items-center justify-between h-10 px-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-zinc-700">← Back</button>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-700 font-medium">{project?.name}</span>
          <span className="text-zinc-400">→</span>
          <span className="text-zinc-500">{ft?.name} ({ft?.bedroomCount} BR)</span>
          <span className="text-zinc-400">→</span>
          <span className="font-medium">{variant?.name}</span>
          {isPublished && <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Published</span>}
          {saved && <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSaved(false); saveMutation.mutate(); }} disabled={saveMutation.isPending}
            className="px-3 py-1 text-xs font-medium bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          {!isPublished && (
            <button onClick={() => { if (confirm('Publish?')) publishMutation.mutate(); }} disabled={publishMutation.isPending}
              className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <AnnotationToolbar />

      {/* Main: canvas fills full area, panels float on top */}
      <div className="flex-1 relative overflow-hidden">
        <WallAnnotationCanvas floorPlanUrl={variant?.floorPlanUrl ?? null} />

        {/* Furniture toggle button — always visible at left edge */}
        {!showFurniture && (
          <button onClick={() => setShowFurniture(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-12 bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 text-xs transition-colors z-20 border border-zinc-200 dark:border-zinc-700 rounded-r"
            title="Show furniture">
            ▶
          </button>
        )}

        {/* Furniture panel — absolute overlay on left */}
        {showFurniture && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex">
            <div style={{ width: furnWidth }} className="bg-white dark:bg-zinc-900 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 shadow-lg">
              <FurnitureSidebar />
            </div>
            <div onMouseDown={startResize('furn')}
              className="w-2 bg-zinc-300 dark:bg-zinc-600 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0" />
            <button onClick={() => setShowFurniture(false)}
              className="w-5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 text-xs transition-colors border-y border-r border-zinc-200 dark:border-zinc-700 rounded-r"
              title="Hide furniture">
              ◀
            </button>
          </div>
        )}

        {/* Inspector toggle button — always visible at right edge */}
        {!showInspector && (
          <button onClick={() => setShowInspector(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-12 bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 text-xs transition-colors z-20 border border-zinc-200 dark:border-zinc-700 rounded-l"
            title="Show inspector">
            ◀
          </button>
        )}

        {/* Inspector panel — absolute overlay on right */}
        {showInspector && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex">
            <button onClick={() => setShowInspector(false)}
              className="w-5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 text-xs transition-colors border-y border-l border-zinc-200 dark:border-zinc-700 rounded-l"
              title="Hide inspector">
              ▶
            </button>
            <div onMouseDown={startResize('insp')}
              className="w-2 bg-zinc-300 dark:bg-zinc-600 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0" />
            <div style={{ width: inspWidth }} className="bg-white dark:bg-zinc-900 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 shadow-lg">
              {selectedWallId ? <WallPropertyPanel /> :
               selectedRoomId ? <RoomPropertyPanel /> :
               selectedFurnitureId ? <FurniturePropertyPanel /> : (
                <div className="p-4 text-sm text-zinc-500 space-y-4">
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">Inspector</p>
                    <p className="text-xs">{walls.length} walls · {rooms.length} rooms</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">How to Draw</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Click <strong>Draw Wall</strong> or press <kbd className="px-1 bg-zinc-100 rounded">W</kbd></li>
                      <li>Click start point, then click end point</li>
                      <li>Hold <kbd className="px-1 bg-zinc-100 rounded">Shift</kbd> for straight lines</li>
                      <li>Double-click or press <kbd className="px-1 bg-zinc-100 rounded">Esc</kbd> to finish</li>
                      <li>Click <strong>Auto-Detect Rooms</strong></li>
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Doors & Windows</p>
                    <p className="text-xs">Click a wall to select it, then use <strong>+ Add Door</strong> or <strong>+ Add Window</strong> in the inspector.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Open-Plan Spaces</p>
                    <p className="text-xs">Use the <strong>Divider</strong> tool to draw a virtual boundary between rooms without a physical wall (e.g., kitchen/living).</p>
                  </div>
                </div>
              )}
            </div>
            <div onMouseDown={startResize('insp')}
              className="w-2 bg-zinc-300 dark:bg-zinc-600 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between h-6 px-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 shrink-0">
        <span>{walls.length} walls · {rooms.length} rooms · {undoCount} undo</span>
        <span>{variant?.floorPlanUrl ? 'Floor plan loaded' : 'No floor plan'}</span>
      </div>
    </div>
  );
}
