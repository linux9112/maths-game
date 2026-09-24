import { DistractorCandidate, DistractorSource } from './types';

export class CandidatePoolBuilder {
  private readonly candidates: Map<number, DistractorCandidate> = new Map();
  private readonly answer: number;
  private readonly lastDigit: number;
  private readonly minBound: number;
  private readonly maxBound: number;

  constructor(answer: number, minBound: number, maxBound: number) {
    this.answer = answer;
    this.lastDigit = Math.abs(answer) % 10;
    this.minBound = minBound;
    this.maxBound = maxBound;
  }

  public add(val: number, source: DistractorSource): void {
    if (!Number.isInteger(val)) return;
    if (val <= 0 || val === this.answer) return;
    if (val < this.minBound || val > this.maxBound) return;

    if (!this.candidates.has(val)) {
      const distance = Math.abs(val - this.answer);
      const relativeDistance = distance / Math.max(1, this.answer);
      const sharesLastDigit = Math.abs(val) % 10 === this.lastDigit;

      this.candidates.set(val, {
        value: val,
        source,
        distance,
        relativeDistance,
        sharesLastDigit,
      });
    }
  }

  public build(): DistractorCandidate[] {
    return Array.from(this.candidates.values());
  }
}

/**
 * Generates cognitive candidates for Multiplication (a * b = answer)
 */
export function generateMultiplicationCandidates(
  a: number,
  b: number,
  answer: number,
  builder: CandidatePoolBuilder
): void {
  // 1. Adjacent Multipliers: a * (b ± 1), a * (b ± 2)
  if (b > 1) builder.add(a * (b - 1), 'adjacent_multiplier');
  builder.add(a * (b + 1), 'adjacent_multiplier');
  if (b > 2) builder.add(a * (b - 2), 'adjacent_multiplier');
  builder.add(a * (b + 2), 'adjacent_multiplier');

  // 2. Neighbor Tables: (a ± 1) * b, (a ± 2) * b
  if (a > 1) builder.add((a - 1) * b, 'neighbor_table');
  builder.add((a + 1) * b, 'neighbor_table');
  if (a > 2) builder.add((a - 2) * b, 'neighbor_table');
  builder.add((a + 2) * b, 'neighbor_table');

  // 3. Conserved Sum / Diagonal Confusion: (a - 1)(b + 1)
  if (a > 1) builder.add((a - 1) * (b + 1), 'conserved_sum');
  if (b > 1) builder.add((a + 1) * (b - 1), 'conserved_sum');

  // 4. Cross-Operation Confusion: a + b
  if (a <= 12 && b <= 12 && a + b !== answer) {
    builder.add(a + b, 'cross_operation');
  }

  // 5. Digit Transposition: 54 <-> 45 for 2-digit numbers
  if (answer >= 12 && answer < 100) {
    const tens = Math.floor(answer / 10);
    const units = answer % 10;
    if (tens !== units) {
      builder.add(units * 10 + tens, 'transposed_digits');
    }
  }

  // 6. Multi-Digit Column Carry Errors (e.g. 43 * 7 = 301)
  if ((a >= 10 && b < 10) || (b >= 10 && a < 10)) {
    const multi = a >= 10 ? a : b;
    const single = a >= 10 ? b : a;
    const a0 = multi % 10;
    const a1 = Math.floor(multi / 10);
    const p0 = a0 * single;
    const carry = Math.floor(p0 / 10);
    const units = p0 % 10;
    const p1 = a1 * single;

    if (carry > 0) {
      // Error A: Omitted carry (e.g. 43 * 7: 4 * 7 = 28, append 1 -> 281)
      builder.add(p1 * 10 + units, 'carry_slip');
      // Error B: Off-by-one carry (carried 1 instead of 2 -> 291)
      builder.add((p1 + carry - 1) * 10 + units, 'carry_slip');
      // Error C: Added carry before multiplying multiplicand ((4 + 2) * 7 = 42 -> 421)
      builder.add(((a1 + carry) * single) * 10 + units, 'carry_slip');
    }
  }

  // 7. Double-Digit Multiplier Alignment Error (e.g. 23 * 14 = 322)
  if (a >= 10 && b >= 10 && a < 100 && b < 100) {
    const b0 = b % 10;
    const b1 = Math.floor(b / 10);
    // Student forgets the zero shift on tens row: (a * b0) + (a * b1)
    const omittedShift = a * b0 + a * b1;
    builder.add(omittedShift, 'carry_slip');
  }
}

