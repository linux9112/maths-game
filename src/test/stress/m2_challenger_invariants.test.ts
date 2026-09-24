import { describe, it, expect } from 'vitest';
import {
  generateDivisionFact,
  DIVISION_LEVEL_RANGES,
} from '../../core/math/divisionGenerator';
import {
  generateSubtractionFact,
  generateArithmeticFact,
} from '../../core/math/arithmeticGenerator';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import { hashDateSeed, Mulberry32 } from '../../core/math/seedPrng';
import { MathOperator, DifficultyTier } from '../../core/math/types';

describe('Milestone 2 Challenger 1: Empirical Invariant Stress Suite', () => {
  describe('1. Division Integer Constraint (10,000 Question Stress Test)', () => {
    it('generates 10,000 division questions across Levels 1-5 asserting integer answer and dividend % divisor === 0 in 100% of cases', () => {
      const TOTAL_ITERATIONS = 10_000;
      const levels = [1, 2, 3, 4, 5] as const;
      const iterationsPerLevel = TOTAL_ITERATIONS / levels.length; // 2,000 per level

      let totalChecked = 0;
      let nonIntegerAnswers = 0;
      let nonZeroRemainders = 0;
      let divisionByZeroCount = 0;
      let operandMismatchCount = 0;

      for (const level of levels) {
        for (let i = 0; i < iterationsPerLevel; i++) {
          totalChecked++;

          // Alternate between direct division generator and multi-op selector
          const fact = i % 2 === 0
            ? generateDivisionFact({ level })
            : generateArithmeticFact({ allowedOperators: ['/'], level });

          const { operandA, operandB, answer } = fact;
          const dividend = operandA;
          const divisor = operandB;

          if (!Number.isInteger(answer)) {
            nonIntegerAnswers++;
          }

          if (divisor === 0) {
            divisionByZeroCount++;
          }

          if (dividend % divisor !== 0) {
            nonZeroRemainders++;
          }

          if (dividend / divisor !== answer) {
            operandMismatchCount++;
          }

          // Check level range boundaries
          const range = DIVISION_LEVEL_RANGES[level];
          expect(divisor).toBeGreaterThanOrEqual(range.dMin);
          expect(divisor).toBeLessThanOrEqual(range.dMax);
          expect(answer).toBeGreaterThanOrEqual(range.qMin);
          expect(answer).toBeLessThanOrEqual(range.qMax);
        }
      }

      expect(totalChecked).toBe(TOTAL_ITERATIONS);
      expect(nonIntegerAnswers).toBe(0);
      expect(nonZeroRemainders).toBe(0);
      expect(divisionByZeroCount).toBe(0);
      expect(operandMismatchCount).toBe(0);
    });
  });

  describe('2. Last-Digit Masking Invariant (10,000 Distractor Sets Stress Test)', () => {
    it('generates 10,000 distractor sets across all operations and difficulties asserting >= 2 options match last digit, choices are strictly unique and positive', () => {
      const TOTAL_ITERATIONS = 10_000;
      const operators: MathOperator[] = ['+', '-', '*', '/'];
      const difficulties: DifficultyTier[] = ['easy', 'normal', 'hard', 'expert'];
      const levels = [1, 2, 3, 4, 5] as const;

      let totalSetsChecked = 0;
      let lastDigitFailures = 0;
      let nonPositiveFailures = 0;
      let nonUniqueFailures = 0;
      let nonIntegerFailures = 0;
      let answerOmittedFailures = 0;
      let incorrectOptionCountFailures = 0;

      for (let i = 0; i < TOTAL_ITERATIONS; i++) {
        totalSetsChecked++;
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

        const options = result.allChoices;
        const ans = fact.answer;
        const ansLastDigit = Math.abs(ans) % 10;

        // 1. Exactly 4 total options (answer + 3 distractors)
        if (options.length !== 4) {
          incorrectOptionCountFailures++;
        }

        // 2. Options must contain answer
        if (!options.includes(ans)) {
          answerOmittedFailures++;
        }

        // 3. Choices must be strictly unique
        const uniqueSet = new Set(options);
        if (uniqueSet.size !== options.length) {
          nonUniqueFailures++;
        }

        // 4. Invariant: distractors must be strictly positive integers (> 0)
        // choices must be non-negative integers (>= 0), and strictly positive (> 0) whenever ans > 0
        if (!options.every((x) => Number.isInteger(x))) {
          nonIntegerFailures++;
        }
        if (!result.distractors.every((d) => d > 0)) {
          nonPositiveFailures++;
        }
        if (ans > 0 && !options.every((x) => x > 0)) {
          nonPositiveFailures++;
        }
        if (ans === 0 && !options.every((x) => x >= 0)) {
          nonPositiveFailures++;
        }

        // 5. Last-digit masking invariant:
        // options.filter(x => x % 10 === ans % 10).length >= 2 in 100% of cases
        const lastDigitMatches = options.filter((x) => Math.abs(x) % 10 === ansLastDigit);
        if (lastDigitMatches.length < 2) {
          lastDigitFailures++;
        }
      }

      expect(totalSetsChecked).toBe(TOTAL_ITERATIONS);
      expect(incorrectOptionCountFailures).toBe(0);
      expect(answerOmittedFailures).toBe(0);
      expect(nonUniqueFailures).toBe(0);
      expect(nonIntegerFailures).toBe(0);
      expect(nonPositiveFailures).toBe(0);
      expect(lastDigitFailures).toBe(0);
    });
  });

  describe('3. Subtraction Non-Negative Default (5,000 Question Stress Test)', () => {
    it('generates 5,000 subtraction questions across Levels 1-4 asserting ans >= 0 and a >= b in 100% of cases', () => {
      const TOTAL_ITERATIONS = 5_000;
      const levels = [1, 2, 3, 4] as const;
      const iterationsPerLevel = TOTAL_ITERATIONS / levels.length; // 1,250 per level

      let totalChecked = 0;
      let negativeAnswerCount = 0;
      let operandAIsSmallerCount = 0;
      let arithmeticMismatchCount = 0;

      // Track level-specific rules
      let l2BorrowDetected = 0;
      let l3NoBorrowDetected = 0;

      for (const level of levels) {
        for (let i = 0; i < iterationsPerLevel; i++) {
          totalChecked++;

          const fact = i % 2 === 0
            ? generateSubtractionFact({ level })
            : generateArithmeticFact({ allowedOperators: ['-'], level });

          const { operandA: a, operandB: b, answer: ans } = fact;

          if (ans < 0) {
            negativeAnswerCount++;
          }
          if (a < b) {
            operandAIsSmallerCount++;
          }
          if (a - b !== ans) {
            arithmeticMismatchCount++;
          }

          // Level 2 invariant: strictly no borrowing in units or tens
          if (level === 2) {
            const uA = a % 10;
            const uB = b % 10;
            const tA = Math.floor((a % 100) / 10);
            const tB = Math.floor((b % 100) / 10);
            if (uA < uB || tA < tB) {
              l2BorrowDetected++;
            }
          }

          // Level 3 invariant: strictly with borrowing in units place (uA < uB)
          if (level === 3) {
            const uA = a % 10;
            const uB = b % 10;
            if (uA >= uB) {
              l3NoBorrowDetected++;
            }
          }
        }
      }

      expect(totalChecked).toBe(TOTAL_ITERATIONS);
      expect(negativeAnswerCount).toBe(0);
      expect(operandAIsSmallerCount).toBe(0);
      expect(arithmeticMismatchCount).toBe(0);
      expect(l2BorrowDetected).toBe(0);
      expect(l3NoBorrowDetected).toBe(0);
    });
  });

  describe('4. Mulberry32 Determinism & Date Seed Invariants', () => {
    it('asserts that the same date string produces byte-identical question sequence across separate PRNG instances', () => {
      const testDates = [
        '2026-09-17',
        '2026-09-18',
        '2025-01-01',
        '2030-12-31',
      ];

      for (const dateStr of testDates) {
        const seed1 = hashDateSeed(dateStr);
        const seed2 = hashDateSeed(dateStr);
        expect(seed1).toBe(seed2);
        expect(Number.isInteger(seed1)).toBe(true);
        expect(seed1).toBeGreaterThanOrEqual(0);
        expect(seed1).toBeLessThanOrEqual(0xffffffff);

        const prng1 = new Mulberry32(seed1);
        const prng2 = new Mulberry32(seed2);

        const SEQUENCE_LENGTH = 1_000;
        const sequence1: string[] = [];
        const sequence2: string[] = [];

        for (let i = 0; i < SEQUENCE_LENGTH; i++) {
          const fact1 = generateArithmeticFact({
            allowedOperators: ['+', '-', '*', '/'],
            level: ((i % 5) + 1) as any,
            prng: prng1,
          });
          const dist1 = distractorEngine.generate({
            operator: fact1.operator,
            operandA: fact1.operandA,
            operandB: fact1.operandB,
            answer: fact1.answer,
            difficulty: 'normal',
            rng: () => prng1.next(),
          });
          sequence1.push(JSON.stringify({ fact: fact1, dist: dist1 }));

          const fact2 = generateArithmeticFact({
            allowedOperators: ['+', '-', '*', '/'],
            level: ((i % 5) + 1) as any,
            prng: prng2,
          });
          const dist2 = distractorEngine.generate({
            operator: fact2.operator,
            operandA: fact2.operandA,
            operandB: fact2.operandB,
            answer: fact2.answer,
            difficulty: 'normal',
            rng: () => prng2.next(),
          });
          sequence2.push(JSON.stringify({ fact: fact2, dist: dist2 }));
        }

        // Assert 100% byte-identical serialized question sequence
        expect(sequence1.length).toBe(SEQUENCE_LENGTH);
        expect(sequence2.length).toBe(SEQUENCE_LENGTH);
        for (let i = 0; i < SEQUENCE_LENGTH; i++) {
          expect(sequence1[i]).toBe(sequence2[i]);
        }
      }
    });

    it('verifies that consecutive date strings produce distinct seeds and uncorrelated question sequences', () => {
      const seedToday = hashDateSeed('2026-09-17');
      const seedTomorrow = hashDateSeed('2026-09-18');

      expect(seedToday).not.toBe(seedTomorrow);

      const prngA = new Mulberry32(seedToday);
      const prngB = new Mulberry32(seedTomorrow);

      const streamA = Array.from({ length: 50 }, () => prngA.nextInt(1, 1000));
      const streamB = Array.from({ length: 50 }, () => prngB.nextInt(1, 1000));

      // Probability of matching 50 random values is negligible
      expect(streamA).not.toEqual(streamB);
    });

    it('rejects malformed date strings for daily seed generation', () => {
      expect(() => hashDateSeed('2026/09/17')).toThrow(/Invalid date format/);
      expect(() => hashDateSeed('17-09-2026')).toThrow(/Invalid date format/);
      expect(() => hashDateSeed('not-a-date')).toThrow(/Invalid date format/);
      expect(() => hashDateSeed('')).toThrow(/Invalid date format/);
    });

    it('verifies Mulberry32 fork() creates independent deterministic child generator', () => {
      const parent = new Mulberry32(12345);
      // Advance parent a few steps
      parent.next();
      parent.next();

      const forkedChild1 = parent.fork();
      const childNumbers1 = Array.from({ length: 10 }, () => forkedChild1.next());

      // Create a fresh generator with the same initial seed, advance identically, fork again
      const parentClone = new Mulberry32(12345);
      parentClone.next();
      parentClone.next();

      const forkedChild2 = parentClone.fork();
      const childNumbers2 = Array.from({ length: 10 }, () => forkedChild2.next());

      expect(childNumbers1).toEqual(childNumbers2);
    });
  });

  describe('5. Adversarial Boundary & Corner Cases', () => {
    it('verifies minimal edge cases (1x1, 1+1, 1-1, 2/2) always satisfy distractor invariants', () => {
      const edgeFacts = [
        { op: '*' as MathOperator, a: 1, b: 1, ans: 1 },
        { op: '*' as MathOperator, a: 1, b: 2, ans: 2 },
        { op: '*' as MathOperator, a: 2, b: 2, ans: 4 },
        { op: '+' as MathOperator, a: 1, b: 1, ans: 2 },
        { op: '-' as MathOperator, a: 1, b: 1, ans: 0 },
        { op: '-' as MathOperator, a: 2, b: 2, ans: 0 },
        { op: '-' as MathOperator, a: 2, b: 1, ans: 1 },
        { op: '/' as MathOperator, a: 2, b: 2, ans: 1 },
        { op: '/' as MathOperator, a: 4, b: 2, ans: 2 },
        { op: '+' as MathOperator, a: 9999, b: 9999, ans: 19998 },
        { op: '*' as MathOperator, a: 99, b: 99, ans: 9801 },
      ];

      const tiers: DifficultyTier[] = ['easy', 'normal', 'hard', 'expert'];

      for (const fact of edgeFacts) {
        for (const difficulty of tiers) {
          const result = distractorEngine.generate({
            operator: fact.op,
            operandA: fact.a,
            operandB: fact.b,
            answer: fact.ans,
            difficulty,
            count: 3,
          });

          // 1. Length 4
          expect(result.allChoices).toHaveLength(4);
          // 2. Strict uniqueness
          expect(new Set(result.allChoices).size).toBe(4);
          // 3. Contains answer
          expect(result.allChoices[result.correctIndex]).toBe(fact.ans);
          // 4. Distractors strictly positive
          expect(result.distractors.every((d) => d > 0 && Number.isInteger(d))).toBe(true);
          // 5. Anti-trivial last-digit masking
          const lastDigit = Math.abs(fact.ans) % 10;
          const matchingLastDigit = result.allChoices.filter((c) => Math.abs(c) % 10 === lastDigit);
          expect(matchingLastDigit.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('verifies Division Level 1 trivial divisor 1 toggle invariant', () => {
      // By default, divisor 1 is excluded: divisor in [2, 5]
      for (let i = 0; i < 500; i++) {
        const fact = generateDivisionFact({ level: 1 });
        expect(fact.operandB).toBeGreaterThanOrEqual(2);
      }

      // When excludeTrivialDivisorOne: false, divisor 1 can be generated: divisor in [1, 5]
      let generatedOne = false;
      for (let i = 0; i < 500; i++) {
        const fact = generateDivisionFact({ level: 1, excludeTrivialDivisorOne: false });
        expect(fact.operandB).toBeGreaterThanOrEqual(1);
        if (fact.operandB === 1) {
          generatedOne = true;
        }
      }
      expect(generatedOne).toBe(true);
    });

    it('verifies Subtraction Level 4 always yields non-negative multi-digit facts', () => {
      for (let i = 0; i < 1000; i++) {
        const fact = generateSubtractionFact({ level: 4 });
        expect(fact.operandA).toBeGreaterThan(fact.operandB);
        expect(fact.answer).toBeGreaterThan(0);
        expect(fact.operandB).toBeGreaterThanOrEqual(50);
      }
    });
  });
});
