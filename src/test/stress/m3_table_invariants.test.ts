import { describe, it, expect } from 'vitest';
import { buildTableQuestionQueue } from '../../features/tables/logic/tableQuestionBuilder';

describe('Milestone 3 Table Invariants: 5,000-Question Stress Suite', () => {
  it('passes 5,000 table questions with 100% mathematical correctness, balanced quotas, anti-clustering, and last-digit masking', () => {
    const selectedTables = [7, 11, 17, 23, 43];
    const multiplierRange = { min: 1, max: 20 };
    const totalQuestions = 5000;

    const startTime = performance.now();
    const questions = buildTableQuestionQueue({
      selectedTables,
      multiplierRange,
      questionCount: totalQuestions,
      difficulty: 'normal',
    });
    const durationMs = performance.now() - startTime;

    console.log(`[5,000 Table Questions Generated in ${durationMs.toFixed(2)} ms]`);
    expect(questions).toHaveLength(totalQuestions);

    const tableCounts: Record<number, number> = {};
    const correctIndexCounts = [0, 0, 0, 0];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // 1. Mathematical Invariant
      expect(q.operandA * q.operandB).toBe(q.answer);
      expect(q.table * q.multiplier).toBe(q.answer);
      expect(q.answerStr).toBe(String(q.answer));
      expect(q.operator).toBe('*');

      // Table representation tracking
      tableCounts[q.table] = (tableCounts[q.table] || 0) + 1;

      // 2. Anti-Clustering Invariant: adjacent questions MUST NOT share the same table
      if (i > 0) {
        expect(q.table).not.toBe(questions[i - 1].table);
      }

      // 3. Option Invariants
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options[q.correctIndex]).toBe(q.answer);
      correctIndexCounts[q.correctIndex]++;

      // 4. Anti-Trivial Last-Digit Masking Invariant
      const lastDigit = Math.abs(q.answer) % 10;
      const distractors = q.options.filter((opt) => opt !== q.answer);
      const sharesLastDigit = distractors.some((d) => Math.abs(d) % 10 === lastDigit);
      expect(sharesLastDigit).toBe(true);
    }

    // Balanced Quotas Verification
    // 5000 questions / 5 tables = exactly 1000 per table
    for (const t of selectedTables) {
      expect(tableCounts[t]).toBe(1000);
    }

    // Shuffling distribution: each index 0..3 should be represented reasonably
    for (let idx = 0; idx < 4; idx++) {
      expect(correctIndexCounts[idx]).toBeGreaterThan(1000);
      expect(correctIndexCounts[idx]).toBeLessThan(1500);
    }

    console.log('[Correct Index Distribution]:', correctIndexCounts);
    console.log('[Table Distribution]:', tableCounts);
  });
});
