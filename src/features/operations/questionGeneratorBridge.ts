import {
  MathOperator,
  OperationSessionConfig,
  OperationQuestion,
  LEVEL_CONFIGS,
  OPERATOR_METAS,
} from './types';
import { generateArithmeticFact } from '../../core/math/arithmeticGenerator';
import { distractorEngine } from '../../core/distractors/distractorEngine';

/**
 * Generates an array of OperationQuestion objects for a given config,
 * utilizing the genuine Core Math Engine and Shared Distractor Pipeline.
 */
export function generateSessionQuestions(
  config: OperationSessionConfig,
  count: number = config.questionCount === Infinity ? 20 : config.questionCount
): OperationQuestion[] {
  const ops: MathOperator[] = config.selectedOperators.length > 0 ? config.selectedOperators : ['+'];
  const questions: OperationQuestion[] = [];
  const difficulty = LEVEL_CONFIGS[config.level]?.difficultyTier ?? 'normal';

  for (let i = 0; i < count; i++) {
    const chosenOp = ops[i % ops.length];
    const fact = generateArithmeticFact({
      allowedOperators: [chosenOp],
      level: config.level,
      difficulty,
    });

    const distractorResult = distractorEngine.generate({
      operator: fact.operator,
      operandA: fact.operandA,
      operandB: fact.operandB,
      answer: fact.answer,
      difficulty,
    });

    const opMeta = OPERATOR_METAS[fact.operator];
    const promptText = `${fact.operandA} ${opMeta.symbol} ${fact.operandB} = ?`;

    questions.push({
      id: `${fact.id}_${i}`,
      operator: fact.operator,
      operandA: fact.operandA,
      operandB: fact.operandB,
      answer: fact.answer,
      promptText,
      options: distractorResult.allChoices,
      correctIndex: distractorResult.correctIndex,
      difficulty,
      level: config.level,
    });
  }

  // Shuffle questions order using Fisher-Yates
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = questions[i];
    questions[i] = questions[j];
    questions[j] = temp;
  }

  return questions;
}
