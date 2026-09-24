import { FactStat } from '../tables/types';
import { UserProfile, LevelProgress, Achievement, MidnightCountdown } from '../progression/types';
import { DailyChallengeRecord } from '../../core/storage/types';

export interface DashboardStats {
  readonly profile: UserProfile;
  readonly levelProgress: LevelProgress;
  readonly todayQuestions: number;
  readonly todayCorrect: number;
  readonly overallAccuracyPercentage: number;
  readonly overallAverageResponseTimeMs: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly weakFacts: FactStat[];
  readonly masteredFactsCount: number; // 0..100 for 10x10
  readonly total10x10Facts: number;    // 100
  readonly heatmapStats: Record<string, FactStat>;
  readonly achievements: Achievement[];
  readonly dailyChallengeRecord: DailyChallengeRecord | null;
  readonly midnightCountdown: MidnightCountdown;
}
