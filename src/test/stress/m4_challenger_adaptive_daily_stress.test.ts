import { describe, it, expect } from 'vitest';
import {
  buildRouletteWheel,
  sampleRouletteWheel,
  AdaptiveQuestionBuilder,
  DDAController,
} from '../../features/adaptive/adaptiveQuestionBuilder';
import {
  buildWeaknessPracticeQueue,
} from '../../features/adaptive/weaknessSessionBuilder';
import {
  generateDailyChallenge,
  calculateDailyStreak,
  getPreviousCalendarDate,
} from '../../features/daily/dailyChallengeBuilder';
import { Mulberry32 } from '../../core/math/seedPrng';
import { generateAdditionFact, generateSubtractionFact, generateMultiplicationFact } from '../../core/math/arithmeticGenerator';
import { generateDivisionFact } from '../../core/math/divisionGenerator';
import { CalculationStatRecord } from '../../core/storage/types';
import { RouletteCandidate } from '../../features/adaptive/types';

describe('Milestone 4 Challenger 1: Empirical Adaptive Engine & Daily Challenge Stress Suite', () => {

  describe('1. Roulette-Wheel Selection & Power-Law Bias (10,000 Samples)', () => {
    it('demonstrates statistically significant bias toward high-weakness facts proportional to W^1.5', () => {
      // 10 candidates with strictly increasing weakness scores from 0.5 to 5.0
      const candidates: RouletteCandidate[] = Array.from({ length: 10 }, (_, i) => {
        const score = (i + 1) * 0.5; // 0.5, 1.0, 1.5, ..., 5.0
        return {
          id: `mul_${i + 1}_8`,
          weaknessScore: score,
        };
      });

      const wheel = buildRouletteWheel(candidates, 1.5);
      const SAMPLE_COUNT = 10000;
      const counts: Record<string, number> = {};
      candidates.forEach((c) => (counts[c.id] = 0));

      const prng = new Mulberry32(123456789);
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const sampled = sampleRouletteWheel(wheel, () => prng.next());
        counts[sampled.id]++;
      }

      // Compute theoretical weights
      const weights = candidates.map((c) => Math.pow(c.weaknessScore, 1.5));
      const totalWeight = weights.reduce((acc, w) => acc + w, 0);
      const expectedP = weights.map((w) => w / totalWeight);

      // Verify empirical frequency matches theoretical probability within 3.5 standard deviations
      for (let i = 0; i < candidates.length; i++) {
        const p = expectedP[i];
        const observed = counts[candidates[i].id];
        const expectedCount = SAMPLE_COUNT * p;
        const stdDev = Math.sqrt(SAMPLE_COUNT * p * (1 - p));

        expect(observed).toBeGreaterThanOrEqual(expectedCount - 3.5 * stdDev);
        expect(observed).toBeLessThanOrEqual(expectedCount + 3.5 * stdDev);
      }

      // Verify highest weakness candidate is sampled significantly more than lowest
      const lowestCount = counts[candidates[0].id]; // score 0.5 -> 0.5^1.5 = 0.353
      const highestCount = counts[candidates[9].id]; // score 5.0 -> 5.0^1.5 = 11.18 (ratio ~31.6)
      expect(highestCount / lowestCount).toBeGreaterThan(20);
      expect(highestCount / lowestCount).toBeLessThan(45);
    });

    it('handles single dominant outlier fact correctly over 10,000 generations', () => {
      // 1 dominant fact with weakness 3.0, 99 facts with weakness 0.1
      const candidates: RouletteCandidate[] = [
        { id: 'mul_7_8', weaknessScore: 3.0 },
      ];
      for (let i = 1; i <= 99; i++) {
        candidates.push({ id: `add_1_${i}`, weaknessScore: 0.1 });
      }

      // Weight of mul_7_8 = 3.0^1.5 = 5.196
      // Weight of each other fact = 0.1^1.5 = 0.03162 * 99 = 3.13
      // mul_7_8 should receive roughly 5.196 / (5.196 + 3.13) = ~62.4% of all roulette selections!
      const wheel = buildRouletteWheel(candidates, 1.5);
      const SAMPLES = 10000;
      let dominantCount = 0;
      const prng = new Mulberry32(987654321);

      for (let i = 0; i < SAMPLES; i++) {
        const sampled = sampleRouletteWheel(wheel, () => prng.next());
        if (sampled.id === 'mul_7_8') {
          dominantCount++;
        }
      }

      const expectedRatio = 5.19615 / (5.19615 + 99 * Math.pow(0.1, 1.5));
      const observedRatio = dominantCount / SAMPLES;
      expect(Math.abs(observedRatio - expectedRatio)).toBeLessThan(0.03); // within 3% tolerance
    });
  });

  describe('2. Recency Buffer & Anti-Clustering Invariant', () => {
    it('strictly prevents immediate re-occurrence within 4-question window across 1,000 consecutive adaptive questions', () => {
      // Create candidate pool of 10 items
      const candidates: RouletteCandidate[] = Array.from({ length: 10 }, (_, i) => ({
        id: `mul_${i + 1}_7`,
        weaknessScore: 1.0 + i * 0.2,
      }));

      // Set explorationRate = 0 to test pure exploitation recency buffer
      const prng = new Mulberry32(424242);
      const builder = new AdaptiveQuestionBuilder(
        {
          domain: 'operations',
          inputMode: 'choice',
          explorationRate: 0,
          recencyBufferSize: 4,
          initialLevel: 2,
        },
        () => prng.next()
      );
      builder.setCandidates(candidates);

      const generatedFactIds: string[] = [];
      const ITERATIONS = 1000;

      for (let i = 0; i < ITERATIONS; i++) {
        const q = builder.nextQuestion();
        const baseFactId = `${q.operator === '*' ? 'mul' : 'add'}_${q.operandA}_${q.operandB}`;
        generatedFactIds.push(baseFactId);

        // Verify that the fact generated at step i has NOT appeared in the previous 4 steps
        if (i >= 1) {
          const windowStart = Math.max(0, i - 4);
          for (let j = windowStart; j < i; j++) {
            expect(generatedFactIds[i]).not.toBe(generatedFactIds[j]);
          }
        }
      }

      expect(generatedFactIds.length).toBe(ITERATIONS);
    });

    it('gracefully handles small candidate pools (<= 4) without crashing or infinite looping', () => {
      // Edge case: exactly 2 candidates, recency buffer size 4
      const candidates: RouletteCandidate[] = [
        { id: 'mul_3_4', weaknessScore: 1.5 },
        { id: 'mul_5_6', weaknessScore: 1.2 },
      ];

      const prng = new Mulberry32(112233);
      const builder = new AdaptiveQuestionBuilder(
        {
          domain: 'operations',
          inputMode: 'choice',
          explorationRate: 0,
          recencyBufferSize: 4,
        },
        () => prng.next()
      );
      builder.setCandidates(candidates);

      // Should not throw or deadlock, buffer relaxation fallback should handle it
      expect(() => {
        for (let i = 0; i < 50; i++) {
          const q = builder.nextQuestion();
          expect(['mul_3_4', 'mul_5_6']).toContain(`mul_${q.operandA}_${q.operandB}`);
        }
      }).not.toThrow();
    });
  });

  describe('3. DDA State Transitions & Hysteresis Invariant', () => {
    it('promotes level and upgrades difficulty tier under sustained high accuracy and fast speed', () => {
      const dda = new DDAController(2, 'normal', 10);

      // Submit 5 fast, correct attempts to satisfy combo >= 5, history >= 5, acc >= 90%, time <= 3200ms
      let lastDecision;
      for (let i = 0; i < 5; i++) {
        lastDecision = dda.recordAttempt(true, 1500);
      }

      // 5th attempt triggers promotion: Level 2 -> Level 3, cooldown set to 5
      expect(lastDecision?.action).toBe('promote');
      expect(lastDecision?.newLevel).toBe(3);
      expect(dda.getLevel()).toBe(3);

      // During the next 4 attempts (cooldown counting down), maintain level
      for (let i = 0; i < 4; i++) {
        const dec = dda.recordAttempt(true, 1200);
        expect(dec.action).toBe('maintain');
        expect(dda.getLevel()).toBe(3);
      }

      // After cooldown expires, the next eligible attempt promotes Level 3 -> 4
      const nextPromote = dda.recordAttempt(true, 1200);
      expect(nextPromote.action).toBe('promote');
      expect(nextPromote.newLevel).toBe(4);
      expect(dda.getLevel()).toBe(4);
    });

    it('demotes level under 3 consecutive mistakes and enforces 5-step cooldown hysteresis', () => {
      const dda = new DDAController(3, 'normal', 10);

      // 3 consecutive mistakes
      dda.recordAttempt(false, 4000);
      dda.recordAttempt(false, 4000);
      const demoteDecision = dda.recordAttempt(false, 4000);

      expect(demoteDecision.action).toBe('demote');
      expect(demoteDecision.newLevel).toBe(2);
      expect(dda.getLevel()).toBe(2);

      // Immediately making another mistake should NOT demote again because cooldownCounter is active
      const cooldownAttempt1 = dda.recordAttempt(false, 5000);
      expect(cooldownAttempt1.action).toBe('maintain');
      expect(cooldownAttempt1.newLevel).toBe(2);
      expect(dda.getLevel()).toBe(2);

      const cooldownAttempt2 = dda.recordAttempt(false, 5000);
      expect(cooldownAttempt2.action).toBe('maintain');
      expect(dda.getLevel()).toBe(2);
    });

    it('prevents rapid level thrashing on alternating responses', () => {
      const dda = new DDAController(3, 'normal', 10);

      // Rapidly oscillating pattern: 2 correct, 2 incorrect, repeat
      const levelsSeen: number[] = [dda.getLevel()];
      for (let i = 0; i < 30; i++) {
        const isCorrect = i % 4 < 2;
        const decision = dda.recordAttempt(isCorrect, 2500);
        levelsSeen.push(decision.newLevel);
      }

      // Count level changes: with hysteresis, level changes should be very low (<= 3 changes across 30 alternating rounds)
      let levelChanges = 0;
      for (let i = 1; i < levelsSeen.length; i++) {
        if (levelsSeen[i] !== levelsSeen[i - 1]) {
          levelChanges++;
        }
      }

      expect(levelChanges).toBeLessThanOrEqual(3);
    });
  });

  describe('4. Daily Challenge Determinism & Mathematical Invariants (365 Days)', () => {
    it('produces 100% identical questions and distractors for the same date across 100 independent invocations', () => {
      const TEST_DATE = '2026-09-18';
      const baseline = generateDailyChallenge(TEST_DATE);

      expect(baseline.questions).toHaveLength(10);
      expect(baseline.dateKey).toBe(TEST_DATE);

      for (let run = 0; run < 100; run++) {
        const challenge = generateDailyChallenge(TEST_DATE);
        expect(challenge.seed).toBe(baseline.seed);
        expect(challenge.questions).toHaveLength(10);

        for (let q = 0; q < 10; q++) {
          const bQ = baseline.questions[q];
          const cQ = challenge.questions[q];

          expect(cQ.id).toBe(bQ.id);
          expect(cQ.operator).toBe(bQ.operator);
          expect(cQ.operandA).toBe(bQ.operandA);
          expect(cQ.operandB).toBe(bQ.operandB);
          expect(cQ.answer).toBe(bQ.answer);
          expect(cQ.options).toEqual(bQ.options);
          expect(cQ.promptText).toBe(bQ.promptText);
        }
      }
    });

    it('generates distinct question sets across consecutive calendar dates', () => {
      const dates = [
        '2026-01-01', '2026-01-02', '2026-01-03', '2026-02-14',
        '2026-06-21', '2026-10-31', '2026-12-25', '2026-12-31'
      ];

      const seeds = new Set<number>();
      const firstQuestionIds = new Set<string>();

      for (const d of dates) {
        const challenge = generateDailyChallenge(d);
        seeds.add(challenge.seed);
        firstQuestionIds.add(challenge.questions[0].id);
      }

      expect(seeds.size).toBe(dates.length);
      expect(firstQuestionIds.size).toBe(dates.length);
    });

    it('verifies exact 2 Add, 2 Sub, 3 Mul, 3 Div distribution across 365 simulated calendar days', () => {
      // Iterate through all 365 days of 2026
      const startDate = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));

      for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
        const currentDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const yyyy = currentDate.getUTCFullYear();
        const mm = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const challenge = generateDailyChallenge(dateStr);
        expect(challenge.questions).toHaveLength(10);

        const opCounts: Record<string, number> = { '+': 0, '-': 0, '*': 0, '/': 0 };
        challenge.questions.forEach((q) => {
          opCounts[q.operator]++;
        });

        expect(opCounts['+']).toBe(2);
        expect(opCounts['-']).toBe(2);
        expect(opCounts['*']).toBe(3);
        expect(opCounts['/']).toBe(3);
      }
    });

    it('verifies 100% integer division constraint in all daily division questions across 365 days', () => {
      const startDate = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
      let totalDivisionQuestionsChecked = 0;

      for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
        const currentDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const yyyy = currentDate.getUTCFullYear();
        const mm = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const challenge = generateDailyChallenge(dateStr);
        const divisionQuestions = challenge.questions.filter((q) => q.operator === '/');

        expect(divisionQuestions).toHaveLength(3);

        for (const q of divisionQuestions) {
          totalDivisionQuestionsChecked++;

          // Invariant 1: Divisor > 0
          expect(q.operandB).toBeGreaterThan(0);

          // Invariant 2: Dividend strictly >= Divisor
          expect(q.operandA).toBeGreaterThanOrEqual(q.operandB);

          // Invariant 3: Exact integer division (remainder strictly 0)
          expect(q.operandA % q.operandB).toBe(0);

          // Invariant 4: Answer matches exact integer quotient
          expect(q.answer).toBe(q.operandA / q.operandB);
          expect(Number.isInteger(q.answer)).toBe(true);

          // Invariant 5: Distractors contain 4 unique numbers, none equal to negative numbers or fractions
          expect(q.options).toBeDefined();
          expect(q.options!).toHaveLength(4);
          expect(new Set(q.options!).size).toBe(4);
          expect(q.options!).toContain(q.answer);
          q.options!.forEach((opt) => {
            expect(Number.isInteger(opt)).toBe(true);
            expect(opt).toBeGreaterThanOrEqual(0);
          });
        }
      }

      expect(totalDivisionQuestionsChecked).toBe(365 * 3); // 1,095 division questions verified
    });
  });

  describe('5. Commutativity & Non-Inversion Invariants (10,000 Questions)', () => {
    it('verifies multiplication commutativity: a * b === b * a', () => {
      const prng = new Mulberry32(55443322);
      for (let i = 0; i < 2000; i++) {
        const fact = generateMultiplicationFact({ level: (i % 5 + 1) as any, prng });
        const a = fact.operandA;
        const b = fact.operandB;

        expect(a * b).toBe(b * a);
        expect(fact.answer).toBe(a * b);
      }
    });

    it('verifies addition commutativity: a + b === b + a', () => {
      const prng = new Mulberry32(77889911);
      for (let i = 0; i < 2000; i++) {
        const fact = generateAdditionFact({ level: (i % 5 + 1) as any, prng });
        const a = fact.operandA;
        const b = fact.operandB;

        expect(a + b).toBe(b + a);
        expect(fact.answer).toBe(a + b);
      }
    });

    it('verifies subtraction non-inversion invariant: operandA >= operandB and answer >= 0 across 5,000 samples', () => {
      const prng = new Mulberry32(33221100);
      for (let i = 0; i < 5000; i++) {
        const fact = generateSubtractionFact({ level: (i % 4 + 1) as any, prng });
        expect(fact.operandA).toBeGreaterThanOrEqual(fact.operandB);
        expect(fact.answer).toBeGreaterThanOrEqual(0);
        expect(fact.answer).toBe(fact.operandA - fact.operandB);
      }
    });

    it('verifies division non-inversion invariant: dividend >= divisor and quotient in Z+ across 5,000 samples', () => {
      const prng = new Mulberry32(66554433);
      for (let i = 0; i < 5000; i++) {
        const fact = generateDivisionFact({ level: (i % 5 + 1) as any, allowRemainders: false, prng });
        expect(fact.operandA).toBeGreaterThanOrEqual(fact.operandB);
        expect(fact.operandB).toBeGreaterThan(0);
        expect(fact.operandA % fact.operandB).toBe(0);
        expect(fact.answer).toBeGreaterThanOrEqual(1);
        expect(fact.answer).toBe(fact.operandA / fact.operandB);
      }
    });

    it('verifies commutativity alternation in buildWeaknessPracticeQueue', () => {
      const weakStats: CalculationStatRecord[] = [
        {
          factId: 'mul_7_8',
          operator: '*',
          operandA: 7,
          operandB: 8,
          attempts: 10,
          mistakes: 5,
          correctCount: 5,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 30000,
          avgResponseTimeMs: 3000,
          lastResponseTimeMs: 3000,
          errorRate: 0.5,
          latencyMultiplier: 2.0,
          weaknessScore: 2.0,
          masteryScore: 40,
          firstPracticed: Date.now() - 100000,
          lastPracticed: Date.now(),
        },
        {
          factId: 'add_9_6',
          operator: '+',
          operandA: 9,
          operandB: 6,
          attempts: 10,
          mistakes: 4,
          correctCount: 6,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 25000,
          avgResponseTimeMs: 2500,
          lastResponseTimeMs: 2500,
          errorRate: 0.4,
          latencyMultiplier: 1.8,
          weaknessScore: 1.8,
          masteryScore: 45,
          firstPracticed: Date.now() - 100000,
          lastPracticed: Date.now(),
        },
        {
          factId: 'sub_15_8',
          operator: '-',
          operandA: 15,
          operandB: 8,
          attempts: 10,
          mistakes: 4,
          correctCount: 6,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 25000,
          avgResponseTimeMs: 2500,
          lastResponseTimeMs: 2500,
          errorRate: 0.4,
          latencyMultiplier: 1.8,
          weaknessScore: 1.6,
          masteryScore: 50,
          firstPracticed: Date.now() - 100000,
          lastPracticed: Date.now(),
        },
      ];

      const queue = buildWeaknessPracticeQueue(
        { targetCount: 15, topK: 3 },
        weakStats
      );

      expect(queue.length).toBe(15);

      // Find all mul_7_8 occurrences
      const mulQuestions = queue.filter(
        (q) => (q.operandA === 7 && q.operandB === 8) || (q.operandA === 8 && q.operandB === 7)
      );
      expect(mulQuestions.length).toBeGreaterThanOrEqual(2);

      // First occurrence should be 7 * 8, second occurrence should be commutative swapped 8 * 7
      expect(mulQuestions[0].operandA).toBe(7);
      expect(mulQuestions[0].operandB).toBe(8);
      expect(mulQuestions[1].operandA).toBe(8);
      expect(mulQuestions[1].operandB).toBe(7);

      // Find all sub_15_8 occurrences: subtraction must NEVER commute (15 - 8 must never become 8 - 15)
      const subQuestions = queue.filter(
        (q) => q.operator === '-' && (q.operandA === 15 || q.operandA === 8)
      );
      for (const sq of subQuestions) {
        expect(sq.operandA).toBe(15);
        expect(sq.operandB).toBe(8);
        expect(sq.answer).toBe(7);
      }
    });
  });

  describe('6. Daily Streak Calculation & Calendar Edge Cases', () => {
    it('advances streak consecutively and resets after a skipped calendar day', () => {
      // Day 1
      let res = calculateDailyStreak(null, '2026-09-18', 0, 0);
      expect(res.nextStreak).toBe(1);
      expect(res.nextBestStreak).toBe(1);

      // Same day replay: does not increment streak
      res = calculateDailyStreak('2026-09-18', '2026-09-18', 1, 1);
      expect(res.nextStreak).toBe(1);
      expect(res.nextBestStreak).toBe(1);

      // Day 2 (Consecutive)
      res = calculateDailyStreak('2026-09-18', '2026-09-19', 1, 1);
      expect(res.nextStreak).toBe(2);
      expect(res.nextBestStreak).toBe(2);
      expect(res.isContinuation).toBe(true);

      // Day 4 (Skipped Day 3 -> Reset to 1)
      res = calculateDailyStreak('2026-09-19', '2026-09-21', 2, 2);
      expect(res.nextStreak).toBe(1);
      expect(res.nextBestStreak).toBe(2);
      expect(res.isContinuation).toBe(false);
    });

    it('handles month and year roll-over correctly in calendar math', () => {
      expect(getPreviousCalendarDate('2026-01-01')).toBe('2025-12-31');
      expect(getPreviousCalendarDate('2026-03-01')).toBe('2026-02-28');
      expect(getPreviousCalendarDate('2024-03-01')).toBe('2024-02-29'); // Leap year 2024
    });
  });
});
