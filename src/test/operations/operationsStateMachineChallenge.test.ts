import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperationPractice } from '../../features/operations/hooks/useOperationPractice';
import { generateSessionQuestions } from '../../features/operations/questionGeneratorBridge';
import { generateArithmeticFact } from '../../core/math/arithmeticGenerator';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import { OperationSessionConfig } from '../../features/operations/types';

describe('Challenger 2 Empirical Verification: Operations Practice State Machine & Distributions', () => {
  describe('1. Mode B Direct Typing State Machine & Auto-Advance', () => {
    it('incorrect input keeps the user on the same question, resets combo, and auto-clears input', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      expect(result.current.currentIndex).toBe(0);
      const q0 = result.current.currentQuestion!;
      expect(q0).toBeDefined();

      const wrongVal = String(q0.answer + 7);

      // User types wrong value
      act(() => {
        result.current.setInputValue(wrongVal);
      });
      expect(result.current.inputValue).toBe(wrongVal);

      // User submits wrong value
      act(() => {
        result.current.handleSubmit();
      });

      // Assertions: Stays on same question, inputFeedback is incorrect, combo is 0
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentQuestion!.id).toBe(q0.id);
      expect(result.current.inputFeedback).toBe('incorrect');
      expect(result.current.currentCombo).toBe(0);

      // After 400ms auto-clear timer expires
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // User is STILL on the same question, but input is cleared and ready for retry
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentQuestion!.id).toBe(q0.id);
      expect(result.current.inputValue).toBe('');
      expect(result.current.inputFeedback).toBe('idle');

      vi.useRealTimers();
    });

    it('submitting correct answer immediately auto-advances to the next question', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q0 = result.current.currentQuestion!;
      const correctVal = String(q0.answer);

      // User enters correct value
      act(() => {
        result.current.setInputValue(correctVal);
      });
      // User submits
      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.inputFeedback).toBe('correct');
      expect(result.current.currentScore).toBe(1);
      expect(result.current.currentCombo).toBe(1);

      // 350ms delay auto-advances without any secondary user action
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentQuestion!.id).not.toBe(q0.id);
      expect(result.current.inputValue).toBe('');
      expect(result.current.inputFeedback).toBe('idle');

      vi.useRealTimers();
    });

    it('typing input without submitting does NOT auto-advance until submitted', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q0 = result.current.currentQuestion!;
      const correctVal = String(q0.answer);

      // User types digits one by one using handleDigit
      for (const char of correctVal) {
        act(() => {
          result.current.handleDigit(char);
        });
      }

      expect(result.current.inputValue).toBe(correctVal);
      // Even though characters match, state machine does not advance until Enter / submit is called
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.inputFeedback).toBe('idle');

      // Now submit
      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.inputFeedback).toBe('correct');
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(result.current.currentIndex).toBe(1);

      vi.useRealTimers();
    });

    it('handles multiple consecutive mistakes before eventual correct answer', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 2 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q0 = result.current.currentQuestion!;
      const correctVal = String(q0.answer);

      // Mistake 1
      act(() => {
        result.current.setInputValue(String(q0.answer + 1));
        result.current.handleSubmit();
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.currentIndex).toBe(0);

      // Mistake 2
      act(() => {
        result.current.setInputValue(String(q0.answer + 2));
        result.current.handleSubmit();
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.currentIndex).toBe(0);

      // Mistake 3
      act(() => {
        result.current.setInputValue(String(q0.answer + 3));
        result.current.handleSubmit();
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.currentIndex).toBe(0);

      // Finally correct
      act(() => {
        result.current.setInputValue(correctVal);
      });
      act(() => {
        result.current.handleSubmit();
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.currentIndex).toBe(1);
      // Because question 0 had mistakes, score does not increment
      expect(result.current.currentScore).toBe(0);
      expect(result.current.currentCombo).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('2. Mode A Option Shuffling & Uniformity Analysis', () => {
    it('verifies that correct answer index is uniformly distributed across options 0, 1, 2, 3 in 20,000 generated questions', () => {
      const counts = [0, 0, 0, 0];
      const N = 20000;
      const expected = N / 4; // 5,000 per index

      const configs: OperationSessionConfig[] = [
        { selectedOperators: ['+'], level: 1, inputMode: 'choice', questionCount: 20 },
        { selectedOperators: ['-'], level: 2, inputMode: 'choice', questionCount: 20 },
        { selectedOperators: ['*'], level: 3, inputMode: 'choice', questionCount: 20 },
        { selectedOperators: ['/'], level: 4, inputMode: 'choice', questionCount: 20 },
        { selectedOperators: ['+', '-', '*', '/'], level: 5, inputMode: 'choice', questionCount: 20 },
      ];

      for (let i = 0; i < N / 20; i++) {
        const config = configs[i % configs.length];
        const questions = generateSessionQuestions(config, 20);

        for (const q of questions) {
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.options[q.correctIndex]).toBe(q.answer);
          counts[q.correctIndex]++;
        }
      }

      console.log(`[Option Shuffling Distribution over ${N} questions]:`, counts);

      // Calculate Pearson Chi-Square statistic: sum((O - E)^2 / E)
      // Degrees of freedom = 3. Critical value at alpha = 0.001 is 16.27.
      let chiSquare = 0;
      for (let i = 0; i < 4; i++) {
        const diff = counts[i] - expected;
        chiSquare += (diff * diff) / expected;
        // Each count should be within tolerance of 5000 (i.e. [4500, 5500])
        expect(counts[i]).toBeGreaterThan(4500);
        expect(counts[i]).toBeLessThan(5500);
      }

      console.log(`[Chi-Square Statistic]: ${chiSquare.toFixed(4)} (df=3, p > 0.001 critical is 16.27)`);
      expect(chiSquare).toBeLessThan(16.27);
    });

    it('verifies distractorEngine.generate directly produces uniform correctIndex distributions', () => {
      const counts = [0, 0, 0, 0];
      const N = 10000;

      for (let i = 0; i < N; i++) {
        const res = distractorEngine.generate({
          operator: '*',
          operandA: 11,
          operandB: 9,
          answer: 99,
          difficulty: 'normal',
        });

        expect(res.allChoices).toHaveLength(4);
        expect(res.allChoices[res.correctIndex]).toBe(99);
        counts[res.correctIndex]++;
      }

      for (let i = 0; i < 4; i++) {
        // Expected ~2500, tolerance [2200, 2800]
        expect(counts[i]).toBeGreaterThan(2200);
        expect(counts[i]).toBeLessThan(2800);
      }
    });
  });

  describe('3. Combo Multiplier, Streak, and XP Score Accumulation Logic', () => {
    it('accumulates combo streak and tracks maxCombo across answers', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'choice', questionCount: 10, level: 3 } })
      );

      act(() => {
        result.current.startSession();
      });

      // Answer 4 questions correctly
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
        });
        act(() => {
          vi.advanceTimersByTime(350);
        });
        expect(result.current.currentCombo).toBe(i + 1);
        expect(result.current.maxCombo).toBe(i + 1);
        expect(result.current.currentScore).toBe(i + 1);
      }

      // Answer question 5 incorrectly
      const wrongIdx = (result.current.currentQuestion!.correctIndex + 1) % 4;
      act(() => {
        result.current.handleSelectOption(wrongIdx);
      });
      act(() => {
        vi.advanceTimersByTime(750);
      });

      // Assert combo reset, but maxCombo preserved
      expect(result.current.currentCombo).toBe(0);
      expect(result.current.maxCombo).toBe(4);
      expect(result.current.currentScore).toBe(4);

      // Answer question 6 correctly
      act(() => {
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.currentCombo).toBe(1);
      expect(result.current.maxCombo).toBe(4);
      expect(result.current.currentScore).toBe(5);

      vi.useRealTimers();
    });

    it('calculates XP bonuses: base level XP, speed bonus, and combo streak bonus', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'choice', questionCount: 15, level: 3 } })
      );

      act(() => {
        result.current.startSession();
      });

      // Level 3 base XP = 10 + (3 - 1) * 2 = 14
      // If responseTime < 2000ms: speed bonus = +5 => 19 XP per question for combo < 5
      // If combo >= 5: streak bonus = +5 => 24 XP per question
      // If combo >= 10: streak bonus = +10 => 34 XP per question

      // Q1: combo = 1
      act(() => {
        vi.advanceTimersByTime(500); // 500ms response time
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      expect(result.current.totalXp).toBe(19); // 14 base + 5 speed

      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Q2-Q4: combo = 2, 3, 4 (each +19 XP)
      for (let i = 2; i <= 4; i++) {
        act(() => {
          vi.advanceTimersByTime(500);
          result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
        });
        act(() => {
          vi.advanceTimersByTime(350);
        });
      }
      expect(result.current.totalXp).toBe(19 * 4); // 76 XP

      // Q5: combo = 5 -> +5 streak bonus => 14 + 5 + 5 = 24 XP
      act(() => {
        vi.advanceTimersByTime(500);
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      expect(result.current.totalXp).toBe(76 + 24); // 100 XP

      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Q6-Q9: combo 6, 7, 8, 9 (each +24 XP)
      for (let i = 6; i <= 9; i++) {
        act(() => {
          vi.advanceTimersByTime(500);
          result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
        });
        act(() => {
          vi.advanceTimersByTime(350);
        });
      }
      expect(result.current.totalXp).toBe(100 + 24 * 4); // 196 XP

      // Q10: combo = 10 -> +5 and +10 bonus => 14 + 5 + 5 + 10 = 34 XP
      act(() => {
        vi.advanceTimersByTime(500);
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      expect(result.current.totalXp).toBe(196 + 34); // 230 XP

      vi.useRealTimers();
    });

    it('Mode B awards partial credit (5 XP) after mistakes and no streak bonus', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct', questionCount: 2, level: 2 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q0 = result.current.currentQuestion!;

      // Wrong answer first
      act(() => {
        result.current.setInputValue(String(q0.answer + 10));
      });
      act(() => {
        result.current.handleSubmit();
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.totalXp).toBe(0);

      // Now correct answer
      act(() => {
        result.current.setInputValue(String(q0.answer));
      });
      act(() => {
        result.current.handleSubmit();
      });

      // Should receive partial credit 5 XP
      expect(result.current.totalXp).toBe(5);

      vi.useRealTimers();
    });

    it('applies accuracy completion bonus on 100% completion in session summary', () => {
      vi.useFakeTimers();
      let reportedSummary: any = null;
      let reportedXp: number = 0;

      const { result } = renderHook(() =>
        useOperationPractice({
          initialConfig: { inputMode: 'choice', questionCount: 2, level: 1 },
          onSessionComplete: (s) => { reportedSummary = s; },
          onXpEarned: (xp) => { reportedXp = xp; },
        })
      );

      act(() => {
        result.current.startSession();
      });

      // Level 1: base = 10, speed = 5 => 15 XP each
      act(() => {
        vi.advanceTimersByTime(500);
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });

      act(() => {
        vi.advanceTimersByTime(500);
        result.current.handleSelectOption(result.current.currentQuestion!.correctIndex);
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.status).toBe('SUMMARY');
      expect(reportedSummary).not.toBeNull();
      expect(reportedSummary.accuracyPercentage).toBe(100);
      // 15 + 15 = 30 session XP + 50 accuracy bonus = 80 total XP
      expect(reportedSummary.totalXpGained).toBe(80);
      expect(reportedXp).toBe(80);

      vi.useRealTimers();
    });
  });

  describe('4. Edge Cases, Boundary Conditions & Invariants', () => {
    it('handles answer = 0 in subtraction (e.g. 5 - 5 = 0) gracefully in distractor engine', () => {
      const res = distractorEngine.generate({
        operator: '-',
        operandA: 5,
        operandB: 5,
        answer: 0,
        difficulty: 'normal',
      });

      expect(res.allChoices).toHaveLength(4);
      expect(new Set(res.allChoices).size).toBe(4);
      expect(res.allChoices[res.correctIndex]).toBe(0);
      // At least one distractor shares the last digit (0), e.g., 10
      expect(res.distractors.some((d) => d % 10 === 0)).toBe(true);
      // All distractors are strictly positive integers
      expect(res.distractors.every((d) => d > 0)).toBe(true);
    });

    it('handles rapid repeated option clicks without corrupting transition state', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'choice', questionCount: 5 } })
      );

      act(() => {
        result.current.startSession();
      });

      const q0 = result.current.currentQuestion!;
      const correctIdx = q0.correctIndex;

      // Click option multiple times rapidly
      act(() => {
        result.current.handleSelectOption(correctIdx);
        result.current.handleSelectOption(correctIdx);
        result.current.handleSelectOption((correctIdx + 1) % 4);
      });

      // Score should only increment once
      expect(result.current.currentScore).toBe(1);
      expect(result.current.currentCombo).toBe(1);

      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Exactly 1 question advanced
      expect(result.current.currentIndex).toBe(1);

      vi.useRealTimers();
    });

    it('rejects input greater than 7 digits in handleDigit', () => {
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct' } })
      );

      act(() => {
        result.current.startSession();
      });

      // Type 10 digits
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleDigit('9');
        });
      }

      // Max length clamped at 7
      expect(result.current.inputValue).toBe('9999999');
      expect(result.current.inputValue.length).toBe(7);
    });

    it('supports backspace and clear operations cleanly', () => {
      const { result } = renderHook(() =>
        useOperationPractice({ initialConfig: { inputMode: 'direct' } })
      );

      act(() => {
        result.current.startSession();
      });

      act(() => {
        result.current.handleDigit('1');
        result.current.handleDigit('2');
        result.current.handleDigit('3');
      });
      expect(result.current.inputValue).toBe('123');

      act(() => {
        result.current.handleBackspace();
      });
      expect(result.current.inputValue).toBe('12');

      act(() => {
        result.current.handleClear();
      });
      expect(result.current.inputValue).toBe('');
    });

    it('reproduces and diagnoses options.length !== 4 across 10,000 iterations', () => {
      const TOTAL = 10000;
      const operators: any[] = ['+', '-', '*', '/'];
      const difficulties: any[] = ['easy', 'normal', 'hard', 'expert'];
      const levels: any[] = [1, 2, 3, 4, 5];

      const anomalies: any[] = [];

      for (let i = 0; i < TOTAL; i++) {
        const op = operators[i % operators.length];
        const difficulty = difficulties[Math.floor(i / operators.length) % difficulties.length];
        const level = levels[i % levels.length];

        const fact = generateArithmeticFact({
          allowedOperators: [op],
          level,
        });

        const result = distractorEngine.generate({
          operator: fact.operator,
          operandA: fact.operandA,
          operandB: fact.operandB,
          answer: fact.answer,
          difficulty,
          count: 3,
        });

        if (result.allChoices.length !== 4) {
          anomalies.push({
            fact,
            difficulty,
            allChoices: result.allChoices,
            distractors: result.distractors,
          });
        }
      }

      console.log(`[Total count anomalies out of ${TOTAL}]: ${anomalies.length}`);
      if (anomalies.length > 0) {
        console.log('[First 5 Anomalies]:', JSON.stringify(anomalies.slice(0, 5), null, 2));
      }
      expect(anomalies.length).toBe(0);
    });
  });
});
