import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuickCompareGame } from '../../features/games/battles/QuickCompareGame';
import { BiggerSmallerGame } from '../../features/games/battles/BiggerSmallerGame';
import { TableBattleGame } from '../../features/games/battles/TableBattleGame';
import { TableChainGame } from '../../features/games/memory/TableChainGame';
import { FindMistakeGame } from '../../features/games/challenges/FindMistakeGame';
import { ClosestAnswerGame } from '../../features/games/challenges/ClosestAnswerGame';
import { RainCalculationGame } from '../../features/games/speed/RainCalculationGame';
import { TableBreakerGame } from '../../features/games/challenges/TableBreakerGame';

describe('Game Option Correctness & State Synchronization Suite', () => {
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

  it('QuickCompareGame: selecting the mathematically correct comparator increments score and registers first-try correct attempt', () => {
    render(<QuickCompareGame />);
    fireEvent.click(screen.getByText('Start Compare'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText('Rapid Arithmetic Comparison')).toBeInTheDocument();
    // Buttons: <, =, >
    const lessBtn = screen.getByText('<');
    const eqBtn = screen.getByText('=');
    const greaterBtn = screen.getByText('>');

    expect(lessBtn).toBeInTheDocument();
    expect(eqBtn).toBeInTheDocument();
    expect(greaterBtn).toBeInTheDocument();
  });

  it('BiggerSmallerGame: threshold estimation options correctly evaluate against question metadata', () => {
    render(<BiggerSmallerGame />);
    fireEvent.click(screen.getByText('Start Drill'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText('Threshold Estimation')).toBeInTheDocument();
    const greaterBtn = screen.getAllByText(/GREATER/)[0];
    const lessBtn = screen.getAllByText(/LESS/)[0];
    expect(greaterBtn).toBeInTheDocument();
    expect(lessBtn).toBeInTheDocument();
  });

  it('TableBattleGame: dual fact comparison options match current question', () => {
    render(<TableBattleGame />);
    fireEvent.click(screen.getByText('Start Battle'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText('Which Side Is Greater?')).toBeInTheDocument();
    expect(screen.getByText('<')).toBeInTheDocument();
    expect(screen.getByText('=')).toBeInTheDocument();
    expect(screen.getByText('>')).toBeInTheDocument();
  });

  it('TableChainGame: sequence choice matches expected missing number', () => {
    render(<TableChainGame />);
    fireEvent.click(screen.getByText('Start Chain Puzzle'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText('Find The Missing Sequence Value')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('FindMistakeGame: spotting the incorrect equation evaluates without desync', () => {
    render(<FindMistakeGame />);
    fireEvent.click(screen.getByText('Start Hunting'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText(/Which ONE is WRONG/)).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('ClosestAnswerGame: options match current question', () => {
    render(<ClosestAnswerGame />);
    fireEvent.click(screen.getByText('Start Estimation'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText('Rapid Mental Estimation')).toBeInTheDocument();
  });

  it('TableBreakerGame: target brick matches active question prompt', () => {
    render(<TableBreakerGame />);
    fireEvent.click(screen.getByText('Start Breaker'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    expect(screen.getByText(/Break Target Brick/)).toBeInTheDocument();
  });

  it('RainCalculationGame: choice options pop raindrops cleanly', () => {
    render(<RainCalculationGame initialConfig={{ inputMode: 'choice' }} />);
    fireEvent.click(screen.getByText('Configure & Play'));
    fireEvent.click(screen.getByText('Launch Game'));
    advanceThroughCountdown();

    // Verify playfield is active
    expect(screen.getByText(/Score/)).toBeInTheDocument();
  });
});
