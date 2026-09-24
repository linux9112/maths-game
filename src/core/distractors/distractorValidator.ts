import { DistractorValidationOptions, ValidationResult } from './types';

/**
 * Calculates plausible magnitude bounds harmonizing standard percentage scaling
 * with the mathematical constraints of small numbers (ans < 17).
 */
export function calculateMagnitudeBounds(
  answer: number,
  minRatio = 0.4,
  maxRatio = 1.8
): { minBound: number; maxBound: number } {
  const minBound = Math.max(1, Math.floor(minRatio * answer));
  const maxBound = Math.max(Math.ceil(maxRatio * answer), answer + 10);
  return { minBound, maxBound };
}

/**
 * Validates a generated set of distractors against all pedagogical and integrity invariants.
 */
export function validateDistractorSet(
  answer: number,
  distractors: number[],
  options: DistractorValidationOptions = {}
): ValidationResult {
  const {
    expectedCount = 3,
    minMagnitudeRatio = 0.4,
    maxMagnitudeRatio = 1.8,
    requireStrictLastDigit = true,
  } = options;

  const errors: string[] = [];
  const { minBound, maxBound } = calculateMagnitudeBounds(
    answer,
    minMagnitudeRatio,
    maxMagnitudeRatio
  );

  // 1. Count check
  const countValid = distractors.length === expectedCount;
  if (!countValid) {
    errors.push(`Expected exactly ${expectedCount} distractors, but received ${distractors.length}`);
  }

  // 2. Integers check
  const integersValid = distractors.every((d) => Number.isInteger(d));
  if (!integersValid) {
    errors.push('All distractors must be finite integers');
  }

  // 3. Positivity check
  const positivityValid = distractors.every((d) => d > 0);
  if (!positivityValid) {
    errors.push('All distractors must be strictly positive integers (> 0)');
  }

  // 4. Non-Answer check
  const nonAnswerValid = distractors.every((d) => d !== answer);
  if (!nonAnswerValid) {
    errors.push('Distractors must never duplicate the correct answer');
  }

  // 5. Uniqueness check
  const uniqueSet = new Set(distractors);
  const uniquenessValid = uniqueSet.size === distractors.length;
  if (!uniquenessValid) {
    errors.push('All distractors must be strictly unique among themselves');
  }

  // 6. Anti-Trivial Last-Digit Masking check
  const lastDigit = Math.abs(answer) % 10;
  const sameLastDigitDistractors = distractors.filter((d) => Math.abs(d) % 10 === lastDigit);
  const lastDigitMasked = !requireStrictLastDigit || sameLastDigitDistractors.length >= 1;
  if (!lastDigitMasked) {
    errors.push(
      `Strict Last-Digit Anti-Trivial violation: correct answer ${answer} (ends in ${lastDigit}) ` +
      `is the only choice with that units digit. Distractors: [${distractors.join(', ')}]`
    );
  }

  // 7. Magnitude Bounds check
  const magnitudeValid = distractors.every((d) => d >= minBound && d <= maxBound);
  if (!magnitudeValid) {
    const violating = distractors.filter((d) => d < minBound || d > maxBound);
    errors.push(
      `Magnitude envelope violation: distractors [${violating.join(', ')}] fall outside ` +
      `plausible bounds [${minBound}, ${maxBound}] for answer ${answer}`
    );
  }

  const isValid =
    countValid &&
    integersValid &&
    positivityValid &&
    nonAnswerValid &&
    uniquenessValid &&
    lastDigitMasked &&
    magnitudeValid;

  return {
    isValid,
    errors,
    details: {
      countValid,
      integersValid,
      positivityValid,
      nonAnswerValid,
      uniquenessValid,
      lastDigitMasked,
      magnitudeValid,
    },
  };
}

/**
 * Assertion helper that throws descriptive Error if validation fails.
 */
export function assertValidDistractors(
  answer: number,
  distractors: number[],
  options?: DistractorValidationOptions
): void {
  const result = validateDistractorSet(answer, distractors, options);
  if (!result.isValid) {
    throw new Error(`Distractor Validation Failed:\n- ${result.errors.join('\n- ')}`);
  }
}
