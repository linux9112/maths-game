import { MathOperator } from '../../../core/math/types';

/**
 * Generates an intuitive, pedagogically sound mental calculation decomposition hint
 * based on the arithmetic operation, operands, and answer.
 */
export function generateCalculationHint(params: {
  operator: MathOperator;
  operandA: number;
  operandB: number;
  answer: number;
}): string {
  const { operator, operandA: a, operandB: b, answer: ans } = params;

  switch (operator) {
    case '*': {
      // 1. Multiplying by 10
      if (b === 10) return `Multiplying by 10: append a 0 to ${a} → ${ans}`;
      if (a === 10) return `Multiplying by 10: append a 0 to ${b} → ${ans}`;

      // 2. Multiplying by 9: (a * 10) - a
      if (b === 9) return `Nine's trick: (${a} × 10) − ${a} = ${a * 10} − ${a} = ${ans}`;
      if (a === 9) return `Nine's trick: (${b} × 10) − ${b} = ${b * 10} − ${b} = ${ans}`;

      // 3. Multiplying by 11: (a * 10) + a
      if (b === 11) return `Eleven's trick: (${a} × 10) + ${a} = ${a * 10} + ${a} = ${ans}`;
      if (a === 11) return `Eleven's trick: (${b} × 10) + ${b} = ${b * 10} + ${b} = ${ans}`;

      // 4. Multiplying by 5: (a * 10) / 2
      if (b === 5) return `Five's trick: Half of (${a} × 10) = ${a * 10} ÷ 2 = ${ans}`;
      if (a === 5) return `Five's trick: Half of (${b} × 10) = ${b * 10} ÷ 2 = ${ans}`;

      // 5. Multiplying by 4: double twice
      if (b === 4) return `Double twice: ${a} × 2 = ${a * 2} → ${a * 2} × 2 = ${ans}`;
      if (a === 4) return `Double twice: ${b} × 2 = ${b * 2} → ${b * 2} × 2 = ${ans}`;

      // 6. Perfect square
      if (a === b) return `Perfect square: ${a}² = ${ans}`;

      // 7. Multi-digit distributive breakdown: (tens + units) * b
      if (a > 10 && b <= 12) {
        const tens = Math.floor(a / 10) * 10;
        const units = a % 10;
        if (units > 0) {
          return `Split ${a}: (${tens} × ${b}) + (${units} × ${b}) = ${tens * b} + ${units * b} = ${ans}`;
        }
      }
      if (b > 10 && a <= 12) {
        const tens = Math.floor(b / 10) * 10;
        const units = b % 10;
        if (units > 0) {
          return `Split ${b}: (${a} × ${tens}) + (${a} × ${units}) = ${a * tens} + ${a * units} = ${ans}`;
        }
      }

      // Default multiplication fallback
      return `Repeated addition: ${a} groups of ${b} = ${ans}`;
    }

    case '+': {
      // Near tens compensation
      if (b % 10 === 9) {
        return `Add ${b + 1} then subtract 1: (${a} + ${b + 1}) − 1 = ${a + b + 1} − 1 = ${ans}`;
      }
      if (b % 10 === 8) {
        return `Add ${b + 2} then subtract 2: (${a} + ${b + 2}) − 2 = ${a + b + 2} − 2 = ${ans}`;
      }
      if (a % 10 === 9) {
        return `Add 1 to ${a} and subtract 1: (${a + 1} + ${b}) − 1 = ${a + 1 + b} − 1 = ${ans}`;
      }

      // Place value decomposition (split tens and units)
      if (a >= 10 || b >= 10) {
        const tensA = Math.floor(a / 10) * 10;
        const unitsA = a % 10;
        const tensB = Math.floor(b / 10) * 10;
        const unitsB = b % 10;
        return `Split tens & units: (${tensA} + ${tensB}) + (${unitsA} + ${unitsB}) = ${tensA + tensB} + ${unitsA + unitsB} = ${ans}`;
      }
      return `Count up from ${Math.max(a, b)}: ${Math.max(a, b)} + ${Math.min(a, b)} = ${ans}`;
    }

    case '-': {
      // Subtraction by constant difference (friendly round numbers)
      if (b % 10 === 9) {
        return `Constant difference (add 1 to both): (${a} + 1) − (${b} + 1) = ${a + 1} − ${b + 1} = ${ans}`;
      }
      if (b % 10 === 8) {
        return `Constant difference (add 2 to both): (${a} + 2) − (${b} + 2) = ${a + 2} − ${b + 2} = ${ans}`;
      }

      // Step-down tens then units
      if (b >= 10) {
        const tensB = Math.floor(b / 10) * 10;
        const unitsB = b % 10;
        if (unitsB > 0) {
          return `Subtract tens then units: (${a} − ${tensB}) − ${unitsB} = ${a - tensB} − ${unitsB} = ${ans}`;
        }
        return `Subtract tens: ${a} − ${tensB} = ${ans}`;
      }
      return `Count down ${b} steps from ${a} = ${ans}`;
    }

    case '/': {
      // Inverse multiplication framing
      return `Think multiplication: what times ${b} equals ${a}? ${b} × ${ans} = ${a}, so ${a} ÷ ${b} = ${ans}`;
    }

    default:
      return `${a} ${operator} ${b} = ${ans}`;
  }
}
