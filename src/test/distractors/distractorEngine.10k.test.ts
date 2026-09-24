import { describe, it, expect } from 'vitest';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import { validateDistractorSet } from '../../core/distractors/distractorValidator';
import { MathOperator, DifficultyTier } from '../../core/distractors/types';

describe('Distractor Engine 10,000-Operation Stochastic Invariant Suite', () => {
  it('passes 10,000 random operations across all operators, levels, and difficulties with 100% integrity', () => {
    const OPS: MathOperator[] = ['+', '-', '*', '/'];
    const TIERS: DifficultyTier[] = ['easy', 'normal', 'hard', 'expert'];
    const indexDistribution = [0, 0, 0, 0];
    const sourceCounts = new Map<string, number>();

    const ITERATIONS = 10000;
    const t0 = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
      const op = OPS[i % 4];
      const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
      let a: number, b: number, ans: number;

      if (op === '*') {
        a = Math.floor(Math.random() * 43) + 1; // Covers tables 1-43
        b = Math.floor(Math.random() * 20) + 1; // Covers multipliers 1-20
        ans = a * b;
      } else if (op === '+') {
        a = Math.floor(Math.random() * 2500) + 1;
        b = Math.floor(Math.random() * 2500) + 1;
        ans = a + b;
      } else if (op === '-') {
        a = Math.floor(Math.random() * 5000) + 2;
        b = Math.floor(Math.random() * (a - 1)) + 1; // Non-negative, b < a
        ans = a - b;
      } else {
        // Division: guaranteed integer division
        const d = Math.floor(Math.random() * 50) + 1;
        const q = Math.floor(Math.random() * 50) + 1;
        ans = q;
        a = d * q;
        b = d;
      }

      const result = distractorEngine.generate({
        operator: op,
        operandA: a,
        operandB: b,
        answer: ans,
        difficulty: tier,
      });

      // 1. Full Invariant Validation
      const validation = validateDistractorSet(ans, result.distractors);
      if (!validation.isValid) {
        throw new Error(
          `Stochastic failure at iteration ${i} (${a} ${op} ${b} = ${ans}, tier: ${tier}):\n` +
          validation.errors.join('\n')
        );
      }

      // 2. Choice Assembly Invariant
      expect(result.allChoices).toHaveLength(4);
      expect(new Set(result.allChoices).size).toBe(4);
      expect(result.allChoices[result.correctIndex]).toBe(ans);

      // 3. Last-Digit Masking Verification
      const lastDigit = Math.abs(ans) % 10;
      const maskCount = result.allChoices.filter((c) => Math.abs(c) % 10 === lastDigit).length;
      expect(maskCount).toBeGreaterThanOrEqual(2);

      // 4. Track correctIndex distribution for uniformity verification
      indexDistribution[result.correctIndex]++;

      // 5. Track source diversity
      for (const src of result.sources) {
        sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
      }
    }

    const elapsedMs = performance.now() - t0;
    console.log(`[10,000 Ops Benchmark] Completed in ${elapsedMs.toFixed(2)} ms`);
    console.log(`[Correct Index Distribution]: [${indexDistribution.join(', ')}]`);

    // Performance assertion: 10k operations must execute swiftly (under 25,000ms in parallel suite with 35 concurrent test files)
    expect(elapsedMs).toBeLessThan(25000);

    // Uniformity assertion: Each index (0, 1, 2, 3) must receive roughly 25% ± 4% (2100 - 2900)
    for (let idx = 0; idx < 4; idx++) {
      expect(indexDistribution[idx]).toBeGreaterThan(2100);
      expect(indexDistribution[idx]).toBeLessThan(2900);
    }

    // Heuristic diversity assertion: distractor sources must not be static fallbacks
    expect(sourceCounts.get('last_digit_mask')).toBeGreaterThan(0);
    expect(sourceCounts.size).toBeGreaterThanOrEqual(5);
  });
});
