import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SurvivalGame } from '../../features/games/survival/SurvivalGame';
import { CalculationRunnerGame } from '../../features/games/survival/CalculationRunnerGame';
import { BossBattleGame } from '../../features/games/survival/BossBattleGame';

describe('Survival Games Suite', () => {
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

  it('renders SurvivalGame and handles wave progression and options', () => {
    render(<SurvivalGame />);
    expect(screen.getAllByText('Survival Mode')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Enter Survival Arena'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText(/Wave 1/)).toBeInTheDocument();
  });

  it('renders CalculationRunnerGame and supports lane switching', () => {
    render(<CalculationRunnerGame />);
    expect(screen.getAllByText('Calculation Runner')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Running'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Solve & Switch To Safe Lane')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Center')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();

    // Switch lane
    fireEvent.click(screen.getByText('Left'));
  });

  it('renders BossBattleGame and displays Boss HP bar and combat arena', () => {
    render(<BossBattleGame />);
    expect(screen.getAllByText('Boss Battle RPG')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Challenge Boss'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Calculon the Destroyer')).toBeInTheDocument();
    expect(screen.getByText(/Boss Attack Charge/)).toBeInTheDocument();
  });
});
