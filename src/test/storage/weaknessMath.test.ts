import { describe, it, expect } from 'vitest';
import {
  calculateLaplaceErrorRate,
  calculateLatencyMultiplier,
  calculateCompositeWeaknessScore,
  calculatePedagogicalMastery,
  MAX_LATENCY_MS,
  MIN_WEAKNESS_SCORE,
  MAX_WEAKNESS_SCORE,
} from '../../core/storage/weaknessMath';

describe('Storage & Weakness Engine Mathematical Invariants', () => {
  describe('Laplace Smoothing Error Rate E = (M + 1) / (N + 2)', () => {
    it('satisfies the uninformed prior invariant E(0, 0) === 0.5000', () => {
      const prior = calculateLaplaceErrorRate(0, 0);
      expect(prior).toBe(0.5);
    });

    it('strictly bounds error rate within (0, 1) across 5,000 random attempts', () => {
      for (let i = 0; i < 5000; i++) {
        const attempts = Math.floor(Math.random() * 500);
        const mistakes = Math.floor(Math.random() * (attempts + 1));
        const rate = calculateLaplaceErrorRate(mistakes, attempts);

        expect(rate).toBeGreaterThan(0);
        expect(rate).toBeLessThan(1);
      }
    });

    it('is strictly monotonic with respect to mistakes: dE/dM > 0', () => {
      const attempts = 20;
      for (let m = 0; m < attempts; m++) {
        const eCurrent = calculateLaplaceErrorRate(m, attempts);
        const eNext = calculateLaplaceErrorRate(m + 1, attempts);
        expect(eNext).toBeGreaterThan(eCurrent);
        // Exact delta is 1 / (attempts + 2)
        expect(eNext - eCurrent).toBeCloseTo(1 / (attempts + 2), 6);
      }
    });

    it('is strictly monotonic with respect to correct practice: dE/dN < 0 for fixed M', () => {
      const mistakes = 3;
      for (let n = mistakes; n < mistakes + 50; n++) {
        const eCurrent = calculateLaplaceErrorRate(mistakes, n);
        const eNext = calculateLaplaceErrorRate(mistakes, n + 1);
        expect(eNext).toBeLessThan(eCurrent);
      }
    });

    it('asymptotically regularizes noisy early attempts', () => {
      // 1 mistake out of 1 attempt: empirical is 100%, Laplace is 66.7%
      expect(calculateLaplaceErrorRate(1, 1)).toBeCloseTo(2 / 3, 4);
      // 0 mistakes out of 1 attempt: empirical is 0%, Laplace is 33.3%
      expect(calculateLaplaceErrorRate(0, 1)).toBeCloseTo(1 / 3, 4);
    });
  });

  describe('Response Latency Multiplier L = 1 + ln(1 + cappedRT / 1000)', () => {
    it('strictly guarantees lower bound L >= 1.0', () => {
      expect(calculateLatencyMultiplier(0)).toBe(1.0);
      expect(calculateLatencyMultiplier(-500)).toBe(1.0);
    });

    it('exhibits sub-linear logarithmic growth at key benchmark latencies', () => {
      // At 1000ms: 1 + ln(2) ~= 1.693147
      expect(calculateLatencyMultiplier(1000)).toBeCloseTo(1 + Math.log(2), 5);

      // At 2000ms: 1 + ln(3) ~= 2.098612
      expect(calculateLatencyMultiplier(2000)).toBeCloseTo(1 + Math.log(3), 5);

      // At 5000ms: 1 + ln(6) ~= 2.791759
      expect(calculateLatencyMultiplier(5000)).toBeCloseTo(1 + Math.log(6), 5);

      // At 15000ms: 1 + ln(16) ~= 3.772589
      expect(calculateLatencyMultiplier(15000)).toBeCloseTo(1 + Math.log(16), 5);
    });

    it('is strictly monotonic for RT < 15,000 ms', () => {
      let prevL = calculateLatencyMultiplier(0);
      for (let rt = 500; rt <= MAX_LATENCY_MS; rt += 500) {
        const currL = calculateLatencyMultiplier(rt);
        expect(currL).toBeGreaterThan(prevL);
        prevL = currL;
      }
    });

    it('enforces Anti-AFK protection by capping at 15,000 ms', () => {
      const capped = calculateLatencyMultiplier(MAX_LATENCY_MS);
      const afk1 = calculateLatencyMultiplier(30000); // 30s
      const afk2 = calculateLatencyMultiplier(120000); // 2 minutes

      expect(afk1).toBe(capped);
      expect(afk2).toBe(capped);
    });
  });

  describe('Composite Weakness Score W = E * L', () => {
    it('strictly satisfies [0.01, 4.0] clamped bounds across extreme parameters', () => {
      expect(calculateCompositeWeaknessScore(0, 100, 100)).toBeGreaterThanOrEqual(MIN_WEAKNESS_SCORE);
      expect(calculateCompositeWeaknessScore(100, 100, 50000)).toBeLessThanOrEqual(MAX_WEAKNESS_SCORE);
    });

    it('separates unpracticed facts from mastered and struggling facts', () => {
      const priorW = calculateCompositeWeaknessScore(0, 0, 0); // 0.5000
      expect(priorW).toBe(0.5);

      // Mastered: 10 attempts, 0 mistakes, 1200ms
      const masteredW = calculateCompositeWeaknessScore(0, 10, 1200);
      expect(masteredW).toBeLessThan(priorW);

      // Struggling: 10 attempts, 5 mistakes, 4000ms
      const strugglingW = calculateCompositeWeaknessScore(5, 10, 4000);
      expect(strugglingW).toBeGreaterThan(priorW);
    });

    it('verifies the Hope Invariant: consecutive correct attempts strictly decrease weakness score', () => {
      let mistakes = 5;
      let attempts = 10;
      let rt = 3000;
      let prevScore = calculateCompositeWeaknessScore(mistakes, attempts, rt);

      // User practices and succeeds 5 times in a row with slightly faster speed
      for (let k = 1; k <= 5; k++) {
        attempts += 1;
        rt = Math.max(1000, rt - 200);
        const nextScore = calculateCompositeWeaknessScore(mistakes, attempts, rt);
        expect(nextScore).toBeLessThan(prevScore);
        prevScore = nextScore;
      }
    });
  });

  describe('Pedagogical Mastery Calculation', () => {
    it('returns 0 for unpracticed facts', () => {
      expect(calculatePedagogicalMastery(0, 0, 0)).toBe(0);
    });

    it('awards high mastery (>= 90%) for fluent accurate recall', () => {
      const score = calculatePedagogicalMastery(15, 0, 1200);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('penalizes frequent mistakes and slow latency', () => {
      const score = calculatePedagogicalMastery(10, 6, 6000);
      expect(score).toBeLessThan(50);
    });
  });
});
