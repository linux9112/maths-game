import { describe, it, expect } from 'vitest';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import { validateDistractorSet, assertValidDistractors } from '../../core/distractors/distractorValidator';

describe('Distractor Engine & Anti-Trivial Last-Digit Masking Suite', () => {
  describe('1. Explicit User-Specified Benchmark Calculations', () => {
    it('11 x 9 = 99: distractors MUST ensure 99 is never the only option ending in 9', () => {
      const result = distractorEngine.generate({
        operator: '*',
        operandA: 11,
        operandB: 9,
        answer: 99,
        difficulty: 'normal',
      });

      assertValidDistractors(99, result.distractors);
      const endsIn9 = result.allChoices.filter((c) => Math.abs(c) % 10 === 9);
      expect(endsIn9.length).toBeGreaterThanOrEqual(2);
      expect(result.allChoices).toContain(99);
      expect(result.allChoices[result.correctIndex]).toBe(99);
    });

    it('43 x 7 = 301: contains carry slips and never leaves 301 as the only choice ending in 1', () => {
      const result = distractorEngine.generate({
        operator: '*',
        operandA: 43,
        operandB: 7,
        answer: 301,
        difficulty: 'hard',
      });

      assertValidDistractors(301, result.distractors);
      const endsIn1 = result.allChoices.filter((c) => Math.abs(c) % 10 === 1);
      expect(endsIn1.length).toBeGreaterThanOrEqual(2);
      expect(result.allChoices).toContain(301);
    });

    it('52 - 27 = 25: masks last digit and provides borrowing / reverse-subtraction slips', () => {
      const result = distractorEngine.generate({
        operator: '-',
        operandA: 52,
        operandB: 27,
        answer: 25,
        difficulty: 'hard',
      });

      assertValidDistractors(25, result.distractors);
      const endsIn5 = result.allChoices.filter((c) => Math.abs(c) % 10 === 5);
      expect(endsIn5.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Small Number Boundary Edge Cases', () => {
    const smallAnswers = [
      { op: '*' as const, a: 1, b: 1, ans: 1 },
      { op: '*' as const, a: 1, b: 2, ans: 2 },
      { op: '*' as const, a: 2, b: 2, ans: 4 },
      { op: '*' as const, a: 3, b: 3, ans: 9 },
      { op: '/' as const, a: 9, b: 9, ans: 1 },
      { op: '+' as const, a: 1, b: 2, ans: 3 },
      { op: '-' as const, a: 5, b: 3, ans: 2 },
    ];

    smallAnswers.forEach(({ op, a, b, ans }) => {
      it(`handles small calculation ${a} ${op} ${b} = ${ans} without crashing, negatives, or violations`, () => {
        const result = distractorEngine.generate({
          operator: op,
          operandA: a,
          operandB: b,
          answer: ans,
          difficulty: 'normal',
        });

        assertValidDistractors(ans, result.distractors);
        expect(result.distractors).toHaveLength(3);
        expect(new Set(result.allChoices).size).toBe(4);
        expect(result.distractors.every((d) => d > 0)).toBe(true);

        const lastDigit = ans % 10;
        const matchingChoices = result.allChoices.filter((c) => c % 10 === lastDigit);
        expect(matchingChoices.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('3. Difficulty Tier Behaviors', () => {
    it('Easy difficulty uses wider spread and avoids trick traps', () => {
      const result = distractorEngine.generate({
        operator: '*',
        operandA: 8,
        operandB: 7,
        answer: 56,
        difficulty: 'easy',
      });
      assertValidDistractors(56, result.distractors);
    });

    it('Expert difficulty generates tightly clustered trap options', () => {
      const result = distractorEngine.generate({
        operator: '*',
        operandA: 17,
        operandB: 12,
        answer: 204,
        difficulty: 'expert',
      });
      assertValidDistractors(204, result.distractors);
      // All distractors should be within tight distance
      expect(result.distractors.every((d) => Math.abs(d - 204) <= 45)).toBe(true);
    });
  });

  describe('4. Deterministic Seeding via PRNG', () => {
    it('generates identical options and choice order when given the same PRNG sequence', () => {
      const createPrng = (seed: number) => {
        let s = seed;
        return () => {
          s = (s * 1664525 + 1013904223) % 4294967296;
          return s / 4294967296;
        };
      };

      const res1 = distractorEngine.generate({
        operator: '*',
        operandA: 23,
        operandB: 9,
        answer: 207,
        difficulty: 'normal',
        rng: createPrng(12345),
      });

      const res2 = distractorEngine.generate({
        operator: '*',
        operandA: 23,
        operandB: 9,
        answer: 207,
        difficulty: 'normal',
        rng: createPrng(12345),
      });

      expect(res1.allChoices).toEqual(res2.allChoices);
      expect(res1.correctIndex).toBe(res2.correctIndex);
      expect(res1.distractors).toEqual(res2.distractors);
    });
  });

  describe('5. Distractor Validator Failure Mode Detection', () => {
    it('fails when distractor count is not 3', () => {
      const validation = validateDistractorSet(50, [40, 60]);
      expect(validation.isValid).toBe(false);
      expect(validation.details.countValid).toBe(false);
    });

    it('fails when distractors duplicate each other', () => {
      const validation = validateDistractorSet(50, [40, 40, 60]);
      expect(validation.isValid).toBe(false);
      expect(validation.details.uniquenessValid).toBe(false);
    });

    it('fails when a distractor duplicates the correct answer', () => {
      const validation = validateDistractorSet(50, [50, 40, 60]);
      expect(validation.isValid).toBe(false);
      expect(validation.details.nonAnswerValid).toBe(false);
    });

    it('fails when a distractor is negative or zero', () => {
      const validation = validateDistractorSet(10, [0, -10, 20]);
      expect(validation.isValid).toBe(false);
      expect(validation.details.positivityValid).toBe(false);
    });

    it('fails when answer is the unique option with that last digit', () => {
      // 99 is the only option ending in 9
      const validation = validateDistractorSet(99, [94, 102, 97]);
      expect(validation.isValid).toBe(false);
      expect(validation.details.lastDigitMasked).toBe(false);
    });

    it('fails when distractors exceed magnitude envelope', () => {
      // Answer 100 has max bound 180; 350 is a huge magnitude leak
      const validation = validateDistractorSet(100, [110, 350, 90]);
      expect(validation.isValid).toBe(false);
      expect(validation.details.magnitudeValid).toBe(false);
    });
  });
});
