import {
  CalculationFact,
  Question,
  GeneratorOptions,
  OperationSelectorConfig,
  IPRNG,
  AdditionLevel,
  SubtractionLevel,
  MultiplicationLevel,
  DivisionLevel,
  OPERATOR_SYMBOLS,
  DifficultyTier,
  QuestionCategory,
} from './types';
import { defaultPrng } from './seedPrng';
import { generateDivisionFact } from './divisionGenerator';

/**
 * Generates Addition facts across Levels 1 to 5.
 */
export function generateAdditionFact(options: GeneratorOptions = {}): CalculationFact {
  const prng: IPRNG = options.prng ?? defaultPrng;
  const level: AdditionLevel = (options.level ?? 1) as AdditionLevel;

  let a = 1;
  let b = 1;

  switch (level) {
    case 1: {
      // Single-digit addition: a, b in [1, 9]
      a = prng.nextInt(1, 9);
      b = prng.nextInt(1, 9);
      break;
    }
    case 2: {
      // Two-digit addition with NO CARRY in units or tens (stays <= 99)
      const tensA = prng.nextInt(1, 8);
      const tensB = prng.nextInt(1, 9 - tensA);
      const unitsA = prng.nextInt(0, 9);
      const unitsB = prng.nextInt(0, 9 - unitsA);

      a = tensA * 10 + unitsA;
      b = tensB * 10 + unitsB;

      // Randomly swap operands for symmetry
      if (prng.next() < 0.5) {
        const tmp = a;
        a = b;
        b = tmp;
      }
      break;
    }
    case 3: {
      // Two-digit addition WITH CARRY in units place (unitsA + unitsB >= 10)
      const unitsA = prng.nextInt(1, 9);
      const unitsB = prng.nextInt(10 - unitsA, 9); // unitsA + unitsB in [10, 18]
      const tensA = prng.nextInt(1, 8);
      const tensB = prng.nextInt(1, 8);

      a = tensA * 10 + unitsA;
      b = tensB * 10 + unitsB;

      if (prng.next() < 0.5) {
        const tmp = a;
        a = b;
        b = tmp;
      }
      break;
    }
    case 4: {
      // Three-digit addition in [100, 999] with at least one column carry
      a = prng.nextInt(100, 999);
      b = prng.nextInt(100, 999);

      const hasCarry =
        (a % 10) + (b % 10) >= 10 ||
        Math.floor((a % 100) / 10) + Math.floor((b % 100) / 10) >= 10 ||
        Math.floor(a / 100) + Math.floor(b / 100) >= 10;

      if (!hasCarry) {
        // Guarantee units carry if neither column carried
        const uA = prng.nextInt(5, 9);
        const uB = prng.nextInt(10 - uA, 9);
        a = Math.floor(a / 10) * 10 + uA;
        b = Math.floor(b / 10) * 10 + uB;
      }
      break;
    }
    case 5: {
      // Four-digit addition in [1000, 9999]
      a = prng.nextInt(1000, 9999);
      b = prng.nextInt(1000, 9999);
      break;
    }
  }

  const answer = a + b;
  return {
    id: `add_${a}_${b}`,
    operator: '+',
    operandA: a,
    operandB: b,
    answer,
  };
}

/**
 * Generates Subtraction facts across Levels 1 to 4 (default non-negative a >= b).
 */
export function generateSubtractionFact(options: GeneratorOptions = {}): CalculationFact {
  const prng: IPRNG = options.prng ?? defaultPrng;
  const level: SubtractionLevel = (Math.min(4, options.level ?? 1)) as SubtractionLevel;

  let a = 1;
  let b = 1;

  switch (level) {
    case 1: {
      // Beginner single-digit non-negative (a >= b)
      a = prng.nextInt(1, 9);
      b = prng.nextInt(1, a);
      break;
    }
    case 2: {
      // Two-digit subtraction with NO BORROWING
      const tensA = prng.nextInt(2, 9);
      const tensB = prng.nextInt(1, tensA);
      const unitsA = prng.nextInt(0, 9);
      const unitsB = prng.nextInt(0, unitsA);

      a = tensA * 10 + unitsA;
      b = tensB * 10 + unitsB;
      break;
    }
    case 3: {
      // Two-digit subtraction WITH BORROWING in units place (unitsA < unitsB, tensA > tensB)
      const tensA = prng.nextInt(2, 9);
      const tensB = prng.nextInt(1, tensA - 1);
      const unitsA = prng.nextInt(0, 8);
      const unitsB = prng.nextInt(unitsA + 1, 9);

      a = tensA * 10 + unitsA;
      b = tensB * 10 + unitsB;
      break;
    }
    case 4: {
      // Multi-digit (3-digit or 4-digit) subtraction with regrouping
      const isFourDigit = prng.next() < 0.5;
      if (isFourDigit) {
        a = prng.nextInt(1000, 9999);
        b = prng.nextInt(500, a - 1);
      } else {
        a = prng.nextInt(100, 999);
        b = prng.nextInt(50, a - 1);
      }
      break;
    }
  }

  const answer = a - b;
  return {
    id: `sub_${a}_${b}`,
    operator: '-',
    operandA: a,
    operandB: b,
    answer,
  };
}

