import { describe, it, expect } from 'vitest';
import {
  parseFactId,
  buildWeaknessPracticeQueue,
  COGNITIVE_BENCHMARK_WEAKNESSES,
} from '../../features/adaptive/weaknessSessionBuilder';
import { CalculationStatRecord } from '../../core/storage/types';

describe('Weakness Session Builder Suite', () => {
  describe('Canonical Fact ID Parser (parseFactId)', () => {
    it('accurately parses valid fact IDs for all four operations', () => {
      const mul = parseFactId('mul_7_8');
      expect(mul.operator).toBe('*');
      expect(mul.operandA).toBe(7);
      expect(mul.operandB).toBe(8);
      expect(mul.answer).toBe(56);

      const add = parseFactId('add_47_38');
      expect(add.operator).toBe('+');
      expect(add.operandA).toBe(47);
      expect(add.operandB).toBe(38);
      expect(add.answer).toBe(85);

      const sub = parseFactId('sub_52_27');
      expect(sub.operator).toBe('-');
      expect(sub.operandA).toBe(52);
      expect(sub.operandB).toBe(27);
      expect(sub.answer).toBe(25);

      const div = parseFactId('div_56_8');
      expect(div.operator).toBe('/');
      expect(div.operandA).toBe(56);
      expect(div.operandB).toBe(8);
      expect(div.answer).toBe(7);
    });

    it('throws informative errors on malformed fact IDs or division by zero', () => {
      expect(() => parseFactId('invalid')).toThrow('Invalid factId format');
      expect(() => parseFactId('mul_a_b')).toThrow('Non-numeric operands');
      expect(() => parseFactId('div_56_0')).toThrow('Division by zero');
      expect(() => parseFactId('pow_2_3')).toThrow('Unknown operator code');
    });
  });

  describe('Practice Queue Construction & Anti-Clustering', () => {
    it('builds a queue of the requested length with balanced quotas', () => {
      const mockStats: CalculationStatRecord[] = [
        {
          factId: 'mul_7_8',
          operator: '*',
          operandA: 7,
          operandB: 8,
          attempts: 10,
          mistakes: 5,
          correctCount: 5,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 30000,
          avgResponseTimeMs: 3000,
          lastResponseTimeMs: 3000,
          errorRate: 0.5,
          latencyMultiplier: 2.38,
          weaknessScore: 1.19,
          masteryScore: 45,
          firstPracticed: 1000,
          lastPracticed: 2000,
        },
        {
          factId: 'mul_8_9',
          operator: '*',
          operandA: 8,
          operandB: 9,
          attempts: 10,
          mistakes: 4,
          correctCount: 6,
          consecutiveCorrect: 1,
          totalResponseTimeMs: 25000,
          avgResponseTimeMs: 2500,
          lastResponseTimeMs: 2500,
          errorRate: 0.41,
          latencyMultiplier: 2.25,
          weaknessScore: 0.92,
          masteryScore: 55,
          firstPracticed: 1000,
          lastPracticed: 2000,
        },
      ];

      const queue = buildWeaknessPracticeQueue({ targetCount: 15, topK: 5 }, mockStats);
      expect(queue.length).toBe(15);
      expect(queue.every((q) => q.options && q.options.length === 4)).toBe(true);
    });

    it('activates cognitive benchmark fallback when user has insufficient recorded weaknesses', () => {
      // Empty weak stats
      const queue = buildWeaknessPracticeQueue({ targetCount: 12, topK: 5 }, []);
      expect(queue.length).toBe(12);

      const uniqueFacts = new Set(queue.map((q) => q.id.split('_').slice(0, 3).join('_')));
      expect(uniqueFacts.size).toBeGreaterThanOrEqual(3);

      // Verify facts are drawn from the benchmark deck
      for (const factId of uniqueFacts) {
        expect(COGNITIVE_BENCHMARK_WEAKNESSES).toContain(factId);
      }
    });

    it('strictly prevents immediate repetition (anti-clustering)', () => {
      const queue = buildWeaknessPracticeQueue({ targetCount: 20, topK: 5 }, []);
      for (let i = 0; i < queue.length - 1; i++) {
        const currFact = queue[i].id.split('_').slice(0, 3).join('_');
        const nextFact = queue[i + 1].id.split('_').slice(0, 3).join('_');
        expect(currFact).not.toBe(nextFact);
      }
    });
  });

  describe('Commutative Invariant & Non-Commutative Integrity', () => {
    it('alternates operand positions for commutative operators (+, *)', () => {
      const singleStat: CalculationStatRecord[] = [
        {
          factId: 'mul_7_8',
          operator: '*',
          operandA: 7,
          operandB: 8,
          attempts: 10,
          mistakes: 8,
          correctCount: 2,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 40000,
          avgResponseTimeMs: 4000,
          lastResponseTimeMs: 4000,
          errorRate: 0.75,
          latencyMultiplier: 2.6,
          weaknessScore: 1.95,
          masteryScore: 20,
          firstPracticed: 1000,
          lastPracticed: 2000,
        },
      ];

      const queue = buildWeaknessPracticeQueue({ targetCount: 10, topK: 3 }, singleStat);
      const fact78s = queue.filter((q) => (q.operandA === 7 && q.operandB === 8) || (q.operandA === 8 && q.operandB === 7));

      expect(fact78s.length).toBeGreaterThan(1);
      // Verify both orientations exist
      const hasOriginal = fact78s.some((q) => q.operandA === 7 && q.operandB === 8);
      const hasSwapped = fact78s.some((q) => q.operandA === 8 && q.operandB === 7);
      expect(hasOriginal).toBe(true);
      expect(hasSwapped).toBe(true);
    });

    it('strictly forbids operand swapping for non-commutative operators (-, /)', () => {
      const subDivStats: CalculationStatRecord[] = [
        {
          factId: 'sub_52_27',
          operator: '-',
          operandA: 52,
          operandB: 27,
          attempts: 5,
          mistakes: 3,
          correctCount: 2,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 20000,
          avgResponseTimeMs: 4000,
          lastResponseTimeMs: 4000,
          errorRate: 0.57,
          latencyMultiplier: 2.6,
          weaknessScore: 1.48,
          masteryScore: 30,
          firstPracticed: 1000,
          lastPracticed: 2000,
        },
        {
          factId: 'div_56_8',
          operator: '/',
          operandA: 56,
          operandB: 8,
          attempts: 5,
          mistakes: 3,
          correctCount: 2,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 20000,
          avgResponseTimeMs: 4000,
          lastResponseTimeMs: 4000,
          errorRate: 0.57,
          latencyMultiplier: 2.6,
          weaknessScore: 1.48,
          masteryScore: 30,
          firstPracticed: 1000,
          lastPracticed: 2000,
        },
      ];

      const queue = buildWeaknessPracticeQueue({ targetCount: 10, topK: 3 }, subDivStats);

      // In Subtraction, operandA must ALWAYS be 52, operandB must ALWAYS be 27
      const subs = queue.filter((q) => q.operator === '-');
      for (const s of subs) {
        expect(s.operandA).toBe(52);
        expect(s.operandB).toBe(27);
        expect(s.answer).toBe(25);
      }

      // In Division, operandA must ALWAYS be 56, operandB must ALWAYS be 8
      const divs = queue.filter((q) => q.operator === '/');
      for (const d of divs) {
        expect(d.operandA).toBe(56);
        expect(d.operandB).toBe(8);
        expect(d.answer).toBe(7);
      }
    });
  });
});
