import { DifficultyTier, Question, IPRNG } from '../../core/math/types';

/**
 * Standard table presets:
 * 1–10, 1–20, 1–30, 1–43, 1–50, 1–100
 */
export type TablePresetId =
  | '1-10'
  | '1-20'
  | '1-30'
  | '1-43'
  | '1-50'
  | '1-100'
  | 'custom';

export interface TablePresetConfig {
  readonly id: TablePresetId;
  readonly label: string;
  readonly title: string;
  readonly min: number;
  readonly max: number;
  readonly tableCount: number;
}

export const TABLE_PRESET_CONFIGS: readonly TablePresetConfig[] = [
  { id: '1-10', label: '1–10', title: 'Foundational', min: 1, max: 10, tableCount: 10 },
  { id: '1-20', label: '1–20', title: 'Elementary', min: 1, max: 20, tableCount: 20 },
  { id: '1-30', label: '1–30', title: 'Intermediate', min: 1, max: 30, tableCount: 30 },
  { id: '1-43', label: '1–43', title: 'Mastery Range', min: 1, max: 43, tableCount: 43 },
  { id: '1-50', label: '1–50', title: 'Advanced', min: 1, max: 50, tableCount: 50 },
  { id: '1-100', label: '1–100', title: 'Century Pro', min: 1, max: 100, tableCount: 100 },
] as const;

export const TABLE_PRESETS = TABLE_PRESET_CONFIGS;

/**
 * Multiplier preset options
 */
export type MultiplierPresetId = '1-10' | '1-12' | '1-20' | 'custom';

export interface MultiplierPresetConfig {
  readonly id: MultiplierPresetId;
  readonly label: string;
  readonly subtitle: string;
  readonly min: number;
  readonly max: number;
}

export const MULTIPLIER_PRESET_CONFIGS: readonly MultiplierPresetConfig[] = [
  { id: '1-10', label: '×1–×10', subtitle: 'Standard 10', min: 1, max: 10 },
  { id: '1-12', label: '×1–×12', subtitle: 'Classical 12', min: 1, max: 12 },
  { id: '1-20', label: '×1–×20', subtitle: 'Extended 20', min: 1, max: 20 },
] as const;

export const MULTIPLIER_PRESETS = MULTIPLIER_PRESET_CONFIGS;

export interface NumberRange {
  readonly min: number;
  readonly max: number;
}

export type TableSelectionMode = 'preset' | 'range' | 'multi';
export type TablePracticeInputMode = 'choice' | 'direct';
export type PracticeInputMode = TablePracticeInputMode;
export type TableSessionStatus = 'CONFIGURING' | 'LEARN' | 'PRACTICING' | 'SUMMARY';
export type TableMasteryBadge = 'novice' | 'practicing' | 'mastered';
export type LearnViewType = 'sheet' | 'flashcard';
export type ReviewTimerDuration = 0 | 10 | 20 | 30 | 60; // 0 represents manual mode

export interface TableSessionConfig {
  readonly selectedTables: readonly number[];
  readonly selectionMode: TableSelectionMode;
  readonly activePreset: TablePresetId;
  readonly customTableRange: NumberRange;
  readonly multiplierPreset: MultiplierPresetId;
  readonly multiplierRange: NumberRange;
  readonly difficulty: DifficultyTier;
  readonly inputMode: TablePracticeInputMode;
  readonly questionTarget: number; // 10, 20, 25, 50, 100
}

export type TableConfig = TableSessionConfig;

/**
 * Ordered fact representation for Learn Mode
 */
export interface TableFact {
  readonly id: string;
  readonly table: number;
  readonly multiplier: number;
  readonly answer: number;
  readonly promptText: string;
  readonly fullEquation: string;
  readonly isSquare: boolean;
  readonly isMilestone: boolean;
  readonly breakdownHint: string;
}

export interface FlashcardConfidence {
  readonly factId: string;
  readonly status: 'unseen' | 'learning' | 'mastered';
  readonly reviewCount: number;
}

/**
 * Question Model extending Question
 */
export interface TableQuestion extends Question {
  readonly factId: string;
  readonly table: number;
  readonly multiplier: number;
  readonly options: number[];
  readonly correctIndex: number;
  readonly distractorSources?: string[];
}

export interface TableQuestionAttempt {
  readonly questionId: string;
  readonly factId: string;
  readonly question: TableQuestion;
  readonly firstUserAnswer: number;
  readonly finalUserAnswer: number;
  readonly isCorrectFirstTry: boolean;
  readonly totalAttempts: number;
  readonly mistakeAnswers: number[];
  readonly responseTimeMs: number;
  readonly solveTimeMs: number;
  readonly timestamp: number;
}

/**
 * Telemetry and Mastery Tracking Models
 */
export interface FactStat {
  readonly factId: string;
  readonly table: number;
  readonly multiplier: number;
  readonly attempts: number;
  readonly correctCount: number;
  readonly consecutiveCorrect: number;
  readonly totalResponseTimeMs: number;
  readonly avgResponseTimeMs: number;
  readonly lastResponseTimeMs: number;
  readonly lastAttemptTimestamp: number;
  readonly masteryScore: number;
}

export interface TableMasteryReport {
  readonly tableNumber: number;
  readonly masteryPercentage: number;
  readonly statusBadge: TableMasteryBadge;
  readonly totalAttempts: number;
  readonly accuracyPercentage: number;
  readonly avgResponseTimeMs: number;
  readonly factsMastered: number;
  readonly totalFacts: number;
  readonly factStats: Record<string, FactStat>;
}

export interface TableSessionSummary {
  readonly tableNumbers: number[];
  readonly totalQuestions: number;
  readonly correctFirstTryCount: number;
  readonly accuracyPercentage: number;
  readonly averageResponseTimeMs: number;
  readonly maxCombo: number;
  readonly totalXpGained: number;
  readonly elapsedTimeMs: number;
  readonly newlyMasteredTables: number[];
  readonly weakFactsEncountered: string[];
}

export interface TableQueueBuildOptions {
  readonly selectedTables: readonly number[];
  readonly multiplierRange: { min: number; max: number };
  readonly questionCount: number;
  readonly difficulty?: DifficultyTier;
  readonly allowCommutativeSwap?: boolean;
  readonly prng?: IPRNG;
}
