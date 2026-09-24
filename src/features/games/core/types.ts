import { MathOperator, Question } from '../../../core/math/types';
import { CalculationAttempt } from '../../../core/storage/types';

/**
 * 7-State Lifecycle State Machine
 */
export type GameLifecycleStatus =
  | 'IDLE'         // Initial uninitialized state
  | 'PRE_FLIGHT'   // Pre-launch configuration modal open
  | 'COUNTDOWN'    // 3-2-1-GO audio countdown
  | 'PLAYING'      // Active gameplay in progress
  | 'PAUSED'       // Suspended game (timer stopped, overlay open)
  | 'GAME_OVER'    // Defeat (lives exhausted or time expired)
  | 'VICTORY';     // Success (target questions completed or objective met)

/**
 * Difficulty tiers matching arithmetic & distractor generator
 */
export type GameDifficulty = 'beginner' | 'normal' | 'hard' | 'expert' | 'extreme';

/**
 * Target question lengths
 */
export type GameTargetLength = number | 'endless';

/**
 * Standard game time limits in seconds (null = untimed)
 */
export type GameTimeLimitSec = null | 30 | 60 | 90 | 120 | 180;

/**
 * Mistake / Life limits (null = unlimited)
 */
export type GameMistakeLimit = 1 | 3 | 5 | null;

/**
 * Standardized Configuration Model
 */
export interface GameConfig {
  readonly gameId: string;
  readonly title: string;
  readonly category: 'Speed' | 'Survival' | 'Memory' | 'Battles' | 'Challenges';
  readonly selectedOperators: readonly MathOperator[];
  readonly difficulty: GameDifficulty;
  readonly targetLength: GameTargetLength;
  readonly timeLimitSec: GameTimeLimitSec;
  readonly mistakeLimit: GameMistakeLimit;
  readonly isStressFree: boolean;
  readonly inputMode: 'choice' | 'direct';
}

/**
 * Mistake record for in-game tracking and review
 */
export interface GameMistakeItem {
  readonly question: Question;
  readonly userAnswer: number | string;
  readonly expectedAnswer: number;
  readonly responseTimeMs: number;
  readonly solveTimeMs: number;
  readonly timestamp: number;
  readonly pedagogicalHint: string;
}

/**
 * Full Unified Game Engine State
 */
export interface GameState {
  // Lifecycle
  readonly status: GameLifecycleStatus;
  readonly countdownValue: number; // 3, 2, 1, 0 (0 = GO)

  // Active Question
  readonly currentQuestion: Question | null;
  readonly questionIndex: number;
  readonly questionsAnswered: number;
  readonly questionsCorrectFirstTry: number;
  readonly targetQuestions: number | null; // null for Endless

  // Score & Multiplier
  readonly score: number;
  readonly combo: number;
  readonly maxCombo: number;
  readonly scoreMultiplier: number; // 1 + floor(combo / 5) * 0.25

  // Health / Lives
  readonly livesRemaining: number | null; // null for unlimited
  readonly maxLives: number | null;

  // Timers
  readonly elapsedTimeSec: number;
  readonly timeRemainingSec: number | null; // null for untimed
  readonly initialTimeLimitSec: number | null;

  // Mistakes & Telemetry
  readonly mistakeCount: number;
  readonly mistakeItems: readonly GameMistakeItem[];
  readonly attempts: readonly CalculationAttempt[];

  // Progression
  readonly totalXpEarned: number;

  // Stress-Free Mode & Hints
  readonly isStressFree: boolean;
  readonly hintActive: boolean;
  readonly currentHint: string | null;

  // UI Feedback States
  readonly feedback: 'idle' | 'correct' | 'incorrect';
  readonly shakeKey: number;
}

/**
 * Performance Grade Tiers
 */
export type PerformanceGrade = 'S' | 'A' | 'B' | 'C';

/**
 * Detailed Game Summary Results
 */
export interface GameSummaryData {
  readonly gameId: string;
  readonly gameTitle: string;
  readonly status: 'GAME_OVER' | 'VICTORY';
  readonly score: number;
  readonly performanceGrade: PerformanceGrade;
  readonly questionsAnswered: number;
  readonly questionsCorrectFirstTry: number;
  readonly accuracyPercentage: number;
  readonly elapsedTimeSec: number;
  readonly averageResponseTimeMs: number;
  readonly maxCombo: number;
  readonly peakMultiplier: number;
  readonly totalXpEarned: number;
  readonly xpBreakdown: {
    readonly baseXp: number;
    readonly comboBonusXp: number;
    readonly difficultyBonusXp: number;
    readonly speedBonusXp: number;
    readonly completionBonusXp: number;
  };
  readonly mistakeItems: readonly GameMistakeItem[];
  readonly completedAt: number;
}

/**
 * Configuration overrides for custom game engines
 */
export interface UseGameEngineOptions {
  readonly initialConfig?: Partial<GameConfig>;
  readonly customQuestionGenerator?: (config: GameConfig, index: number) => Question;
  readonly onGameOver?: (summary: GameSummaryData) => void;
  readonly onVictory?: (summary: GameSummaryData) => void;
}
