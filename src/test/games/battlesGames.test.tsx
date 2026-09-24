import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TableBattleGame } from '../../features/games/battles/TableBattleGame';
import { QuickCompareGame } from '../../features/games/battles/QuickCompareGame';
import { BiggerSmallerGame } from '../../features/games/battles/BiggerSmallerGame';

describe('Battles Games Suite', () => {
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

  it('renders TableBattleGame and presents head-to-head comparison buttons (<, =, >)', () => {
    render(<TableBattleGame />);
    expect(screen.getAllByText('Table Battle')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Battle'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Which Side Is Greater?')).toBeInTheDocument();
    expect(screen.getByText('<')).toBeInTheDocument();
    expect(screen.getByText('=')).toBeInTheDocument();
    expect(screen.getByText('>')).toBeInTheDocument();
  });

  it('renders QuickCompareGame and presents rapid arithmetic duel', () => {
    render(<QuickCompareGame />);
    expect(screen.getAllByText('Quick Compare')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Compare'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Rapid Arithmetic Comparison')).toBeInTheDocument();
    expect(screen.getByText('<')).toBeInTheDocument();
    expect(screen.getByText('=')).toBeInTheDocument();
    expect(screen.getByText('>')).toBeInTheDocument();
  });

  it('renders BiggerSmallerGame and presents threshold estimation decisions', () => {
    render(<BiggerSmallerGame />);
    expect(screen.getAllByText('Bigger or Smaller')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Drill'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Threshold Estimation')).toBeInTheDocument();
    expect(screen.getAllByText(/GREATER/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/LESS/)[0]).toBeInTheDocument();
  });
});
