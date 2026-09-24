import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTablePractice } from '../../features/tables/hooks/useTablePractice';
import { tableMasteryStore } from '../../features/tables/logic/tableMasteryStore';

describe('useTablePractice State Machine & Lifecycle Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tableMasteryStore.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in CONFIGURING status and starts practice', () => {
    const { result } = renderHook(() => useTablePractice());
    expect(result.current.status).toBe('CONFIGURING');

    act(() => {
      result.current.startPractice({
        selectedTables: [7],
        multiplierRange: { min: 1, max: 10 },
        questionTarget: 10,
        inputMode: 'choice',
      });
    });

    expect(result.current.status).toBe('PRACTICING');
    expect(result.current.totalQuestions).toBe(10);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentQuestion).not.toBeNull();
  });

  describe('Mode A: Multiple Choice Mechanics', () => {
    it('handles correct choice: emerald feedback, score increment, advances after 350ms', () => {
      const onXpEarned = vi.fn();
      const { result } = renderHook(() => useTablePractice({ onXpEarned }));

      act(() => {
        result.current.startPractice({
          selectedTables: [7],
          multiplierRange: { min: 1, max: 10 },
          questionTarget: 5,
          inputMode: 'choice',
        });
      });

      const q0 = result.current.currentQuestion!;
      const correctIdx = q0.correctIndex;

      act(() => {
        result.current.handleSelectOption(correctIdx);
      });

      expect(result.current.choiceFeedback).toBe('correct');
      expect(result.current.currentCombo).toBe(1);
      expect(onXpEarned).toHaveBeenCalled();

      // Before 350ms, still on q0
      expect(result.current.currentIndex).toBe(0);

      // Advance by 350ms
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.choiceFeedback).toBe('idle');
    });

    it('handles incorrect choice: rose feedback, combo reset, advances after 750ms', () => {
      const { result } = renderHook(() => useTablePractice());

      act(() => {
        result.current.startPractice({
          selectedTables: [7],
          multiplierRange: { min: 1, max: 10 },
          questionTarget: 5,
          inputMode: 'choice',
        });
      });

      const q0 = result.current.currentQuestion!;
      // Find a wrong index
      const wrongIdx = (q0.correctIndex + 1) % 4;

      act(() => {
        result.current.handleSelectOption(wrongIdx);
      });

      expect(result.current.choiceFeedback).toBe('incorrect');
      expect(result.current.currentCombo).toBe(0);

      // Still on q0 at 350ms
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(result.current.currentIndex).toBe(0);

      // Advances after 750ms
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.choiceFeedback).toBe('idle');
    });
  });

  describe('Mode B: Direct Typing & Non-Advancing Mistake Lock', () => {
    it('locks user on same question on wrong answer and auto-clears after 400ms', () => {
      const { result } = renderHook(() => useTablePractice());

      act(() => {
        result.current.startPractice({
          selectedTables: [7],
          multiplierRange: { min: 1, max: 10 },
          questionTarget: 5,
          inputMode: 'direct',
        });
      });

      const q0 = result.current.currentQuestion!;
      const wrongAnswer = String(q0.answer + 5);

      act(() => {
        result.current.handleSubmit(wrongAnswer);
      });

      // NON-ADVANCING MISTAKE LOCK
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.inputFeedback).toBe('incorrect');
      expect(result.current.shakeKey).toBeGreaterThan(0);
      expect(result.current.currentCombo).toBe(0);

      // After 400ms: input clears, returns to idle, STILL ON QUESTION 0
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.inputValue).toBe('');
      expect(result.current.inputFeedback).toBe('idle');
    });

    it('advances after 350ms when correct answer is entered, auto-clears input', () => {
      const { result } = renderHook(() => useTablePractice());

      act(() => {
        result.current.startPractice({
          selectedTables: [7],
          multiplierRange: { min: 1, max: 10 },
          questionTarget: 5,
          inputMode: 'direct',
        });
      });

      const q0 = result.current.currentQuestion!;
      const correctAnswer = String(q0.answer);

      act(() => {
        result.current.handleInputChange(correctAnswer);
      });

      expect(result.current.inputFeedback).toBe('correct');
      expect(result.current.currentCombo).toBe(1);

      // Advance by 350ms
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.inputValue).toBe('');
      expect(result.current.inputFeedback).toBe('idle');
    });
  });

  describe('Session Summary Transition', () => {
    it('transitions to SUMMARY when the final question is answered', () => {
      const onSessionComplete = vi.fn();
      const { result } = renderHook(() => useTablePractice({ onSessionComplete }));

      act(() => {
        result.current.startPractice({
          selectedTables: [7],
          multiplierRange: { min: 1, max: 10 },
          questionTarget: 1,
          inputMode: 'direct',
        });
      });

      const q0 = result.current.currentQuestion!;
      act(() => {
        result.current.handleSubmit(String(q0.answer));
      });

      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.status).toBe('SUMMARY');
      expect(result.current.summary).not.toBeNull();
      expect(result.current.summary?.totalQuestions).toBe(1);
      expect(result.current.summary?.accuracyPercentage).toBe(100);
      expect(onSessionComplete).toHaveBeenCalled();
    });
  });
});
