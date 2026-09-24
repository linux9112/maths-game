import { describe, it, expect } from 'vitest';
import {
  buildRouletteWheel,
  sampleRouletteWheel,
  DDAController,
  AdaptiveQuestionBuilder,
} from '../../features/adaptive/adaptiveQuestionBuilder';
import { RouletteCandidate } from '../../features/adaptive/types';

describe('Adaptive Engine & Dynamic Difficulty Adjustment Suite', () => {
  describe('Roulette Wheel Construction & Sampling', () => {
    it('handles empty and singular candidate sets cleanly', () => {
      const emptyWheel = buildRouletteWheel([]);
      expect(emptyWheel.totalWeight).toBe(0);
      expect(() => sampleRouletteWheel(emptyWheel)).toThrow();

      const singleCandidate: RouletteCandidate[] = [{ id: 'mul_7_8', weaknessScore: 2.0 }];
      const singleWheel = buildRouletteWheel(singleCandidate);
      expect(singleWheel.candidates.length).toBe(1);
      expect(singleWheel.totalWeight).toBeCloseTo(Math.pow(2.0, 1.5), 4);

      const sampled = sampleRouletteWheel(singleWheel);
      expect(sampled.id).toBe('mul_7_8');
    });

    it('amplifies severe weaknesses with power-law gamma = 1.5', () => {
      const candidates: RouletteCandidate[] = [
        { id: 'fact_low', weaknessScore: 0.5 },
        { id: 'fact_high', weaknessScore: 2.0 },
      ];

      const wheel = buildRouletteWheel(candidates, 1.5);
      const lowWeight = Math.pow(0.5, 1.5);
      const highWeight = Math.pow(2.0, 1.5);

      expect(wheel.prefixSums[0]).toBeCloseTo(lowWeight, 4);
      expect(wheel.totalWeight).toBeCloseTo(lowWeight + highWeight, 4);
      // High weight to low weight ratio should be 8:1
      expect(highWeight / lowWeight).toBeCloseTo(8.0, 2);
    });

    it('samples candidates proportionally according to power-law weights', () => {
      const candidates: RouletteCandidate[] = [
        { id: 'weak_mild', weaknessScore: 1.0 },
        { id: 'weak_severe', weaknessScore: 3.0 },
      ];
      const wheel = buildRouletteWheel(candidates, 1.5);

      let severeCount = 0;
      const rolls = 5000;

      for (let i = 0; i < rolls; i++) {
        const picked = sampleRouletteWheel(wheel, Math.random);
        if (picked.id === 'weak_severe') {
          severeCount++;
        }
      }

      // 3.0^1.5 ~= 5.196, 1.0^1.5 = 1.0 -> expected severe proportion is 5.196 / 6.196 ~= 83.8%
      const observedRatio = severeCount / rolls;
      expect(observedRatio).toBeGreaterThan(0.75);
      expect(observedRatio).toBeLessThan(0.92);
    });
  });

  describe('DDAController (Rolling 10 Window & Hysteresis Cooldown)', () => {
    it('promotes difficulty level on high accuracy (>= 90%) and fast response time', () => {
      const dda = new DDAController(2, 'normal', 10);

      // Answer 4 questions correctly in rapid succession (1200ms)
      for (let i = 0; i < 4; i++) {
        dda.recordAttempt(true, 1200);
      }
      // 5th attempt triggers promotion
      const decision = dda.recordAttempt(true, 1200);

      expect(decision.action).toBe('promote');
      expect(decision.newLevel).toBe(3);
    });

    it('demotes difficulty level on low accuracy (<= 60%) or 3 consecutive mistakes', () => {
      const dda = new DDAController(3, 'normal', 10);

      dda.recordAttempt(false, 3000);
      dda.recordAttempt(false, 3000);
      const decision = dda.recordAttempt(false, 3000);

      expect(decision.action).toBe('demote');
      expect(decision.newLevel).toBe(2);
    });

    it('enforces 5-question cooldown hysteresis after a level transition', () => {
      const dda = new DDAController(2, 'normal', 10);

      // Trigger promotion
      for (let i = 0; i < 6; i++) {
        dda.recordAttempt(true, 1200);
      }
      expect(dda.getLevel()).toBe(3);

      // Immediate subsequent correct attempts must NOT promote again during cooldown
      const decision1 = dda.recordAttempt(true, 1200);
      expect(decision1.action).toBe('maintain');
      expect(dda.getLevel()).toBe(3);

      const decision2 = dda.recordAttempt(true, 1200);
      expect(decision2.action).toBe('maintain');
      expect(dda.getLevel()).toBe(3);
    });
  });

  describe('AdaptiveQuestionBuilder Epsilon-Greedy & Recency Buffer', () => {
    it('respects the 20% exploration policy across Monte Carlo trials', () => {
      const builder = new AdaptiveQuestionBuilder({
        domain: 'all',
        inputMode: 'choice',
        explorationRate: 0.20,
      });

      builder.setCandidates([
        { id: 'mul_7_8', weaknessScore: 2.5 },
        { id: 'mul_8_9', weaknessScore: 2.0 },
      ]);

      let explorationCount = 0;
      const trials = 2000;

      for (let i = 0; i < trials; i++) {
        const q = builder.nextQuestion();
        if (q.source === 'exploration') {
          explorationCount++;
        }
      }

      const rate = explorationCount / trials;
      // 0.20 +/- 0.04
      expect(rate).toBeGreaterThan(0.16);
      expect(rate).toBeLessThan(0.25);
    });

    it('masks recent questions through recency buffer (size 4)', () => {
      const builder = new AdaptiveQuestionBuilder({
        domain: 'all',
        inputMode: 'choice',
        explorationRate: 0.0, // Force exploitation
        recencyBufferSize: 4,
      });

      builder.setCandidates([
        { id: 'mul_7_8', weaknessScore: 3.0 },
        { id: 'mul_6_7', weaknessScore: 2.8 },
        { id: 'mul_8_9', weaknessScore: 2.5 },
        { id: 'mul_9_9', weaknessScore: 2.2 },
        { id: 'mul_12_8', weaknessScore: 2.0 },
        { id: 'mul_8_6', weaknessScore: 1.8 },
      ]);

      builder.nextQuestion();
      builder.nextQuestion();
      builder.nextQuestion();
      builder.nextQuestion();

      const recency = builder.getRecencyBuffer();
      expect(recency.length).toBe(4);
      // The 4 generated facts must all be distinct
      const uniqueRecents = new Set(recency);
      expect(uniqueRecents.size).toBe(4);
    });
  });
});
