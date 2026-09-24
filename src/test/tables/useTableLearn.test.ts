import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableLearn } from '../../features/tables/hooks/useTableLearn';

describe('useTableLearn Hook Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates exact ordered facts for the active table', () => {
    const { result } = renderHook(() =>
      useTableLearn({
        selectedTables: [7],
        multiplierRange: { min: 1, max: 12 },
      })
    );

    expect(result.current.activeTable).toBe(7);
    expect(result.current.orderedFacts).toHaveLength(12);

    const fact1 = result.current.orderedFacts[0];
    expect(fact1.promptText).toBe('7 × 1');
    expect(fact1.answer).toBe(7);
    expect(fact1.fullEquation).toBe('7 × 1 = 7');

    // Milestone & Square checks
    const squareFact = result.current.orderedFacts.find((f) => f.multiplier === 7);
    expect(squareFact?.isSquare).toBe(true);

    const midpointFact = result.current.orderedFacts.find((f) => f.multiplier === 5);
    expect(midpointFact?.isMilestone).toBe(true);

    const decadeFact = result.current.orderedFacts.find((f) => f.multiplier === 10);
    expect(decadeFact?.isMilestone).toBe(true);
  });

  it('toggles flashcard flip state', () => {
    const { result } = renderHook(() =>
      useTableLearn({
        selectedTables: [8],
        multiplierRange: { min: 1, max: 10 },
      })
    );

    expect(result.current.isFlipped).toBe(false);

    act(() => {
      result.current.flipCard();
    });

    expect(result.current.isFlipped).toBe(true);
  });

  it('navigates through deck and supports shuffle', () => {
    const { result } = renderHook(() =>
      useTableLearn({
        selectedTables: [9],
        multiplierRange: { min: 1, max: 10 },
      })
    );

    expect(result.current.currentCardIndex).toBe(0);

    act(() => {
      result.current.nextCard();
    });
    expect(result.current.currentCardIndex).toBe(1);

    act(() => {
      result.current.prevCard();
    });
    expect(result.current.currentCardIndex).toBe(0);

    act(() => {
      result.current.setIsShuffled(true);
    });
    expect(result.current.isShuffled).toBe(true);
    expect(result.current.currentCardIndex).toBe(0);
  });

  it('handles timed countdown review and auto-flips card at 0s', () => {
    const { result } = renderHook(() =>
      useTableLearn({
        selectedTables: [6],
        multiplierRange: { min: 1, max: 10 },
      })
    );

    act(() => {
      result.current.setViewType('flashcard');
      result.current.setTimerDuration(10);
    });

    expect(result.current.timerDuration).toBe(10);
    expect(result.current.timeRemainingSec).toBe(10);
    expect(result.current.isTimerRunning).toBe(true);
    expect(result.current.isFlipped).toBe(false);

    // Advance timer to 0s
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.isFlipped).toBe(true);
  });

  it('records confidence rating and advances card', () => {
    const { result } = renderHook(() =>
      useTableLearn({
        selectedTables: [11],
        multiplierRange: { min: 1, max: 10 },
      })
    );

    const fact0 = result.current.currentFact;

    act(() => {
      result.current.markConfidence('mastered');
    });

    expect(result.current.confidenceMap[fact0.id]).toEqual({
      factId: fact0.id,
      status: 'mastered',
      reviewCount: 1,
    });
    expect(result.current.currentCardIndex).toBe(1);
  });
});
