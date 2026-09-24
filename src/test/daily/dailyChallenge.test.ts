import { describe, it, expect } from 'vitest';
import {
  generateDailyChallenge,
  calculateDailyStreak,
  generateDailyScorecard,
  getPreviousCalendarDate,
} from '../../features/daily/dailyChallengeBuilder';

describe('Daily Challenge & Streak Invariant Suite', () => {
  describe('Mulberry32 Date Determinism Invariant', () => {
    it('produces identical 10-question sequences for the same date across independent runs', () => {
      const challengeA = generateDailyChallenge('2026-09-18');
      const challengeB = generateDailyChallenge('2026-09-18');

      expect(challengeA.seed).toBe(challengeB.seed);
      expect(challengeA.questions.length).toBe(10);
      expect(challengeB.questions.length).toBe(10);

      for (let i = 0; i < 10; i++) {
        const qA = challengeA.questions[i];
        const qB = challengeB.questions[i];
        expect(qA.promptText).toBe(qB.promptText);
        expect(qA.answer).toBe(qB.answer);
        expect(qA.options).toEqual(qB.options);
      }
    });

    it('produces distinct seeds and questions for different dates', () => {
      const day1 = generateDailyChallenge('2026-09-18');
      const day2 = generateDailyChallenge('2026-09-19');

      expect(day1.seed).not.toBe(day2.seed);
      expect(day1.questions[0].promptText).not.toBe(day2.questions[0].promptText);
    });
  });

  describe('Standardized 10-Question Distribution', () => {
    it('strictly satisfies the 2 Add, 2 Sub, 3 Mul, 3 Div distribution', () => {
      const challenge = generateDailyChallenge('2026-09-18');
      const ops = challenge.questions.map((q) => q.operator);

      expect(ops.slice(0, 2)).toEqual(['+', '+']);
      expect(ops.slice(2, 4)).toEqual(['-', '-']);
      expect(ops.slice(4, 7)).toEqual(['*', '*', '*']);
      expect(ops.slice(7, 10)).toEqual(['/', '/', '/']);
    });

    it('strictly guarantees exact integer division without remainders across 50 calendar dates', () => {
      for (let d = 1; d <= 50; d++) {
        const dateStr = `2026-10-${String(d).padStart(2, '0')}`;
        const challenge = generateDailyChallenge(dateStr);
        const divQuestions = challenge.questions.slice(7, 10);

        for (const divQ of divQuestions) {
          expect(divQ.operator).toBe('/');
          expect(divQ.operandB).toBeGreaterThanOrEqual(2);
          expect(divQ.operandA % divQ.operandB).toBe(0);
          expect(divQ.operandA / divQ.operandB).toBe(divQ.answer);
        }
      }
    });
  });

  describe('Timezone-Safe Streak Tracking', () => {
    it('correctly calculates previous calendar date without timezone drift', () => {
      expect(getPreviousCalendarDate('2026-09-18')).toBe('2026-09-17');
      expect(getPreviousCalendarDate('2026-03-01')).toBe('2026-02-28');
      expect(getPreviousCalendarDate('2026-01-01')).toBe('2025-12-31');
    });

    it('increments streak by 1 on consecutive calendar days', () => {
      const result = calculateDailyStreak('2026-09-17', '2026-09-18', 4, 10);
      expect(result.nextStreak).toBe(5);
      expect(result.nextBestStreak).toBe(10);
      expect(result.isContinuation).toBe(true);
    });

    it('updates bestStreak when current streak surpasses it', () => {
      const result = calculateDailyStreak('2026-09-17', '2026-09-18', 10, 10);
      expect(result.nextStreak).toBe(11);
      expect(result.nextBestStreak).toBe(11);
      expect(result.isContinuation).toBe(true);
    });

    it('leaves streak unchanged on same-day multiple completions', () => {
      const result = calculateDailyStreak('2026-09-18', '2026-09-18', 5, 8);
      expect(result.nextStreak).toBe(5);
      expect(result.nextBestStreak).toBe(8);
      expect(result.isContinuation).toBe(false);
    });

    it('resets streak to 1 after a missed day (gap > 1 day) while preserving best streak', () => {
      const result = calculateDailyStreak('2026-09-15', '2026-09-18', 7, 14);
      expect(result.nextStreak).toBe(1);
      expect(result.nextBestStreak).toBe(14);
      expect(result.isContinuation).toBe(false);
    });
  });

  describe('Emoji Scorecard Generation', () => {
    it('formats a shareable Wordle-style scorecard with accuracy, time, streak, and boxes', () => {
      const card = generateDailyScorecard({
        dateKey: '2026-09-18',
        score: 9,
        totalQuestions: 10,
        timeSec: 34.5,
        streak: 6,
        questionResults: [true, true, true, false, true, true, true, true, true, true],
      });

      expect(card).toContain('Math Daily Challenge — 2026-09-18');
      expect(card).toContain('Score: 9/10 ⭐ (90%)');
      expect(card).toContain('Time: 34.5s ⚡');
      expect(card).toContain('Streak: 6 days 🔥');
      expect(card).toContain('🟩🟩 ➕ Addition');
      expect(card).toContain('🟩🟥 ➖ Subtraction');
      expect(card).toContain('https://mathsgame.app');
    });
  });
});
