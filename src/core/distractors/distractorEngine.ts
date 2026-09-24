import {
  DistractorRequest,
  DistractorResult,
  IDistractorEngine,
  DistractorSource,
} from './types';
import {
  CandidatePoolBuilder,
  generateMultiplicationCandidates,
  generateAdditionCandidates,
  generateSubtractionCandidates,
  generateDivisionCandidates,
  generateLastDigitCandidates,
} from './candidateGenerators';
import { calculateMagnitudeBounds } from './distractorValidator';

export class DistractorEngine implements IDistractorEngine {
  public generate(request: DistractorRequest): DistractorResult {
    const {
      operator,
      operandA,
      operandB,
      answer,
      difficulty,
      count = 3,
      rng = Math.random,
    } = request;

    const { minBound, maxBound } = calculateMagnitudeBounds(answer);
    const lastDigit = Math.abs(answer) % 10;

    // 1. Build initial candidate pool
    const builder = new CandidatePoolBuilder(answer, minBound, maxBound);

    switch (operator) {
      case '*':
        generateMultiplicationCandidates(operandA, operandB, answer, builder);
        break;
      case '+':
        generateAdditionCandidates(operandA, operandB, answer, builder);
        break;
      case '-':
        generateSubtractionCandidates(operandA, operandB, answer, builder);
        break;
      case '/':
        generateDivisionCandidates(operandA, operandB, answer, builder);
        break;
    }

    // 2. Inject guaranteed last-digit candidates (answer ± 10k)
    generateLastDigitCandidates(answer, builder);

    const fullPool = builder.build();

    // 3. Filter candidates by difficulty tier clustering envelopes
    const maxDivergence =
      difficulty === 'expert' ? 0.20 :
      difficulty === 'hard'   ? 0.35 :
      difficulty === 'normal' ? 0.50 : 0.75;

    let tierCandidates = fullPool.filter((c) => c.relativeDistance <= maxDivergence);

    // If tier filter was too restrictive to provide sufficient choices, gracefully fall back to full pool
    if (tierCandidates.length < count) {
      tierCandidates = fullPool;
    }

    // 4. Anti-Trivial Last-Digit Mask Selection:
    // At least one distractor MUST share the last digit of the answer.
    const selectedValues: number[] = [];
    const selectedSources: DistractorSource[] = [];

    const sameLastDigitCandidates = tierCandidates.filter((c) => c.sharesLastDigit);

    if (sameLastDigitCandidates.length > 0) {
      // Pick closest / most plausible candidate sharing the last digit
      sameLastDigitCandidates.sort((x, y) => x.distance - y.distance);
      const chosenMask = sameLastDigitCandidates[0];
      selectedValues.push(chosenMask.value);
      selectedSources.push(chosenMask.source);
    } else {
      // Guaranteed fallback last-digit mask
      const fallbackMask = answer >= 17 ? answer - 10 : answer + 10;
      selectedValues.push(fallbackMask);
      selectedSources.push('last_digit_mask');
    }

    // On Hard/Expert, optionally select a second last-digit match if available
    if ((difficulty === 'hard' || difficulty === 'expert') && count >= 3) {
      const secondMask = sameLastDigitCandidates.find((c) => !selectedValues.includes(c.value));
      if (secondMask && secondMask.relativeDistance <= maxDivergence) {
        selectedValues.push(secondMask.value);
        selectedSources.push(secondMask.source);
      }
    }

    // 5. Select remaining distractors to reach `count`
    // Sort remaining candidates by distance to answer (plausibility)
    const remaining = tierCandidates.filter((c) => !selectedValues.includes(c.value));
    remaining.sort((x, y) => x.distance - y.distance);

    for (const c of remaining) {
      if (selectedValues.length >= count) break;
      selectedValues.push(c.value);
      selectedSources.push(c.source);
    }

    // 6. Fallback safety net: if pool is exhausted (e.g. tiny answers or pathological inputs)
    let offset = 1;
    while (selectedValues.length < count) {
      const cand = answer + offset;
      if (
        cand > 0 &&
        cand !== answer &&
        cand >= minBound &&
        cand <= maxBound &&
        !selectedValues.includes(cand)
      ) {
        selectedValues.push(cand);
        selectedSources.push('magnitude_fallback');
      }
      offset = offset > 0 ? -offset : -offset + 1;
    }

    // Final safety check: ensure the last-digit invariant is strictly satisfied
    const hasSameLastDigit = selectedValues.some((d) => Math.abs(d) % 10 === lastDigit);
    if (!hasSameLastDigit) {
      const guaranteedMask = answer >= 17 ? answer - 10 : answer + 10;
      selectedValues[0] = guaranteedMask;
      selectedSources[0] = 'last_digit_mask';
    }

    // 7. Assemble and Shuffle choices via Fisher-Yates
    const allChoices = [answer, ...selectedValues.slice(0, count)];
    for (let i = allChoices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = allChoices[i];
      allChoices[i] = allChoices[j];
      allChoices[j] = temp;
    }

    const correctIndex = allChoices.indexOf(answer);

    return {
      correctAnswer: answer,
      distractors: selectedValues.slice(0, count),
      allChoices,
      correctIndex,
      sources: selectedSources.slice(0, count),
    };
  }
}

export const distractorEngine: IDistractorEngine = new DistractorEngine();
