import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperationPractice } from '../../features/operations/hooks/useOperationPractice';

describe('useOperationPractice State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default configuring state', () => {
    const { result } = renderHook(() => useOperationPractice());
    expect(result.current.status).toBe('CONFIGURING');
    expect(result.current.config.selectedOperators).toEqual(['+']);
    expect(result.current.config.level).toBe(1);
    expect(result.current.config.inputMode).toBe('choice');
    expect(result.current.questions).toHaveLength(0);
  });

  it('updates configuration and prevents empty operator sets', () => {
    const { result } = renderHook(() => useOperationPractice());
    act(() => {
      result.current.updateConfig({ selectedOperators: ['+', '*'], level: 3 });
    });
    expect(result.current.config.selectedOperators).toEqual(['+', '*']);
    expect(result.current.config.level).toBe(3);

    // Empty operator fallback
    act(() => {
      result.current.updateConfig({ selectedOperators: [] });
    });
    expect(result.current.config.selectedOperators).toEqual(['+']);
  });

  it('starts session and generates configured number of questions', () => {
    const { result } = renderHook(() => useOperationPractice());
    act(() => {
      result.current.startSession({ questionCount: 10, level: 2 });
    });

    expect(result.current.status).toBe('PRACTICING');
    expect(result.current.questions).toHaveLength(10);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentQuestion).not.toBeNull();
  });

  describe('Mode A: Multiple Choice Selection', () => {
    it('advances and increments score on correct option selection', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'choice', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q = result.current.currentQuestion!;
      const correctIdx = q.correctIndex;

      act(() => {
        result.current.handleSelectOption(correctIdx);
      });

      expect(result.current.choiceFeedback).toBe('correct');
      expect(result.current.currentScore).toBe(1);
      expect(result.current.currentCombo).toBe(1);

      // Fast-forward transition timer
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.choiceFeedback).toBe('idle');
      vi.useRealTimers();
    });

    it('resets combo and flags incorrect on wrong option selection', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'choice', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q = result.current.currentQuestion!;
      const wrongIdx = (q.correctIndex + 1) % 4;

      act(() => {
        result.current.handleSelectOption(wrongIdx);
      });

      expect(result.current.choiceFeedback).toBe('incorrect');
      expect(result.current.currentScore).toBe(0);
      expect(result.current.currentCombo).toBe(0);

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(result.current.currentIndex).toBe(1);
      vi.useRealTimers();
    });
  });

  describe('Mode B: Direct Numeric Typing & Non-Advancing Mistakes', () => {
    it('does NOT advance on incorrect submission, triggers shake feedback, and stays on same question', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const initialShakeKey = result.current.shakeKey;
      const q = result.current.currentQuestion!;
      const wrongAnswer = String(q.answer + 5);

      act(() => {
        result.current.setInputValue(wrongAnswer);
      });
      act(() => {
        result.current.handleSubmit();
      });

      // Assert non-advancing mistake behavior
      expect(result.current.currentIndex).toBe(0); // Still on Q0!
      expect(result.current.inputFeedback).toBe('incorrect');
      expect(result.current.shakeKey).toBe(initialShakeKey + 1);
      expect(result.current.currentCombo).toBe(0);

      // Advance auto-clear timer
      act(() => {
        vi.advanceTimersByTime(450);
      });

      expect(result.current.inputValue).toBe('');
      expect(result.current.currentIndex).toBe(0); // Still on Q0!

      vi.useRealTimers();
    });

    it('advances on correct numeric submission after prior mistake', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q = result.current.currentQuestion!;
      const correctAnswer = String(q.answer);

      // Submit wrong first
      act(() => {
        result.current.setInputValue('9999');
        result.current.handleSubmit();
      });

      act(() => {
        vi.advanceTimersByTime(450);
      });

      // Now submit correct answer
      act(() => {
        result.current.setInputValue(correctAnswer);
        result.current.handleSubmit(correctAnswer);
      });

      expect(result.current.inputFeedback).toBe('correct');

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.currentIndex).toBe(1);
      vi.useRealTimers();
    });
  });

  describe('Session Completion & Summary', () => {
    it('transitions to SUMMARY status and computes accuracy upon completing last question', async () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useOperationPractice({
          initialConfig: { inputMode: 'choice', questionCount: 2 },
          onSessionComplete: onComplete,
        })
      );

      act(() => {
        result.current.startSession();
      });

      // Question 1 correct
      act(() => {
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Question 2 correct
      act(() => {
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.status).toBe('SUMMARY');
      expect(result.current.summary).not.toBeNull();
      expect(result.current.summary!.accuracyPercentage).toBe(100);
      expect(result.current.summary!.correctFirstTryCount).toBe(2);
      expect(onComplete).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
