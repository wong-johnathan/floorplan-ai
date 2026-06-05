import { useState } from 'react';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, type FurnitureDef } from '../../lib/furnitureCatalog';

export function FurnitureSidebar() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(FURNITURE_CATEGORIES));
  const placingType = useAnnotationStore(s => s.placingFurnitureType);
  const setPlacingType = useAnnotationStore(s => s.setPlacingFurnitureType);

  const toggleCat = (cat: string) => {
    const next = new Set(expanded);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setExpanded(next);
  };

  const filtered = search
    ? FURNITURE_CATALOG.filter(f => f.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handleClick = (f: FurnitureDef) => {
    setPlacingType(placingType === f.type ? null : f.type);
  };

  if (filtered !== null) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
          <input type="text" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-zinc-200 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map(f => (
            <button key={f.type} onClick={() => handleClick(f)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                placingType === f.type ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}>
              <span className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: f.color, border: '1px solid rgba(0,0,0,0.15)' }} />
              <span>{f.label}</span>
              <span className="ml-auto text-zinc-400">{f.defaultW.toFixed(1)}×{f.defaultH.toFixed(1)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Furniture</p>
        <input type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-zinc-200 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {FURNITURE_CATEGORIES.map(cat => {
          const items = FURNITURE_CATALOG.filter(f => f.category === cat);
          const open = expanded.has(cat);
          return (
            <div key={cat}>
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <span className="text-[10px] w-3">{open ? '▾' : '▸'}</span>
                {cat}
              </button>
              {open && items.map(f => (
                <button key={f.type} onClick={() => handleClick(f)}
                  className={`w-full flex items-center gap-2 pl-7 pr-2 py-1.5 text-xs text-left transition-colors ${
                    placingType === f.type ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}>
                  <span className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: f.color, border: '1px solid rgba(0,0,0,0.12)' }} />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
