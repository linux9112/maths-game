import { describe, it, expect } from 'vitest';
import { buildTableQuestionQueue } from '../../features/tables/logic/tableQuestionBuilder';
import { Mulberry32 } from '../../core/math/seedPrng';
import { DifficultyTier } from '../../core/math/types';

describe('Milestone 3 Challenger 1: Empirical Table Mastery & Question Invariant Stress Suite', () => {
  describe('1. Single Table Selection Invariant Stress Test', () => {
    it('generates 100 questions for each single table (1, 7, 12, 19, 43, 99, 100) without crashing or clustering deadlock', () => {
      const testTables = [1, 7, 12, 19, 43, 99, 100];
      const QUESTIONS_PER_TABLE = 100;

      for (const t of testTables) {
        const questions = buildTableQuestionQueue({
          selectedTables: [t],
          multiplierRange: { min: 1, max: 12 },
          questionCount: QUESTIONS_PER_TABLE,
          difficulty: 'normal',
        });

        expect(questions).toHaveLength(QUESTIONS_PER_TABLE);

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          // All questions must belong strictly to table t
          expect(q.table).toBe(t);
          expect(q.multiplier).toBeGreaterThanOrEqual(1);
          expect(q.multiplier).toBeLessThanOrEqual(12);

          // Mathematical correctness
          expect(q.table * q.multiplier).toBe(q.answer);
          expect(q.operandA * q.operandB).toBe(q.answer);
          expect(q.answerStr).toBe(String(q.answer));
          expect(q.operator).toBe('*');

          // Distractor invariants
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.options[q.correctIndex]).toBe(q.answer);

          // Last-digit masking invariant: |{ c : c = ans mod 10 }| >= 2
          const ansLastDigit = Math.abs(q.answer) % 10;
          const matchingChoices = q.options.filter((c) => Math.abs(c) % 10 === ansLastDigit);
          expect(matchingChoices.length).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  describe('2. All 100 Tables Uniformity & Anti-Clustering Invariant (1,000 Questions)', () => {
    it('distributes 1,000 questions across all 100 tables with exactly 10 questions per table and zero adjacent duplicates', () => {
      const all100Tables = Array.from({ length: 100 }, (_, i) => i + 1);
      const TOTAL_QUESTIONS = 1000;

      const startTime = performance.now();
      const questions = buildTableQuestionQueue({
        selectedTables: all100Tables,
        multiplierRange: { min: 1, max: 20 },
        questionCount: TOTAL_QUESTIONS,
        difficulty: 'normal',
      });
      const elapsedMs = performance.now() - startTime;

      console.log(`[All 100 Tables: 1,000 Questions generated in ${elapsedMs.toFixed(2)} ms]`);
      expect(questions).toHaveLength(TOTAL_QUESTIONS);

      const tableFrequencies: Record<number, number> = {};
      let adjacentCollisions = 0;
      let lastDigitViolations = 0;
      let mathViolations = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Track quota
        tableFrequencies[q.table] = (tableFrequencies[q.table] || 0) + 1;

        // Verify mathematical invariant
        if (q.operandA * q.operandB !== q.answer || q.table * q.multiplier !== q.answer) {
          mathViolations++;
        }

        // Anti-clustering invariant: no two consecutive questions share the same table
        if (i > 0 && q.table === questions[i - 1].table) {
          adjacentCollisions++;
        }

        // Distractor invariant: 4 distinct choices, correctIndex matches answer
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options[q.correctIndex]).toBe(q.answer);

        // Last digit masking: |{ c : c = ans mod 10 }| >= 2
        const lastDigit = Math.abs(q.answer) % 10;
        const matchingChoices = q.options.filter((c) => Math.abs(c) % 10 === lastDigit);
        if (matchingChoices.length < 2) {
          lastDigitViolations++;
        }
      }

      // Mathematical and invariant assertions
      expect(mathViolations).toBe(0);
      expect(adjacentCollisions).toBe(0);
      expect(lastDigitViolations).toBe(0);

      // Uniformity check: every single table from 1 to 100 MUST have exactly 10 questions
      for (let t = 1; t <= 100; t++) {
        expect(tableFrequencies[t]).toBe(10);
      }
    });
  });

  describe('3. Arbitrary Ranges & Multi-Select Subsets', () => {
    it('handles Range 1–43 (43 tables) with 430 questions allocating exactly 10 per table with zero adjacent duplicates', () => {
      const tables1To43 = Array.from({ length: 43 }, (_, i) => i + 1);
      const TOTAL_QUESTIONS = 430;

      const questions = buildTableQuestionQueue({
        selectedTables: tables1To43,
        multiplierRange: { min: 1, max: 12 },
        questionCount: TOTAL_QUESTIONS,
      });

      expect(questions).toHaveLength(TOTAL_QUESTIONS);
      const counts: Record<number, number> = {};

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        counts[q.table] = (counts[q.table] || 0) + 1;
        if (i > 0) {
          expect(q.table).not.toBe(questions[i - 1].table);
        }
      }

      for (let t = 1; t <= 43; t++) {
        expect(counts[t]).toBe(10);
      }
    });

    it('handles Non-Contiguous Multi-Select [7, 11, 17, 23, 43] with divisible and non-divisible question counts', () => {
      const selected = [7, 11, 17, 23, 43];

      // Divisible: 500 questions -> exactly 100 per table
      const questions500 = buildTableQuestionQueue({
        selectedTables: selected,
        multiplierRange: { min: 1, max: 15 },
        questionCount: 500,
      });
      expect(questions500).toHaveLength(500);

      const counts500: Record<number, number> = {};
      for (let i = 0; i < questions500.length; i++) {
        const q = questions500[i];
        counts500[q.table] = (counts500[q.table] || 0) + 1;
        if (i > 0) {
          expect(q.table).not.toBe(questions500[i - 1].table);
        }
      }
      for (const t of selected) {
        expect(counts500[t]).toBe(100);
      }

      // Non-divisible: 103 questions -> 3 tables get 21, 2 tables get 20 (max - min <= 1)
      const questions103 = buildTableQuestionQueue({
        selectedTables: selected,
        multiplierRange: { min: 1, max: 15 },
        questionCount: 103,
      });
      expect(questions103).toHaveLength(103);

      const counts103: Record<number, number> = {};
      for (let i = 0; i < questions103.length; i++) {
        const q = questions103[i];
        counts103[q.table] = (counts103[q.table] || 0) + 1;
        if (i > 0) {
          expect(q.table).not.toBe(questions103[i - 1].table);
        }
      }

      const countsArray = selected.map((t) => counts103[t] || 0);
      const minCount = Math.min(...countsArray);
      const maxCount = Math.max(...countsArray);
      expect(maxCount - minCount).toBeLessThanOrEqual(1);
      expect(minCount).toBe(20);
      expect(maxCount).toBe(21);
    });

    it('handles Minimal Multi-Select (2 tables [12, 89]) with strict alternation and zero collisions', () => {
      const selected = [12, 89];
      const questions = buildTableQuestionQueue({
        selectedTables: selected,
        multiplierRange: { min: 1, max: 10 },
        questionCount: 60,
      });

      expect(questions).toHaveLength(60);
      const counts: Record<number, number> = {};

      for (let i = 0; i < questions.length; i++) {
        counts[questions[i].table] = (counts[questions[i].table] || 0) + 1;
        if (i > 0) {
          expect(questions[i].table).not.toBe(questions[i - 1].table);
        }
      }

      expect(counts[12]).toBe(30);
      expect(counts[89]).toBe(30);
    });
  });

  describe('4. High-Volume Anti-Clustering Stress Test (10,000 Questions)', () => {
    it('verifies 10,000 questions across 3, 7, and 25 tables never produce adjacent table duplicates', () => {
      const configs = [
        { tables: [3, 7, 19], count: 3000 },
        { tables: [2, 3, 5, 7, 11, 13, 17], count: 3500 },
        { tables: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97], count: 5000 },
      ];

      for (const config of configs) {
        const questions = buildTableQuestionQueue({
          selectedTables: config.tables,
          multiplierRange: { min: 1, max: 20 },
          questionCount: config.count,
        });

        expect(questions).toHaveLength(config.count);
        let adjacentDuplicates = 0;

        for (let i = 1; i < questions.length; i++) {
          if (questions[i].table === questions[i - 1].table) {
            adjacentDuplicates++;
          }
        }

        expect(adjacentDuplicates).toBe(0);
      }
    });
  });

  describe('5. Distractor Invariant & Last-Digit Masking Verification Across All Tiers', () => {
    it('generates 5,000 questions verifying 4 unique options, correct answer presence, and last-digit masking (|{c: c = ans mod 10}| >= 2)', () => {
      const TOTAL_QUESTIONS = 5000;
      const difficulties: DifficultyTier[] = ['easy', 'normal', 'hard', 'expert'];
      const testTables = [1, 2, 5, 7, 10, 11, 25, 43, 50, 99, 100];

      let totalChecked = 0;
      let incorrectCount = 0;
      let nonUniqueCount = 0;
      let missingAnswerCount = 0;
      let lastDigitViolations = 0;
      let nonPositiveCount = 0;

      for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        totalChecked++;
        const difficulty = difficulties[i % difficulties.length];
        const table = testTables[i % testTables.length];

        const questions = buildTableQuestionQueue({
          selectedTables: [table],
          multiplierRange: { min: 1, max: 20 },
          questionCount: 1,
          difficulty,
        });

        const q = questions[0];

        // 1. Option count
        if (q.options.length !== 4) {
          incorrectCount++;
        }

        // 2. Strict uniqueness
        if (new Set(q.options).size !== 4) {
          nonUniqueCount++;
        }

        // 3. Correct answer included at correctIndex
        if (q.options[q.correctIndex] !== q.answer) {
          missingAnswerCount++;
        }

        // 4. Strictly positive integers
        if (!q.options.every((opt) => opt > 0 && Number.isInteger(opt))) {
          nonPositiveCount++;
        }

        // 5. Last-digit masking: at least 2 choices must share answer's last digit
        const lastDigit = Math.abs(q.answer) % 10;
        const matchingChoices = q.options.filter((c) => Math.abs(c) % 10 === lastDigit);
        if (matchingChoices.length < 2) {
          lastDigitViolations++;
        }
      }

      expect(totalChecked).toBe(TOTAL_QUESTIONS);
      expect(incorrectCount).toBe(0);
      expect(nonUniqueCount).toBe(0);
      expect(missingAnswerCount).toBe(0);
      expect(nonPositiveCount).toBe(0);
      expect(lastDigitViolations).toBe(0);
    });
  });

  describe('6. Boundary, Corner & Adversarial Inputs', () => {
    it('handles questionCount === 1 cleanly with 1 table, 5 tables, and 100 tables', () => {
      // 1 table, 1 question
      const q1 = buildTableQuestionQueue({
        selectedTables: [7],
        multiplierRange: { min: 1, max: 10 },
        questionCount: 1,
      });
      expect(q1).toHaveLength(1);
      expect(q1[0].table).toBe(7);

      // 5 tables, 1 question
      const q5 = buildTableQuestionQueue({
        selectedTables: [7, 11, 13, 17, 19],
        multiplierRange: { min: 1, max: 10 },
        questionCount: 1,
      });
      expect(q5).toHaveLength(1);
      expect([7, 11, 13, 17, 19]).toContain(q5[0].table);

      // 100 tables, 1 question
      const q100 = buildTableQuestionQueue({
        selectedTables: Array.from({ length: 100 }, (_, i) => i + 1),
        multiplierRange: { min: 1, max: 10 },
        questionCount: 1,
      });
      expect(q100).toHaveLength(1);
      expect(q100[0].table).toBeGreaterThanOrEqual(1);
      expect(q100[0].table).toBeLessThanOrEqual(100);
    });

    it('sanitizes empty selectedTables fallback to table 1 without error', () => {
      const q = buildTableQuestionQueue({
        selectedTables: [],
        multiplierRange: { min: 1, max: 10 },
        questionCount: 5,
      });
      expect(q).toHaveLength(5);
      for (const item of q) {
        expect(item.table).toBe(1);
      }
    });

    it('clamps out-of-bounds tables (-10, 0, 150, 999) safely into [1, 100]', () => {
      const q = buildTableQuestionQueue({
        selectedTables: [-10, 0, 150, 999],
        multiplierRange: { min: 1, max: 5 },
        questionCount: 20,
      });
      expect(q).toHaveLength(20);
      for (const item of q) {
        expect(item.table).toBeGreaterThanOrEqual(1);
        expect(item.table).toBeLessThanOrEqual(100);
      }
    });

    it('sanitizes inverted multiplierRange { min: 20, max: 2 } gracefully', () => {
      const q = buildTableQuestionQueue({
        selectedTables: [7],
        multiplierRange: { min: 20, max: 2 },
        questionCount: 10,
      });
      expect(q).toHaveLength(10);
      for (const item of q) {
        expect(item.multiplier).toBeGreaterThanOrEqual(2);
        expect(item.multiplier).toBeLessThanOrEqual(20);
      }
    });

    it('supports allowCommutativeSwap: true producing both A × B and B × A prompts', () => {
      const questions = buildTableQuestionQueue({
        selectedTables: [7],
        multiplierRange: { min: 2, max: 2 },
        questionCount: 50,
        allowCommutativeSwap: true,
      });

      expect(questions).toHaveLength(50);
      const prompts = questions.map((q) => q.promptText);
      const hasStandard = prompts.some((p) => p === '7 × 2 = ?');
      const hasSwapped = prompts.some((p) => p === '2 × 7 = ?');
      expect(hasStandard).toBe(true);
      expect(hasSwapped).toBe(true);
    });
  });

  describe('7. PRNG Determinism & Correct Option Uniformity', () => {
    it('produces uniform distribution of correct answer index across 0, 1, 2, 3 (Chi-Square test)', () => {
      const TOTAL_RUNS = 8000;
      const prng = new Mulberry32(987654);

      const questions = buildTableQuestionQueue({
        selectedTables: [6, 7, 8, 9],
        multiplierRange: { min: 1, max: 12 },
        questionCount: TOTAL_RUNS,
        prng,
      });

      expect(questions).toHaveLength(TOTAL_RUNS);

      const indexCounts = [0, 0, 0, 0];
      for (const q of questions) {
        indexCounts[q.correctIndex]++;
      }

      console.log('[Table Option Uniformity across 8000 questions]:', indexCounts);

      // Expected count per option = 2000
      const expected = TOTAL_RUNS / 4;
      let chiSquare = 0;
      for (let i = 0; i < 4; i++) {
        const diff = indexCounts[i] - expected;
        chiSquare += (diff * diff) / expected;
      }

      console.log(`[Chi-Square Statistic]: ${chiSquare.toFixed(4)} (df=3, alpha=0.001 critical is 16.27)`);
      expect(chiSquare).toBeLessThan(16.27);
    });
  });
});
