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
 * Threshold(L) = floor(500 * (L - 1)^1.5) for L in [2, 50]
 */
export const LEVEL_XP_THRESHOLDS: readonly number[] = Object.freeze(
  Array.from({ length: 50 }, (_, i) => {
    const level = i + 1;
    if (level === 1) return 0;
    return Math.floor(500 * Math.pow(level - 1, 1.5));
  })
);

/**
 * Resolves player level from cumulative XP
 */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0 || !isFinite(totalXp)) return 1;
  const maxPrecomputed = LEVEL_XP_THRESHOLDS[49]; // Level 50 threshold: 171500
  if (totalXp >= maxPrecomputed) {
    let est = Math.floor(Math.pow(totalXp / 500, 2 / 3)) + 1;
    while (Math.floor(500 * Math.pow(est, 1.5)) <= totalXp) {
      est++;
    }
    while (est > 1 && Math.floor(500 * Math.pow(est - 1, 1.5)) > totalXp) {
      est--;
    }
    return est;
  }
  for (let lvl = 49; lvl >= 1; lvl--) {
    if (totalXp >= LEVEL_XP_THRESHOLDS[lvl - 1]) {
      return lvl;
    }
  }
  return 1;
}

/**
 * Exactly 100 player rank titles (Levels 1 to 100)
 */
export const LEVEL_TITLES_MAP: readonly string[] = Object.freeze([
  'Beginner',               // 1
  'Learner',                // 2
  'Starter',                // 3
  'Rookie',                 // 4
  'Trainee',                // 5
  'Apprentice',             // 6
  'Student',                // 7
  'Solver',                 // 8
  'Number Solver',          // 9
  'Math Solver',            // 10
  'Thinker',                // 11
  'Quick Thinker',          // 12
  'Number Thinker',         // 13
  'Math Thinker',           // 14
  'Calculator',             // 15
  'Fast Calculator',        // 16
  'Number Calculator',      // 17
  'Mental Calculator',      // 18
  'Mental Math Learner',    // 19
  'Mental Math Solver',     // 20
  'Number Explorer',        // 21
  'Math Explorer',          // 22
  'Calculation Explorer',   // 23
  'Table Explorer',         // 24
  'Number Apprentice',      // 25
  'Math Apprentice',        // 26
  'Calculation Apprentice', // 27
  'Table Apprentice',       // 28
  'Number Warrior',         // 29
  'Math Warrior',           // 30
  'Calculation Warrior',    // 31
  'Table Warrior',          // 32
  'Number Fighter',         // 33
  'Math Fighter',           // 34
  'Calculation Fighter',    // 35
  'Table Fighter',          // 36
  'Number Challenger',      // 37
  'Math Challenger',        // 38
  'Calculation Challenger', // 39
  'Table Challenger',       // 40
  'Number Specialist',      // 41
  'Math Specialist',        // 42
  'Calculation Specialist', // 43
  'Table Specialist',       // 44
  'Mental Math Specialist', // 45
  'Speed Specialist',       // 46
  'Number Expert',          // 47
  'Math Expert',            // 48
  'Calculation Expert',     // 49
  'Table Expert',           // 50
  'Calculator',             // 51
  'Quick Thinker',          // 52
  'Number Runner',          // 53
  'Math Runner',            // 54
  'Number Hunter',          // 55
  'Math Hunter',            // 56
  'Calculation Hunter',     // 57
  'Quick Solver',           // 58
  'Fast Solver',            // 59
  'Speed Solver',           // 60
  'Calculation Master',     // 61
  'Number Master',          // 62
  'Math Master',            // 63
  'Table Master',           // 64
  'Table Expert',           // 65
  'Math Expert',            // 66
  'Calculation Expert',     // 67
  'Number Expert',          // 68
  'Mental Math Expert',     // 69
  'Speed Expert',           // 70
  'Calculation Specialist', // 71
  'Number Specialist',      // 72
  'Math Specialist',        // 73
  'Table Specialist',       // 74
  'Mental Math Specialist', // 75
  'Speed Specialist',       // 76
  'Number Champion',        // 77
  'Math Champion',          // 78
  'Calculation Champion',   // 79
  'Table Champion',         // 80
  'Mental Math Champion',   // 81
  'Speed Champion',         // 82
  'Number Mastermind',      // 83
  'Math Mastermind',        // 84
  'Calculation Mastermind', // 85
  'Table Mastermind',       // 86
  'Mental Math Mastermind', // 87
  'Speed Mastermind',       // 88
  'Number Genius',          // 89
  'Math Genius',            // 90
  'Calculation Genius',     // 91
  'Table Genius',           // 92
  'Mental Math Genius',     // 93
  'Speed Genius',           // 94
  'Number Legend',          // 95
  'Math Legend',            // 96
  'Calculation Legend',     // 97
  'Table Legend',           // 98
  'Mental Math Legend',     // 99
  'Math Master',            // 100
]);

/**
 * Resolves rank title for a given level:
 * - Levels 1–100 mapped to specific titles
 * - Greater than 100 returns 'Grandmaster'
 */
export function getTitleForLevel(level: number): PlayerRankTitle {
  if (level > 100) return 'Grandmaster';
  if (level <= 0) return 'Beginner';
  return LEVEL_TITLES_MAP[level - 1] || 'Grandmaster';
}

/**
 * Computes level progress details and progress percentage
 */
export function getLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, isFinite(totalXp) ? totalXp : 0);
  const level = getLevelFromXp(safeXp);
  const getThreshold = (lvl: number): number => {
    if (lvl <= 1) return 0;
    if (lvl <= 50) return LEVEL_XP_THRESHOLDS[lvl - 1];
    return Math.floor(500 * Math.pow(lvl - 1, 1.5));
  };

  const currentThreshold = getThreshold(level);
  const nextThreshold = getThreshold(level + 1);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const xpInLevel = Math.max(0, safeXp - currentThreshold);
  const progressPercent = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return {
    level,
    title: getTitleForLevel(level),
    currentLevelXp: currentThreshold,
    nextLevelXp: nextThreshold,
    xpInCurrentLevel: xpInLevel,
    xpNeededForNextLevel: xpNeeded,
    progressPercentage: progressPercent,
    isMaxLevel: false,
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
