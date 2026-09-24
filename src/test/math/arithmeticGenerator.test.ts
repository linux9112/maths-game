import { describe, it, expect } from 'vitest';
import {
  generateAdditionFact,
  generateSubtractionFact,
  generateMultiplicationFact,
  generateArithmeticFact,
} from '../../core/math/arithmeticGenerator';

describe('Arithmetic Generator Engine Suite', () => {
  describe('Addition Engine', () => {
    it('Level 1: Single-digit operands in [1, 9]', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateAdditionFact({ level: 1 });
        expect(fact.operandA).toBeGreaterThanOrEqual(1);
        expect(fact.operandA).toBeLessThanOrEqual(9);
        expect(fact.operandB).toBeGreaterThanOrEqual(1);
        expect(fact.operandB).toBeLessThanOrEqual(9);
        expect(fact.answer).toBe(fact.operandA + fact.operandB);
      }
    });

    it('Level 2: Strictly NO CARRY in units and tens places across 1000 runs', () => {
      for (let i = 0; i < 1000; i++) {
        const fact = generateAdditionFact({ level: 2 });
        const a = fact.operandA;
        const b = fact.operandB;

        expect(a).toBeGreaterThanOrEqual(10);
        expect(a).toBeLessThanOrEqual(89);
        expect(b).toBeGreaterThanOrEqual(10);
        expect(b).toBeLessThanOrEqual(89);

        // Invariant: No units carry
        const unitsCarry = (a % 10) + (b % 10);
        expect(unitsCarry).toBeLessThanOrEqual(9);

        // Invariant: No tens carry (stays 2-digit)
        const tensCarry = Math.floor(a / 10) + Math.floor(b / 10);
        expect(tensCarry).toBeLessThanOrEqual(9);
        expect(fact.answer).toBeLessThanOrEqual(99);
      }
    });

    it('Level 3: Strictly WITH CARRY in units place across 1000 runs', () => {
      for (let i = 0; i < 1000; i++) {
        const fact = generateAdditionFact({ level: 3 });
        const a = fact.operandA;
        const b = fact.operandB;

        expect(a).toBeGreaterThanOrEqual(11);
        expect(a).toBeLessThanOrEqual(99);
        expect(b).toBeGreaterThanOrEqual(11);
        expect(b).toBeLessThanOrEqual(99);

        // Invariant: Units regrouping required
        const unitsSum = (a % 10) + (b % 10);
        expect(unitsSum).toBeGreaterThanOrEqual(10);
      }
    });

    it('Level 4 & 5: Three-digit and four-digit operands', () => {
      const f4 = generateAdditionFact({ level: 4 });
      expect(f4.operandA).toBeGreaterThanOrEqual(100);
      expect(f4.operandA).toBeLessThanOrEqual(999);
      expect(f4.operandB).toBeGreaterThanOrEqual(100);
      expect(f4.operandB).toBeLessThanOrEqual(999);

      const f5 = generateAdditionFact({ level: 5 });
      expect(f5.operandA).toBeGreaterThanOrEqual(1000);
      expect(f5.operandA).toBeLessThanOrEqual(9999);
      expect(f5.operandB).toBeGreaterThanOrEqual(1000);
      expect(f5.operandB).toBeLessThanOrEqual(9999);
    });
  });

  describe('Subtraction Engine', () => {
    it('Level 1: Beginner single-digit non-negative (a >= b)', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateSubtractionFact({ level: 1 });
        expect(fact.operandA).toBeGreaterThanOrEqual(1);
        expect(fact.operandA).toBeLessThanOrEqual(9);
        expect(fact.operandB).toBeGreaterThanOrEqual(1);
        expect(fact.operandB).toBeLessThanOrEqual(fact.operandA);
        expect(fact.answer).toBeGreaterThanOrEqual(0);
        expect(fact.answer).toBe(fact.operandA - fact.operandB);
      }
    });

    it('Level 2: Strictly NO BORROW in units and tens across 1000 runs', () => {
      for (let i = 0; i < 1000; i++) {
        const fact = generateSubtractionFact({ level: 2 });
        const a = fact.operandA;
        const b = fact.operandB;

        expect(a).toBeGreaterThanOrEqual(20);
        expect(a).toBeLessThanOrEqual(99);
        expect(b).toBeGreaterThanOrEqual(10);
        expect(b).toBeLessThanOrEqual(a);

        // Invariant: Units of a >= units of b (no units borrowing)
        expect(a % 10).toBeGreaterThanOrEqual(b % 10);
        // Invariant: Tens of a >= tens of b
        expect(Math.floor(a / 10)).toBeGreaterThanOrEqual(Math.floor(b / 10));
        expect(fact.answer).toBeGreaterThanOrEqual(0);
      }
    });

    it('Level 3: Strictly WITH BORROW in units place across 1000 runs', () => {
      for (let i = 0; i < 1000; i++) {
        const fact = generateSubtractionFact({ level: 3 });
        const a = fact.operandA;
        const b = fact.operandB;

        expect(a).toBeGreaterThanOrEqual(20);
        expect(a).toBeLessThanOrEqual(98);
        expect(b).toBeGreaterThanOrEqual(11);
        expect(b).toBeLessThan(a);

        // Invariant: Units borrowing required
        expect(a % 10).toBeLessThan(b % 10);
        expect(fact.answer).toBeGreaterThan(0);
      }
    });

    it('Level 4: Multi-digit regrouping non-negative', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateSubtractionFact({ level: 4 });
        expect(fact.operandA).toBeGreaterThan(fact.operandB);
        expect(fact.answer).toBeGreaterThan(0);
      }
    });
  });

  describe('Multiplication Engine', () => {
    it('Level 1: Single-digit facts 1-9', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateMultiplicationFact({ level: 1 });
        expect(fact.operandA).toBeGreaterThanOrEqual(1);
        expect(fact.operandA).toBeLessThanOrEqual(9);
        expect(fact.operandB).toBeGreaterThanOrEqual(1);
        expect(fact.operandB).toBeLessThanOrEqual(9);
        expect(fact.answer).toBe(fact.operandA * fact.operandB);
      }
    });

    it('Level 3: 1d x 2d multiplication', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateMultiplicationFact({ level: 3 });
        expect(fact.operandA).toBeGreaterThanOrEqual(2);
        expect(fact.operandA).toBeLessThanOrEqual(9);
        expect(fact.operandB).toBeGreaterThanOrEqual(13);
        expect(fact.operandB).toBeLessThanOrEqual(99);
        expect(fact.answer).toBe(fact.operandA * fact.operandB);
      }
    });

    it('Level 5: Full 2d x 2d multi-digit', () => {
      for (let i = 0; i < 500; i++) {
        const fact = generateMultiplicationFact({ level: 5 });
        expect(fact.operandA).toBeGreaterThanOrEqual(12);
        expect(fact.operandA).toBeLessThanOrEqual(99);
        expect(fact.operandB).toBeGreaterThanOrEqual(12);
        expect(fact.operandB).toBeLessThanOrEqual(99);
        expect(fact.answer).toBe(fact.operandA * fact.operandB);
      }
    });
  });

  describe('Flexible Operation Selector', () => {
    it('generates only selected single operator', () => {
      for (let i = 0; i < 100; i++) {
        const fact = generateArithmeticFact({ allowedOperators: ['*'], level: 1 });
        expect(fact.operator).toBe('*');
      }
    });

    it('balances all 4 operators uniformly in All Mixed mode', () => {
      const counts: Record<string, number> = { '+': 0, '-': 0, '*': 0, '/': 0 };
      for (let i = 0; i < 2000; i++) {
        const fact = generateArithmeticFact({
          allowedOperators: ['+', '-', '*', '/'],
          level: 2,
        });
        counts[fact.operator]++;
      }
      // Each operator should receive approximately 25% (around 500 +- 100)
      for (const op of ['+', '-', '*', '/']) {
        expect(counts[op]).toBeGreaterThan(400);
        expect(counts[op]).toBeLessThan(600);
      }
    });

    it('safely clamps Subtraction when level 5 is requested', () => {
      const fact = generateArithmeticFact({ allowedOperators: ['-'], level: 5 });
      expect(fact.operator).toBe('-');
      expect(fact.answer).toBeGreaterThanOrEqual(0);
    });
  });
});
