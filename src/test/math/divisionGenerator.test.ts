import { describe, it, expect } from 'vitest';
import { generateDivisionFact } from '../../core/math/divisionGenerator';
import { DivisionLevel } from '../../core/math/types';

describe('Division Generator & Integer Constraints Suite', () => {
  describe('Exact Integer Division Invariants (5000 Iteration Stress Test)', () => {
    it('strictly guarantees D % d === 0 and D / d === quotient across all 5 levels', () => {
      const levels: DivisionLevel[] = [1, 2, 3, 4, 5];

      for (const level of levels) {
        for (let i = 0; i < 1000; i++) {
          const fact = generateDivisionFact({ level });

          // Invariant 1: Non-zero divisor
          expect(fact.operandB).toBeGreaterThan(0);
          expect(fact.divisor).toBe(fact.operandB);

          // Invariant 2: Exact divisibility
          expect(fact.operandA % fact.operandB).toBe(0);

          // Invariant 3: Integer quotient integrity
          expect(Number.isInteger(fact.answer)).toBe(true);
          expect(fact.operandA / fact.operandB).toBe(fact.answer);
          expect(fact.quotient).toBe(fact.answer);

          // Invariant 4: Remainder strictly zero
          expect(fact.remainder).toBe(0);
          expect(fact.isExact).toBe(true);

          // Invariant 5: Canonical ID format
          expect(fact.id).toBe(`div_${fact.operandA}_${fact.operandB}`);
        }
      }
    });
  });

  describe('Level Boundary Range Verifications', () => {
    it('Level 1 adheres to divisor [2, 5] and quotient [1, 10]', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateDivisionFact({ level: 1, excludeTrivialDivisorOne: true });
        expect(fact.divisor).toBeGreaterThanOrEqual(2);
        expect(fact.divisor).toBeLessThanOrEqual(5);
        expect(fact.quotient).toBeGreaterThanOrEqual(1);
        expect(fact.quotient).toBeLessThanOrEqual(10);
        expect(fact.dividend).toBeLessThanOrEqual(50);
      }
    });

    it('Level 1 allows divisor 1 when excludeTrivialDivisorOne is false', () => {
      let sawDivisorOne = false;
      for (let i = 0; i < 500; i++) {
        const fact = generateDivisionFact({ level: 1, excludeTrivialDivisorOne: false });
        if (fact.divisor === 1) {
          sawDivisorOne = true;
          expect(fact.dividend).toBe(fact.quotient);
        }
      }
      expect(sawDivisorOne).toBe(true);
    });

    it('Level 5 handles large mental math multi-digit divisors and quotients', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateDivisionFact({ level: 5 });
        expect(fact.divisor).toBeGreaterThanOrEqual(12);
        expect(fact.divisor).toBeLessThanOrEqual(99);
        expect(fact.quotient).toBeGreaterThanOrEqual(12);
        expect(fact.quotient).toBeLessThanOrEqual(99);
        expect(fact.dividend).toBe(fact.divisor * fact.quotient);
      }
    });
  });

  describe('Optional Remainder Mode Invariants', () => {
    it('guarantees 1 <= r < d and D === d * q + r', () => {
      for (let i = 0; i < 1000; i++) {
        const fact = generateDivisionFact({ level: 2, allowRemainders: true });
        expect(fact.remainder).toBeGreaterThanOrEqual(1);
        expect(fact.remainder).toBeLessThan(fact.divisor);
        expect(fact.isExact).toBe(false);
        expect(fact.dividend).toBe(fact.divisor * fact.quotient + fact.remainder);
        expect(Math.floor(fact.dividend / fact.divisor)).toBe(fact.quotient);
        expect(fact.dividend % fact.divisor).toBe(fact.remainder);
        expect(fact.id).toBe(`div_${fact.dividend}_${fact.divisor}_r${fact.remainder}`);
      }
    });
  });
});
