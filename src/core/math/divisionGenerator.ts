import { DivisionFact, DivisionLevel, GeneratorOptions, IPRNG } from './types';
import { defaultPrng } from './seedPrng';

interface DivisionRange {
  dMin: number;
  dMax: number;
  qMin: number;
  qMax: number;
}

export const DIVISION_LEVEL_RANGES: Record<DivisionLevel, DivisionRange> = {
  1: { dMin: 2, dMax: 5, qMin: 1, qMax: 10 },
  2: { dMin: 2, dMax: 10, qMin: 2, qMax: 12 },
  3: { dMin: 3, dMax: 15, qMin: 5, qMax: 20 },
  4: { dMin: 11, dMax: 35, qMin: 10, qMax: 50 },
  5: { dMin: 12, dMax: 99, qMin: 12, qMax: 99 },
};

/**
 * Generates strictly valid division facts:
 * - Exact integer division by default: D = d * q, ensuring D % d === 0 and d >= 1.
 * - Optional remainder mode: r in [1, d - 1] (when d > 1), D = d * q + r.
 */
export function generateDivisionFact(options: GeneratorOptions = {}): DivisionFact {
  const prng: IPRNG = options.prng ?? defaultPrng;
  const level: DivisionLevel = (options.level ?? 1) as DivisionLevel;
  const allowRemainders = options.allowRemainders ?? false;
  const excludeDivisorOne = options.excludeTrivialDivisorOne ?? true;

  const range = DIVISION_LEVEL_RANGES[level] ?? DIVISION_LEVEL_RANGES[1];
  let dMin = range.dMin;
  const dMax = range.dMax;

  if (level === 1 && !excludeDivisorOne) {
    dMin = 1;
  }

  const divisor = prng.nextInt(dMin, dMax);
  const quotient = prng.nextInt(range.qMin, range.qMax);

  if (allowRemainders && divisor > 1) {
    const remainder = prng.nextInt(1, divisor - 1);
    const dividend = divisor * quotient + remainder;
    return {
      id: `div_${dividend}_${divisor}_r${remainder}`,
      operator: '/',
      operandA: dividend,
      operandB: divisor,
      answer: quotient,
      dividend,
      divisor,
      quotient,
      remainder,
      isExact: false,
    };
  }

  // Strictly exact integer division
  const dividend = divisor * quotient;
  return {
    id: `div_${dividend}_${divisor}`,
    operator: '/',
    operandA: dividend,
    operandB: divisor,
    answer: quotient,
    dividend,
    divisor,
    quotient,
    remainder: 0,
    isExact: true,
  };
}
