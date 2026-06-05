import { useState, useRef } from 'react';
import { useAnnotationStore } from '../../stores/adminAnnotationStore';

const ROOM_CHIPS: { label: string; roomType: string }[] = [
  { label: 'Living Room', roomType: 'living' },
  { label: 'Master BR', roomType: 'bedroom_master' },
  { label: 'Bedroom', roomType: 'bedroom' },
  { label: 'Kitchen', roomType: 'kitchen' },
  { label: 'Toilet', roomType: 'toilet' },
  { label: 'Balcony', roomType: 'balcony' },
  { label: 'Bomb Shelter', roomType: 'bomb_shelter' },
  { label: 'Service Yard', roomType: 'service_yard' },
  { label: 'Hallway', roomType: 'hallway' },
];

interface Props {
  roomId: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

export function RoomLabelPopup({ roomId, screenX, screenY, onClose }: Props) {
  const rooms = useAnnotationStore(s => s.rooms);
  const updateRoom = useAnnotationStore(s => s.updateRoom);
  const [customName, setCustomName] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  const room = rooms.find(r => r.id === roomId);
  if (!room) return null;

  function applyLabel(label: string, roomType: string) {
    updateRoom(roomId, { label, roomType });
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && customName.trim()) {
      applyLabel(customName.trim(), room!.roomType ?? 'bedroom');
    }
    if (e.key === 'Escape') onClose();
  }

  // Clamp position to viewport
  const popupWidth = 260;
  const popupHeight = 160;
  const clampedX = Math.min(screenX, window.innerWidth - popupWidth - 8);
  const clampedY = Math.min(screenY - popupHeight - 8, window.innerHeight - popupHeight - 8);
  const finalY = clampedY < 8 ? screenY + 8 : clampedY;

  return (
    <div
      ref={popupRef}
      className="absolute z-30 bg-white border border-zinc-200 rounded-lg shadow-xl p-3"
      style={{ left: clampedX, top: finalY, width: popupWidth }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Current label badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Relabel room</span>
        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          {room.label}
        </span>
      </div>

      {/* Chip grid */}
      <div className="flex flex-wrap gap-1 mb-2">
        {ROOM_CHIPS.filter(chip => chip.roomType !== room.roomType).map(chip => (
          <button
            key={chip.roomType}
            onClick={() => applyLabel(chip.label, chip.roomType)}
            className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <input
        type="text"
        autoFocus
        value={customName}
        onChange={e => setCustomName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Custom name… (Enter to confirm)"
        className="w-full px-2 py-1 border border-zinc-200 rounded text-xs focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
