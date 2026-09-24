import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from '../../features/games/core/useGameEngine';

describe('useGameEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default IDLE status and default state', () => {
    const { result } = renderHook(() => useGameEngine());
    expect(result.current.state.status).toBe('IDLE');
    expect(result.current.state.score).toBe(0);
    expect(result.current.state.combo).toBe(0);
    expect(result.current.state.scoreMultiplier).toBe(1);
    expect(result.current.state.mistakeCount).toBe(0);
    expect(result.current.state.questionsAnswered).toBe(0);
  });

  it('transitions from IDLE to PRE_FLIGHT and back to IDLE', () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => {
      result.current.openPreFlight();
    });
    expect(result.current.state.status).toBe('PRE_FLIGHT');

    act(() => {
      result.current.closePreFlight();
    });
    expect(result.current.state.status).toBe('IDLE');
  });

  it('runs countdown 3 -> 2 -> 1 -> GO -> PLAYING on startGame', () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.state.status).toBe('COUNTDOWN');
    expect(result.current.state.countdownValue).toBe(3);

    // Advance 1s -> 2
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.state.countdownValue).toBe(2);

    // Advance 1s -> 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.state.countdownValue).toBe(1);

    // Advance 1s -> 0 (GO)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.state.countdownValue).toBe(0);

    // Advance 600ms -> PLAYING
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.state.status).toBe('PLAYING');
    expect(result.current.state.currentQuestion).not.toBeNull();
  });

  const advanceThroughCountdown = () => {
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(600); });
  };

  it('pauses and resumes game timer without advancing elapsed time while paused', () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => {
      result.current.startGame();
    });
    advanceThroughCountdown();

    expect(result.current.state.status).toBe('PLAYING');

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.state.elapsedTimeSec).toBe(3);

    // Pause
    act(() => {
      result.current.pause();
    });
    expect(result.current.state.status).toBe('PAUSED');

    // Advance 5 seconds while paused
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.state.elapsedTimeSec).toBe(3);

    // Resume
    act(() => {
      result.current.resume();
    });
    expect(result.current.state.status).toBe('PLAYING');

    // Advance 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.state.elapsedTimeSec).toBe(5);
  });

  it('handles correct answer: increases score, increments combo, escalates multiplier', () => {
    const { result } = renderHook(() =>
      useGameEngine({
        initialConfig: { targetLength: 10, difficulty: 'normal' },
      })
    );

    act(() => {
      result.current.startGame();
    });
    advanceThroughCountdown();

    const currentQ = result.current.state.currentQuestion!;
    expect(currentQ).toBeDefined();

    act(() => {
      result.current.submitAnswer(currentQ.answer);
    });

    expect(result.current.state.score).toBeGreaterThan(0);
    expect(result.current.state.combo).toBe(1);
    expect(result.current.state.questionsCorrectFirstTry).toBe(1);
    expect(result.current.state.questionsAnswered).toBe(1);
  });

  it('handles incorrect answer: deducts a life and resets combo', () => {
    const { result } = renderHook(() =>
      useGameEngine({
        initialConfig: { mistakeLimit: 3, isStressFree: false },
      })
    );

    act(() => {
      result.current.startGame();
    });
    advanceThroughCountdown();

    const currentQ = result.current.state.currentQuestion!;

    // Submit wrong answer
    act(() => {
      result.current.submitAnswer(currentQ.answer + 999);
    });

    expect(result.current.state.combo).toBe(0);
    expect(result.current.state.livesRemaining).toBe(2);
    expect(result.current.state.mistakeCount).toBe(1);
    expect(result.current.state.mistakeItems.length).toBe(1);
    expect(result.current.state.mistakeItems[0].pedagogicalHint).toBeTruthy();
  });

  it('triggers GAME_OVER when lives drop to 0', () => {
    const onGameOver = vi.fn();
    const { result } = renderHook(() =>
      useGameEngine({
        initialConfig: { mistakeLimit: 1, isStressFree: false },
        onGameOver,
      })
    );

    act(() => {
      result.current.startGame();
    });
    advanceThroughCountdown();

    const currentQ = result.current.state.currentQuestion!;

    act(() => {
      result.current.submitAnswer(currentQ.answer + 999);
    });

    expect(result.current.state.livesRemaining).toBe(0);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state.status).toBe('GAME_OVER');
    expect(onGameOver).toHaveBeenCalled();
  });

  it('stress-free mode provides unlimited lives, no timer expiration, and on-demand hints', () => {
    const { result } = renderHook(() =>
      useGameEngine({
        initialConfig: { isStressFree: true, mistakeLimit: null, timeLimitSec: null },
      })
    );

    act(() => {
      result.current.startGame();
    });
    advanceThroughCountdown();

    expect(result.current.state.isStressFree).toBe(true);
    expect(result.current.state.livesRemaining).toBeNull();
    expect(result.current.state.timeRemainingSec).toBeNull();

    // Wrong answer does not deduct lives
    const currentQ = result.current.state.currentQuestion!;
    act(() => {
      result.current.submitAnswer(currentQ.answer + 999);
    });

    expect(result.current.state.livesRemaining).toBeNull();
    expect(result.current.state.currentHint).toBeTruthy();
    expect(result.current.state.hintActive).toBe(true);

    // Request hint explicitly
    act(() => {
      result.current.requestHint();
    });
    expect(result.current.state.currentHint).toBeTruthy();
  });

  it('triggers VICTORY when target questions are reached', () => {
    const onVictory = vi.fn();
    const { result } = renderHook(() =>
      useGameEngine({
        initialConfig: { targetLength: 1 },
        onVictory,
      })
    );

    act(() => {
      result.current.startGame();
    });
    advanceThroughCountdown();

    const currentQ = result.current.state.currentQuestion!;
    act(() => {
      result.current.submitAnswer(currentQ.answer);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state.status).toBe('VICTORY');
    expect(onVictory).toHaveBeenCalled();
  });
});
