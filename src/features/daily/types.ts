import { Question } from '../../core/math/types';

export interface DailyChallengeQuestion extends Question {
  readonly stepIndex: number; // 0..9
}

export interface DailyChallenge {
  readonly dateKey: string;   // "YYYY-MM-DD"
  readonly seed: number;
  readonly questions: readonly DailyChallengeQuestion[];
}

export interface DailyChallengeRecord {
  readonly dateKey: string;           // "YYYY-MM-DD"
  readonly completed: boolean;
  readonly score: number;             // 0..10
  readonly totalQuestions: number;    // 10
  readonly accuracyPercentage: number;// 0..100
  readonly timeSec: number;           // elapsed seconds
  readonly seed: number;
  readonly xpAwarded: number;
  readonly completedAt?: number;
  readonly questionResults?: boolean[]; // 10 booleans (correct on first try)
}

export interface DailyStreakState {
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly lastActiveDate: string | null;
}

export interface StreakUpdateResult {
  readonly nextStreak: number;
  readonly nextBestStreak: number;
  readonly isContinuation: boolean;
}
