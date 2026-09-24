import { MathOperator, DifficultyTier, OPERATOR_SYMBOLS } from '../../core/math/types';
import { generateArithmeticFact } from '../../core/math/arithmeticGenerator';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import {
  RouletteCandidate,
  RouletteWheel,
  AdaptiveEndlessConfig,
  AdaptiveQuestion,
  DdaDecision,
} from './types';
import { parseFactId } from './weaknessSessionBuilder';

/**
 * Builds a roulette wheel from candidates using power-law transformation W(f)^gamma
 */
export function buildRouletteWheel(
  candidates: readonly RouletteCandidate[],
  gamma: number = 1.5
): RouletteWheel {
  if (candidates.length === 0) {
    return { candidates: [], prefixSums: [], totalWeight: 0, gamma };
  }

  const prefixSums: number[] = [];
  let runningTotal = 0;

  for (const c of candidates) {
    const safeScore = Math.max(0.001, isFinite(c.weaknessScore) ? c.weaknessScore : 0.001);
    const weight = Math.pow(safeScore, gamma);
    runningTotal += weight;
    prefixSums.push(runningTotal);
  }

  return {
    candidates: [...candidates],
    prefixSums,
    totalWeight: runningTotal,
    gamma,
  };
}

/**
 * Samples a candidate from the roulette wheel using O(log K) binary search
 */
