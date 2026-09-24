import { hashDateSeed, Mulberry32 } from '../../core/math/seedPrng';
import {
  generateAdditionFact,
  generateSubtractionFact,
  generateMultiplicationFact,
} from '../../core/math/arithmeticGenerator';
import { generateDivisionFact } from '../../core/math/divisionGenerator';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import { OPERATOR_SYMBOLS } from '../../core/math/types';
import { DailyChallenge, DailyChallengeQuestion, StreakUpdateResult } from './types';

/**
 * Standardized 10-question distribution specs
 */
const DAILY_SPECS = [
  { op: '+', level: 2, desc: 'Addition L2 (No Carry)' },
  { op: '+', level: 3, desc: 'Addition L3 (Carry)' },
  { op: '-', level: 2, desc: 'Subtraction L2 (No Borrow)' },
  { op: '-', level: 3, desc: 'Subtraction L3 (Borrow)' },
  { op: '*', level: 1, desc: 'Multiplication L1 (1-9 Table)' },
  { op: '*', level: 2, desc: 'Multiplication L2 (Teens / 12s)' },
  { op: '*', level: 3, desc: 'Multiplication L3 (1d x 2d)' },
  { op: '/', level: 1, desc: 'Division L1 (Basic Exact)' },
  { op: '/', level: 2, desc: 'Division L2 (2d / Teens Exact)' },
  { op: '/', level: 3, desc: 'Division L3 (3d Exact)' },
] as const;

/**
 * Generates deterministic 10-question Daily Challenge for given YYYY-MM-DD date
 */
export function generateDailyChallenge(dateStr: string): DailyChallenge {
  const seed = hashDateSeed(dateStr, 'math-daily-v1');
  const prng = new Mulberry32(seed);

  const questions: DailyChallengeQuestion[] = [];

  for (let i = 0; i < DAILY_SPECS.length; i++) {
    const spec = DAILY_SPECS[i];
    let fact;

    switch (spec.op) {
      case '+':
        fact = generateAdditionFact({ level: spec.level as any, prng });
        break;
      case '-':
        fact = generateSubtractionFact({ level: spec.level as any, prng });
        break;
      case '*':
        fact = generateMultiplicationFact({ level: spec.level as any, prng });
        break;
      case '/':
        fact = generateDivisionFact({ level: spec.level as any, allowRemainders: false, prng });
        break;
    }

    // Deterministic distractor generation using seeded Mulberry32
    const distractorResult = distractorEngine.generate({
      operator: fact.operator,
      operandA: fact.operandA,
      operandB: fact.operandB,
      answer: fact.answer,
      difficulty: 'normal',
      rng: () => prng.next(),
    });

    const opSymbol = OPERATOR_SYMBOLS[fact.operator];

    questions.push({
      ...fact,
      stepIndex: i,
      promptText: `${fact.operandA} ${opSymbol} ${fact.operandB} = ?`,
      displayOperator: opSymbol,
      options: distractorResult.allChoices,
      answerStr: String(fact.answer),
      difficulty: 'normal',
      category: 'daily',
    });
  }

  return { dateKey: dateStr, seed, questions };
}

/**
 * Calendar math utility to get previous date YYYY-MM-DD without DST distortion
 */
export function getPreviousCalendarDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
  const year = prevDate.getUTCFullYear();
  const month = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(prevDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates updated streak state based on previous active date
 */
export function calculateDailyStreak(
  lastActiveDate: string | null | undefined,
  completionDate: string,
  currentStreak: number,
  bestStreak: number
): StreakUpdateResult {
  if (lastActiveDate === completionDate) {
    return {
      nextStreak: currentStreak,
      nextBestStreak: bestStreak,
      isContinuation: false,
    };
  }

  const yesterday = getPreviousCalendarDate(completionDate);
  let nextStreak = 1;
  let isContinuation = false;

  if (lastActiveDate === yesterday) {
    nextStreak = currentStreak + 1;
    isContinuation = true;
  }

  const nextBestStreak = Math.max(bestStreak, nextStreak);
  return { nextStreak, nextBestStreak, isContinuation };
}

/**
 * Generates Wordle-style shareable emoji scorecard
 */
export function generateDailyScorecard(record: {
  dateKey: string;
  score: number;
  totalQuestions: number;
  timeSec: number;
  streak: number;
  questionResults?: boolean[];
}): string {
  const results = record.questionResults ?? [
    true, true, true, true, true, true, true, true, true, true,
  ];

  const addBoxes = results.slice(0, 2).map((r) => (r ? '🟩' : '🟥')).join('');
  const subBoxes = results.slice(2, 4).map((r) => (r ? '🟩' : '🟥')).join('');
  const mulBoxes = results.slice(4, 7).map((r) => (r ? '🟩' : '🟥')).join('');
  const divBoxes = results.slice(7, 10).map((r) => (r ? '🟩' : '🟥')).join('');

  const accuracy = Math.round((record.score / record.totalQuestions) * 100);

  return `🧮 Math Daily Challenge — ${record.dateKey}
Score: ${record.score}/${record.totalQuestions} ⭐ (${accuracy}%)
Time: ${record.timeSec.toFixed(1)}s ⚡
Streak: ${record.streak} days 🔥

${addBoxes} ➕ Addition
${subBoxes} ➖ Subtraction
${mulBoxes} ✖️ Multiplication
${divBoxes} ➗ Division

Play at: https://mathsgame.app`;
}
