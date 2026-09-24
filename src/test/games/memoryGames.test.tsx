import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryCalculationGame } from '../../features/games/memory/MemoryCalculationGame';
import { OperationSwitchGame } from '../../features/games/memory/OperationSwitchGame';
import { TableChainGame } from '../../features/games/memory/TableChainGame';

describe('Memory Games Suite', () => {
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

  it('renders MemoryCalculationGame and flips card face-down after 1.8s', () => {
    render(<MemoryCalculationGame />);
    expect(screen.getAllByText('Memory Calculation')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Memory Drill'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Memorize The Equation!')).toBeInTheDocument();

    // Advance 1.8s -> flips face-down
    act(() => {
      vi.advanceTimersByTime(1900);
    });

    expect(screen.getByText('Recall From Memory & Solve')).toBeInTheDocument();
  });

  it('renders OperationSwitchGame and alerts on dynamic operator changes', () => {
    render(<OperationSwitchGame />);
    expect(screen.getAllByText('Operation Switch')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Switch Drill'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Cognitive Switch')).toBeInTheDocument();
  });

  it('renders TableChainGame and renders sequence slots and missing term question mark', () => {
    render(<TableChainGame />);
    expect(screen.getAllByText('Table Chain')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Chain Puzzle'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Find The Missing Sequence Value')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
