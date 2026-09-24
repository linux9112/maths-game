import { MathOperator, DifficultyTier, QuestionCategory } from '../math/types';

/**
 * Record of an individual calculation attempt for longitudinal telemetry
 */
export interface CalculationAttempt {
  id?: number;                  // Auto-increment primary key (++id)
  factId: string;               // Canonical fact identifier e.g. "mul_7_8", "add_23_45", "div_48_6"
  operator: MathOperator;       // '+' | '-' | '*' | '/'
  operandA: number;             // First operand (or dividend for division)
  operandB: number;             // Second operand (or divisor for division)
  expectedAnswer: number;       // Mathematical ground truth
  userAnswer: number;           // User's answer input
  isCorrect: boolean;           // True if answered correctly on first try
  responseTimeMs: number;       // Latency in milliseconds from prompt presentation to first input
  solveTimeMs: number;          // Total elapsed time until question advanced
  timestamp: number;            // Date.now() timestamp (epoch milliseconds)
  mode: QuestionCategory;       // 'table' | 'arithmetic' | 'daily' | 'weakness' | 'game'
  mistakeCount?: number;        // Total incorrect inputs before advancing (e.g. in Mode B)
  difficulty?: DifficultyTier;  // 'easy' | 'normal' | 'hard' | 'expert'
  inputMode?: 'choice' | 'direct'; // Mode A vs Mode B
}

/**
 * Aggregated rolling statistics and weakness scores for each canonical fact
 */
export interface CalculationStatRecord {
  factId: string;               // Primary key (e.g. "mul_7_8", "add_15_27")
  operator: MathOperator;       // '+' | '-' | '*' | '/'
  operandA: number;             // Operand A (or table number)
  operandB: number;             // Operand B (or multiplier)
  attempts: number;             // Total attempts count (N)
  mistakes: number;             // Total incorrect attempts (M)
  correctCount: number;         // Total correct attempts (C = N - M)
  consecutiveCorrect: number;   // Current unbroken correct streak
  totalResponseTimeMs: number;  // Cumulative response time across all attempts
  avgResponseTimeMs: number;    // Mean response time: totalResponseTimeMs / attempts
  lastResponseTimeMs: number;   // Response time on most recent attempt
  errorRate: number;            // Laplace smoothed error rate: E = (mistakes + 1) / (attempts + 2)
  latencyMultiplier: number;    // Latency factor: L = 1 + ln(1 + avgRT / 1000)
  weaknessScore: number;        // Composite weakness score: W = E * L (clamped)
  masteryScore: number;         // Pedagogical mastery score (0–100)
  firstPracticed: number;       // Epoch ms of first attempt
  lastPracticed: number;        // Epoch ms of most recent attempt
}

/**
 * Persistent progression profile record
 */
export interface UserProfileRecord {
  id: string;                   // Primary key (default 'player_1')
  xp: number;                   // Lifetime experience points
  level: number;                // Player level (1 to 50+)
  title: string;                // Progression title (e.g. "Mental Math Explorer")
  currentStreak: number;        // Current daily streak (consecutive calendar days)
  bestStreak: number;           // All-time best streak record
  lastActiveDate: string;       // Calendar date 'YYYY-MM-DD' of last active session
  totalQuestionsAnswered: number; // Lifetime questions completed
  totalCorrect: number;         // Lifetime correct answers
  totalPlayTimeSec: number;     // Lifetime accumulated active practice time
  unlockedAchievements: string[]; // List of unlocked achievement IDs
  createdAt: number;            // Account creation timestamp
  updatedAt: number;            // Last update timestamp
}

/**
 * Seeded daily challenge completion record
 */
export interface DailyChallengeRecord {
  dateKey: string;              // Primary key: calendar date 'YYYY-MM-DD'
  completed: boolean;           // True if user completed the daily challenge
  score: number;                // Questions answered correctly (e.g. 10/10)
  totalQuestions: number;       // Total questions in challenge (e.g. 10)
  accuracyPercentage: number;   // Accuracy: round((score / totalQuestions) * 100)
  timeSec: number;              // Completion time in seconds
  seed: number;                 // FNV-1a PRNG seed derived from dateKey
  xpAwarded: number;            // XP granted for completion + streak bonus
  completedAt?: number;         // Timestamp of completion
  questionResults?: boolean[];  // Individual question outcomes (10 booleans)
}

/**
 * Options for querying weak calculations
 */
export interface WeakCalculationQueryOptions {
  limit?: number;                 // Maximum items to return (default 10)
  operator?: MathOperator;        // Optional filter: '+' | '-' | '*' | '/'
  minAttempts?: number;           // Exclude unpracticed facts (default: 1)
  threshold?: number;             // Minimum weakness score to qualify as "weak" (default: 0.50)
}

/**
 * Unified storage repository interface
 */
export interface IWeaknessRepository {
  recordAttempt(attempt: CalculationAttempt): Promise<CalculationStatRecord>;
  getStat(factId: string): Promise<CalculationStatRecord | null>;
  getAllStats(): Promise<CalculationStatRecord[]>;
  getWeakCalculations(options?: WeakCalculationQueryOptions): Promise<CalculationStatRecord[]>;
  getUserProfile(): Promise<UserProfileRecord>;
  saveUserProfile(patch: Partial<UserProfileRecord>): Promise<UserProfileRecord>;
  getDailyChallenge(dateKey: string): Promise<DailyChallengeRecord | null>;
  saveDailyChallenge(record: DailyChallengeRecord): Promise<void>;
  getAllAttempts(limit?: number): Promise<CalculationAttempt[]>;
  clearAll(): Promise<void>;
}
