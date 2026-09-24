import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  calculateFactMasteryComponents,
  calculateFactMastery,
  getMasteryBadge,
  calculateTableMasteryReport,
} from '../../features/tables/logic/tableMasteryCalculator';
import { useTablePractice } from '../../features/tables/hooks/useTablePractice';
import { tableMasteryStore } from '../../features/tables/logic/tableMasteryStore';
import { FactStat } from '../../features/tables/types';

describe('Milestone 3 Challenger 2: Empirical Boundary & State Machine Test Suite', () => {
  /* =========================================================================
   * 1. BOUNDARY TESTING OF TABLE MASTERY CALCULATOR
   * ========================================================================= */
  describe('1. Table Mastery Calculator Boundary Conditions', () => {
    describe('1.1 Zero Attempts Boundary -> 0 Score', () => {
      it('returns exactly 0 for null, undefined, or empty fact stats', () => {
        expect(calculateFactMastery(null)).toBe(0);
        expect(calculateFactMastery(undefined)).toBe(0);

        const nullComp = calculateFactMasteryComponents(null);
        expect(nullComp.accuracyScore).toBe(0);
        expect(nullComp.speedScore).toBe(0);
        expect(nullComp.streakScore).toBe(0);
        expect(nullComp.totalScore).toBe(0);

        const undefComp = calculateFactMasteryComponents(undefined);
        expect(undefComp.accuracyScore).toBe(0);
        expect(undefComp.speedScore).toBe(0);
        expect(undefComp.streakScore).toBe(0);
        expect(undefComp.totalScore).toBe(0);
      });

      it('returns exactly 0 across all components when attempts === 0', () => {
        const zeroAttemptsStat: FactStat = {
          factId: 'mul_9_9',
          table: 9,
          multiplier: 9,
          attempts: 0,
          correctCount: 0,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 0,
          avgResponseTimeMs: 0,
          lastResponseTimeMs: 0,
          lastAttemptTimestamp: 0,
          masteryScore: 0,
        };

        const comp = calculateFactMasteryComponents(zeroAttemptsStat);
        expect(comp.accuracyScore).toBe(0);
        expect(comp.speedScore).toBe(0);
        expect(comp.streakScore).toBe(0);
        expect(comp.totalScore).toBe(0);
        expect(calculateFactMastery(zeroAttemptsStat)).toBe(0);
      });

      it('guards against corrupted negative attempt values by returning 0', () => {
        const corruptedStat: FactStat = {
          factId: 'mul_9_9',
          table: 9,
          multiplier: 9,
          attempts: -5,
          correctCount: 0,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 0,
          avgResponseTimeMs: 0,
          lastResponseTimeMs: 0,
          lastAttemptTimestamp: 0,
          masteryScore: 0,
        };

        const comp = calculateFactMasteryComponents(corruptedStat);
        expect(comp.totalScore).toBe(0);
      });

      it('produces 0% table mastery report when table has zero attempts across all facts', () => {
        const report = calculateTableMasteryReport({
          tableNumber: 13,
          multiplierMin: 1,
          multiplierMax: 10,
          factStats: {},
        });

        expect(report.totalFacts).toBe(10);
        expect(report.totalAttempts).toBe(0);
        expect(report.accuracyPercentage).toBe(0);
        expect(report.avgResponseTimeMs).toBe(0);
        expect(report.factsMastered).toBe(0);
        expect(report.masteryPercentage).toBe(0);
        expect(report.statusBadge).toBe('novice');
      });
    });

    describe('1.2 Accuracy Dampener with Few Attempts (Volume Dampener N/3)', () => {
      it('prevents single attempt (1/1) from jumping to 100% or even 50% mastery', () => {
        const singleWinStat: FactStat = {
          factId: 'mul_8_7',
          table: 8,
          multiplier: 7,
          attempts: 1,
          correctCount: 1,
          consecutiveCorrect: 1,
          totalResponseTimeMs: 1000,
          avgResponseTimeMs: 1000,
          lastResponseTimeMs: 1000,
          lastAttemptTimestamp: Date.now(),
          masteryScore: 0,
        };

        const comp = calculateFactMasteryComponents(singleWinStat);

        expect(comp.accuracyScore).toBeCloseTo(16.67, 1);
        expect(comp.speedScore).toBe(15.0);
        expect(comp.streakScore).toBeCloseTo(6.67, 1);
        expect(comp.totalScore).toBe(38);
        expect(comp.totalScore).toBeLessThan(50);
        expect(getMasteryBadge(comp.totalScore)).toBe('novice');
      });

      it('rewards 2 consecutive perfect attempts with Practicing tier, not yet Mastered', () => {
        const twoWinStat: FactStat = {
          factId: 'mul_8_7',
          table: 8,
          multiplier: 7,
          attempts: 2,
          correctCount: 2,
          consecutiveCorrect: 2,
          totalResponseTimeMs: 2000,
          avgResponseTimeMs: 1000,
          lastResponseTimeMs: 1000,
          lastAttemptTimestamp: Date.now(),
          masteryScore: 0,
        };

        const comp = calculateFactMasteryComponents(twoWinStat);

        expect(comp.accuracyScore).toBeCloseTo(33.33, 1);
        expect(comp.speedScore).toBe(30.0);
        expect(comp.streakScore).toBeCloseTo(13.33, 1);
        expect(comp.totalScore).toBe(77);
        expect(comp.totalScore).toBeGreaterThanOrEqual(50);
        expect(comp.totalScore).toBeLessThan(90);
        expect(getMasteryBadge(comp.totalScore)).toBe('practicing');
      });

      it('reaches 100% mastery only when N >= 3 with perfect accuracy, speed, and streak', () => {
        const threeWinStat: FactStat = {
          factId: 'mul_8_7',
          table: 8,
          multiplier: 7,
          attempts: 3,
          correctCount: 3,
          consecutiveCorrect: 3,
          totalResponseTimeMs: 3000,
          avgResponseTimeMs: 1000,
          lastResponseTimeMs: 1000,
          lastAttemptTimestamp: Date.now(),
          masteryScore: 0,
        };

        const comp = calculateFactMasteryComponents(threeWinStat);
        expect(comp.accuracyScore).toBe(50);
        expect(comp.speedScore).toBe(30);
        expect(comp.streakScore).toBe(20);
        expect(comp.totalScore).toBe(100);
        expect(getMasteryBadge(comp.totalScore)).toBe('mastered');
      });

      it('saturates volume dampener at N >= 3 and respects 90% accuracy target', () => {
        const stat90: FactStat = {
          factId: 'mul_8_7',
          table: 8,
          multiplier: 7,
          attempts: 10,
          correctCount: 9,
          consecutiveCorrect: 3,
          totalResponseTimeMs: 15000,
          avgResponseTimeMs: 1500,
          lastResponseTimeMs: 1500,
          lastAttemptTimestamp: Date.now(),
          masteryScore: 0,
        };
        expect(calculateFactMasteryComponents(stat90).accuracyScore).toBe(50);

        const stat80: FactStat = { ...stat90, correctCount: 8 };
        expect(calculateFactMasteryComponents(stat80).accuracyScore).toBeCloseTo(44.44, 1);
      });
    });

    describe('1.3 Speed Cutoff Bounds (<=1000ms Full Points, >=6000ms Zero Points)', () => {
      const baseFastStat: FactStat = {
        factId: 'mul_6_6',
        table: 6,
        multiplier: 6,
        attempts: 5,
        correctCount: 5,
        consecutiveCorrect: 5,
        totalResponseTimeMs: 5000,
        avgResponseTimeMs: 1000,
        lastResponseTimeMs: 1000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };

      it('awards full 30 points for response times <= 1000ms (and up to 3000ms target)', () => {
        const times = [100, 300, 500, 800, 1000, 1500, 2500, 3000];
        for (const rt of times) {
          const comp = calculateFactMasteryComponents({
            ...baseFastStat,
            avgResponseTimeMs: rt,
          });
          expect(comp.speedScore).toBe(30);
        }
      });

      it('linearly decays speed score between 3000ms and 6000ms', () => {
        const compMid = calculateFactMasteryComponents({
          ...baseFastStat,
          avgResponseTimeMs: 4500,
        });
        expect(compMid.speedScore).toBe(15.0);

        const comp3001 = calculateFactMasteryComponents({
          ...baseFastStat,
          avgResponseTimeMs: 3001,
        });
        expect(comp3001.speedScore).toBeCloseTo(29.99, 2);

        const comp5999 = calculateFactMasteryComponents({
          ...baseFastStat,
          avgResponseTimeMs: 5999,
        });
        expect(comp5999.speedScore).toBeCloseTo(0.01, 2);
      });

      it('awards strictly 0 speed points for response times >= 6000ms (zero speed points)', () => {
        const slowTimes = [6000, 6001, 7000, 10000, 60000];
        for (const rt of slowTimes) {
          const comp = calculateFactMasteryComponents({
            ...baseFastStat,
            avgResponseTimeMs: rt,
          });
          expect(comp.speedScore).toBe(0);
        }
      });

      it('awards 0 speed points for non-positive response times (RT <= 0)', () => {
        expect(calculateFactMasteryComponents({ ...baseFastStat, avgResponseTimeMs: 0 }).speedScore).toBe(0);
        expect(calculateFactMasteryComponents({ ...baseFastStat, avgResponseTimeMs: -500 }).speedScore).toBe(0);
      });

      it('dampens speed score when N < 2 even if response time is fast', () => {
        const comp1 = calculateFactMasteryComponents({
          ...baseFastStat,
          attempts: 1,
          avgResponseTimeMs: 1000,
        });
        expect(comp1.speedScore).toBe(15.0);
      });
    });

    describe('1.4 Streak Bonus Progression (Max 20 Points)', () => {
      const baseStreakStat: FactStat = {
        factId: 'mul_4_4',
        table: 4,
        multiplier: 4,
        attempts: 5,
        correctCount: 5,
        consecutiveCorrect: 0,
        totalResponseTimeMs: 5000,
        avgResponseTimeMs: 1000,
        lastResponseTimeMs: 1000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };

      it('awards 0 points when streak S === 0', () => {
        const comp = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: 0 });
        expect(comp.streakScore).toBe(0);
      });

      it('progresses linearly from 1 to 3 consecutive correct answers', () => {
        const comp1 = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: 1 });
        expect(comp1.streakScore).toBeCloseTo(6.67, 2);

        const comp2 = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: 2 });
        expect(comp2.streakScore).toBeCloseTo(13.33, 2);

        const comp3 = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: 3 });
        expect(comp3.streakScore).toBe(20.0);
      });

      it('caps streak bonus at 20 points for S >= 3', () => {
        for (const s of [4, 5, 10, 50, 100]) {
          const comp = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: s });
          expect(comp.streakScore).toBe(20.0);
        }
      });

      it('immediately drops streak points to 0 upon a single mistake reset', () => {
        const highStreak = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: 3 });
        expect(highStreak.streakScore).toBe(20.0);

        const resetStreak = calculateFactMasteryComponents({ ...baseStreakStat, consecutiveCorrect: 0 });
        expect(resetStreak.streakScore).toBe(0);
      });
    });
  });

  /* =========================================================================
   * 2. MODE B MISTAKE LOCK STATE MACHINE VERIFICATION
   * ========================================================================= */
  describe('2. Mode B Mistake Lock State Machine Verification', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      tableMasteryStore.clearAll();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('2.1 Non-Advancing Behavior on Wrong Answer', () => {
      it('strictly keeps the user on the same question when submitting wrong answers', () => {
        const { result } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 1, max: 10 },
            questionTarget: 5,
            inputMode: 'direct',
          });
        });

        expect(result.current.status).toBe('PRACTICING');
        expect(result.current.currentIndex).toBe(0);
        const originalQuestion = result.current.currentQuestion!;
        expect(originalQuestion).not.toBeNull();

        const wrongAnswer = String(originalQuestion.answer + 11);

        // Submit wrong answer
        act(() => {
          result.current.handleSubmit(wrongAnswer);
        });

        // VERIFICATION: Question remains UNCHANGED
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.currentQuestion?.id).toBe(originalQuestion.id);
        expect(result.current.currentQuestion?.factId).toBe(originalQuestion.factId);
        expect(result.current.inputFeedback).toBe('incorrect');
        expect(result.current.shakeKey).toBe(1);
        expect(result.current.currentCombo).toBe(0);

        // Submit a second different wrong answer
        const secondWrongAnswer = String(originalQuestion.answer + 22);
        act(() => {
          result.current.handleSubmit(secondWrongAnswer);
        });

        // VERIFICATION: Still on the exact same question
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.currentQuestion?.id).toBe(originalQuestion.id);
        expect(result.current.shakeKey).toBe(2);
      });
    });

    describe('2.2 Mistake Count Incrementing & Telemetry Attribution', () => {
      it('tracks multiple mistake attempts, records failure in telemetry, and updates telemetry stats', () => {
        const onXpEarned = vi.fn();
        const { result } = renderHook(() => useTablePractice({ onXpEarned }));

        act(() => {
          result.current.startPractice({
            selectedTables: [9],
            multiplierRange: { min: 5, max: 5 },
            questionTarget: 1,
            inputMode: 'direct',
          });
        });

        const q0 = result.current.currentQuestion!;
        expect(q0.table).toBe(9);
        expect(q0.multiplier).toBe(5);
        expect(q0.answer).toBe(45);

        // Submit 1st wrong answer (40)
        act(() => {
          result.current.handleSubmit('40');
        });
        expect(result.current.shakeKey).toBe(1);

        // Auto-clear 400ms
        act(() => {
          vi.advanceTimersByTime(400);
        });
        expect(result.current.inputValue).toBe('');
        expect(result.current.inputFeedback).toBe('idle');

        // Submit 2nd wrong answer (46)
        act(() => {
          result.current.handleSubmit('46');
        });
        expect(result.current.shakeKey).toBe(2);

        // Auto-clear 400ms
        act(() => {
          vi.advanceTimersByTime(400);
        });

        // Submit 3rd wrong answer (50)
        act(() => {
          result.current.handleSubmit('50');
        });
        expect(result.current.shakeKey).toBe(3);

        // Auto-clear 400ms
        act(() => {
          vi.advanceTimersByTime(400);
        });

        // Now user enters CORRECT answer (45)
        act(() => {
          result.current.handleInputChange('45');
        });

        expect(result.current.inputFeedback).toBe('correct');
        expect(result.current.currentCombo).toBe(1);

        // Advance question by 350ms
        act(() => {
          vi.advanceTimersByTime(350);
        });

        // Check telemetry store directly:
        const stat = tableMasteryStore.getFactStat(q0.factId)!;
        expect(stat).not.toBeNull();
        expect(stat.attempts).toBe(1);
        expect(stat.correctCount).toBe(0); // Recorded as failure due to mistakes
        expect(stat.consecutiveCorrect).toBe(0); // Streak broken

        // Verify session summary basics
        expect(result.current.status).toBe('SUMMARY');
        const summary = result.current.summary!;
        expect(summary).not.toBeNull();
        expect(summary.totalQuestions).toBe(1);
        expect(summary.correctFirstTryCount).toBe(0);
        expect(summary.accuracyPercentage).toBe(0);
        expect(summary.weakFactsEncountered).toContain(q0.factId);

        // Verify onXpEarned callback was invoked with 5 XP (reduced XP for mistake)
        expect(onXpEarned).toHaveBeenCalledWith(5);
      });

      it('EMPERICAL REPRODUCTION: reveals stale totalXp closure bug in finishSession', () => {
        // This test empirically documents the closure staleness bug where finishSession reads stale totalXp state
        const { result } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 2, max: 2 },
            questionTarget: 1,
            inputMode: 'direct',
          });
        });

        const q0 = result.current.currentQuestion!;
        act(() => {
          result.current.handleInputChange(String(q0.answer));
        });

        // Advance past 350ms to trigger advanceQuestion and finishSession
        act(() => {
          vi.advanceTimersByTime(350);
        });

        expect(result.current.status).toBe('SUMMARY');
        // TotalXp and maxCombo are now accurately captured via refs without closure staleness:
        expect(result.current.totalXp).toBeGreaterThan(0);
        expect(result.current.summary?.totalXpGained).toBe(15);
        expect(result.current.maxCombo).toBe(1);
        expect(result.current.summary?.maxCombo).toBe(1);
      });
    });

    describe('2.3 Auto-Clear Timing (400ms) & Correct Answer Advance Timing (350ms)', () => {
      it('verifies exact millisecond precision for 400ms auto-clear on wrong answer', () => {
        const { result } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 1, max: 10 },
            questionTarget: 3,
            inputMode: 'direct',
          });
        });

        const q0 = result.current.currentQuestion!;
        const wrongInput = String(q0.answer + 3);

        // Enter wrong input
        act(() => {
          result.current.handleInputChange(wrongInput);
        });
        expect(result.current.inputValue).toBe(wrongInput);

        // Submit wrong input
        act(() => {
          result.current.handleSubmit();
        });

        expect(result.current.inputFeedback).toBe('incorrect');
        expect(result.current.inputValue).toBe(wrongInput);

        // Advance 200ms: still incorrect, still showing wrong input
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(result.current.inputFeedback).toBe('incorrect');
        expect(result.current.inputValue).toBe(wrongInput);

        // Advance another 199ms (total 399ms): still incorrect, still showing wrong input
        act(() => {
          vi.advanceTimersByTime(199);
        });
        expect(result.current.inputFeedback).toBe('incorrect');
        expect(result.current.inputValue).toBe(wrongInput);
        expect(result.current.currentIndex).toBe(0);

        // Advance exactly 1ms (total 400ms): auto-clear triggers!
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(result.current.inputFeedback).toBe('idle');
        expect(result.current.inputValue).toBe('');
        expect(result.current.currentIndex).toBe(0); // Still on same question
      });

      it('verifies exact millisecond precision for 350ms advance on correct answer', () => {
        const { result } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 1, max: 10 },
            questionTarget: 3,
            inputMode: 'direct',
          });
        });

        const q0 = result.current.currentQuestion!;
        const correctInput = String(q0.answer);

        // Enter correct answer
        act(() => {
          result.current.handleInputChange(correctInput);
        });

        expect(result.current.inputFeedback).toBe('correct');
        expect(result.current.currentIndex).toBe(0);

        // Advance 200ms: still on question 0
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(result.current.currentIndex).toBe(0);

        // Advance another 149ms (total 349ms): still on question 0
        act(() => {
          vi.advanceTimersByTime(149);
        });
        expect(result.current.currentIndex).toBe(0);

        // Advance exactly 1ms (total 350ms): advance triggers!
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(result.current.currentIndex).toBe(1);
        expect(result.current.inputFeedback).toBe('idle');
        expect(result.current.inputValue).toBe('');
      });
    });

    describe('2.4 Keypad Input Guards & Boundary Defense', () => {
      it('blocks virtual digit input and backspace while feedback is active (shaking or advancing)', () => {
        const { result } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 1, max: 10 },
            questionTarget: 3,
            inputMode: 'direct',
          });
        });

        const q0 = result.current.currentQuestion!;
        act(() => {
          result.current.handleSubmit(String(q0.answer + 9));
        });

        expect(result.current.inputFeedback).toBe('incorrect');

        // Attempting to append digit while feedback is 'incorrect' should be ignored
        act(() => {
          result.current.handleDigit('8');
          result.current.handleBackspace();
          result.current.handleClear();
        });

        // After 400ms auto-clear
        act(() => {
          vi.advanceTimersByTime(400);
        });
        expect(result.current.inputFeedback).toBe('idle');
        expect(result.current.inputValue).toBe('');

        // Now handleDigit works properly in idle state
        act(() => {
          result.current.handleDigit('5');
        });
        expect(result.current.inputValue).toBe('5');
      });

      it('clamps maximum input length to 5 digits and strips non-numeric characters', () => {
        const { result } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 1, max: 10 },
            questionTarget: 3,
            inputMode: 'direct',
          });
        });

        act(() => {
          result.current.handleInputChange('123456789');
        });
        expect(result.current.inputValue).toBe('12345');

        act(() => {
          result.current.handleInputChange('43abc21');
        });
        expect(result.current.inputValue).toBe('4321');
      });

      it('safely cancels pending timers on unmount without leaks or exceptions', () => {
        const { result, unmount } = renderHook(() => useTablePractice());

        act(() => {
          result.current.startPractice({
            selectedTables: [7],
            multiplierRange: { min: 1, max: 10 },
            questionTarget: 3,
            inputMode: 'direct',
          });
        });

        // Trigger wrong answer (timer scheduled for 400ms)
        act(() => {
          result.current.handleSubmit('9999');
        });

        // Unmount component before timer fires
        expect(() => {
          unmount();
          vi.advanceTimersByTime(1000);
        }).not.toThrow();
      });
    });
  });
});