export function sampleRouletteWheel(
  wheel: RouletteWheel,
  prngNext: () => number = Math.random
): RouletteCandidate {
  if (wheel.candidates.length === 0) {
    throw new Error('Cannot sample from empty roulette wheel');
  }
  if (wheel.candidates.length === 1) {
    return wheel.candidates[0];
  }

  const target = prngNext() * wheel.totalWeight;

  let low = 0;
  let high = wheel.prefixSums.length - 1;

  while (low < high) {
    const mid = (low + high) >> 1;
    if (wheel.prefixSums[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return wheel.candidates[low];
}

/**
 * Dynamic Difficulty Adjustment (DDA) Controller
 * Tracks rolling 10-attempt accuracy and speed with a 5-question cooldown refractory period.
 */
export class DDAController {
  private history: Array<{ isCorrect: boolean; responseTimeMs: number }> = [];
  private windowSize: number;
  private currentLevel: number;
  private currentDifficulty: DifficultyTier;
  private cooldownCounter: number = 0;
  private consecutiveMistakes: number = 0;
  private consecutiveCorrect: number = 0;

  constructor(
    initialLevel = 2,
    initialDifficulty: DifficultyTier = 'normal',
    windowSize = 10
  ) {
    this.currentLevel = initialLevel;
    this.currentDifficulty = initialDifficulty;
    this.windowSize = windowSize;
  }

  public recordAttempt(isCorrect: boolean, responseTimeMs: number): DdaDecision {
    this.history.push({ isCorrect, responseTimeMs });
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    if (isCorrect) {
      this.consecutiveCorrect += 1;
      this.consecutiveMistakes = 0;
    } else {
      this.consecutiveMistakes += 1;
      this.consecutiveCorrect = 0;
    }

    if (this.cooldownCounter > 0) {
      this.cooldownCounter -= 1;
    }

    const rollingAccuracy =
      this.history.length > 0
        ? this.history.filter((h) => h.isCorrect).length / this.history.length
        : 1;

    const rollingAvgTimeMs =
      this.history.length > 0
        ? this.history.reduce((acc, h) => acc + h.responseTimeMs, 0) / this.history.length
        : 2000;

    // Evaluate promotion / demotion only when cooldown is zero
    if (this.cooldownCounter === 0) {
      // Demotion condition: 3 consecutive mistakes immediately, or accuracy <= 60% with at least 5 attempts
      if (this.consecutiveMistakes >= 3 || (this.history.length >= 5 && rollingAccuracy <= 0.60)) {
        if (this.currentLevel > 1) {
          this.currentLevel -= 1;
          this.cooldownCounter = 5;
          return {
            action: 'demote',
            newLevel: this.currentLevel,
            newDifficulty: this.currentDifficulty,
            rollingAccuracy,
            rollingAvgTimeMs,
            reason: 'Cognitive overload / struggle detected',
          };
        } else if (this.currentDifficulty === 'hard') {
          this.currentDifficulty = 'normal';
          this.cooldownCounter = 5;
          return {
            action: 'demote',
            newLevel: this.currentLevel,
            newDifficulty: this.currentDifficulty,
            rollingAccuracy,
            rollingAvgTimeMs,
            reason: 'Relaxed distractor difficulty',
          };
        }
      }

      // Promotion condition: Accuracy >= 90%, fast solve <= 3200ms, combo >= 5, history >= 5
      if (this.history.length >= 5 && rollingAccuracy >= 0.90 && rollingAvgTimeMs <= 3200 && this.consecutiveCorrect >= 5) {
        if (this.currentLevel < 5) {
          this.currentLevel += 1;
          this.cooldownCounter = 5;
          return {
            action: 'promote',
            newLevel: this.currentLevel,
            newDifficulty: this.currentDifficulty,
            rollingAccuracy,
            rollingAvgTimeMs,
            reason: 'High accuracy and fast speed',
          };
        } else if (this.currentDifficulty === 'normal') {
          this.currentDifficulty = 'hard';
          this.cooldownCounter = 5;
          return {
            action: 'promote',
            newLevel: this.currentLevel,
            newDifficulty: this.currentDifficulty,
            rollingAccuracy,
            rollingAvgTimeMs,
            reason: 'Upgraded distractor difficulty',
          };
        }
      }
    }

    return {
      action: 'maintain',
      newLevel: this.currentLevel,
      newDifficulty: this.currentDifficulty,
      rollingAccuracy,
      rollingAvgTimeMs,
    };
  }

  public getLevel(): number {
    return this.currentLevel;
  }

  public getDifficulty(): DifficultyTier {
    return this.currentDifficulty;
  }

  public reset(level = 2, difficulty: DifficultyTier = 'normal'): void {
    this.currentLevel = level;
    this.currentDifficulty = difficulty;
    this.history = [];
    this.cooldownCounter = 0;
    this.consecutiveCorrect = 0;
    this.consecutiveMistakes = 0;
  }
}

/**
 * Adaptive question builder managing epsilon-greedy exploration,
 * recency buffers, and roulette-wheel sampling.
 */
export class AdaptiveQuestionBuilder {
  private config: AdaptiveEndlessConfig;
  private recencyBuffer: string[] = [];
  private ddaController: DDAController;
  private candidates: RouletteCandidate[] = [];
  private prngNext: () => number;

  constructor(config: AdaptiveEndlessConfig, prngNext: () => number = Math.random) {
    this.config = config;
    this.prngNext = prngNext;
    this.ddaController = new DDAController(config.initialLevel ?? 2);
  }

  public setCandidates(candidates: RouletteCandidate[]): void {
    this.candidates = [...candidates];
  }

  public getCandidates(): readonly RouletteCandidate[] {
    return this.candidates;
  }

  public getDdaController(): DDAController {
    return this.ddaController;
  }

  public getRecencyBuffer(): readonly string[] {
    return this.recencyBuffer;
  }

  public nextQuestion(): AdaptiveQuestion {
    const explorationRate = this.config.explorationRate ?? 0.20;
    const recencyBufferSize = this.config.recencyBufferSize ?? 4;
    const isExploration = this.candidates.length === 0 || this.prngNext() < explorationRate;

    let chosenFactId: string | null = null;
    let source: 'weakness_roulette' | 'exploration' = 'exploration';
    let weaknessScore: number | undefined;

    if (!isExploration && this.candidates.length > 0) {
      // Exploitation via roulette wheel
      let eligible = this.candidates.filter((c) => !this.recencyBuffer.includes(c.id));

      // Buffer relaxation fallback if all candidates are in recency buffer
      if (eligible.length === 0) {
        eligible = this.candidates;
      }

      const wheel = buildRouletteWheel(eligible, this.config.gamma ?? 1.5);
      const sampled = sampleRouletteWheel(wheel, this.prngNext);
      chosenFactId = sampled.id;
      weaknessScore = sampled.weaknessScore;
      source = 'weakness_roulette';
    }

    let fact: {
      id: string;
      operator: MathOperator;
      operandA: number;
      operandB: number;
      answer: number;
    };

    if (chosenFactId) {
      try {
        fact = parseFactId(chosenFactId);
      } catch {
        // Fallback to procedural generation if parsing fails
        fact = this.generateProceduralFact();
        source = 'exploration';
      }
    } else {
      fact = this.generateProceduralFact();
      source = 'exploration';
    }

    // Update recency buffer
    this.recencyBuffer.push(fact.id);
    if (this.recencyBuffer.length > recencyBufferSize) {
      this.recencyBuffer.shift();
    }

    const opSymbol = OPERATOR_SYMBOLS[fact.operator];
    const difficulty = this.ddaController.getDifficulty();

    const distractorResult = distractorEngine.generate({
      operator: fact.operator,
      operandA: fact.operandA,
      operandB: fact.operandB,
      answer: fact.answer,
      difficulty,
      rng: this.prngNext,
    });

    return {
      id: `${fact.id}_${Date.now()}_${Math.floor(this.prngNext() * 1000)}`,
      operator: fact.operator,
      operandA: fact.operandA,
      operandB: fact.operandB,
      answer: fact.answer,
      promptText: `${fact.operandA} ${opSymbol} ${fact.operandB} = ?`,
      displayOperator: opSymbol,
      options: distractorResult.allChoices,
      answerStr: String(fact.answer),
      difficulty,
      category: 'weakness',
      source,
      weaknessScore,
    };
  }

  private generateProceduralFact() {
    const level = this.ddaController.getLevel() as 1 | 2 | 3 | 4 | 5;
    const allowedOperators: MathOperator[] =
      this.config.selectedOperators && this.config.selectedOperators.length > 0
        ? [...this.config.selectedOperators]
        : ['+', '-', '*', '/'];

    const chosenOp = allowedOperators[Math.floor(this.prngNext() * allowedOperators.length)];

    const fact = generateArithmeticFact({
      allowedOperators: [chosenOp],
      level: Math.min(5, Math.max(1, level)) as any,
      difficulty: this.ddaController.getDifficulty(),
    });

    return {
      id: fact.id,
      operator: fact.operator,
      operandA: fact.operandA,
      operandB: fact.operandB,
      answer: fact.answer,
    };
  }
}
