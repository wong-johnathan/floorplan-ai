import { useAnnotationStore } from '../../stores/adminAnnotationStore';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">{title}</p>
      {children}
    </div>
  );
}

export function WallPropertyPanel() {
  const walls = useAnnotationStore((s) => s.walls);
  const selectedWallId = useAnnotationStore((s) => s.selectedWallId);
  const updateWall = useAnnotationStore((s) => s.updateWall);
  const deleteWall = useAnnotationStore((s) => s.deleteWall);
  const addDoor = useAnnotationStore((s) => s.addDoor);
  const addWindow = useAnnotationStore((s) => s.addWindow);
  const removeDoor = useAnnotationStore((s) => s.removeDoor);
  const removeWindow = useAnnotationStore((s) => s.removeWindow);
  const wall = walls.find(w => w.id === selectedWallId);
  if (!wall) return null;

  const length = Math.hypot(wall.endX - wall.startX, wall.endY - wall.startY);

  return (
    <div className="p-3 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Wall Properties</p>
        <button onClick={() => deleteWall(wall.id!)} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>

      <Section title="Type">
        <select value={wall.wallType ?? 'internal'}
          onChange={e => updateWall(wall.id!, { wallType: e.target.value })}
          className="w-full px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="party">Party</option>
        </select>
        <label className="flex items-center gap-2 mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" checked={wall.isLoadBearing ?? false} onChange={e => updateWall(wall.id!, { isLoadBearing: e.target.checked })} className="rounded" />
          Load-bearing
        </label>
      </Section>

      <Section title="Dimensions">
        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="text-xs text-zinc-400">Thickness (m)</label>
            <input type="number" value={wall.thickness ?? 0.1} step="0.01"
              onChange={e => updateWall(wall.id!, { thickness: parseFloat(e.target.value) || 0.1 })}
              className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Height (m)</label>
            <input type="number" value={wall.height ?? 2.6} step="0.1"
              onChange={e => updateWall(wall.id!, { height: parseFloat(e.target.value) || 2.6 })}
              className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Length: <span className="font-mono">{length.toFixed(2)}m</span></p>
      </Section>

      <Section title="Position">
        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="text-xs text-zinc-400">Start (X, Y)</label>
            <div className="flex gap-1">
              <input type="number" value={parseFloat(wall.startX.toFixed(2))} step="0.01"
                onChange={e => updateWall(wall.id!, { startX: parseFloat(e.target.value) || 0 })}
                className="w-full px-1 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
              <input type="number" value={parseFloat(wall.startY.toFixed(2))} step="0.01"
                onChange={e => updateWall(wall.id!, { startY: parseFloat(e.target.value) || 0 })}
                className="w-full px-1 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400">End (X, Y)</label>
            <div className="flex gap-1">
              <input type="number" value={parseFloat(wall.endX.toFixed(2))} step="0.01"
                onChange={e => updateWall(wall.id!, { endX: parseFloat(e.target.value) || 0 })}
                className="w-full px-1 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
              <input type="number" value={parseFloat(wall.endY.toFixed(2))} step="0.01"
                onChange={e => updateWall(wall.id!, { endY: parseFloat(e.target.value) || 0 })}
                className="w-full px-1 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Doors">
        {(wall.doors ?? []).map((d, i) => (
          <div key={i} className="mb-2 p-2 border border-zinc-100 dark:border-zinc-800 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-500">Door #{i + 1}</span>
              <button onClick={() => removeDoor(wall.id!, i)} className="text-xs text-red-500">×</button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xs w-12">Pos</span>
                <input type="range" min="0" max="1" step="0.01" value={d.position}
                  onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], position: parseFloat(e.target.value) }; updateWall(wall.id!, { doors }); }}
                  className="flex-1" />
                <span className="text-xs font-mono w-8">{d.position.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-xs">Length (m)</label>
                  <input type="number" value={d.length ?? d.width ?? 0.9} step="0.05" min="0.1"
                    onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], length: parseFloat(e.target.value) || (d.width ?? 0.9) }; updateWall(wall.id!, { doors }); }}
                    className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
                </div>
                {(d.doorType ?? 'swing') === 'folding' && (
                <div>
                  <label className="text-xs">Width (m)</label>
                  <input type="number" value={d.width ?? 0.9} step="0.05" min="0.2"
                    onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], width: parseFloat(e.target.value) || 0.9 }; updateWall(wall.id!, { doors }); }}
                    className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
                </div>
                )}
                <div>
                  <label className="text-xs">Height (m)</label>
                  <input type="number" value={d.height ?? 2.1} step="0.1" min="1.8"
                    onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], height: parseFloat(e.target.value) || 2.1 }; updateWall(wall.id!, { doors }); }}
                    className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
                </div>
                <div>
                  <label className="text-xs">Type</label>
                  <select value={d.doorType ?? 'swing'}
                    onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], doorType: e.target.value }; updateWall(wall.id!, { doors }); }}
                    className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
                    <option value="swing">Swing</option>
                    <option value="folding">Folding</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs">Swing</label>
                  <select value={d.swing ?? 'in'}
                    onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], swing: e.target.value }; updateWall(wall.id!, { doors }); }}
                    className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
                    <option value="in">Inward</option>
                    <option value="out">Outward</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs">Hinge</label>
                  <select value={d.hinge ?? 'left'}
                    onChange={e => { const doors = [...(wall.doors ?? [])]; doors[i] = { ...doors[i], hinge: e.target.value }; updateWall(wall.id!, { doors }); }}
                    className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => addDoor(wall.id!, 0.5)} className="text-xs text-blue-600 hover:underline mt-1">+ Add Door</button>
      </Section>

      <Section title="Windows">
        {(wall.windows ?? []).map((win, i) => (
          <div key={i} className="mb-2 p-2 border border-zinc-100 dark:border-zinc-800 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-500">Window #{i + 1}</span>
              <button onClick={() => removeWindow(wall.id!, i)} className="text-xs text-red-500">×</button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xs w-12">Pos</span>
                <input type="range" min="0" max="1" step="0.01" value={win.position}
                  onChange={e => { const windows = [...(wall.windows ?? [])]; windows[i] = { ...windows[i], position: parseFloat(e.target.value) }; updateWall(wall.id!, { windows }); }}
                  className="flex-1" />
                <span className="text-xs font-mono w-8">{win.position.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-xs">Width (m)</label>
                <input type="number" value={win.width ?? 1.2} step="0.1" min="0.3"
                  onChange={e => { const windows = [...(wall.windows ?? [])]; windows[i] = { ...windows[i], width: parseFloat(e.target.value) || 1.2 }; updateWall(wall.id!, { windows }); }}
                  className="w-full px-1 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => addWindow(wall.id!, 0.5)} className="text-xs text-blue-600 hover:underline mt-1">+ Add Window</button>
      </Section>
    </div>
  );
}
