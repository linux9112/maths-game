import { describe, it, expect } from 'vitest';
import { generateCalculationHint } from '../../features/games/core/calculationHint';

describe('calculationHint', () => {
  it('generates friendly tens hint for multiplying by 10', () => {
    const hint = generateCalculationHint({
      operator: '*',
      operandA: 14,
      operandB: 10,
      answer: 140,
    });
    expect(hint).toContain('append a 0');
  });

  it("generates nine's trick hint for multiplying by 9", () => {
    const hint = generateCalculationHint({
      operator: '*',
      operandA: 8,
      operandB: 9,
      answer: 72,
    });
    expect(hint).toContain("Nine's trick");
  });

  it("generates eleven's trick hint for multiplying by 11", () => {
    const hint = generateCalculationHint({
      operator: '*',
      operandA: 7,
      operandB: 11,
      answer: 77,
    });
    expect(hint).toContain("Eleven's trick");
  });

  it("generates five's trick hint for multiplying by 5", () => {
    const hint = generateCalculationHint({
      operator: '*',
      operandA: 16,
      operandB: 5,
      answer: 80,
    });
    expect(hint).toContain("Five's trick");
  });

  it('generates double twice hint for multiplying by 4', () => {
    const hint = generateCalculationHint({
      operator: '*',
      operandA: 15,
      operandB: 4,
      answer: 60,
    });
    expect(hint).toContain('Double twice');
  });

  it('generates near tens compensation hint for addition ending in 9', () => {
    const hint = generateCalculationHint({
      operator: '+',
      operandA: 35,
      operandB: 19,
      answer: 54,
    });
    expect(hint).toContain('Add 20 then subtract 1');
  });

  it('generates constant difference hint for subtraction ending in 9', () => {
    const hint = generateCalculationHint({
      operator: '-',
      operandA: 52,
      operandB: 19,
      answer: 33,
    });
    expect(hint).toContain('Constant difference');
  });

  it('generates inverse multiplication hint for division', () => {
    const hint = generateCalculationHint({
      operator: '/',
      operandA: 48,
      operandB: 6,
      answer: 8,
    });
    expect(hint).toContain('Think multiplication');
    expect(hint).toContain('6 × 8 = 48');
  });
});
