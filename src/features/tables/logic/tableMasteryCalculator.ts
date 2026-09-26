import {
  FactStat,
  TableMasteryReport,
  TableMasteryBadge,
  TableQuestionAttempt,
} from '../types';

export interface FactMasteryComponents {
  readonly accuracyScore: number;  // Max 50
  readonly speedScore: number;     // Max 30
  readonly streakScore: number;    // Max 20
  readonly totalScore: number;     // 0..100
}

/**
 * Calculates the individual fact mastery components and total score (0–100%).
 * Weights:
 * - Accuracy: 50% (Max 50 points, target 90% accuracy, confidence dampener N/3)
 * - Speed: 30% (Max 30 points, target <= 3000ms, cutoff >= 6000ms, confidence dampener N/2)
 * - Consecutive Correct Streak: 20% (Max 20 points, target >= 3 consecutive)
 */
export function calculateFactMasteryComponents(stat: FactStat | null | undefined): FactMasteryComponents {
  if (!stat || stat.attempts <= 0) {
    return {
      accuracyScore: 0,
      speedScore: 0,
      streakScore: 0,
      totalScore: 0,
    };
  }

  const N = stat.attempts;
  const C = Math.max(0, stat.correctCount);
  const S = Math.max(0, stat.consecutiveCorrect);
  const RT = stat.avgResponseTimeMs;

  // 1. Accuracy Score (Max 50)
  const accuracy = N > 0 ? C / N : 0;
  const volumeDampenerAcc = Math.min(1, N / 3);
  const accuracyRatio = Math.min(1, accuracy / 0.90);
  const accuracyScore = 50 * accuracyRatio * volumeDampenerAcc;

  // 2. Speed Score (Max 30)
  const volumeDampenerSpeed = Math.min(1, N / 2);
  let speedScore = 0;
  if (RT > 0 && RT < 6000) {
    if (RT <= 3000) {
      speedScore = 30 * volumeDampenerSpeed;
    } else {
      const speedRatio = (6000 - RT) / 3000;
      speedScore = 30 * Math.max(0, speedRatio) * volumeDampenerSpeed;
    }
  }

  // 3. Streak Score (Max 20)
  const streakRatio = Math.min(1, S / 3);
  const streakScore = 20 * streakRatio;

  // Composite 0..100 clamped
  const rawTotal = accuracyScore + speedScore + streakScore;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  return {
    accuracyScore: Math.round(accuracyScore * 100) / 100,
    speedScore: Math.round(speedScore * 100) / 100,
    streakScore: Math.round(streakScore * 100) / 100,
    totalScore,
  };
}

export function calculateFactMastery(stat: FactStat | null | undefined): number {
  return calculateFactMasteryComponents(stat).totalScore;
}

export function getMasteryBadge(percentage: number): TableMasteryBadge {
  if (percentage >= 90) return 'mastered';
  if (percentage >= 50) return 'practicing';
  return 'novice';
}

export function isFactWeak(stat: FactStat): boolean {
  if (!stat || stat.attempts <= 0) return false;
  const accuracy = stat.correctCount / stat.attempts;
  const isLowAccuracy = stat.attempts >= 2 && accuracy < 0.75;
  const isSlow = stat.attempts >= 2 && stat.avgResponseTimeMs > 4500;
  const hasRecentMistake = stat.attempts >= 1 && stat.consecutiveCorrect === 0;
  const isLowMastery = stat.attempts >= 1 && stat.masteryScore < 50;

  return isLowAccuracy || isSlow || hasRecentMistake || isLowMastery;
}

export function calculateWeaknessPriorityScore(stat: FactStat): number {
  if (!stat || stat.attempts <= 0) return 0;
  const mistakes = Math.max(0, stat.attempts - stat.correctCount);
  const recentMistakePenalty = stat.consecutiveCorrect === 0 ? 25 : 0;
  const mistakeVolumePenalty = Math.min(20, mistakes * 5);
  const masteryDeficit = 100 - stat.masteryScore;

  return masteryDeficit + recentMistakePenalty + mistakeVolumePenalty;
}

export interface TableReportOptions {
  readonly tableNumber: number;
  readonly multiplierMin?: number;
  readonly multiplierMax?: number;
  readonly factStats: Record<string, FactStat>;
}

export function calculateTableMasteryReport(options: TableReportOptions): TableMasteryReport {
  const {
    tableNumber,
    multiplierMin = 1,
    multiplierMax = 10,
    factStats,
  } = options;

  const minM = Math.min(multiplierMin, multiplierMax);
  const maxM = Math.max(multiplierMin, multiplierMax);
  const totalFacts = maxM - minM + 1;

  let sumMastery = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalResponseTime = 0;
  let factsMastered = 0;

  for (let m = minM; m <= maxM; m++) {
    const factId = `mul_${tableNumber}_${m}`;
    const stat = factStats[factId];
    if (stat && stat.attempts > 0) {
      const factMastery = stat.masteryScore ?? calculateFactMastery(stat);
      sumMastery += factMastery;
      totalAttempts += stat.attempts;
      totalCorrect += stat.correctCount;
      totalResponseTime += stat.totalResponseTimeMs;
      if (factMastery >= 90) {
        factsMastered++;
      }
    }
  }

  const masteryPercentage = totalFacts > 0 ? Math.round(sumMastery / totalFacts) : 0;
  const accuracyPercentage = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const avgResponseTimeMs = totalAttempts > 0 ? Math.round(totalResponseTime / totalAttempts) : 0;
  const statusBadge = getMasteryBadge(masteryPercentage);

  return {
    tableNumber,
    masteryPercentage,
    statusBadge,
    totalAttempts,
    accuracyPercentage,
    avgResponseTimeMs,
    factsMastered,
    totalFacts,
    factStats,
  };
}

/**
 * Determines whether a question response took significantly longer than normal.
 * Uses the user's session baseline (median) and complexity buffer.
 */
export function isAttemptSlow(
  solveTimeMs: number,
  baselineMs: number,
  table: number,
  multiplier: number
): boolean {
  const base = Math.max(2000, baselineMs);
  const complexityBuffer = table > 12 || multiplier > 12 ? 1500 : 0;
  const threshold = Math.max(3500 + complexityBuffer, base * 1.8);
  return solveTimeMs > threshold;
}

/**
 * Calculates priority score for weakness practice:
 * 1. More wrong attempts (highest priority: 100 pts per wrong attempt)
 * 2. Much slower response time (15 pts per sec over baseline)
 * 3. Repeated historical mistakes & low accuracy
 */
export function calculateSessionWeaknessScore(
  attempt: TableQuestionAttempt,
  baselineMs: number,
  historicalStat?: FactStat | null
): number {
  let score = 0;

  // 1. Wrong attempts weight
  const wrongCount = attempt.wrongAttempts ?? (attempt.isCorrectFirstTry ? 0 : 1);
  score += wrongCount * 100;

  // 2. Slow response time weight
  const base = Math.max(2000, baselineMs);
  if (attempt.solveTimeMs > base) {
    const extraSeconds = (attempt.solveTimeMs - base) / 1000;
    score += Math.round(extraSeconds * 15);
  }

  // 3. Historical mistakes & low accuracy
  if (historicalStat && historicalStat.attempts > 0) {
    const histAccuracy = historicalStat.correctCount / historicalStat.attempts;
    if (histAccuracy < 1) {
      score += Math.round((1 - histAccuracy) * 40);
    }
    if (historicalStat.consecutiveCorrect === 0) {
      score += 20;
    }
  }

  return score;
}
