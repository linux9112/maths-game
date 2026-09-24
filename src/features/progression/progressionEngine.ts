import { DifficultyTier } from '../../core/math/types';
import {
  PlayerRankTitle,
  LevelProgress,
  XpBreakdown,
  Achievement,
  MidnightCountdown,
  UserProfile,
} from './types';

/**
 * Precomputed cumulative XP thresholds for levels 1 to 50:
 * Threshold(1) = 0
 * Threshold(L) = floor(100 * (L - 1)^1.5) for L in [2, 50]
 */
export const LEVEL_XP_THRESHOLDS: readonly number[] = Object.freeze(
  Array.from({ length: 50 }, (_, i) => {
    const level = i + 1;
    if (level === 1) return 0;
    return Math.floor(100 * Math.pow(level - 1, 1.5));
  })
);

/**
 * Resolves player level from cumulative XP
 */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0 || !isFinite(totalXp)) return 1;
  for (let lvl = 50; lvl >= 1; lvl--) {
    if (totalXp >= LEVEL_XP_THRESHOLDS[lvl - 1]) {
      return lvl;
    }
  }
  return 1;
}

/**
 * Resolves rank title for a given level
 */
export function getTitleForLevel(level: number): PlayerRankTitle {
  if (level >= 40) return 'Grandmaster';
  if (level >= 30) return 'Mental Math Wizard';
  if (level >= 20) return 'Calculation Specialist';
  if (level >= 10) return 'Math Explorer';
  return 'Novice';
}

/**
 * Computes level progress details and progress percentage
 */
export function getLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, isFinite(totalXp) ? totalXp : 0);
  const level = getLevelFromXp(safeXp);
  const currentThreshold = LEVEL_XP_THRESHOLDS[level - 1];
  const nextThreshold = level < 50 ? LEVEL_XP_THRESHOLDS[level] : currentThreshold;
  const xpNeeded = level < 50 ? nextThreshold - currentThreshold : 0;
  const xpInLevel = level < 50 ? Math.max(0, safeXp - currentThreshold) : xpNeeded;
  const progressPercent =
    level >= 50 ? 100 : Math.min(100, Math.round((xpInLevel / Math.max(1, xpNeeded)) * 100));

  return {
    level,
    title: getTitleForLevel(level),
    currentLevelXp: currentThreshold,
    nextLevelXp: nextThreshold,
    xpInCurrentLevel: xpInLevel,
    xpNeededForNextLevel: xpNeeded,
    progressPercentage: progressPercent,
    isMaxLevel: level >= 50,
  };
}

/**
 * Calculates XP earned for a single question attempt
 */
export function calculateQuestionXp(params: {
  isCorrectFirstTry: boolean;
  responseTimeMs: number;
  combo: number;
  difficulty?: DifficultyTier;
}): XpBreakdown {
  const { isCorrectFirstTry, responseTimeMs, combo, difficulty = 'normal' } = params;

  if (!isCorrectFirstTry) {
    return {
      totalXp: 5,
      baseXp: 5,
      comboMultiplier: 1.0,
      difficultyMultiplier: 1.0,
      speedBonus: 0,
    };
  }

  const baseXp = 10;

  // Combo multiplier: 1.0 + (C - 1) * 0.1, capped at 2.5x
  let comboMultiplier = 1.0;
  if (combo >= 2) {
    comboMultiplier = Math.min(2.5, Math.round((1.0 + (combo - 1) * 0.1) * 10) / 10);
  }

  // Difficulty multiplier
  let difficultyMultiplier = 1.2;
  if (difficulty === 'easy') difficultyMultiplier = 1.0;
  else if (difficulty === 'hard') difficultyMultiplier = 1.5;
  else if (difficulty === 'expert') difficultyMultiplier = 2.0;

  // Speed bonus
  let speedBonus = 0;
  if (responseTimeMs < 1500) {
    speedBonus = 5;
  } else if (responseTimeMs < 2500) {
    speedBonus = 2;
  }

  const scaledBase = Math.round(baseXp * comboMultiplier * difficultyMultiplier);
  const totalXp = Math.min(55, scaledBase + speedBonus);

  return {
    totalXp,
    baseXp,
    comboMultiplier,
    difficultyMultiplier,
    speedBonus,
  };
}

/**
 * Timezone-safe local calendar date representation 'YYYY-MM-DD'
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the exact number of calendar days between two date keys without DST distortion
 */
