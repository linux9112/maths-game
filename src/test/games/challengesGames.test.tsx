import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NumberTargetGame } from '../../features/games/challenges/NumberTargetGame';
import { TableBreakerGame } from '../../features/games/challenges/TableBreakerGame';
import { FindMistakeGame } from '../../features/games/challenges/FindMistakeGame';
import { ClosestAnswerGame } from '../../features/games/challenges/ClosestAnswerGame';

describe('Challenges Games Suite', () => {
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

  it('renders NumberTargetGame and accepts number tiles and operator clicks', () => {
    render(<NumberTargetGame />);
    expect(screen.getAllByText('Number Target')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Target Puzzle'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Check Solution')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('renders TableBreakerGame and presents brick wall demolition', () => {
    render(<TableBreakerGame />);
    expect(screen.getAllByText('Table Breaker')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Breaker'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText(/Bricks Remaining/)).toBeInTheDocument();
    expect(screen.getByText(/Break Target Brick/)).toBeInTheDocument();
  });

  it('renders FindMistakeGame and displays 4 candidate equations', () => {
    render(<FindMistakeGame />);
    expect(screen.getAllByText('Find the Mistake')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Hunting'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText(/Which ONE is WRONG/)).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('renders ClosestAnswerGame and presents mental estimation options', () => {
    render(<ClosestAnswerGame />);
    expect(screen.getAllByText('Closest Answer')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start Estimation'));

    fireEvent.click(screen.getByText('Launch Game'));

    advanceThroughCountdown();

    expect(screen.getByText('Rapid Mental Estimation')).toBeInTheDocument();
  });
});
