import { describe, it, expect } from 'vitest';
import { buildTableQuestionQueue } from '../../features/tables/logic/tableQuestionBuilder';
import { Mulberry32 } from '../../core/math/seedPrng';

describe('Table Question Builder Suite', () => {
  describe('Mathematical Correctness & Fact Integrity', () => {
    it('strictly guarantees operandA * operandB === answer across custom ranges', () => {
      const questions = buildTableQuestionQueue({
        selectedTables: [1, 7, 12, 23, 43, 89, 100],
        multiplierRange: { min: 1, max: 20 },
        questionCount: 140,
        difficulty: 'normal',
      });

      expect(questions).toHaveLength(140);
      for (const q of questions) {
        expect(q.operandA * q.operandB).toBe(q.answer);
        expect(q.table * q.multiplier).toBe(q.answer);
        expect(q.answerStr).toBe(String(q.answer));
        expect(q.operator).toBe('*');
      }
    });

    it('handles boundary facts (1 × 1 and 100 × 100) correctly', () => {
      const q1 = buildTableQuestionQueue({
        selectedTables: [1],
        multiplierRange: { min: 1, max: 1 },
        questionCount: 1,
      })[0];
      expect(q1.operandA).toBe(1);
      expect(q1.operandB).toBe(1);
      expect(q1.answer).toBe(1);

      const q100 = buildTableQuestionQueue({
        selectedTables: [100],
        multiplierRange: { min: 100, max: 100 },
        questionCount: 1,
      })[0];
      expect(q100.operandA).toBe(100);
      expect(q100.operandB).toBe(100);
      expect(q100.answer).toBe(10000);
    });
  });

  describe('Stratified Balancing & Quotas', () => {
    it('allocates perfectly equal quotas across selected tables when count is divisible', () => {
      const tables = [7, 11, 17, 23, 43];
      const questions = buildTableQuestionQueue({
        selectedTables: tables,
        multiplierRange: { min: 1, max: 20 },
        questionCount: 50,
      });

      expect(questions).toHaveLength(50);
      const counts: Record<number, number> = {};
      for (const q of questions) {
        counts[q.table] = (counts[q.table] || 0) + 1;
      }

      for (const t of tables) {
        expect(counts[t]).toBe(10);
      }
    });

    it('distributes remainder equitably so table counts differ by at most 1', () => {
      const tables = [3, 7, 13];
      const questions = buildTableQuestionQueue({
        selectedTables: tables,
        multiplierRange: { min: 1, max: 12 },
        questionCount: 10,
      });

      expect(questions).toHaveLength(10);
      const counts: Record<number, number> = {};
      for (const q of questions) {
        counts[q.table] = (counts[q.table] || 0) + 1;
      }

      for (const t of tables) {
        expect(counts[t]).toBeGreaterThanOrEqual(3);
        expect(counts[t]).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('Anti-Clustering Invariant', () => {
    it('ensures no two consecutive questions originate from the same table when > 1 table is selected', () => {
      const tables = [2, 3, 5, 7];
      const questions = buildTableQuestionQueue({
        selectedTables: tables,
        multiplierRange: { min: 1, max: 10 },
        questionCount: 40,
      });

      expect(questions).toHaveLength(40);
      for (let i = 0; i < questions.length - 1; i++) {
        expect(questions[i].table).not.toBe(questions[i + 1].table);
      }
    });
  });

  describe('Distractor Engine & Anti-Trivial Last-Digit Masking', () => {
    it('generates 4 unique choices with correct answer and at least one distractor sharing last digit', () => {
      const questions = buildTableQuestionQueue({
        selectedTables: [7, 11, 43],
        multiplierRange: { min: 1, max: 12 },
        questionCount: 36,
        difficulty: 'normal',
      });

      for (const q of questions) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options[q.correctIndex]).toBe(q.answer);

        const lastDigit = Math.abs(q.answer) % 10;
        const distractors = q.options.filter((opt) => opt !== q.answer);
        const sharesLastDigit = distractors.some((d) => Math.abs(d) % 10 === lastDigit);
        expect(sharesLastDigit).toBe(true);
      }
    });
  });

  describe('Deterministic Seeding with PRNG', () => {
    it('produces identical queues when given the same PRNG seed', () => {
      const prng1 = new Mulberry32(424242);
      const queue1 = buildTableQuestionQueue({
        selectedTables: [6, 7, 8],
        multiplierRange: { min: 1, max: 12 },
        questionCount: 15,
        prng: prng1,
      });

      const prng2 = new Mulberry32(424242);
      const queue2 = buildTableQuestionQueue({
        selectedTables: [6, 7, 8],
        multiplierRange: { min: 1, max: 12 },
        questionCount: 15,
        prng: prng2,
      });

      expect(queue1.length).toBe(queue2.length);
      for (let i = 0; i < queue1.length; i++) {
        expect(queue1[i].table).toBe(queue2[i].table);
        expect(queue1[i].multiplier).toBe(queue2[i].multiplier);
        expect(queue1[i].answer).toBe(queue2[i].answer);
        expect(queue1[i].options).toEqual(queue2[i].options);
        expect(queue1[i].correctIndex).toBe(queue2[i].correctIndex);
      }
    });
  });
});
