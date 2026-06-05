import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAnnotationStore } from '../../../stores/adminAnnotationStore';
import { RoomLabelPopup } from '../RoomLabelPopup';

beforeEach(() => useAnnotationStore.getState().reset());

function setupRoom() {
  useAnnotationStore.setState({
    rooms: [
      { id: 'r1', label: 'Master BR', roomType: 'bedroom_master', area: 12, centroidX: 2, centroidY: 2, polygon: [], sortOrder: 0 },
    ],
  });
}

describe('RoomLabelPopup', () => {
  it('renders with current room label', () => {
    setupRoom();
    render(<RoomLabelPopup roomId="r1" screenX={200} screenY={200} onClose={() => {}} />);
    expect(screen.getByText('Master BR')).toBeInTheDocument();
  });

  it('clicking a chip updates the room label and calls onClose', () => {
    setupRoom();
    const onClose = vi.fn();
    render(<RoomLabelPopup roomId="r1" screenX={200} screenY={200} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Kitchen/i }));
    expect(useAnnotationStore.getState().rooms[0].label).toBe('Kitchen');
    expect(useAnnotationStore.getState().rooms[0].roomType).toBe('kitchen');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('custom input submits on Enter and calls onClose', () => {
    setupRoom();
    const onClose = vi.fn();
    render(<RoomLabelPopup roomId="r1" screenX={200} screenY={200} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/custom/i);
    fireEvent.change(input, { target: { value: 'Study' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useAnnotationStore.getState().rooms[0].label).toBe('Study');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders null when roomId does not match any room', () => {
    setupRoom();
    const { container } = render(<RoomLabelPopup roomId="nonexistent" screenX={0} screenY={0} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
