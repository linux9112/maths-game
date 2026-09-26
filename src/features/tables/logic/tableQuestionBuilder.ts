import { TableQuestion, TableQueueBuildOptions, TableQuestionAttempt } from '../types';
import { DifficultyTier, IPRNG } from '../../../core/math/types';
import { clampTable, sanitizeRange } from '../utils/tableSelectionUtils';
import { distractorEngine } from '../../../core/distractors/distractorEngine';

interface FactTuple {
  readonly table: number;
  readonly multiplier: number;
  readonly answer: number;
}

export function buildTableQuestionQueue(options: TableQueueBuildOptions): TableQuestion[] {
  const {
    selectedTables: rawTables,
    multiplierRange: rawRange,
    questionCount,
    difficulty = 'normal',
    allowCommutativeSwap = false,
    prng,
  } = options;

  const rng = prng ? () => prng.next() : Math.random;

  // 1. Sanitize tables and multiplier range
  const tables = Array.from(new Set(rawTables.map(clampTable))).sort((a, b) => a - b);
  const activeTables = tables.length > 0 ? tables : [1];
  const { min: minM, max: maxM } = sanitizeRange(rawRange.min, rawRange.max);
  const count = Math.max(1, questionCount);

  // 2. Allocate quotas per table
  const K = activeTables.length;
  const baseQuota = Math.floor(count / K);
  const remainder = count % K;

  const shuffledTablesForQuota = [...activeTables];
  fisherYates(shuffledTablesForQuota, rng);

  const tableQuotas: Record<number, number> = {};
  for (let i = 0; i < shuffledTablesForQuota.length; i++) {
    const t = shuffledTablesForQuota[i];
    tableQuotas[t] = i < remainder ? baseQuota + 1 : baseQuota;
  }

  // 3. Prepare multiplier pools for each table
  const tableMultiplierPools: Record<number, number[]> = {};
  const multiplierRangeList: number[] = [];
  for (let m = minM; m <= maxM; m++) {
    multiplierRangeList.push(m);
  }

  for (const t of activeTables) {
    const quota = tableQuotas[t];
    const pool: number[] = [];
    let lastM: number | null = null;

    while (pool.length < quota) {
      const deck = [...multiplierRangeList];
      fisherYates(deck, rng);

      // Avoid edge collision across deck cycles
      if (lastM !== null && deck.length > 1 && deck[0] === lastM) {
        const swapIdx = deck.length - 1;
        const tmp = deck[0];
        deck[0] = deck[swapIdx];
        deck[swapIdx] = tmp;
      }

      for (const m of deck) {
        if (pool.length >= quota) break;
        pool.push(m);
        lastM = m;
      }
    }
    tableMultiplierPools[t] = pool;
  }

  // 4. Generate table sequence with strict anti-clustering
  const tableSequence: number[] = [];
  const remainingCounts = { ...tableQuotas };
  let lastTable: number | null = null;

  for (let step = 0; step < count; step++) {
    // Find candidate tables with remaining quota > 0
    let candidates = activeTables.filter((t) => remainingCounts[t] > 0);

    if (K > 1 && lastTable !== null) {
      const nonAdjacentCandidates = candidates.filter((t) => t !== lastTable);
      if (nonAdjacentCandidates.length > 0) {
        candidates = nonAdjacentCandidates;
      }
    }

    // Max-Frequency Greedy: pick among candidates that have the highest remaining count
    let maxRemaining = 0;
    for (const t of candidates) {
      if (remainingCounts[t] > maxRemaining) {
        maxRemaining = remainingCounts[t];
      }
    }

    const topCandidates = candidates.filter((t) => remainingCounts[t] === maxRemaining);
    const chosenTable = topCandidates[Math.floor(rng() * topCandidates.length)];

    tableSequence.push(chosenTable);
    remainingCounts[chosenTable]--;
    lastTable = chosenTable;
  }

  // 5. Assemble fact sequence
  const factSequence: FactTuple[] = tableSequence.map((t) => {
    const m = tableMultiplierPools[t].shift()!;
    return {
      table: t,
      multiplier: m,
      answer: t * m,
    };
  });

  // 6. Enrich facts with distractor engine
  const questions: TableQuestion[] = factSequence.map((fact, index) => {
    let operandA = fact.table;
    let operandB = fact.multiplier;

    if (allowCommutativeSwap && rng() > 0.5) {
      operandA = fact.multiplier;
      operandB = fact.table;
    }

    const promptText = `${operandA} × ${operandB} = ?`;

    const distractorResult = distractorEngine.generate({
      operator: '*',
      operandA,
      operandB,
      answer: fact.answer,
      difficulty,
      count: 3,
      rng,
    });

    const factId = `mul_${fact.table}_${fact.multiplier}`;

    return {
      id: `tbl_${fact.table}_${fact.multiplier}_${index}_${Math.floor(rng() * 100000)}`,
      factId,
      table: fact.table,
      multiplier: fact.multiplier,
      operator: '*',
      operandA,
      operandB,
      answer: fact.answer,
      answerStr: fact.answer.toString(),
      promptText,
      displayOperator: '×',
      options: distractorResult.allChoices,
      correctIndex: distractorResult.correctIndex,
      difficulty,
      category: 'table',
      distractorSources: distractorResult.sources,
    };
  });

  return questions;
}

