import { useState } from 'react';
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

export function RoomLabelingWizard() {
  const isLabelingMode = useAnnotationStore(s => s.isLabelingMode);
  const activeLabelRoomIndex = useAnnotationStore(s => s.activeLabelRoomIndex);
  const labelingOrder = useAnnotationStore(s => s.labelingOrder);
  const rooms = useAnnotationStore(s => s.rooms);
  const updateRoom = useAnnotationStore(s => s.updateRoom);
  const advanceLabelRoom = useAnnotationStore(s => s.advanceLabelRoom);
  const exitLabelingMode = useAnnotationStore(s => s.exitLabelingMode);

  const [customName, setCustomName] = useState('');

  if (!isLabelingMode) return null;

  const activeRoomId = labelingOrder[activeLabelRoomIndex];
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  if (!activeRoom) return null;

  const total = labelingOrder.length;
  const current = activeLabelRoomIndex + 1;
  const progress = (current / total) * 100;

  function applyLabel(label: string, roomType: string) {
    updateRoom(activeRoomId, { label, roomType });
    setCustomName('');
    advanceLabelRoom();
  }

  function handleCustomKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && customName.trim()) {
      applyLabel(customName.trim(), activeRoom?.roomType ?? 'bedroom');
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-zinc-200 shadow-lg">
      {/* Progress bar */}
      <div className="h-1 bg-zinc-100">
        <div className="h-1 bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">
        {/* Counter + area */}
        <div className="shrink-0 text-xs font-semibold text-zinc-700 whitespace-nowrap">
          Room {current} of {total}
          {activeRoom.area !== undefined && (
            <span className="ml-2 font-normal text-zinc-400">{activeRoom.area} m²</span>
          )}
        </div>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ROOM_CHIPS.map(chip => (
            <button
              key={chip.roomType}
              onClick={() => applyLabel(chip.label, chip.roomType)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <input
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          placeholder="Custom name… (Enter)"
          className="px-2 py-0.5 border border-zinc-200 rounded text-xs w-44 focus:outline-none focus:border-blue-400"
        />

        <div className="flex-1" />

        {/* Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => useAnnotationStore.setState(s => ({
              activeLabelRoomIndex: Math.max(0, s.activeLabelRoomIndex - 1),
            }))}
            disabled={activeLabelRoomIndex === 0}
            className="px-2 py-0.5 text-xs border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            onClick={() => advanceLabelRoom()}
            className="px-2 py-0.5 text-xs border border-zinc-200 rounded hover:bg-zinc-50"
          >
            Skip
          </button>
          <button
            onClick={exitLabelingMode}
            className="px-2.5 py-0.5 text-xs bg-zinc-700 text-white rounded hover:bg-zinc-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
