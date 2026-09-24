import {
  CalculationFact,
  MathOperator,
  Question,
  OPERATOR_SYMBOLS,
} from '../../core/math/types';
import { distractorEngine } from '../../core/distractors/distractorEngine';
import { CalculationStatRecord } from '../../core/storage/types';
import { WeaknessQueueOptions } from './types';

/**
 * Parses canonical fact identifier into a CalculationFact model
 * Canonical formats: "mul_7_8", "add_47_38", "sub_52_27", "div_56_8"
 */
export function parseFactId(factId: string): CalculationFact {
  const parts = factId.split('_');
  if (parts.length < 3) {
    throw new Error(`Invalid factId format: "${factId}"`);
  }

  const [opCode, aStr, bStr] = parts;
  const operandA = parseInt(aStr, 10);
  const operandB = parseInt(bStr, 10);

  if (isNaN(operandA) || isNaN(operandB)) {
    throw new Error(`Non-numeric operands in factId: "${factId}"`);
  }

  let operator: MathOperator;
  let answer: number;

  switch (opCode) {
    case 'add':
      operator = '+';
      answer = operandA + operandB;
      break;
    case 'sub':
      operator = '-';
      answer = operandA - operandB;
      break;
    case 'mul':
      operator = '*';
      answer = operandA * operandB;
      break;
    case 'div':
      operator = '/';
      if (operandB === 0) throw new Error(`Division by zero in factId: "${factId}"`);
      answer = Math.floor(operandA / operandB);
      break;
    default:
      throw new Error(`Unknown operator code: "${opCode}" in factId: "${factId}"`);
  }

  return { id: factId, operator, operandA, operandB, answer };
}

/**
 * Benchmark weakness deck of historically error-prone facts for cold starts
 */
export const COGNITIVE_BENCHMARK_WEAKNESSES: readonly string[] = [
  'mul_7_8',
  'mul_6_7',
  'mul_8_9',
  'mul_7_7',
  'mul_12_8',
  'mul_9_7',
  'mul_8_6',
  'add_8_7',
  'add_9_6',
  'add_7_5',
  'add_18_17',
  'add_47_38',
  'sub_15_8',
  'sub_14_7',
  'sub_13_6',
  'sub_52_27',
  'sub_61_34',
  'div_56_8',
  'div_42_7',
  'div_54_6',
  'div_72_8',
  'div_96_8',
];

/**
 * Builds a curated, interleaved 10-20 question queue targeting top weaknesses
 */