export function getDayDifference(dateKeyA: string, dateKeyB: string): number {
  const [yA, mA, dA] = dateKeyA.split('-').map(Number);
  const [yB, mB, dB] = dateKeyB.split('-').map(Number);
  // Anchoring at UTC 12:00:00 completely eliminates DST jumps and timezone drift
  const utcA = Date.UTC(yA, mA - 1, dA, 12, 0, 0);
  const utcB = Date.UTC(yB, mB - 1, dB, 12, 0, 0);
  return Math.round((utcB - utcA) / (24 * 60 * 60 * 1000));
}

/**
 * Calculates countdown until next local midnight
 */
export function getTimeUntilNextMidnight(now: Date = new Date()): MidnightCountdown {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalSeconds,
    hours,
    minutes,
    seconds,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}

/**
 * Achievement badge specifications and evaluation criteria
 */
export const ACHIEVEMENT_DEFINITIONS: ReadonlyArray<Omit<Achievement, 'currentProgress' | 'isUnlocked' | 'unlockedAt'>> = [
  {
    id: 'first_table_mastered',
    title: 'Table Titan',
    description: 'Master any multiplication table to 90%+',
    tier: 'gold',
    maxProgress: 1,
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Solve 100 total math calculation questions',
    tier: 'silver',
    maxProgress: 100,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Solve any calculation correctly in under 1.5 seconds',
    tier: 'bronze',
    maxProgress: 1,
  },
  {
    id: 'streak_7_day',
    title: '7-Day Streak',
    description: 'Practice calculations for 7 consecutive days',
    tier: 'gold',
    maxProgress: 7,
  },
  {
    id: 'perfect_daily_challenge',
    title: 'Flawless Day',
    description: 'Complete a Daily Challenge with 100% accuracy',
    tier: 'platinum',
    maxProgress: 1,
  },
  {
    id: 'combo_king_10',
    title: 'Combo King',
    description: 'Reach a 10x consecutive combo streak',
    tier: 'silver',
    maxProgress: 10,
  },
  {
    id: 'reach_grandmaster',
    title: 'Apex Grandmaster',
    description: 'Attain Level 40 and unlock Grandmaster title',
    tier: 'platinum',
    maxProgress: 40,
  },
  {
    id: 'century_club_1000',
    title: 'Calculation Marathon',
    description: 'Solve 1,000 total math calculation questions',
    tier: 'gold',
    maxProgress: 1000,
  },
];

/**
 * Evaluates achievement statuses against user profile and session parameters
 */
export function evaluateAchievements(
  profile: UserProfile,
  extras: {
    sessionMaxCombo?: number;
    latestResponseTimeMs?: number;
    hasTableMastered?: boolean;
    isDailyFlawless?: boolean;
  } = {}
): Achievement[] {
  const unlockedSet = new Set(profile.unlockedAchievements);

  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    let currentProgress = 0;
    let isConditionMet = unlockedSet.has(def.id);

    switch (def.id) {
      case 'first_table_mastered':
        currentProgress = extras.hasTableMastered ? 1 : 0;
        if (extras.hasTableMastered) isConditionMet = true;
        break;
      case 'century_club':
        currentProgress = Math.min(100, profile.totalQuestionsAnswered);
        if (profile.totalQuestionsAnswered >= 100) isConditionMet = true;
        break;
      case 'speed_demon':
        currentProgress = (profile.fastestResponseTimeMs > 0 && profile.fastestResponseTimeMs < 1500) || (extras.latestResponseTimeMs !== undefined && extras.latestResponseTimeMs < 1500) ? 1 : 0;
        if (currentProgress >= 1) isConditionMet = true;
        break;
      case 'streak_7_day':
        currentProgress = Math.min(7, profile.currentStreak);
        if (profile.currentStreak >= 7) isConditionMet = true;
        break;
      case 'perfect_daily_challenge':
        currentProgress = profile.dailyChallengesFlawless > 0 || extras.isDailyFlawless ? 1 : 0;
        if (currentProgress >= 1) isConditionMet = true;
        break;
      case 'combo_king_10':
        currentProgress = Math.min(10, extras.sessionMaxCombo ?? 0);
        if (currentProgress >= 10) isConditionMet = true;
        break;
      case 'reach_grandmaster':
        currentProgress = Math.min(40, profile.level);
        if (profile.level >= 40) isConditionMet = true;
        break;
      case 'century_club_1000':
        currentProgress = Math.min(1000, profile.totalQuestionsAnswered);
        if (profile.totalQuestionsAnswered >= 1000) isConditionMet = true;
        break;
    }

    const isUnlocked = isConditionMet || unlockedSet.has(def.id);

    return {
      ...def,
      currentProgress: isUnlocked ? def.maxProgress : currentProgress,
      isUnlocked,
      unlockedAt: isUnlocked ? Date.now() : null,
    };
  });
}
