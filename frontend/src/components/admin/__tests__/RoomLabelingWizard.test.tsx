import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAnnotationStore } from '../../../stores/adminAnnotationStore';
import { RoomLabelingWizard } from '../RoomLabelingWizard';

beforeEach(() => useAnnotationStore.getState().reset());

function setupTwoRooms() {
  // Manually inject two unlabeled rooms into the store
  useAnnotationStore.setState({
    rooms: [
      { id: 'r1', label: 'Room 1', roomType: 'bedroom', area: 14, centroidX: 1, centroidY: 1, polygon: [], sortOrder: 0 },
      { id: 'r2', label: 'Room 2', roomType: 'bedroom', area: 8, centroidX: 5, centroidY: 1, polygon: [], sortOrder: 1 },
    ],
    isLabelingMode: true,
    labelingOrder: ['r1', 'r2'],
    activeLabelRoomIndex: 0,
  });
}

describe('RoomLabelingWizard', () => {
  it('renders the wizard when isLabelingMode is true', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    expect(screen.getByText(/Room 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/14/)).toBeInTheDocument(); // area
  });

  it('does not render when isLabelingMode is false', () => {
    useAnnotationStore.setState({ isLabelingMode: false });
    render(<RoomLabelingWizard />);
    expect(screen.queryByText(/Room 1 of/i)).not.toBeInTheDocument();
  });

  it('clicking a room type chip labels the room and advances', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Living Room/i }));
    const { rooms, activeLabelRoomIndex } = useAnnotationStore.getState();
    expect(rooms.find(r => r.id === 'r1')!.label).toBe('Living Room');
    expect(rooms.find(r => r.id === 'r1')!.roomType).toBe('living');
    expect(activeLabelRoomIndex).toBe(1);
  });

  it('clicking Done closes the wizard', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(useAnnotationStore.getState().isLabelingMode).toBe(false);
  });

  it('custom name input labels the room on Enter', () => {
    setupTwoRooms();
    render(<RoomLabelingWizard />);
    const input = screen.getByPlaceholderText(/custom/i);
    fireEvent.change(input, { target: { value: 'Study Nook' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useAnnotationStore.getState().rooms.find(r => r.id === 'r1')!.label).toBe('Study Nook');
  });
});
