import { MathOperator, DifficultyTier, Question } from '../../core/math/types';

export interface RouletteCandidate {
  readonly id: string;
  readonly weaknessScore: number;
}

export interface RouletteWheel {
  readonly candidates: readonly RouletteCandidate[];
  readonly prefixSums: readonly number[];
  readonly totalWeight: number;
  readonly gamma: number;
}

export interface AdaptiveEndlessConfig {
  readonly domain: 'tables' | 'operations' | 'all';
  readonly selectedTables?: readonly number[];
  readonly selectedOperators?: readonly MathOperator[];
  readonly inputMode: 'choice' | 'direct';
  readonly initialLevel?: number;
  readonly explorationRate?: number;  // default 0.20
  readonly gamma?: number;            // default 1.5
  readonly recencyBufferSize?: number;// default 4
  readonly ddaWindowSize?: number;    // default 10
}

export interface AdaptiveQuestion extends Question {
  readonly source: 'weakness_roulette' | 'exploration';
  readonly weaknessScore?: number;
}

export interface DdaDecision {
  readonly action: 'promote' | 'demote' | 'maintain';
  readonly newLevel: number;
  readonly newDifficulty: DifficultyTier;
  readonly rollingAccuracy: number;
  readonly rollingAvgTimeMs: number;
  readonly reason?: string;
}

export interface WeaknessQueueOptions {
  readonly targetCount?: number;      // 10..20, default 15
  readonly topK?: number;             // 3..10, default 5
  readonly difficulty?: DifficultyTier;
  readonly inputMode?: 'choice' | 'direct';
  readonly operatorFilter?: MathOperator;
}

export interface ConqueredFactDelta {
  readonly factId: string;
  readonly equation: string;
  readonly initialScore: number;
  readonly finalScore: number;
  readonly attempts: number;
  readonly accuracy: number;
  readonly improved: boolean;
}

export interface WeaknessSessionSummary {
  readonly totalQuestions: number;
  readonly correctFirstTry: number;
  readonly accuracyPercentage: number;
  readonly averageResponseTimeMs: number;
  readonly maxCombo: number;
  readonly conqueredDeltas: readonly ConqueredFactDelta[];
  readonly totalXpGained: number;
  readonly elapsedTimeMs: number;
}
