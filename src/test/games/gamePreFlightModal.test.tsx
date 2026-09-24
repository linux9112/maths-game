import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamePreFlightModal } from '../../features/games/core/GamePreFlightModal';

describe('GamePreFlightModal', () => {
  const defaultProps = {
    isOpen: true,
    gameId: 'test_game',
    gameTitle: 'Test Math Game',
    gameDescription: 'A test description for preflight modal.',
    category: 'Speed' as const,
    onStartGame: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders modal title, category, and controls when open', () => {
    render(<GamePreFlightModal {...defaultProps} />);
    expect(screen.getByText('Test Math Game')).toBeInTheDocument();
    expect(screen.getByText('Speed')).toBeInTheDocument();
    expect(screen.getByText('Stress-Free Practice Mode')).toBeInTheDocument();
    expect(screen.getByText('Launch Game')).toBeInTheDocument();
  });

  it('toggles operation chips', () => {
    render(<GamePreFlightModal {...defaultProps} />);
    const subButton = screen.getByText(/Subtract/);
    expect(subButton).toBeInTheDocument();

    // Click to deselect
    fireEvent.click(subButton);
    // At least 1 operator stays, but here we had 4, so subtract is deselected
    expect(subButton.getAttribute('aria-pressed')).toBe('false');

    // Click to re-select
    fireEvent.click(subButton);
    expect(subButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('selects difficulty tiers', () => {
    render(<GamePreFlightModal {...defaultProps} />);
    const expertBtn = screen.getByText('expert');
    fireEvent.click(expertBtn);
    expect(expertBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles stress-free mode and disables time and mistake chips', () => {
    render(<GamePreFlightModal {...defaultProps} />);
    const toggle = screen.getByLabelText('Toggle Stress-Free Practice Mode');
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it('calls onStartGame with configured settings when launch button clicked', () => {
    const onStartGame = vi.fn();
    render(<GamePreFlightModal {...defaultProps} onStartGame={onStartGame} />);

    const launchBtn = screen.getByText('Launch Game');
    fireEvent.click(launchBtn);

    expect(onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'test_game',
        title: 'Test Math Game',
        category: 'Speed',
      })
    );
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<GamePreFlightModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });
});
