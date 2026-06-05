const ROOM_PRESETS = [
  { type: 'living', label: 'Living Room', color: '#F5F0E8', icon: '🛋' },
  { type: 'bedroom_master', label: 'Master Bedroom', color: '#E8ECF5', icon: '🛏' },
  { type: 'bedroom', label: 'Bedroom', color: '#EEF5EA', icon: '🛏' },
  { type: 'kitchen', label: 'Kitchen', color: '#FFF5EA', icon: '🍳' },
  { type: 'toilet', label: 'Toilet', color: '#EAF0F5', icon: '🚿' },
  { type: 'bomb_shelter', label: 'Bomb Shelter', color: '#F0EAEA', icon: '🛡' },
  { type: 'service_yard', label: 'Service Yard', color: '#F5F5F0', icon: '🧺' },
  { type: 'hallway', label: 'Hallway', color: '#F8F8F5', icon: '🚪' },
  { type: 'balcony', label: 'Balcony', color: '#EAF5F0', icon: '🌿' },
];

interface Props {
  activeRoomType: string | null;
  onSelect: (type: string | null) => void;
  rooms: Array<{ id?: string; label: string; roomType?: string }>;
  onSelectRoom: (id: string | null) => void;
  selectedRoomId: string | null;
  onDetectRooms: () => void;
  onClear: () => void;
}

export function RoomTypePalette({ activeRoomType, onSelect, rooms, onSelectRoom, selectedRoomId, onDetectRooms, onClear }: Props) {
  return (
    <div className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-full flex flex-col">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Room Types</p>
        <div className="space-y-1">
          {ROOM_PRESETS.map(r => (
            <button
              key={r.type}
              onClick={() => onSelect(activeRoomType === r.type ? null : r.type)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                activeRoomType === r.type
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">{r.icon}</span>
              <span className="flex-1">{r.label}</span>
              <span className="w-3 h-3 rounded-full border border-zinc-300" style={{ background: r.color }} />
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Detected Rooms</p>
        {rooms.length === 0 ? (
          <p className="text-xs text-zinc-400">Draw walls, then click Auto-Detect to find rooms.</p>
        ) : (
          <div className="space-y-0.5">
            {rooms.map(r => (
              <button
                key={r.id}
                onClick={() => onSelectRoom(selectedRoomId === r.id ? null : r.id!)}
                className={`w-full text-left px-2 py-1 rounded text-xs ${
                  selectedRoomId === r.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 flex-1">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Actions</p>
        <div className="space-y-1">
          <button onClick={onDetectRooms} className="w-full px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
            Auto-Detect Rooms
          </button>
          <button onClick={onClear} className="w-full px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Clear All Walls
          </button>
        </div>
      </div>
    </div>
  );
}