export function buildWeaknessPracticeQueue(
  options: WeaknessQueueOptions = {},
  weakRecords: CalculationStatRecord[] = []
): Question[] {
  const targetCount = Math.max(10, Math.min(20, options.targetCount ?? 15));
  const topK = Math.max(3, Math.min(10, options.topK ?? 5));
  const difficulty = options.difficulty ?? 'normal';

  // 1. Gather candidate fact IDs
  let selectedFacts: Array<{ factId: string; weaknessScore: number }> = [];

  for (const rec of weakRecords) {
    if (options.operatorFilter && rec.operator !== options.operatorFilter) continue;
    selectedFacts.push({
      factId: rec.factId,
      weaknessScore: rec.weaknessScore || 1.0,
    });
    if (selectedFacts.length >= topK) break;
  }

  // 2. Cold-start fallback: supplement with benchmark facts if < topK
  if (selectedFacts.length < topK) {
    const existingIds = new Set(selectedFacts.map((s) => s.factId));
    for (const benchmarkId of COGNITIVE_BENCHMARK_WEAKNESSES) {
      if (options.operatorFilter) {
        const opCode = benchmarkId.split('_')[0];
        const opMap: Record<string, MathOperator> = { add: '+', sub: '-', mul: '*', div: '/' };
        if (opMap[opCode] !== options.operatorFilter) continue;
      }

      if (!existingIds.has(benchmarkId)) {
        selectedFacts.push({ factId: benchmarkId, weaknessScore: 0.8 });
        existingIds.add(benchmarkId);
        if (selectedFacts.length >= topK) break;
      }
    }
  }

  // Fallback safety guard if still empty
  if (selectedFacts.length === 0) {
    selectedFacts = [
      { factId: 'mul_7_8', weaknessScore: 1.0 },
      { factId: 'mul_8_9', weaknessScore: 0.9 },
      { factId: 'mul_6_7', weaknessScore: 0.8 },
    ];
  }

  // 3. Quota allocation proportional to weakness scores
  const totalScore = selectedFacts.reduce((sum, f) => sum + f.weaknessScore, 0);
  const factQuotas: Array<{ factId: string; quota: number }> = selectedFacts.map((f) => ({
    factId: f.factId,
    quota: Math.max(1, Math.round((targetCount * f.weaknessScore) / totalScore)),
  }));

  // Reconcile quotas to sum to exactly targetCount
  let currentTotal = factQuotas.reduce((sum, f) => sum + f.quota, 0);
  while (currentTotal > targetCount) {
    const maxItem = factQuotas.reduce((max, item) => (item.quota > max.quota ? item : max), factQuotas[0]);
    if (maxItem.quota > 1) {
      maxItem.quota -= 1;
      currentTotal -= 1;
    } else {
      break;
    }
  }
  while (currentTotal < targetCount) {
    factQuotas[0].quota += 1;
    currentTotal += 1;
  }

  // 4. Interleaving queue construction using max-frequency selection
  const counts: Record<string, number> = {};
  factQuotas.forEach(({ factId, quota }) => {
    counts[factId] = quota;
  });

  const orderedFactIds: string[] = [];

  for (let step = 0; step < targetCount; step++) {
    const lastId = orderedFactIds[orderedFactIds.length - 1];

    let bestFactId: string | null = null;
    let maxRemaining = 0;

    for (const [id, count] of Object.entries(counts)) {
      if (count > 0 && id !== lastId) {
        if (count > maxRemaining) {
          maxRemaining = count;
          bestFactId = id;
        }
      }
    }

    if (bestFactId) {
      orderedFactIds.push(bestFactId);
      counts[bestFactId]--;
    } else {
      // If forced to select same as lastId, splice into an earlier non-adjacent slot
      const remainingId = Object.keys(counts).find((id) => counts[id] > 0);
      if (remainingId) {
        let inserted = false;
        for (let j = 1; j < orderedFactIds.length; j++) {
          if (orderedFactIds[j - 1] !== remainingId && orderedFactIds[j] !== remainingId) {
            orderedFactIds.splice(j, 0, remainingId);
            counts[remainingId]--;
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          orderedFactIds.push(remainingId);
          counts[remainingId]--;
        }
      }
    }
  }

  // 5. Build questions with commutative swap on alternating occurrences
  const occurrenceCount: Record<string, number> = {};
  const questions: Question[] = [];

  for (let i = 0; i < orderedFactIds.length; i++) {
    const factId = orderedFactIds[i];
    const baseFact = parseFactId(factId);
    const count = (occurrenceCount[factId] ?? 0) + 1;
    occurrenceCount[factId] = count;

    let opA = baseFact.operandA;
    let opB = baseFact.operandB;

    // Commutative swap on odd repetitions (count % 2 === 0) ONLY for + and *
    if (count % 2 === 0 && (baseFact.operator === '+' || baseFact.operator === '*')) {
      opA = baseFact.operandB;
      opB = baseFact.operandA;
    }

    const opSymbol = OPERATOR_SYMBOLS[baseFact.operator];
    const distractorResult = distractorEngine.generate({
      operator: baseFact.operator,
      operandA: opA,
      operandB: opB,
      answer: baseFact.answer,
      difficulty,
    });

    questions.push({
      id: `${factId}_${i}_${Date.now()}`,
      operator: baseFact.operator,
      operandA: opA,
      operandB: opB,
      answer: baseFact.answer,
      promptText: `${opA} ${opSymbol} ${opB} = ?`,
      displayOperator: opSymbol,
      options: distractorResult.allChoices,
      answerStr: String(baseFact.answer),
      difficulty,
      category: 'weakness',
    });
  }

  return questions;
}
