import { MathOperator, DifficultyTier, Question } from '../../../core/math/types';
import { generateArithmeticFact, createQuestionFromFact } from '../../../core/math/arithmeticGenerator';
import { distractorEngine } from '../../../core/distractors/distractorEngine';
import { GameConfig, GameDifficulty } from '../core/types';

export function mapGameDiffToLevel(difficulty: GameDifficulty): 1 | 2 | 3 | 4 | 5 {
  switch (difficulty) {
    case 'beginner': return 1;
    case 'normal': return 2;
    case 'hard': return 3;
    case 'expert': return 4;
    case 'extreme': return 5;
    default: return 2;
  }
}

export function mapGameDiffToTier(difficulty: GameDifficulty): DifficultyTier {
  switch (difficulty) {
    case 'beginner': return 'easy';
    case 'normal': return 'normal';
    case 'hard': return 'hard';
    case 'expert':
    case 'extreme': return 'expert';
    default: return 'normal';
  }
}

/**
 * Generates a validated question with distractors for any game in the suite
 */
export function generateGameQuestion(config: GameConfig, index = 0): Question {
  const ops: MathOperator[] = config.selectedOperators.length > 0 ? [...config.selectedOperators] : ['+'];
  const chosenOp = ops[Math.floor(Math.random() * ops.length)];
  const level = mapGameDiffToLevel(config.difficulty);
  const tier = mapGameDiffToTier(config.difficulty);

  const fact = generateArithmeticFact({
    allowedOperators: [chosenOp],
    level,
    difficulty: tier,
  });

  const distractorResult = distractorEngine.generate({
    operator: fact.operator,
    operandA: fact.operandA,
    operandB: fact.operandB,
    answer: fact.answer,
    difficulty: tier,
  });

  const question = createQuestionFromFact(fact, {
    difficulty: tier,
    category: 'game',
    choices: distractorResult.allChoices,
  });

  return {
    ...question,
    id: `${fact.id}_${index}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  };
}
