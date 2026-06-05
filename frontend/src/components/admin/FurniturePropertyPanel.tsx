import { useAnnotationStore } from '../../stores/adminAnnotationStore';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';

export function FurniturePropertyPanel() {
  const furniture = useAnnotationStore(s => s.furniture);
  const selectedId = useAnnotationStore(s => s.selectedFurnitureId);
  const updateFurniture = useAnnotationStore(s => s.updateFurniture);
  const removeFurniture = useAnnotationStore(s => s.removeFurniture);
  const item = furniture.find(f => f.id === selectedId);
  if (!item) return null;

  const def = FURNITURE_CATALOG.find(d => d.type === item.itemType);

  return (
    <div className="p-3 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{def?.label ?? item.itemType}</p>
        <button onClick={() => removeFurniture(item.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="text-xs text-zinc-400">X (m)</label>
            <input type="number" value={parseFloat(item.x.toFixed(3))} step="0.05"
              onChange={e => updateFurniture(item.id!, { x: parseFloat(e.target.value) || item.x })}
              className="w-full px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Y (m)</label>
            <input type="number" value={parseFloat(item.y.toFixed(3))} step="0.05"
              onChange={e => updateFurniture(item.id!, { y: parseFloat(e.target.value) || item.y })}
              className="w-full px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="text-xs text-zinc-400">Width (m)</label>
            <input type="number" value={parseFloat(item.width.toFixed(3))} step="0.05" min="0.1"
              onChange={e => updateFurniture(item.id!, { width: Math.max(0.1, parseFloat(e.target.value) || item.width) })}
              className="w-full px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Height (m)</label>
            <input type="number" value={parseFloat(item.height.toFixed(3))} step="0.05" min="0.1"
              onChange={e => updateFurniture(item.id!, { height: Math.max(0.1, parseFloat(e.target.value) || item.height) })}
              className="w-full px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400">Rotation (°)</label>
          <input type="number" value={Math.round(item.rotation)} step="15"
            onChange={e => updateFurniture(item.id!, { rotation: parseFloat(e.target.value) || 0 })}
            className="w-full px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
        </div>
      </div>
    </div>
  );
}
