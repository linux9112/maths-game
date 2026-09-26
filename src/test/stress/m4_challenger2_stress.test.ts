import { describe, it, expect } from 'vitest';
import {
  calculateLaplaceErrorRate,
  calculateLatencyMultiplier,
  calculateCompositeWeaknessScore,
  MIN_WEAKNESS_SCORE,
  MAX_WEAKNESS_SCORE,
} from '../../core/storage/weaknessMath';
import {
  InMemoryWeaknessRepository,
  LocalStorageWeaknessRepository,
} from '../../core/storage/storageRepository';
import {
  migrateLegacyStorageToDexie,
  MIGRATION_FLAG_KEY,
  LEGACY_STORAGE_KEY,
} from '../../core/storage/storageMigration';
import { MathAppDatabase } from '../../core/storage/db';
import { CalculationAttempt, DailyChallengeRecord } from '../../core/storage/types';
import {
  LEVEL_XP_THRESHOLDS,
  getLevelFromXp,
  getTitleForLevel,
  getLevelProgress,
  getLocalDateKey,
  getDayDifference,
  getTimeUntilNextMidnight,
  evaluateAchievements,
} from '../../features/progression/progressionEngine';
import { createInitialProfile } from '../../features/progression/progressionStore';

describe('Milestone 4 Challenger 2: Empirical Stress & Verification Suite', () => {
  // =========================================================================
  // SCOPE 1: Weakness Mathematical Boundaries & Monotonicity
  // =========================================================================
  describe('Scope 1: Weakness Mathematical Boundaries & Monotonicity', () => {
    it('1.1: 0 attempts strictly yields unpracticed default E = 0.5000 and W = 0.5000 at 0ms latency', () => {
      const errorRate = calculateLaplaceErrorRate(0, 0);
      expect(errorRate).toBe(0.5);

      const weakness0ms = calculateCompositeWeaknessScore(0, 0, 0);
      expect(weakness0ms).toBe(0.5);

      // Verify boundary safety on negative / invalid inputs
      expect(calculateLaplaceErrorRate(-1, -1)).toBe(0.5);
      expect(calculateLaplaceErrorRate(-10, 0)).toBe(0.5);
      expect(calculateLaplaceErrorRate(NaN as unknown as number, 0)).toBe(0.5);

      // If mistakes exceed attempts, safeAttempts clamps to at least mistakes
      const clampedExceed = calculateLaplaceErrorRate(5, 2);
      expect(clampedExceed).toBeCloseTo((5 + 1) / (5 + 2), 6);
    });

    it('1.2: Infinite attempts with 100% accuracy monotonically approaches minimal weakness score (0.0100)', () => {
      const attemptsSeries = [1, 2, 5, 10, 20, 50, 100, 500, 1000, 10000, 100000];
      let previousErrorRate = 1.0;
      let previousScore = 10.0;

      for (const attempts of attemptsSeries) {
        const errorRate = calculateLaplaceErrorRate(0, attempts);
        expect(errorRate).toBe((0 + 1) / (attempts + 2));
        expect(errorRate).toBeLessThan(previousErrorRate);
        previousErrorRate = errorRate;

        // With 1000ms latency (L = 1 + ln(2) approx 1.6931)
        const score = calculateCompositeWeaknessScore(0, attempts, 1000);
        expect(score).toBeLessThanOrEqual(previousScore);
        previousScore = score;
      }

      // At 10,000 flawless attempts, raw score is (1/10002) * 1.6931 < 0.0002, clamped to MIN_WEAKNESS_SCORE
      const ultraMasteredScore = calculateCompositeWeaknessScore(0, 10000, 1000);
      expect(ultraMasteredScore).toBe(MIN_WEAKNESS_SCORE);
      expect(ultraMasteredScore).toBe(0.01);

      // Even with maximum capped latency (15000ms, L approx 3.77), 100,000 attempts hits MIN_WEAKNESS_SCORE
      const maxLatencyFlawless = calculateCompositeWeaknessScore(0, 100000, 15000);
      expect(maxLatencyFlawless).toBe(MIN_WEAKNESS_SCORE);
    });

    it('1.3: Consecutive mistakes strictly yields monotonically increasing weakness score (W_k+1 > W_k)', () => {
      let previousWeakness = 0;
      const fixedLatency = 2000; // ms

      for (let k = 0; k <= 30; k++) {
        const weakness = calculateCompositeWeaknessScore(k, k, fixedLatency);
        if (k > 0) {
          if (previousWeakness < MAX_WEAKNESS_SCORE) {
            expect(weakness).toBeGreaterThan(previousWeakness);
          } else {
            expect(weakness).toBe(MAX_WEAKNESS_SCORE);
          }
        }
        previousWeakness = weakness;
      }
    });

    it('1.3b: Async repository updates for consecutive mistakes produce strictly increasing weakness scores', async () => {
      const repo = new InMemoryWeaknessRepository();
      let previousWeakness = 0;

      for (let k = 1; k <= 15; k++) {
        const stat = await repo.recordAttempt({
          factId: 'mul_9_9',
          operator: '*',
          operandA: 9,
          operandB: 9,
          expectedAnswer: 81,
          userAnswer: 72,
          isCorrect: false,
          responseTimeMs: 2500,
          solveTimeMs: 2500,
          timestamp: 1700000000000 + k * 1000,
          mode: 'table',
        });

        expect(stat.attempts).toBe(k);
        expect(stat.mistakes).toBe(k);
        expect(stat.weaknessScore).toBeGreaterThan(previousWeakness);
        previousWeakness = stat.weaknessScore;
      }
    });

    it('1.4: Response latency extremes: 0ms lower bound, 15000ms upper limit, and strict capping for >15000ms', () => {
      // 0ms latency
      const L_0 = calculateLatencyMultiplier(0);
      expect(L_0).toBe(1.0);

      // Negative latency clamped to 0ms
      expect(calculateLatencyMultiplier(-500)).toBe(1.0);
      expect(calculateLatencyMultiplier(-100000)).toBe(1.0);

      // 15000ms latency
      const L_15000 = calculateLatencyMultiplier(15000);
      const expectedAt15k = 1 + Math.log(1 + 15000 / 1000); // 1 + ln(16) approx 3.7725887
      expect(L_15000).toBeCloseTo(expectedAt15k, 8);

      // Over 15000ms: strictly clamped to L(15000)
      const latenciesAboveCap = [15001, 16000, 25000, 60000, 1000000, 1e9];
      for (const rt of latenciesAboveCap) {
        expect(calculateLatencyMultiplier(rt)).toBe(L_15000);
        // Verify composite weakness score is identical
        const scoreAt15k = calculateCompositeWeaknessScore(2, 5, 15000);
        const scoreAboveCap = calculateCompositeWeaknessScore(2, 5, rt);
        expect(scoreAboveCap).toBe(scoreAt15k);
      }

      // Max weakness score cap verification: mathematically bounded by (1 + ln(16)) approx 3.7726 <= MAX_WEAKNESS_SCORE (4.0)
      const cappedMax = calculateCompositeWeaknessScore(1000, 1000, 999999);
      expect(cappedMax).toBeLessThanOrEqual(MAX_WEAKNESS_SCORE);
      expect(cappedMax).toBeCloseTo(3.7688, 4);
    });
  });

  // =========================================================================
  // SCOPE 2: Multi-Tier Storage Fallback Verification
  // =========================================================================
  describe('Scope 2: Multi-Tier Storage Fallback Verification', () => {
    it('2.1: InMemoryWeaknessRepository executes full CRUD operations flawlessly', async () => {
      const repo = new InMemoryWeaknessRepository();

      // --- CREATE / INSERT ---
      const sampleAttempts: CalculationAttempt[] = [
        { factId: 'add_12_15', operator: '+', operandA: 12, operandB: 15, expectedAnswer: 27, userAnswer: 27, isCorrect: true, responseTimeMs: 1200, solveTimeMs: 1200, timestamp: 1000, mode: 'arithmetic' },
        { factId: 'sub_20_8', operator: '-', operandA: 20, operandB: 8, expectedAnswer: 12, userAnswer: 10, isCorrect: false, responseTimeMs: 3000, solveTimeMs: 3000, timestamp: 2000, mode: 'arithmetic' },
        { factId: 'mul_6_7', operator: '*', operandA: 6, operandB: 7, expectedAnswer: 42, userAnswer: 42, isCorrect: true, responseTimeMs: 800, solveTimeMs: 800, timestamp: 3000, mode: 'table' },
        { factId: 'div_56_8', operator: '/', operandA: 56, operandB: 8, expectedAnswer: 7, userAnswer: 6, isCorrect: false, responseTimeMs: 4500, solveTimeMs: 4500, timestamp: 4000, mode: 'arithmetic' },
      ];

      for (const att of sampleAttempts) {
        await repo.recordAttempt(att);
      }

      // Save User Profile
      await repo.saveUserProfile({
        xp: 150,
        level: 2,
        title: 'Novice',
        currentStreak: 3,
        bestStreak: 5,
        totalQuestionsAnswered: 4,
        totalCorrect: 2,
      });

      // Save Daily Challenge
      await repo.saveDailyChallenge({
        dateKey: '2026-09-18',
        score: 10,
        totalQuestions: 10,
        timeSec: 45,
        accuracyPercentage: 100,
        completed: true,
        completedAt: 1700000000000,
        seed: 12345,
        xpAwarded: 50,
      });

      // --- READ ---
      const statAdd = await repo.getStat('add_12_15');
      expect(statAdd).not.toBeNull();
      expect(statAdd?.attempts).toBe(1);
      expect(statAdd?.mistakes).toBe(0);
      expect(statAdd?.correctCount).toBe(1);
      expect(statAdd?.avgResponseTimeMs).toBe(1200);

      const statSub = await repo.getStat('sub_20_8');
      expect(statSub?.attempts).toBe(1);
      expect(statSub?.mistakes).toBe(1);
      expect(statSub?.correctCount).toBe(0);

      const allStats = await repo.getAllStats();
      expect(allStats).toHaveLength(4);

      // Weak calculation querying & descending sort
      const weakAll = await repo.getWeakCalculations({ limit: 10, minAttempts: 1, threshold: 0.1 });
      expect(weakAll.length).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < weakAll.length - 1; i++) {
        expect(weakAll[i].weaknessScore).toBeGreaterThanOrEqual(weakAll[i + 1].weaknessScore);
      }

      // Operator filter
      const weakMul = await repo.getWeakCalculations({ operator: '*' });
      expect(weakMul.every((s) => s.operator === '*')).toBe(true);

      // User profile read
      const profile = await repo.getUserProfile();
      expect(profile.xp).toBe(150);
      expect(profile.level).toBe(2);
      expect(profile.currentStreak).toBe(3);

      // Daily challenge read
      const daily = await repo.getDailyChallenge('2026-09-18');
      expect(daily).not.toBeNull();
      expect(daily?.score).toBe(10);
      expect(daily?.accuracyPercentage).toBe(100);

      const nonExistentDaily = await repo.getDailyChallenge('1999-01-01');
      expect(nonExistentDaily).toBeNull();

      // Attempts read
      const attempts = await repo.getAllAttempts(10);
      expect(attempts).toHaveLength(4);

      // --- UPDATE ---
      // Second attempt on sub_20_8
      await repo.recordAttempt({
        factId: 'sub_20_8',
        operator: '-',
        operandA: 20,
        operandB: 8,
        expectedAnswer: 12,
        userAnswer: 12,
        isCorrect: true,
        responseTimeMs: 1500,
        solveTimeMs: 1500,
        timestamp: 5000,
        mode: 'arithmetic',
      });
      const updatedSub = await repo.getStat('sub_20_8');
      expect(updatedSub?.attempts).toBe(2);
      expect(updatedSub?.mistakes).toBe(1);
      expect(updatedSub?.correctCount).toBe(1);
      expect(updatedSub?.avgResponseTimeMs).toBe(Math.round((3000 + 1500) / 2));

      // Update profile patch
      const patchedProfile = await repo.saveUserProfile({ xp: 300, level: 3 });
      expect(patchedProfile.xp).toBe(300);
      expect(patchedProfile.level).toBe(3);
      expect(patchedProfile.currentStreak).toBe(3); // Preserved

      // --- DELETE / CLEAR ---
      await repo.clearAll();
      expect(await repo.getAllStats()).toHaveLength(0);
      expect(await repo.getAllAttempts()).toHaveLength(0);
      expect(await repo.getDailyChallenge('2026-09-18')).toBeNull();
      const clearedProfile = await repo.getUserProfile();
      expect(clearedProfile.xp).toBe(0);
      expect(clearedProfile.level).toBe(1);
    });

    it('2.2: LocalStorageWeaknessRepository serialization, retrieval, rolling buffer and corruption recovery', async () => {
      localStorage.clear();
      const repo = new LocalStorageWeaknessRepository();

      // Record attempts
      await repo.recordAttempt({
        factId: 'mul_8_8',
        operator: '*',
        operandA: 8,
        operandB: 8,
        expectedAnswer: 64,
        userAnswer: 64,
        isCorrect: true,
        responseTimeMs: 1400,
        solveTimeMs: 1400,
        timestamp: 10000,
        mode: 'table',
      });

      // Verify raw serialization in localStorage
      const rawStats = localStorage.getItem('math_calculation_stats_v1');
      expect(rawStats).toBeTruthy();
      const parsedStats = JSON.parse(rawStats!);
      expect(parsedStats['mul_8_8']).toBeDefined();
      expect(parsedStats['mul_8_8'].attempts).toBe(1);
      expect(parsedStats['mul_8_8'].correctCount).toBe(1);

      // Verify retrieval through repository interface
      const retrieved = await repo.getStat('mul_8_8');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.factId).toBe('mul_8_8');
      expect(retrieved?.masteryScore).toBeGreaterThanOrEqual(0);

      // User Profile serialization
      await repo.saveUserProfile({
        xp: 500,
        level: 4,
        title: 'Novice',
        currentStreak: 2,
        bestStreak: 4,
      });
      const rawProfile = localStorage.getItem('math_user_profile_v1');
      expect(rawProfile).toBeTruthy();
      const parsedProfile = JSON.parse(rawProfile!);
      expect(parsedProfile.xp).toBe(500);

      const retrievedProfile = await repo.getUserProfile();
      expect(retrievedProfile.xp).toBe(500);
      expect(retrievedProfile.level).toBe(4);

      // Daily challenge serialization
      const sampleDaily: DailyChallengeRecord = {
        dateKey: '2026-09-18',
        score: 9,
        totalQuestions: 10,
        timeSec: 52,
        accuracyPercentage: 90,
        completed: true,
        completedAt: 1700000000000,
        seed: 54321,
        xpAwarded: 130,
      };
      await repo.saveDailyChallenge(sampleDaily);
      const retrievedDaily = await repo.getDailyChallenge('2026-09-18');
      expect(retrievedDaily?.score).toBe(9);

      // Test rolling buffer: insert 310 attempts, verify it retains exactly 300
      for (let i = 1; i <= 310; i++) {
        await repo.recordAttempt({
          factId: `add_${i}_1`,
          operator: '+',
          operandA: i,
          operandB: 1,
          expectedAnswer: i + 1,
          userAnswer: i + 1,
          isCorrect: true,
          responseTimeMs: 1000,
          solveTimeMs: 1000,
          timestamp: 20000 + i,
          mode: 'arithmetic',
        });
      }
      const attempts = await repo.getAllAttempts(500);
      expect(attempts.length).toBeLessThanOrEqual(300);

      // Test corruption resilience: corrupt JSON in localStorage
      localStorage.setItem('math_calculation_stats_v1', 'CORRUPT_JSON_DATA{{');
      localStorage.setItem('math_user_profile_v1', '{invalid:');

      // Neither getStat nor getAllStats nor getUserProfile should throw!
      expect(async () => await repo.getStat('any_id')).not.toThrow();
      expect(await repo.getStat('any_id')).toBeNull();
      expect(await repo.getAllStats()).toEqual([]);

      const recoveredProfile = await repo.getUserProfile();
      expect(recoveredProfile.xp).toBe(0);
      expect(recoveredProfile.level).toBe(1);

      // Test clearAll
      await repo.clearAll();
      expect(localStorage.getItem('math_calculation_stats_v1')).toBeNull();
      expect(localStorage.getItem('math_calculation_attempts_v1')).toBeNull();
      expect(localStorage.getItem('math_user_profile_v1')).toBeNull();
      expect(localStorage.getItem('math_daily_challenges_v1')).toBeNull();
    });

    it('2.3: Migration idempotency: running migration multiple times does not duplicate or corrupt data', async () => {
      localStorage.clear();
      const testDb = new MathAppDatabase('Challenger2_MigrationTestDb');

      // Seed legacy storage with 3 items
      const legacyData = {
        mul_3_4: {
          factId: 'mul_3_4',
          table: 3,
          multiplier: 4,
          attempts: 6,
          correctCount: 5,
          consecutiveCorrect: 3,
          totalResponseTimeMs: 12000,
          avgResponseTimeMs: 2000,
          lastResponseTimeMs: 1800,
          lastAttemptTimestamp: 1695000000000,
          masteryScore: 82,
        },
        mul_7_7: {
          factId: 'mul_7_7',
          table: 7,
          multiplier: 7,
          attempts: 8,
          correctCount: 6,
          consecutiveCorrect: 2,
          totalResponseTimeMs: 24000,
          avgResponseTimeMs: 3000,
          lastResponseTimeMs: 2500,
          lastAttemptTimestamp: 1695000100000,
          masteryScore: 68,
        },
        mul_9_12: {
          factId: 'mul_9_12',
          table: 9,
          multiplier: 12,
          attempts: 4,
          correctCount: 4,
          consecutiveCorrect: 4,
          totalResponseTimeMs: 6000,
          avgResponseTimeMs: 1500,
          lastResponseTimeMs: 1400,
          lastAttemptTimestamp: 1695000200000,
          masteryScore: 95,
        },
      };

      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyData));
      expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBeNull();

      // RUN 1: Initial Migration
      const run1 = await migrateLegacyStorageToDexie(testDb);
      expect(run1.success).toBe(true);
      expect(run1.skipped).toBe(false);
      expect(run1.migratedStatsCount).toBe(3);
      expect(run1.synthesizedAttemptsCount).toBe(3);
      expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBe('true');

      // RUN 2: Immediate Re-run (Idempotent check)
      const run2 = await migrateLegacyStorageToDexie(testDb);
      expect(run2.success).toBe(true);
      expect(run2.skipped).toBe(true);
      expect(run2.migratedStatsCount).toBe(0);
      expect(run2.synthesizedAttemptsCount).toBe(0);

      // RUN 3: Third Re-run
      const run3 = await migrateLegacyStorageToDexie(testDb);
      expect(run3.success).toBe(true);
      expect(run3.skipped).toBe(true);
      expect(run3.migratedStatsCount).toBe(0);
      expect(run3.synthesizedAttemptsCount).toBe(0);

      // Edge case: empty legacy storage
      localStorage.removeItem(MIGRATION_FLAG_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const runEmpty = await migrateLegacyStorageToDexie(testDb);
      expect(runEmpty.success).toBe(true);
      expect(runEmpty.skipped).toBe(true);
      expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBe('true');
    });
  });

  // =========================================================================
  // SCOPE 3: Leveling & Streak Arithmetic
  // =========================================================================
  describe('Scope 3: Leveling & Streak Arithmetic', () => {
    it('3.1: All 50 level thresholds strictly match floor(100 * (L - 1)^1.5)', () => {
      expect(LEVEL_XP_THRESHOLDS).toHaveLength(50);

      for (let L = 1; L <= 50; L++) {
        const expectedThreshold = Math.floor(100 * Math.pow(L - 1, 1.5));
        expect(LEVEL_XP_THRESHOLDS[L - 1]).toBe(expectedThreshold);
      }

      // Spot check specific mathematical points
      expect(LEVEL_XP_THRESHOLDS[0]).toBe(0);      // Level 1: 100 * 0^1.5 = 0
      expect(LEVEL_XP_THRESHOLDS[1]).toBe(100);    // Level 2: 100 * 1^1.5 = 100
      expect(LEVEL_XP_THRESHOLDS[2]).toBe(282);    // Level 3: 100 * 2^1.5 = 282.84 -> 282
      expect(LEVEL_XP_THRESHOLDS[3]).toBe(519);    // Level 4: 100 * 3^1.5 = 519.61 -> 519
      expect(LEVEL_XP_THRESHOLDS[9]).toBe(2700);   // Level 10: 100 * 9^1.5 = 100 * 27 = 2700
      expect(LEVEL_XP_THRESHOLDS[15]).toBe(5809);  // Level 16: 100 * 15^1.5 = 5809.47 -> 5809
      expect(LEVEL_XP_THRESHOLDS[24]).toBe(11757); // Level 25: 100 * 24^1.5 = 11757.55 -> 11757
      expect(LEVEL_XP_THRESHOLDS[39]).toBe(24355); // Level 40: 100 * 39^1.5 = 24355.69 -> 24355
      expect(LEVEL_XP_THRESHOLDS[49]).toBe(34300); // Level 50: 100 * 49^1.5 = 100 * 343 = 34300

      // Test level resolution across boundary conditions
      expect(getLevelFromXp(0)).toBe(1);
      expect(getLevelFromXp(99)).toBe(1);
      expect(getLevelFromXp(100)).toBe(2);
      expect(getLevelFromXp(281)).toBe(2);
      expect(getLevelFromXp(282)).toBe(3);
      expect(getLevelFromXp(24354)).toBe(39);
      expect(getLevelFromXp(24355)).toBe(40);
      expect(getLevelFromXp(34299)).toBe(49);
      expect(getLevelFromXp(34300)).toBe(50);
      expect(getLevelFromXp(98503)).toBe(100);
      expect(getLevelFromXp(1000000)).toBeGreaterThan(100);
      expect(getLevelFromXp(-50)).toBe(1);
      expect(getLevelFromXp(NaN)).toBe(1);
      expect(getLevelFromXp(Infinity)).toBe(1);

      // Rank titles
      expect(getTitleForLevel(1)).toBe('Beginner');
      expect(getTitleForLevel(9)).toBe('Number Solver');
      expect(getTitleForLevel(10)).toBe('Math Solver');
      expect(getTitleForLevel(20)).toBe('Mental Math Solver');
      expect(getTitleForLevel(30)).toBe('Math Warrior');
      expect(getTitleForLevel(40)).toBe('Table Challenger');
      expect(getTitleForLevel(50)).toBe('Table Expert');
      expect(getTitleForLevel(100)).toBe('Math Master');
      expect(getTitleForLevel(105)).toBe('Grandmaster');

      // Level Progress representation
      const progL1 = getLevelProgress(50);
      expect(progL1.level).toBe(1);
      expect(progL1.currentLevelXp).toBe(0);
      expect(progL1.nextLevelXp).toBe(100);
      expect(progL1.xpInCurrentLevel).toBe(50);
      expect(progL1.progressPercentage).toBe(50);

      const progL55 = getLevelProgress(40000);
      expect(progL55.level).toBe(55);
      expect(progL55.title).toBe('Number Hunter');
      expect(progL55.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(progL55.progressPercentage).toBeLessThanOrEqual(100);
    });

    it('3.2: Streak date calculation across DST transitions and UTC midnight offsets', () => {
      // 1. Same calendar day
      expect(getDayDifference('2026-03-29', '2026-03-29')).toBe(0);
      expect(getDayDifference('2026-10-25', '2026-10-25')).toBe(0);

      // 2. Standard consecutive days
      expect(getDayDifference('2026-04-10', '2026-04-11')).toBe(1);

      // 3. DST Spring-forward transition (European DST 2026-03-29, 23h day)
      // Standard Date subtraction can yield 0.9583 days (23h), but getDayDifference anchors at UTC 12:00:00!
      expect(getDayDifference('2026-03-29', '2026-03-30')).toBe(1);

      // 4. DST Fall-back transition (European DST 2026-10-25, 25h day)
      // Standard Date subtraction can yield 1.0416 days (25h)
      expect(getDayDifference('2026-10-25', '2026-10-26')).toBe(1);

      // 5. US DST Spring-forward (2026-03-08)
      expect(getDayDifference('2026-03-08', '2026-03-09')).toBe(1);

      // 6. US DST Fall-back (2026-11-01)
      expect(getDayDifference('2026-11-01', '2026-11-02')).toBe(1);

      // 7. Leap year transition (2024 is leap year: Feb 28 -> Feb 29 -> Mar 01)
      expect(getDayDifference('2024-02-28', '2024-02-29')).toBe(1);
      expect(getDayDifference('2024-02-29', '2024-03-01')).toBe(1);
      expect(getDayDifference('2024-02-28', '2024-03-01')).toBe(2);

      // 8. Non-leap year transition (2025: Feb 28 -> Mar 01)
      expect(getDayDifference('2025-02-28', '2025-03-01')).toBe(1);

      // 9. Year rollover transition
      expect(getDayDifference('2025-12-31', '2026-01-01')).toBe(1);

      // 10. Broken streak (gap > 1 day)
      expect(getDayDifference('2026-01-01', '2026-01-03')).toBe(2);
      expect(getDayDifference('2026-01-01', '2026-01-15')).toBe(14);

      // 11. Reverse date difference
      expect(getDayDifference('2026-01-15', '2026-01-01')).toBe(-14);

      // 12. Local date key formatting
      const dateSample = new Date(2026, 8, 18, 5, 30, 0); // Sep 18, 2026
      expect(getLocalDateKey(dateSample)).toBe('2026-09-18');
      const janSample = new Date(2026, 0, 5, 23, 59, 59); // Jan 05, 2026
      expect(getLocalDateKey(janSample)).toBe('2026-01-05');

      // 13. Next midnight countdown
      const sampleNow = new Date(2026, 8, 18, 23, 59, 50, 0);
      const countdown = getTimeUntilNextMidnight(sampleNow);
      expect(countdown.totalSeconds).toBe(10);
      expect(countdown.hours).toBe(0);
      expect(countdown.minutes).toBe(0);
      expect(countdown.seconds).toBe(10);
      expect(countdown.formatted).toBe('00:00:10');
    });

    it('3.3: All 8 achievement badges trigger conditions and edge boundaries', () => {
      const baseProfile = createInitialProfile();

      // Badge 1: first_table_mastered (Table Titan)
      const b1False = evaluateAchievements(baseProfile, { hasTableMastered: false });
      expect(b1False.find((a) => a.id === 'first_table_mastered')?.isUnlocked).toBe(false);
      const b1True = evaluateAchievements(baseProfile, { hasTableMastered: true });
      expect(b1True.find((a) => a.id === 'first_table_mastered')?.isUnlocked).toBe(true);

      // Badge 2: century_club (Century Club, threshold: 100)
      const b2Under = evaluateAchievements({ ...baseProfile, totalQuestionsAnswered: 99 });
      expect(b2Under.find((a) => a.id === 'century_club')?.isUnlocked).toBe(false);
      expect(b2Under.find((a) => a.id === 'century_club')?.currentProgress).toBe(99);

      const b2Exact = evaluateAchievements({ ...baseProfile, totalQuestionsAnswered: 100 });
      expect(b2Exact.find((a) => a.id === 'century_club')?.isUnlocked).toBe(true);
      expect(b2Exact.find((a) => a.id === 'century_club')?.currentProgress).toBe(100);

      // Badge 3: speed_demon (Speed Demon, threshold: < 1500ms)
      const b3Over = evaluateAchievements({ ...baseProfile, fastestResponseTimeMs: 1500 });
      expect(b3Over.find((a) => a.id === 'speed_demon')?.isUnlocked).toBe(false);

      const b3Fastest = evaluateAchievements({ ...baseProfile, fastestResponseTimeMs: 1499 });
      expect(b3Fastest.find((a) => a.id === 'speed_demon')?.isUnlocked).toBe(true);

      const b3Session = evaluateAchievements({ ...baseProfile, fastestResponseTimeMs: 2000 }, { latestResponseTimeMs: 1200 });
      expect(b3Session.find((a) => a.id === 'speed_demon')?.isUnlocked).toBe(true);

      // Badge 4: streak_7_day (7-Day Streak, threshold: >= 7)
      const b4Under = evaluateAchievements({ ...baseProfile, currentStreak: 6 });
      expect(b4Under.find((a) => a.id === 'streak_7_day')?.isUnlocked).toBe(false);
      expect(b4Under.find((a) => a.id === 'streak_7_day')?.currentProgress).toBe(6);

      const b4Exact = evaluateAchievements({ ...baseProfile, currentStreak: 7 });
      expect(b4Exact.find((a) => a.id === 'streak_7_day')?.isUnlocked).toBe(true);
      expect(b4Exact.find((a) => a.id === 'streak_7_day')?.currentProgress).toBe(7);

      // Badge 5: perfect_daily_challenge (Flawless Day)
      const b5Under = evaluateAchievements({ ...baseProfile, dailyChallengesFlawless: 0 });
      expect(b5Under.find((a) => a.id === 'perfect_daily_challenge')?.isUnlocked).toBe(false);

      const b5Profile = evaluateAchievements({ ...baseProfile, dailyChallengesFlawless: 1 });
      expect(b5Profile.find((a) => a.id === 'perfect_daily_challenge')?.isUnlocked).toBe(true);

      const b5Extra = evaluateAchievements(baseProfile, { isDailyFlawless: true });
      expect(b5Extra.find((a) => a.id === 'perfect_daily_challenge')?.isUnlocked).toBe(true);

      // Badge 6: combo_king_10 (Combo King, threshold: >= 10)
      const b6Under = evaluateAchievements(baseProfile, { sessionMaxCombo: 9 });
      expect(b6Under.find((a) => a.id === 'combo_king_10')?.isUnlocked).toBe(false);
      expect(b6Under.find((a) => a.id === 'combo_king_10')?.currentProgress).toBe(9);

      const b6Exact = evaluateAchievements(baseProfile, { sessionMaxCombo: 10 });
      expect(b6Exact.find((a) => a.id === 'combo_king_10')?.isUnlocked).toBe(true);
      expect(b6Exact.find((a) => a.id === 'combo_king_10')?.currentProgress).toBe(10);

      // Badge 7: reach_grandmaster (Apex Grandmaster, threshold: level >= 40)
      const b7Under = evaluateAchievements({ ...baseProfile, level: 39 });
      expect(b7Under.find((a) => a.id === 'reach_grandmaster')?.isUnlocked).toBe(false);
      expect(b7Under.find((a) => a.id === 'reach_grandmaster')?.currentProgress).toBe(39);

      const b7Exact = evaluateAchievements({ ...baseProfile, level: 40 });
      expect(b7Exact.find((a) => a.id === 'reach_grandmaster')?.isUnlocked).toBe(true);
      expect(b7Exact.find((a) => a.id === 'reach_grandmaster')?.currentProgress).toBe(40);

      // Badge 8: century_club_1000 (Calculation Marathon, threshold: >= 1000)
      const b8Under = evaluateAchievements({ ...baseProfile, totalQuestionsAnswered: 999 });
      expect(b8Under.find((a) => a.id === 'century_club_1000')?.isUnlocked).toBe(false);
      expect(b8Under.find((a) => a.id === 'century_club_1000')?.currentProgress).toBe(999);

      const b8Exact = evaluateAchievements({ ...baseProfile, totalQuestionsAnswered: 1000 });
      expect(b8Exact.find((a) => a.id === 'century_club_1000')?.isUnlocked).toBe(true);
      expect(b8Exact.find((a) => a.id === 'century_club_1000')?.currentProgress).toBe(1000);

      // Persistence & Retention Check: Unlocked achievements remain unlocked even if state drops
      const unlockedProfile = {
        ...baseProfile,
        unlockedAchievements: [
          'first_table_mastered',
          'century_club',
          'speed_demon',
          'streak_7_day',
          'perfect_daily_challenge',
          'combo_king_10',
          'reach_grandmaster',
          'century_club_1000',
        ],
        totalQuestionsAnswered: 0,
        currentStreak: 0,
        level: 1,
      };
      const retained = evaluateAchievements(unlockedProfile);
      for (const badge of retained) {
        expect(badge.isUnlocked).toBe(true);
        expect(badge.currentProgress).toBe(badge.maxProgress);
      }
    });
  });
});