/**
 * Generates Multiplication facts across Levels 1 to 5.
 */
export function generateMultiplicationFact(options: GeneratorOptions = {}): CalculationFact {
  const prng: IPRNG = options.prng ?? defaultPrng;
  const level: MultiplicationLevel = (options.level ?? 1) as MultiplicationLevel;

  let a = 1;
  let b = 1;

  switch (level) {
    case 1: {
      // Single-digit multiplication facts: 1-9 x 1-9
      a = prng.nextInt(1, 9);
      b = prng.nextInt(1, 9);
      break;
    }
    case 2: {
      // Standard tables 1-12 or teens
      if (prng.next() < 0.5) {
        a = prng.nextInt(1, 12);
        b = prng.nextInt(1, 12);
      } else {
        a = prng.nextInt(2, 9);
        b = prng.nextInt(10, 19);
      }
      break;
    }
    case 3: {
      // 1-digit by 2-digit general: operandA in [2, 9], operandB in [13, 99]
      a = prng.nextInt(2, 9);
      b = prng.nextInt(13, 99);
      break;
    }
    case 4: {
      // Friendly 2d x 2d (tens multiples or smaller 2d)
      if (prng.next() < 0.5) {
        // Tens multiples
        a = prng.nextInt(1, 9) * 10;
        b = prng.nextInt(11, 99);
      } else {
        a = prng.nextInt(11, 35);
        b = prng.nextInt(11, 25);
      }
      if (prng.next() < 0.5) {
        const tmp = a;
        a = b;
        b = tmp;
      }
      break;
    }
    case 5: {
      // Full 2d x 2d multi-digit: operandA in [12, 99], operandB in [12, 99]
      a = prng.nextInt(12, 99);
      b = prng.nextInt(12, 99);
      break;
    }
  }

  const answer = a * b;
  return {
    id: `mul_${a}_${b}`,
    operator: '*',
    operandA: a,
    operandB: b,
    answer,
  };
}

/**
 * Flexible multi-operator arithmetic selector.
 */
export function generateArithmeticFact(
  config: OperationSelectorConfig
): CalculationFact {
  const prng: IPRNG = config.prng ?? defaultPrng;
  const allowed = config.allowedOperators.length > 0
    ? config.allowedOperators
    : (['+'] as const);

  const chosenOp = prng.nextChoice(allowed);
  const rawLevel = config.level ?? 1;

  switch (chosenOp) {
    case '+':
      return generateAdditionFact({ ...config, level: rawLevel as AdditionLevel });
    case '-': {
      const subLevel = Math.min(4, rawLevel) as SubtractionLevel;
      return generateSubtractionFact({ ...config, level: subLevel });
    }
    case '*':
      return generateMultiplicationFact({ ...config, level: rawLevel as MultiplicationLevel });
    case '/':
      return generateDivisionFact({ ...config, level: rawLevel as DivisionLevel });
  }
}

/**
 * Assembles a complete Question presentation object from a raw CalculationFact.
 */
export function createQuestionFromFact(
  fact: CalculationFact,
  options?: {
    difficulty?: DifficultyTier;
    category?: QuestionCategory;
    choices?: number[];
  }
): Question {
  const opSymbol = OPERATOR_SYMBOLS[fact.operator];
  const prompt = `${fact.operandA} ${opSymbol} ${fact.operandB}`;
  const answerStr = String(fact.answer);

  return {
    ...fact,
    promptText: prompt,
    displayOperator: opSymbol,
    options: options?.choices,
    answerStr,
    difficulty: options?.difficulty ?? 'normal',
    category: options?.category ?? 'arithmetic',
  };
}
