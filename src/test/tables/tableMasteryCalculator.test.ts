import { describe, it, expect } from 'vitest';
import {
  calculateFactMasteryComponents,
  calculateFactMastery,
  getMasteryBadge,
  isFactWeak,
  calculateWeaknessPriorityScore,
  calculateTableMasteryReport,
} from '../../features/tables/logic/tableMasteryCalculator';
import { FactStat } from '../../features/tables/types';

describe('Table Mastery Calculator Suite', () => {
  describe('Accuracy Component (Weight 50%)', () => {
    it('returns 0 for 0 attempts or null stat', () => {
      expect(calculateFactMasteryComponents(null).accuracyScore).toBe(0);
      const zeroStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 0,
        correctCount: 0,
        consecutiveCorrect: 0,
        totalResponseTimeMs: 0,
        avgResponseTimeMs: 0,
        lastResponseTimeMs: 0,
        lastAttemptTimestamp: 0,
        masteryScore: 0,
      };
      expect(calculateFactMasteryComponents(zeroStat).accuracyScore).toBe(0);
    });

    it('scales accuracy with confidence dampener N/3 for small attempt counts', () => {
      // 1 attempt, 1 correct: A = 1.0, dampener = 1/3 => 50 * 1.0 * (1/3) = 16.67
      const stat1: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 1,
        correctCount: 1,
        consecutiveCorrect: 1,
        totalResponseTimeMs: 2000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      const res1 = calculateFactMasteryComponents(stat1);
      expect(res1.accuracyScore).toBeCloseTo(16.67, 1);

      // 3 attempts, 3 correct: A = 1.0, dampener = 3/3 = 1.0 => 50.0
      const stat3: FactStat = {
        ...stat1,
        attempts: 3,
        correctCount: 3,
        consecutiveCorrect: 3,
      };
      expect(calculateFactMasteryComponents(stat3).accuracyScore).toBe(50);
    });

    it('caps accuracy scaling at 90% target', () => {
      // 10 attempts, 9 correct: A = 0.90 => full 50
      const stat90: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 10,
        correctCount: 9,
        consecutiveCorrect: 5,
        totalResponseTimeMs: 20000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      expect(calculateFactMasteryComponents(stat90).accuracyScore).toBe(50);

      // 10 attempts, 8 correct: A = 0.80 => 50 * (0.80 / 0.90) = 44.44
      const stat80: FactStat = {
        ...stat90,
        correctCount: 8,
      };
      expect(calculateFactMasteryComponents(stat80).accuracyScore).toBeCloseTo(44.44, 1);
    });
  });

  describe('Speed Component (Weight 30%)', () => {
    it('awards full 30 points for response time <= 3000ms with sufficient attempts', () => {
      const fastStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 3,
        correctCount: 3,
        consecutiveCorrect: 3,
        totalResponseTimeMs: 4500,
        avgResponseTimeMs: 1500,
        lastResponseTimeMs: 1500,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      expect(calculateFactMasteryComponents(fastStat).speedScore).toBe(30);
    });

    it('linearly degrades speed score between 3000ms and 6000ms', () => {
      const midStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 2,
        correctCount: 2,
        consecutiveCorrect: 2,
        totalResponseTimeMs: 9000,
        avgResponseTimeMs: 4500,
        lastResponseTimeMs: 4500,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      // RT = 4500 => (6000 - 4500) / 3000 = 0.5 => 30 * 0.5 * 1.0 = 15
      expect(calculateFactMasteryComponents(midStat).speedScore).toBe(15);
    });

    it('returns 0 points for response time >= 6000ms', () => {
      const slowStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 5,
        correctCount: 5,
        consecutiveCorrect: 5,
        totalResponseTimeMs: 35000,
        avgResponseTimeMs: 7000,
        lastResponseTimeMs: 7000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      expect(calculateFactMasteryComponents(slowStat).speedScore).toBe(0);
    });

    it('dampens speed confidence by N/2 when N < 2', () => {
      const singleAttemptStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 1,
        correctCount: 1,
        consecutiveCorrect: 1,
        totalResponseTimeMs: 2000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      // N=1 => dampener = 0.5 => 30 * 0.5 = 15
      expect(calculateFactMasteryComponents(singleAttemptStat).speedScore).toBe(15);
    });
  });

  describe('Streak Component (Weight 20%)', () => {
    it('returns 0 if consecutive correct streak is 0', () => {
      const streak0: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 5,
        correctCount: 4,
        consecutiveCorrect: 0,
        totalResponseTimeMs: 10000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      expect(calculateFactMasteryComponents(streak0).streakScore).toBe(0);
    });

    it('scales linearly up to streak of 3', () => {
      const baseStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 5,
        correctCount: 5,
        consecutiveCorrect: 1,
        totalResponseTimeMs: 10000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };

      expect(calculateFactMasteryComponents({ ...baseStat, consecutiveCorrect: 1 }).streakScore).toBeCloseTo(6.67, 1);
      expect(calculateFactMasteryComponents({ ...baseStat, consecutiveCorrect: 2 }).streakScore).toBeCloseTo(13.33, 1);
      expect(calculateFactMasteryComponents({ ...baseStat, consecutiveCorrect: 3 }).streakScore).toBe(20);
      expect(calculateFactMasteryComponents({ ...baseStat, consecutiveCorrect: 7 }).streakScore).toBe(20);
    });
  });

  describe('Composite Mastery & Clamping', () => {
    it('computes 100% for perfectly mastered fact', () => {
      const perfectStat: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 5,
        correctCount: 5,
        consecutiveCorrect: 5,
        totalResponseTimeMs: 10000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 0,
      };
      const comp = calculateFactMasteryComponents(perfectStat);
      expect(comp.accuracyScore).toBe(50);
      expect(comp.speedScore).toBe(30);
      expect(comp.streakScore).toBe(20);
      expect(comp.totalScore).toBe(100);
      expect(calculateFactMastery(perfectStat)).toBe(100);
    });

    it('strictly clamps score between 0 and 100', () => {
      expect(calculateFactMastery(null)).toBe(0);
    });
  });

  describe('Table-Level Aggregation & Badges', () => {
    it('calculates average across entire multiplier range, treating unattempted as 0%', () => {
      const factStats: Record<string, FactStat> = {
        mul_7_1: {
          factId: 'mul_7_1',
          table: 7,
          multiplier: 1,
          attempts: 3,
          correctCount: 3,
          consecutiveCorrect: 3,
          totalResponseTimeMs: 3000,
          avgResponseTimeMs: 1000,
          lastResponseTimeMs: 1000,
          lastAttemptTimestamp: Date.now(),
          masteryScore: 100,
        },
      };

      // Only 1 fact out of 10 is mastered (100%), 9 are unattempted (0%)
      const rep = calculateTableMasteryReport({
        tableNumber: 7,
        multiplierMin: 1,
        multiplierMax: 10,
        factStats,
      });

      expect(rep.totalFacts).toBe(10);
      expect(rep.factsMastered).toBe(1);
      expect(rep.masteryPercentage).toBe(10); // 100 / 10 = 10%
      expect(rep.statusBadge).toBe('novice');
    });

    it('maps badges accurately: novice (<50%), practicing (50..89%), mastered (>=90%)', () => {
      expect(getMasteryBadge(0)).toBe('novice');
      expect(getMasteryBadge(49)).toBe('novice');
      expect(getMasteryBadge(50)).toBe('practicing');
      expect(getMasteryBadge(89)).toBe('practicing');
      expect(getMasteryBadge(90)).toBe('mastered');
      expect(getMasteryBadge(100)).toBe('mastered');
    });
  });

  describe('Weakness Detection & Prioritization', () => {
    it('flags facts as weak if low accuracy, slow recall, or recent mistake', () => {
      const lowAcc: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 4,
        correctCount: 2, // 50% < 75%
        consecutiveCorrect: 1,
        totalResponseTimeMs: 8000,
        avgResponseTimeMs: 2000,
        lastResponseTimeMs: 2000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 40,
      };
      expect(isFactWeak(lowAcc)).toBe(true);

      const recentMistake: FactStat = {
        ...lowAcc,
        correctCount: 3,
        consecutiveCorrect: 0,
      };
      expect(isFactWeak(recentMistake)).toBe(true);

      const slowFact: FactStat = {
        ...lowAcc,
        correctCount: 4,
        consecutiveCorrect: 4,
        avgResponseTimeMs: 5000, // > 4500
      };
      expect(isFactWeak(slowFact)).toBe(true);
    });

    it('calculates higher priority score for facts with recent mistakes and low mastery', () => {
      const statA: FactStat = {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 2,
        correctCount: 0,
        consecutiveCorrect: 0,
        totalResponseTimeMs: 8000,
        avgResponseTimeMs: 4000,
        lastResponseTimeMs: 4000,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 20,
      };

      const statB: FactStat = {
        factId: 'mul_7_2',
        table: 7,
        multiplier: 2,
        attempts: 3,
        correctCount: 3,
        consecutiveCorrect: 3,
        totalResponseTimeMs: 4000,
        avgResponseTimeMs: 1333,
        lastResponseTimeMs: 1333,
        lastAttemptTimestamp: Date.now(),
        masteryScore: 95,
      };

      expect(calculateWeaknessPriorityScore(statA)).toBeGreaterThan(calculateWeaknessPriorityScore(statB));
    });
  });
});
