
export type PlayerRankTitle =
  | 'Novice'
  | 'Math Explorer'
  | 'Calculation Specialist'
  | 'Mental Math Wizard'
  | 'Grandmaster';

export interface UserProfile {
  readonly id: string;
  readonly xp: number;
  readonly level: number;
  readonly levelTitle: PlayerRankTitle;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly lastActiveDateKey: string | null;
  readonly totalQuestionsAnswered: number;
  readonly totalCorrectAnswers: number;
  readonly fastestResponseTimeMs: number;
  readonly unlockedAchievements: readonly string[];
  readonly dailyChallengesCompleted: number;
  readonly dailyChallengesFlawless: number;
}

export interface LevelProgress {
  readonly level: number;
  readonly title: PlayerRankTitle;
  readonly currentLevelXp: number;
  readonly nextLevelXp: number;
  readonly xpInCurrentLevel: number;
  readonly xpNeededForNextLevel: number;
  readonly progressPercentage: number;
  readonly isMaxLevel: boolean;
}

export interface XpBreakdown {
  readonly totalXp: number;
  readonly baseXp: number;
  readonly comboMultiplier: number;
  readonly difficultyMultiplier: number;
  readonly speedBonus: number;
}

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  readonly maxProgress: number;
  readonly currentProgress: number;
  readonly isUnlocked: boolean;
  readonly unlockedAt: number | null;
}

export interface MidnightCountdown {
  readonly totalSeconds: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly formatted: string;
}
