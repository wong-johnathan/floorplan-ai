import { useAnnotationStore } from '../../stores/adminAnnotationStore';
import type { ToolMode } from '../../stores/adminAnnotationStore';

const TOOLS: { mode: ToolMode; label: string; key: string; icon: string }[] = [
  { mode: 'select', label: 'Select', key: 'S', icon: '↖' },
  { mode: 'draw-wall', label: 'Draw Wall', key: 'W', icon: '┃' },
  { mode: 'divider', label: 'Divider', key: 'V', icon: '┅' },
  { mode: 'pan', label: 'Pan', key: 'H', icon: '✋' },
];

export function AnnotationToolbar() {
  const tool = useAnnotationStore(s => s.tool);
  const setTool = useAnnotationStore(s => s.setTool);
  const gridSnap = useAnnotationStore(s => s.gridSnap);
  const detectAndSetRooms = useAnnotationStore(s => s.detectAndSetRooms);
  const undo = useAnnotationStore(s => s.undo);
  const redo = useAnnotationStore(s => s.redo);
  const undoStack = useAnnotationStore(s => s.undoStack);
  const redoStack = useAnnotationStore(s => s.redoStack);
  const enterLabelingMode = useAnnotationStore(s => s.enterLabelingMode);
  const rooms = useAnnotationStore(s => s.rooms);
  const unlabeledCount = rooms.filter(r => /^Room \d+$/.test(r.label)).length;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-wrap">
      {TOOLS.map(t => (
        <button key={t.mode} onClick={() => setTool(t.mode)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            tool === t.mode
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          title={`${t.label}${t.key ? ` (${t.key})` : ''}`}>
          <span className="text-sm">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      <button onClick={undo} disabled={undoStack.length === 0}
        className="px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30"
        title="Undo (Ctrl+Z)">↩</button>
      <button onClick={redo} disabled={redoStack.length === 0}
        className="px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30"
        title="Redo (Ctrl+Shift+Z)">↪</button>

      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer">
        <input type="checkbox" checked={gridSnap}
          onChange={e => useAnnotationStore.setState({ gridSnap: e.target.checked })}
          className="rounded" />
        Grid
      </label>
      <select
        value={useAnnotationStore(s => s.gridSize)}
        onChange={e => useAnnotationStore.setState({ gridSize: parseFloat(e.target.value) })}
        className="text-xs border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5 bg-white dark:bg-zinc-900 text-zinc-600">
        <option value="0.05">5px</option>
        <option value="0.1">10px</option>
        <option value="0.2">20px</option>
        <option value="0.25">25px</option>
        <option value="0.5">50px</option>
        <option value="1">100px</option>
      </select>

      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer">
        <input type="checkbox" checked={useAnnotationStore(s => s.wallSnap)}
          onChange={e => useAnnotationStore.setState({ wallSnap: e.target.checked })}
          className="rounded" />
        Wall Snap
      </label>
      <select
        value={useAnnotationStore(s => s.snapDistance)}
        onChange={e => useAnnotationStore.setState({ snapDistance: parseFloat(e.target.value) })}
        className="text-xs border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.5 bg-white dark:bg-zinc-900 text-zinc-600">
        <option value="0.04">4px</option>
        <option value="0.06">6px</option>
        <option value="0.08">8px</option>
        <option value="0.1">10px</option>
        <option value="0.15">15px</option>
        <option value="0.2">20px</option>
      </select>

      <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      <button
        onClick={detectAndSetRooms}
        className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Detect Rooms
      </button>

      {rooms.length > 0 && (
        <button
          onClick={enterLabelingMode}
          className="px-2.5 py-1 text-xs font-medium bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-1"
          title={unlabeledCount > 0 ? `${unlabeledCount} rooms need labels` : 'Re-open labeling wizard'}
        >
          Label Rooms
          {unlabeledCount > 0 && (
            <span className="bg-white text-amber-600 rounded-full px-1.5 text-xs font-bold leading-none py-0.5">
              {unlabeledCount}
            </span>
          )}
        </button>
      )}

      <span className="flex-1" />

      <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer">
        <input type="checkbox" checked={useAnnotationStore(s => s.showBackground)}
          onChange={e => useAnnotationStore.setState({ showBackground: e.target.checked })}
          className="rounded" />
        BG
      </label>

      <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer">
        <input type="checkbox" checked={useAnnotationStore(s => s.showFurniture)}
          onChange={e => useAnnotationStore.setState({ showFurniture: e.target.checked })}
          className="rounded" />
        Furniture
      </label>

      <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer">
        <input type="checkbox" checked={useAnnotationStore(s => s.showFurnitureLabels)}
          onChange={e => useAnnotationStore.setState({ showFurnitureLabels: e.target.checked })}
          className="rounded" />
        Labels
      </label>

      <label className="flex items-center gap-1 text-xs text-zinc-500">
        <span>Opacity</span>
        <input type="range" min="0.2" max="1" step="0.1"
          value={useAnnotationStore(s => s.wallOpacity)}
          onChange={e => useAnnotationStore.setState({ wallOpacity: parseFloat(e.target.value) })}
          className="w-16" />
      </label>

      <span className="text-xs text-zinc-400">
        Hold <kbd className="px-1 py-0.5 bg-zinc-100 rounded text-xs">Shift</kbd> for straight lines
      </span>
    </div>
  );
}