/**
 * Generates cognitive candidates for Addition (a + b = answer)
 */
export function generateAdditionCandidates(
  a: number,
  b: number,
  answer: number,
  builder: CandidatePoolBuilder
): void {
  // 1. Carry / Regrouping slips (Naturally preserves answer % 10!)
  if (answer >= 17) builder.add(answer - 10, 'carry_slip'); // Forgot carry
  builder.add(answer + 10, 'carry_slip');                    // Phantom carry
  if (answer > 100) builder.add(answer - 100, 'carry_slip');
  builder.add(answer + 100, 'carry_slip');

  // 2. Adjacent steps
  builder.add(answer + 1, 'adjacent_step');
  if (answer > 1) builder.add(answer - 1, 'adjacent_step');
  builder.add(answer + 2, 'adjacent_step');
  if (answer > 2) builder.add(answer - 2, 'adjacent_step');

  // 3. Cross-operation for small operands: a * b
  if (a <= 6 && b <= 6 && a * b !== answer) {
    builder.add(a * b, 'cross_operation');
  }

  // 4. Digit transposition for 2-digit sums
  if (answer >= 12 && answer < 100) {
    const tens = Math.floor(answer / 10);
    const units = answer % 10;
    if (tens !== units) {
      builder.add(units * 10 + tens, 'transposed_digits');
    }
  }
}

/**
 * Generates cognitive candidates for Subtraction (a - b = answer)
 */
export function generateSubtractionCandidates(
  a: number,
  b: number,
  answer: number,
  builder: CandidatePoolBuilder
): void {
  // 1. Borrowing mistakes (Naturally preserves answer % 10!)
  builder.add(answer + 10, 'borrow_slip'); // Forgot to decrement tens after borrowing
  if (answer >= 17) builder.add(answer - 10, 'borrow_slip'); // Double borrowed

  // 2. Adjacent steps
  builder.add(answer + 1, 'adjacent_step');
  if (answer > 1) builder.add(answer - 1, 'adjacent_step');
  builder.add(answer + 2, 'adjacent_step');
  if (answer > 2) builder.add(answer - 2, 'adjacent_step');

  // 3. Reverse Column Subtraction (Classic bug: student calculates |a0 - b0| when a0 < b0)
  if (a >= 10 && b >= 10) {
    const a0 = a % 10;
    const a1 = Math.floor(a / 10);
    const b0 = b % 10;
    const b1 = Math.floor(b / 10);
    if (a0 < b0) {
      const bugResult = Math.abs(a1 - b1) * 10 + (b0 - a0);
      builder.add(bugResult, 'reverse_subtraction');
    }
  }
}

/**
 * Generates cognitive candidates for Division (a / b = answer, where a = b * answer)
 */
export function generateDivisionCandidates(
  _a: number,
  b: number,
  answer: number,
  builder: CandidatePoolBuilder
): void {
  // 1. Adjacent Quotients
  builder.add(answer + 1, 'adjacent_step');
  if (answer > 1) builder.add(answer - 1, 'adjacent_step');
  builder.add(answer + 2, 'adjacent_step');
  if (answer > 2) builder.add(answer - 2, 'adjacent_step');

  // 2. Divisor confusion trap (offering divisor b when b !== answer)
  if (b > 0 && b !== answer) {
    builder.add(b, 'divisor_trap');
  }

  // 3. Remainder slip (confusing remainder with quotient: answer ± b)
  if (answer > b) builder.add(answer - b, 'remainder_slip');
  builder.add(answer + b, 'remainder_slip');
}

/**
 * Injects guaranteed last-digit masking candidates: answer ± 10k
 */
export function generateLastDigitCandidates(
  answer: number,
  builder: CandidatePoolBuilder
): void {
  const deltas = answer >= 17
    ? [-10, 10, -20, 20, -30, 30]
    : [10, 20, 30];

  for (const delta of deltas) {
    builder.add(answer + delta, 'last_digit_mask');
  }
}
