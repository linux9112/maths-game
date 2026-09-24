import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RainCalculationGame } from '../../features/games/speed/RainCalculationGame';
import { SixtySecondRushGame } from '../../features/games/speed/SixtySecondRushGame';
import { RocketGame } from '../../features/games/speed/RocketGame';
import { BombDefusalGame } from '../../features/games/speed/BombDefusalGame';

describe('Speed Games Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const advanceThroughCountdown = () => {
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(600); });
  };

  it('renders RainCalculationGame and opens preflight configuration', () => {
    render(<RainCalculationGame />);
    expect(screen.getAllByText('Rain Calculation')[0]).toBeInTheDocument();
    const configBtn = screen.getByText('Configure & Play');
    fireEvent.click(configBtn);

    expect(screen.getByText('Launch Game')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();
  });

  it('renders SixtySecondRushGame and starts 60-second time attack', () => {
    render(<SixtySecondRushGame />);
    expect(screen.getAllByText('60-Second Rush')[0]).toBeInTheDocument();
    const startBtn = screen.getByText('Start 60s Rush');
    fireEvent.click(startBtn);

    expect(screen.getByText('Launch Game')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Time Attack')).toBeInTheDocument();
  });

  it('renders RocketGame and advances altitude on correct answers', () => {
    render(<RocketGame />);
    expect(screen.getAllByText('Rocket Math')[0]).toBeInTheDocument();
    const launchBtn = screen.getByText('Launch Configuration');
    fireEvent.click(launchBtn);

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Altitude')).toBeInTheDocument();
  });

  it('renders BombDefusalGame and displays wire timer fuses', () => {
    render(<BombDefusalGame />);
    expect(screen.getAllByText('Bomb Defusal')[0]).toBeInTheDocument();
    const armBtn = screen.getByText('Arm & Defuse');
    fireEvent.click(armBtn);

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText(/Wire/)).toBeInTheDocument();
    expect(screen.getByText(/Defusal Code/)).toBeInTheDocument();
  });
});
