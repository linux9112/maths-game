/**
 * Supported arithmetic operators
 */
export type MathOperator = '+' | '-' | '*' | '/';

/**
 * Difficulty tiers influencing distractor clustering, trap density, and cognitive models
 */
export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'expert';

/**
 * Pedagogical source categories for cognitive distractor candidates
 */
export type DistractorSource =
  | 'adjacent_multiplier'    // a * (b ± 1), a * (b ± 2)
  | 'neighbor_table'        // (a ± 1) * b, (a ± 2) * b
  | 'conserved_sum'          // (a - 1) * (b + 1), (a + 1) * (b - 1)
  | 'cross_operation'       // a + b for a * b, a * b for a + b
  | 'carry_slip'            // forgot carry, phantom carry, multi-digit carry errors
  | 'borrow_slip'           // failed decrement after borrow, double borrow
  | 'reverse_subtraction'   // column subtraction without borrowing (b0 - a0)
  | 'transposed_digits'     // swapped tens and units (54 <-> 45)
  | 'adjacent_step'         // ans ± 1, ans ± 2, ans ± 3
  | 'divisor_trap'          // offering divisor or quotient confusion in division
  | 'remainder_slip'        // ans ± divisor
  | 'last_digit_mask'       // deliberate ans ± 10k injection to mask units digit
  | 'magnitude_fallback';   // bounded offset when candidate pool is depleted

/**
 * Candidate distractor tagged with value, heuristic origin, and plausibility score
 */
export interface DistractorCandidate {
  readonly value: number;
  readonly source: DistractorSource;
  readonly distance: number;         // Math.abs(value - answer)
  readonly relativeDistance: number; // Math.abs(value - answer) / Math.max(1, answer)
  readonly sharesLastDigit: boolean; // Math.abs(value) % 10 === Math.abs(answer) % 10
}

/**
 * Request payload to generate distractors
 */
export interface DistractorRequest {
  readonly operator: MathOperator;
  readonly operandA: number;
  readonly operandB: number;
  readonly answer: number;
  readonly difficulty: DifficultyTier;
  readonly count?: number;           // Defaults to 3 (producing 4 total choices)
  readonly rng?: () => number;       // Optional PRNG (e.g. Mulberry32 for Daily Challenge)
}

/**
 * Generated distractor output meeting all pedagogical and UI requirements
 */
export interface DistractorResult {
  readonly correctAnswer: number;
  readonly distractors: number[];        // Array of exactly `count` items (default 3)
  readonly allChoices: number[];         // Shuffled array of 4 choices containing correctAnswer
  readonly correctIndex: number;         // Index of correctAnswer in allChoices (0..3)
  readonly sources: DistractorSource[];  // Corresponding heuristic sources for the distractors
}

/**
 * Interface contract for the Distractor Engine
 */
export interface IDistractorEngine {
  generate(request: DistractorRequest): DistractorResult;
}

/**
 * Options for distractor validation
 */
export interface DistractorValidationOptions {
  readonly expectedCount?: number;       // Default: 3
  readonly minMagnitudeRatio?: number;   // Default: 0.4
  readonly maxMagnitudeRatio?: number;   // Default: 1.8
  readonly requireStrictLastDigit?: boolean; // Default: true (correct answer never unique last digit)
}

/**
 * Validation result object
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly details: {
    readonly countValid: boolean;
    readonly uniquenessValid: boolean;
    readonly positivityValid: boolean;
    readonly nonAnswerValid: boolean;
    readonly lastDigitMasked: boolean;
    readonly magnitudeValid: boolean;
    readonly integersValid: boolean;
  };
}
