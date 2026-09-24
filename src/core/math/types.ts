/**
 * Supported fundamental arithmetic operators
 */
export type MathOperator = '+' | '-' | '*' | '/';

/**
 * Display symbols for UI rendering
 */
export const OPERATOR_SYMBOLS: Record<MathOperator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

/**
 * Difficulty tiers for adaptive distractor clustering and time pressure
 */
export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'expert';

/**
 * Categorical contexts where questions are instantiated
 */
export type QuestionCategory =
  | 'table'
  | 'arithmetic'
  | 'daily'
  | 'weakness'
  | 'game';

/**
 * Standard arithmetic progression levels
 */
export type AdditionLevel = 1 | 2 | 3 | 4 | 5;
export type SubtractionLevel = 1 | 2 | 3 | 4;
export type MultiplicationLevel = 1 | 2 | 3 | 4 | 5;
export type DivisionLevel = 1 | 2 | 3 | 4 | 5;
export type ArithmeticLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Fundamental calculation fact model (canonical storage and telemetry)
 */
export interface CalculationFact {
  readonly id: string; // Canonical key: e.g. "add_23_45", "sub_52_27", "mul_7_12", "div_48_6"
  readonly operator: MathOperator;
  readonly operandA: number; // For division, dividend D; for subtraction, minuend a
  readonly operandB: number; // For division, divisor d; for subtraction, subtrahend b
  readonly answer: number;   // Numerical result (for division with remainder, integer quotient)
}

/**
 * Division fact extending CalculationFact to support optional remainder modes
 */
export interface DivisionFact extends CalculationFact {
  readonly operator: '/';
  readonly dividend: number;  // Equal to operandA
  readonly divisor: number;   // Equal to operandB
  readonly quotient: number;  // Equal to answer
  readonly remainder: number; // Strictly 0 in exact division, >= 1 in remainder mode
  readonly isExact: boolean;  // true if remainder === 0
}

/**
 * Full question model presented to UI components and game engines
 */
export interface Question extends CalculationFact {
  readonly promptText: string;      // e.g. "48 ÷ 6" or "52 − 27"
  readonly displayOperator: string; // "+", "−", "×", "÷"
  readonly options?: number[];      // 4 choices for multiple-choice mode (Mode A)
  readonly answerStr: string;       // String representation (e.g. "8", "25", or "7 R 2")
  readonly difficulty: DifficultyTier;
  readonly category: QuestionCategory;
}

/**
 * Operation modes supported by the Operations selector
 */
export type OperationMode =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mixed'
  | 'custom';

/**
 * Configuration for question generation requests
 */
export interface GeneratorOptions {
  readonly level?: ArithmeticLevel;
  readonly difficulty?: DifficultyTier;
  readonly category?: QuestionCategory;
  readonly allowNegativeAnswers?: boolean; // For subtraction (default false)
  readonly allowRemainders?: boolean;      // For division (default false)
  readonly excludeTrivialDivisorOne?: boolean; // For division level 1 (default true)
  readonly prng?: IPRNG;                   // Seeded or random generator
}

/**
 * Configuration for the flexible multi-operator selector
 */
export interface OperationSelectorConfig extends GeneratorOptions {
  readonly allowedOperators: readonly MathOperator[];
}

/**
 * PRNG abstraction interface
 */
export interface IPRNG {
  next(): number;                          // Float in [0, 1)
  nextInt(min: number, max: number): number;// Integer in [min, max] inclusive
  nextChoice<T>(items: readonly T[]): T;   // Random item from collection
  shuffle<T>(array: readonly T[]): T[];    // Immutable Fisher-Yates shuffle
}
