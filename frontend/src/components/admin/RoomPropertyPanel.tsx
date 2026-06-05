import { useAnnotationStore } from '../../stores/adminAnnotationStore';

const ROOM_TYPES = [
  { value: 'living', label: 'Living Room' },
  { value: 'bedroom_master', label: 'Master Bedroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'bomb_shelter', label: 'Bomb Shelter' },
  { value: 'service_yard', label: 'Service Yard' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'balcony', label: 'Balcony' },
];

const FLOOR_TYPES = ['parquet', 'tile', 'marble', 'vinyl', 'concrete', 'carpet'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">{title}</p>
      {children}
    </div>
  );
}

export function RoomPropertyPanel() {
  const rooms = useAnnotationStore((s) => s.rooms);
  const selectedRoomId = useAnnotationStore((s) => s.selectedRoomId);
  const updateRoom = useAnnotationStore((s) => s.updateRoom);
  const room = rooms.find(r => r.id === selectedRoomId);
  if (!room) return null;

  return (
    <div className="p-3 space-y-1">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Room Properties</p>

      <Section title="Identity">
        <input type="text" value={room.label}
          onChange={e => updateRoom(room.id!, { label: e.target.value })}
          className="w-full px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 mb-1" />
        <select value={room.roomType ?? 'bedroom'}
          onChange={e => updateRoom(room.id!, { roomType: e.target.value })}
          className="w-full px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
          {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Section>

      <Section title="Size">
        <div className="flex items-center gap-2">
          <input type="number" value={room.area ?? ''}
            onChange={e => updateRoom(room.id!, { area: e.target.value ? parseFloat(e.target.value) : undefined })}
            step="0.1" min="1" placeholder="Area" className="w-24 px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
          <span className="text-xs text-zinc-500">sqm</span>
        </div>
      </Section>

      <Section title="Finishes">
        <label className="text-xs text-zinc-500 mb-1 block">Wall Color</label>
        <div className="flex items-center gap-2 mb-2">
          <input type="color" value={room.defaultWallColor ?? '#F5F5F0'}
            onChange={e => updateRoom(room.id!, { defaultWallColor: e.target.value })}
            className="w-8 h-8 rounded border cursor-pointer" />
          <input type="text" value={room.defaultWallColor ?? '#F5F5F0'}
            onChange={e => updateRoom(room.id!, { defaultWallColor: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm font-mono bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
        </div>
        <label className="text-xs text-zinc-500 mb-1 block">Floor</label>
        <select value={room.defaultFloorType ?? 'parquet'}
          onChange={e => updateRoom(room.id!, { defaultFloorType: e.target.value })}
          className="w-full px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 mb-1">
          {FLOOR_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="color" value={room.defaultFloorColor ?? '#C4A882'}
            onChange={e => updateRoom(room.id!, { defaultFloorColor: e.target.value })}
            className="w-8 h-8 rounded border cursor-pointer" />
          <input type="text" value={room.defaultFloorColor ?? '#C4A882'}
            onChange={e => updateRoom(room.id!, { defaultFloorColor: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-sm font-mono bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50" />
        </div>
      </Section>
    </div>
  );
}