function fisherYates<T>(array: T[], rng: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

export interface WeaknessQueueBuildOptions {
  readonly weakAttempts: TableQuestionAttempt[];
  readonly targetCount: number; // 15, 30, 50
  readonly difficulty?: DifficultyTier;
  readonly prng?: IPRNG;
}

/**
 * Builds a focused question queue targeting ONLY the weak calculations identified.
 * Intelligently prioritizes the highest weakness scores, repeating them with anti-consecutive spacing
 * if targetCount exceeds unique facts, and never adding unrelated questions.
 */
export function buildWeaknessTableQuestionQueue(options: WeaknessQueueBuildOptions): TableQuestion[] {
  const { weakAttempts, targetCount, difficulty = 'normal', prng } = options;
  const rng = prng ? () => prng.next() : Math.random;

  if (!weakAttempts || weakAttempts.length === 0) {
    return [];
  }

  // Deduplicate weak facts and extract their fact information
  const uniqueFactMap = new Map<string, { table: number; multiplier: number; weight: number }>();
  for (const a of weakAttempts) {
    const key = `${a.question.table}_${a.question.multiplier}`;
    const weight = a.weaknessScore && a.weaknessScore > 0 ? a.weaknessScore : 100;
    const existing = uniqueFactMap.get(key);
    if (!existing || weight > existing.weight) {
      uniqueFactMap.set(key, {
        table: a.question.table,
        multiplier: a.question.multiplier,
        weight,
      });
    }
  }

  const sortedUniqueFacts = Array.from(uniqueFactMap.values()).sort((a, b) => b.weight - a.weight);
  const pool: Array<{ table: number; multiplier: number }> = [];

  if (sortedUniqueFacts.length >= targetCount) {
    // If we have enough unique weak calculations, pick the top targetCount
    for (let i = 0; i < targetCount; i++) {
      pool.push({ table: sortedUniqueFacts[i].table, multiplier: sortedUniqueFacts[i].multiplier });
    }
    fisherYates(pool, rng);
  } else {
    // Allocate targetCount questions across the weak facts, giving more repetitions to higher-weight facts
    const totalWeights = sortedUniqueFacts.reduce((sum, f) => sum + f.weight, 0);
    const counts: number[] = sortedUniqueFacts.map((f) =>
      Math.max(1, Math.floor((f.weight / totalWeights) * targetCount))
    );

    let assigned = counts.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (assigned < targetCount) {
      counts[idx % counts.length]++;
      assigned++;
      idx++;
    }
    while (assigned > targetCount) {
      const maxIdx = counts.indexOf(Math.max(...counts));
      if (counts[maxIdx] > 1) {
        counts[maxIdx]--;
        assigned--;
      } else {
        break;
      }
    }

    for (let i = 0; i < sortedUniqueFacts.length; i++) {
      for (let c = 0; c < counts[i]; c++) {
        pool.push({ table: sortedUniqueFacts[i].table, multiplier: sortedUniqueFacts[i].multiplier });
      }
    }

    // Shuffle with anti-consecutive spacing so identical calculations are not adjacent
    fisherYates(pool, rng);
    for (let i = 1; i < pool.length; i++) {
      if (
        pool[i].table === pool[i - 1].table &&
        pool[i].multiplier === pool[i - 1].multiplier &&
        i + 1 < pool.length
      ) {
        for (let j = i + 1; j < pool.length; j++) {
          if (
            pool[j].table !== pool[i].table ||
            pool[j].multiplier !== pool[i].multiplier
          ) {
            const temp = pool[i];
            pool[i] = pool[j];
            pool[j] = temp;
            break;
          }
        }
      }
    }
  }

  const finalPool = pool.slice(0, targetCount);

  return finalPool.map((f, i) => {
    const operandA = f.table;
    const operandB = f.multiplier;
    const answer = operandA * operandB;
    const promptText = `${operandA} × ${operandB} = ?`;

    const distractorResult = distractorEngine.generate({
      operator: '*',
      operandA,
      operandB,
      answer,
      difficulty,
      count: 3,
      rng,
    });

    const factId = `mul_${f.table}_${f.multiplier}`;

    return {
      id: `weakness_${f.table}_${f.multiplier}_${i}_${Math.floor(rng() * 100000)}`,
      factId,
      table: f.table,
      multiplier: f.multiplier,
      operator: '*',
      operandA,
      operandB,
      answer,
      answerStr: answer.toString(),
      promptText,
      displayOperator: '×',
      options: distractorResult.allChoices,
      correctIndex: distractorResult.correctIndex,
      difficulty,
      category: 'table',
      distractorSources: distractorResult.sources,
    };
  });
}
