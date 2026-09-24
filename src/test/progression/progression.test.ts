import { describe, it, expect } from 'vitest';
import {
  LEVEL_XP_THRESHOLDS,
  getLevelFromXp,
  getTitleForLevel,
  getLevelProgress,
  calculateQuestionXp,
  getLocalDateKey,
  getDayDifference,
  getTimeUntilNextMidnight,
  ACHIEVEMENT_DEFINITIONS,
  evaluateAchievements,
} from '../../features/progression/progressionEngine';
import { createInitialProfile } from '../../features/progression/progressionStore';
import type { UserProfile } from '../../features/progression/types';

describe('Progression Engine Suite', () => {
  describe('XP Calculation Invariants', () => {
    it('awards 5 XP on retry / mistake with no bonuses', () => {
      const result = calculateQuestionXp({
        isCorrectFirstTry: false,
        responseTimeMs: 1200,
        combo: 10,
        difficulty: 'expert',
      });
      expect(result.totalXp).toBe(5);
    });

    it('scales combo multiplier up to 2.5x cap', () => {
      const combo1 = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 3000, combo: 1, difficulty: 'easy' });
      const combo5 = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 3000, combo: 5, difficulty: 'easy' });
      const combo16 = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 3000, combo: 16, difficulty: 'easy' });
      const combo50 = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 3000, combo: 50, difficulty: 'easy' });

      expect(combo1.comboMultiplier).toBe(1.0);
      expect(combo5.comboMultiplier).toBe(1.4);
      expect(combo16.comboMultiplier).toBe(2.5);
      expect(combo50.comboMultiplier).toBe(2.5); // strictly capped at 2.5
    });

    it('awards speed bonus tiers for fast responses', () => {
      const fast = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 1100, combo: 1 });
      const medium = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 2100, combo: 1 });
      const deliberate = calculateQuestionXp({ isCorrectFirstTry: true, responseTimeMs: 3500, combo: 1 });

      expect(fast.speedBonus).toBe(5);
      expect(medium.speedBonus).toBe(2);
      expect(deliberate.speedBonus).toBe(0);
    });

    it('bounds total question XP strictly within [0, 55] across 1,000 randomized attempts', () => {
      for (let i = 0; i < 1000; i++) {
        const isCorrect = Math.random() > 0.3;
        const rt = Math.floor(Math.random() * 10000);
        const combo = Math.floor(Math.random() * 30);
        const xp = calculateQuestionXp({
          isCorrectFirstTry: isCorrect,
          responseTimeMs: rt,
          combo,
          difficulty: 'expert',
        });

        expect(xp.totalXp).toBeGreaterThanOrEqual(0);
        expect(xp.totalXp).toBeLessThanOrEqual(55);
      }
    });
  });

  describe('Leveling Curve & 50 Thresholds', () => {
    it('verifies all 50 precomputed level thresholds match floor(100 * (L-1)^1.5)', () => {
      expect(LEVEL_XP_THRESHOLDS.length).toBe(50);
      expect(LEVEL_XP_THRESHOLDS[0]).toBe(0); // Level 1
      expect(LEVEL_XP_THRESHOLDS[1]).toBe(100); // Level 2
      expect(LEVEL_XP_THRESHOLDS[2]).toBe(282); // Level 3
      expect(LEVEL_XP_THRESHOLDS[9]).toBe(2700); // Level 10
      expect(LEVEL_XP_THRESHOLDS[49]).toBe(34300); // Level 50

      for (let l = 2; l <= 50; l++) {
        const expected = Math.floor(100 * Math.pow(l - 1, 1.5));
        expect(LEVEL_XP_THRESHOLDS[l - 1]).toBe(expected);
      }
    });

    it('resolves exact level from cumulative XP for boundary values', () => {
      expect(getLevelFromXp(0)).toBe(1);
      expect(getLevelFromXp(99)).toBe(1);
      expect(getLevelFromXp(100)).toBe(2);
      expect(getLevelFromXp(281)).toBe(2);
      expect(getLevelFromXp(282)).toBe(3);
      expect(getLevelFromXp(34300)).toBe(50);
      expect(getLevelFromXp(100000)).toBe(50);
    });

    it('maps all 5 rank titles to level tiers correctly', () => {
      expect(getTitleForLevel(1)).toBe('Novice');
      expect(getTitleForLevel(9)).toBe('Novice');
      expect(getTitleForLevel(10)).toBe('Math Explorer');
      expect(getTitleForLevel(19)).toBe('Math Explorer');
      expect(getTitleForLevel(20)).toBe('Calculation Specialist');
      expect(getTitleForLevel(29)).toBe('Calculation Specialist');
      expect(getTitleForLevel(30)).toBe('Mental Math Wizard');
      expect(getTitleForLevel(39)).toBe('Mental Math Wizard');
      expect(getTitleForLevel(40)).toBe('Grandmaster');
      expect(getTitleForLevel(50)).toBe('Grandmaster');
    });

    it('computes level progress percentage bounded within [0, 100]', () => {
      const progress = getLevelProgress(150);
      expect(progress.level).toBe(2);
      expect(progress.progressPercentage).toBeGreaterThan(0);
      expect(progress.progressPercentage).toBeLessThan(100);

      const maxProgress = getLevelProgress(50000);
      expect(maxProgress.level).toBe(50);
      expect(maxProgress.progressPercentage).toBe(100);
      expect(maxProgress.isMaxLevel).toBe(true);
    });
  });

  describe('Streak Calendar & Midnight Countdown', () => {
    it('produces valid local date key YYYY-MM-DD', () => {
      const key = getLocalDateKey();
      expect(/^\d{4}-\d{2}-\d{2}$/.test(key)).toBe(true);
    });

    it('accurately computes calendar day differences without DST shift', () => {
      expect(getDayDifference('2026-09-18', '2026-09-19')).toBe(1);
      expect(getDayDifference('2026-09-18', '2026-09-25')).toBe(7);
      expect(getDayDifference('2026-09-25', '2026-09-18')).toBe(-7);
      expect(getDayDifference('2026-09-18', '2026-09-18')).toBe(0);
    });

    it('formats midnight countdown timer as HH:MM:SS', () => {
      const countdown = getTimeUntilNextMidnight();
      expect(countdown.totalSeconds).toBeGreaterThanOrEqual(0);
      expect(countdown.totalSeconds).toBeLessThanOrEqual(86400);
      expect(/^\d{2}:\d{2}:\d{2}$/.test(countdown.formatted)).toBe(true);
    });
  });

  describe('Achievement Badge Evaluation', () => {
    it('contains all 8 defined achievement badges', () => {
      expect(ACHIEVEMENT_DEFINITIONS.length).toBe(8);
      const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
      expect(ids).toContain('first_table_mastered');
      expect(ids).toContain('century_club');
      expect(ids).toContain('speed_demon');
      expect(ids).toContain('streak_7_day');
      expect(ids).toContain('perfect_daily_challenge');
      expect(ids).toContain('combo_king_10');
      expect(ids).toContain('reach_grandmaster');
      expect(ids).toContain('century_club_1000');
    });

    it('unlocks badges when condition criteria are met', () => {
      const profile = createInitialProfile();
      const testProfile: UserProfile = {
        ...profile,
        totalQuestionsAnswered: 105,
        currentStreak: 7,
        fastestResponseTimeMs: 1100,
      };

      const badges = evaluateAchievements(testProfile);
      const century = badges.find((b) => b.id === 'century_club');
      const streak7 = badges.find((b) => b.id === 'streak_7_day');
      const speed = badges.find((b) => b.id === 'speed_demon');

      expect(century?.isUnlocked).toBe(true);
      expect(streak7?.isUnlocked).toBe(true);
      expect(speed?.isUnlocked).toBe(true);
    });
  });
});
