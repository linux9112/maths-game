import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryWeaknessRepository,
  LocalStorageWeaknessRepository,
  StorageManager,
} from '../../core/storage/storageRepository';
import { CalculationAttempt } from '../../core/storage/types';

describe('Storage Fallback & Multi-Tier Repository Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    StorageManager.setRepository(null);
  });

  describe('InMemoryWeaknessRepository', () => {
    it('records attempts and updates aggregated stats correctly', async () => {
      const repo = new InMemoryWeaknessRepository();
      const attempt1: CalculationAttempt = {
        factId: 'mul_7_8',
        operator: '*',
        operandA: 7,
        operandB: 8,
        expectedAnswer: 56,
        userAnswer: 54,
        isCorrect: false,
        responseTimeMs: 3200,
        solveTimeMs: 3200,
        timestamp: Date.now(),
        mode: 'table',
      };

      const stat1 = await repo.recordAttempt(attempt1);
      expect(stat1.attempts).toBe(1);
      expect(stat1.mistakes).toBe(1);
      expect(stat1.correctCount).toBe(0);
      expect(stat1.avgResponseTimeMs).toBe(3200);
      expect(stat1.weaknessScore).toBeGreaterThan(1.0);

      // Now answer correctly
      const attempt2: CalculationAttempt = {
        ...attempt1,
        userAnswer: 56,
        isCorrect: true,
        responseTimeMs: 1400,
        solveTimeMs: 1400,
      };

      const stat2 = await repo.recordAttempt(attempt2);
      expect(stat2.attempts).toBe(2);
      expect(stat2.mistakes).toBe(1);
      expect(stat2.correctCount).toBe(1);
      expect(stat2.avgResponseTimeMs).toBe(2300);
      expect(stat2.weaknessScore).toBeLessThan(stat1.weaknessScore);
    });

    it('queries weak calculations ordered by weaknessScore descending with filters', async () => {
      const repo = new InMemoryWeaknessRepository();

      // Seed 3 facts with varying weakness
      await repo.recordAttempt({
        factId: 'mul_7_8',
        operator: '*',
        operandA: 7,
        operandB: 8,
        expectedAnswer: 56,
        userAnswer: 54,
        isCorrect: false,
        responseTimeMs: 4000,
        solveTimeMs: 4000,
        timestamp: Date.now(),
        mode: 'table',
      });

      await repo.recordAttempt({
        factId: 'add_25_34',
        operator: '+',
        operandA: 25,
        operandB: 34,
        expectedAnswer: 59,
        userAnswer: 59,
        isCorrect: true,
        responseTimeMs: 1200,
        solveTimeMs: 1200,
        timestamp: Date.now(),
        mode: 'arithmetic',
      });

      await repo.recordAttempt({
        factId: 'mul_8_9',
        operator: '*',
        operandA: 8,
        operandB: 9,
        expectedAnswer: 72,
        userAnswer: 70,
        isCorrect: false,
        responseTimeMs: 5000,
        solveTimeMs: 5000,
        timestamp: Date.now(),
        mode: 'table',
      });

      const weakAll = await repo.getWeakCalculations({ limit: 10, threshold: 0.1 });
      expect(weakAll.length).toBe(3);
      expect(weakAll[0].weaknessScore).toBeGreaterThanOrEqual(weakAll[1].weaknessScore);

      // Filter by operator '*'
      const weakMul = await repo.getWeakCalculations({ operator: '*', limit: 10 });
      expect(weakMul.length).toBe(2);
      expect(weakMul.every((w) => w.operator === '*')).toBe(true);
    });

    it('manages user profile persistence and daily challenge records', async () => {
      const repo = new InMemoryWeaknessRepository();

      const initialProfile = await repo.getUserProfile();
      expect(initialProfile.level).toBe(1);
      expect(initialProfile.xp).toBe(0);

      await repo.saveUserProfile({ xp: 500, level: 3, currentStreak: 4 });
      const updated = await repo.getUserProfile();
      expect(updated.xp).toBe(500);
      expect(updated.level).toBe(3);
      expect(updated.currentStreak).toBe(4);

      // Daily challenge
      const dailyKey = '2026-09-18';
      expect(await repo.getDailyChallenge(dailyKey)).toBeNull();

      await repo.saveDailyChallenge({
        dateKey: dailyKey,
        completed: true,
        score: 10,
        totalQuestions: 10,
        accuracyPercentage: 100,
        timeSec: 35.2,
        seed: 12345,
        xpAwarded: 250,
      });

      const savedChallenge = await repo.getDailyChallenge(dailyKey);
      expect(savedChallenge).not.toBeNull();
      expect(savedChallenge?.score).toBe(10);
      expect(savedChallenge?.timeSec).toBe(35.2);
    });
  });

  describe('LocalStorageWeaknessRepository', () => {
    it('persists and recovers calculation stats from localStorage', async () => {
      const repo = new LocalStorageWeaknessRepository();

      await repo.recordAttempt({
        factId: 'div_56_8',
        operator: '/',
        operandA: 56,
        operandB: 8,
        expectedAnswer: 7,
        userAnswer: 7,
        isCorrect: true,
        responseTimeMs: 1800,
        solveTimeMs: 1800,
        timestamp: Date.now(),
        mode: 'arithmetic',
      });

      const stat = await repo.getStat('div_56_8');
      expect(stat).not.toBeNull();
      expect(stat?.attempts).toBe(1);
      expect(stat?.correctCount).toBe(1);

      // Create a fresh instance reading the same localStorage
      const repo2 = new LocalStorageWeaknessRepository();
      const recoveredStat = await repo2.getStat('div_56_8');
      expect(recoveredStat?.factId).toBe('div_56_8');
      expect(recoveredStat?.correctCount).toBe(1);
    });
  });

  describe('StorageManager Safe Fallback', () => {
    it('gracefully returns an operational repository', async () => {
      const repo = await StorageManager.getRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.recordAttempt).toBe('function');
      expect(typeof repo.getUserProfile).toBe('function');
    });

    it('allows dependency injection of mock repository for deterministic unit tests', async () => {
      const mockRepo = new InMemoryWeaknessRepository();
      StorageManager.setRepository(mockRepo);

      const activeRepo = await StorageManager.getRepository();
      expect(activeRepo).toBe(mockRepo);
    });
  });
});
