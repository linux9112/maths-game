/**
 * Domain models and interface definitions for Operations Practice.
 */

export type MathOperator = '+' | '-' | '*' | '/';

export const ALL_OPERATORS: readonly MathOperator[] = ['+', '-', '*', '/'] as const;

export type OperationLevel = 1 | 2 | 3 | 4 | 5;

export type PracticeInputMode = 'choice' | 'direct';

export type SessionStatus = 'CONFIGURING' | 'PRACTICING' | 'SUMMARY';

export interface OperatorMeta {
  readonly symbol: string;      // Display symbol: '+', '−', '×', '÷'
  readonly name: string;        // 'Addition', 'Subtraction', 'Multiplication', 'Division'
  readonly shortName: string;   // 'Add', 'Sub', 'Mul', 'Div'
  readonly accentColor: string; // Color token
}

export const OPERATOR_METAS: Record<MathOperator, OperatorMeta> = {
  '+': {
    symbol: '+',
    name: 'Addition',
    shortName: 'Add',
    accentColor: 'indigo',
  },
  '-': {
    symbol: '−', // Unicode minus sign \u2212
    name: 'Subtraction',
    shortName: 'Sub',
    accentColor: 'rose',
  },
  '*': {
    symbol: '×', // Unicode times sign \u00D7
    name: 'Multiplication',
    shortName: 'Mul',
    accentColor: 'amber',
  },
  '/': {
    symbol: '÷', // Unicode division sign \u00F7
    name: 'Division',
    shortName: 'Div',
    accentColor: 'emerald',
  },
};

export interface LevelDescription {
  readonly level: OperationLevel;
  readonly name: string; // 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Master'
  readonly badgeColor: string;
  readonly difficultyTier: 'easy' | 'normal' | 'hard' | 'expert';
  readonly descriptions: Record<MathOperator, string>;
  readonly overallSummary: string;
}

export const LEVEL_CONFIGS: Record<OperationLevel, LevelDescription> = {
  1: {
    level: 1,
    name: 'Beginner',
    badgeColor: 'emerald',
    difficultyTier: 'easy',
    descriptions: {
      '+': 'Single-digit addition (1–9 + 1–9, sums up to 18)',
      '-': 'Single-digit subtraction (non-negative answers, a ≥ b)',
      '*': 'Single-digit multiplication facts (1–9 × 1–9)',
      '/': 'Basic integer division (divisors 2–5, quotients 1–10)',
    },
    overallSummary: 'Single-digit foundational arithmetic facts',
  },
  2: {
    level: 2,
    name: 'Elementary',
    badgeColor: 'sky',
    difficultyTier: 'normal',
    descriptions: {
      '+': 'Two-digit addition without carry (column sums ≤ 9)',
      '-': 'Two-digit subtraction without borrowing',
      '*': 'Standard times tables (multipliers up to 12 × 12)',
      '/': 'Standard table division facts (divisors up to 10)',
    },
    overallSummary: 'Two-digit facts without regrouping & tables 1–12',
  },
  3: {
    level: 3,
    name: 'Intermediate',
    badgeColor: 'indigo',
    difficultyTier: 'normal',
    descriptions: {
      '+': 'Two-digit addition with carry / regrouping (sums to 198)',
      '-': 'Two-digit subtraction with borrowing',
      '*': 'Extended tables and teens (facts up to 20 × 20)',
      '/': 'Extended division (divisors 3–15, quotients up to 20)',
    },
    overallSummary: 'Regrouping & carries, extended tables up to 20',
  },
  4: {
    level: 4,
    name: 'Advanced',
    badgeColor: 'amber',
    difficultyTier: 'hard',
    descriptions: {
      '+': 'Three-digit addition (100–999 + 100–999)',
      '-': 'Three-digit & four-digit subtraction with regrouping',
      '*': 'Two-digit by 1-digit or friendly tens (e.g. 34 × 7)',
      '/': 'Double-digit divisors (divisors 11–35, quotients to 50)',
    },
    overallSummary: 'Multi-digit arithmetic & double-digit divisors',
  },
  5: {
    level: 5,
    name: 'Master',
    badgeColor: 'purple',
    difficultyTier: 'expert',
    descriptions: {
      '+': 'Four-digit addition (1,000–9,999)',
      '-': 'Complex four-digit subtraction with multiple borrows',
      '*': 'Two-digit by two-digit mental multiplication (e.g. 43 × 27)',
      '/': 'Mental division mastery (divisors 12–99, quotients 12–99)',
    },
    overallSummary: 'Expert multi-digit mental calculation & fast division',
  },
};

export interface OperationQuestion {
  readonly id: string;
  readonly operator: MathOperator;
  readonly operandA: number;
  readonly operandB: number;
  readonly answer: number;
  readonly promptText: string;
  readonly options: number[]; // exactly 4 items for Mode A
  readonly correctIndex: number; // 0..3
  readonly difficulty: 'easy' | 'normal' | 'hard' | 'expert';
  readonly level: OperationLevel;
}

export interface QuestionAttempt {
  readonly questionId: string;
  readonly question: OperationQuestion;
  readonly firstUserAnswer: number;
  readonly finalUserAnswer: number;
  readonly isCorrectFirstTry: boolean;
  readonly totalAttempts: number;
  readonly mistakeAnswers: number[];
  readonly responseTimeMs: number; // time to first attempt
  readonly solveTimeMs: number;    // time to correct answer
  readonly timestamp: number;
}

export interface OperationSessionConfig {
  selectedOperators: MathOperator[];
  level: OperationLevel;
  inputMode: PracticeInputMode;
  questionCount: number; // 10, 20, 50
}

export interface OperationSessionSummary {
  readonly totalQuestions: number;
  readonly correctFirstTryCount: number;
  readonly accuracyPercentage: number;
  readonly averageResponseTimeMs: number;
  readonly maxCombo: number;
  readonly totalXpGained: number;
  readonly operatorBreakdown: Record<MathOperator, { total: number; correct: number }>;
  readonly elapsedTimeMs: number;
}
