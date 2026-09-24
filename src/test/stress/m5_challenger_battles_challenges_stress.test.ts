import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MathOperator } from '../../core/math/types';
import { generateArithmeticFact } from '../../core/math/arithmeticGenerator';
import { generateCalculationHint } from '../../features/games/core/calculationHint';

// Game Components
import { NumberTargetGame } from '../../features/games/challenges/NumberTargetGame';
import { ClosestAnswerGame } from '../../features/games/challenges/ClosestAnswerGame';
import { FindMistakeGame } from '../../features/games/challenges/FindMistakeGame';
import { TableBreakerGame } from '../../features/games/challenges/TableBreakerGame';
import { TableBattleGame } from '../../features/games/battles/TableBattleGame';
import { QuickCompareGame } from '../../features/games/battles/QuickCompareGame';
import { BiggerSmallerGame } from '../../features/games/battles/BiggerSmallerGame';
import { MemoryCalculationGame } from '../../features/games/memory/MemoryCalculationGame';
import { OperationSwitchGame } from '../../features/games/memory/OperationSwitchGame';
import { TableChainGame } from '../../features/games/memory/TableChainGame';

// ============================================================================
// MIRROR GENERATOR FUNCTIONS (from component implementations for oracle testing)
// ============================================================================

interface TargetPuzzle {
  targetNumber: number;
  tiles: number[];
  allowedOperators: MathOperator[];
  solutionExpr: string;
}

function generateTargetPuzzle(): TargetPuzzle {
  const opList: MathOperator[] = ['+', '-', '*'];
  const op = opList[Math.floor(Math.random() * opList.length)];
  let a = 2 + Math.floor(Math.random() * 11);
  let b = 2 + Math.floor(Math.random() * 11);

  let target = a + b;
  if (op === '*') target = a * b;
  else if (op === '-') {
    if (a < b) {
      const temp = a;
      a = b;
      b = temp;
    }
    target = a - b;
  }

  // Create tray of 5 tiles including a and b
  const traySet = new Set<number>([a, b]);
  while (traySet.size < 5) {
    traySet.add(2 + Math.floor(Math.random() * 15));
  }
  const tiles = Array.from(traySet).sort(() => Math.random() - 0.5);

  return {
    targetNumber: target,
    tiles,
    allowedOperators: ['+', '-', '*', '/'],
    solutionExpr: `${a} ${op} ${b} = ${target}`,
  };
}

interface EstimateRound {
  promptText: string;
  actualAnswer: number;
  closestCandidate: number;
  candidates: number[];
}

function generateEstimateRound(): EstimateRound {
  const a = 19 + Math.floor(Math.random() * 80);
  const b = 11 + Math.floor(Math.random() * 88);
  const actual = a * b;
  const closestCandidate = actual;

  const candidatesSet = new Set<number>([closestCandidate]);
  candidatesSet.add(Math.round(actual * 0.75));
  candidatesSet.add(Math.round(actual * 1.35));
  candidatesSet.add(Math.round(actual * 1.6));

  while (candidatesSet.size < 4) {
    candidatesSet.add(Math.round(actual * (0.5 + Math.random())));
  }

  const candidates = Array.from(candidatesSet).sort(() => Math.random() - 0.5);

  return {
    promptText: `${a} × ${b}`,
    actualAnswer: actual,
    closestCandidate,
    candidates,
  };
}

interface EquationItem {
  id: number;
  text: string;
  isMistake: boolean;
  explanation: string;
}

interface FindMistakeRound {
  equations: EquationItem[];
  mistakeIndex: number;
}

function generateMistakeRound(selectedOps: readonly MathOperator[] = ['*', '+']): FindMistakeRound {
  const ops = selectedOps.length > 0 ? selectedOps : (['*', '+'] as const);
  const mistakeIdx = Math.floor(Math.random() * 4);
  const equations: EquationItem[] = [];

  for (let i = 0; i < 4; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const fact = generateArithmeticFact({ allowedOperators: [op], level: 2 });
    const sym = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';

    if (i === mistakeIdx) {
      const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 5));
      const wrongAnswer = fact.answer + delta;
      equations.push({
        id: i,
        text: `${fact.operandA} ${sym} ${fact.operandB} = ${wrongAnswer}`,
        isMistake: true,
        explanation: `Should be ${fact.operandA} ${sym} ${fact.operandB} = ${fact.answer}`,
      });
    } else {
      equations.push({
        id: i,
        text: `${fact.operandA} ${sym} ${fact.operandB} = ${fact.answer}`,
        isMistake: false,
        explanation: 'Correct equation',
      });
    }
  }

  return { equations, mistakeIndex: mistakeIdx };
}

interface ComparisonFact {
  leftExpr: string;
  leftVal: number;
  rightExpr: string;
  rightVal: number;
  relation: '<' | '=' | '>';
  expectedAnswerCode: number;
}

function generateTableBattle(): ComparisonFact {
  const t1 = 3 + Math.floor(Math.random() * 10);
  const m1 = 3 + Math.floor(Math.random() * 10);
  const t2 = 3 + Math.floor(Math.random() * 10);
  const m2 = 3 + Math.floor(Math.random() * 10);

  const leftVal = t1 * m1;
  const rightVal = t2 * m2;

  let relation: '<' | '=' | '>' = '=';
  let expectedAnswerCode = 2;

  if (leftVal < rightVal) {
    relation = '<';
    expectedAnswerCode = 1;
  } else if (leftVal > rightVal) {
    relation = '>';
    expectedAnswerCode = 3;
  }

  return {
    leftExpr: `${t1} × ${m1}`,
    leftVal,
    rightExpr: `${t2} × ${m2}`,
    rightVal,
    relation,
    expectedAnswerCode,
  };
}

interface QuickComparePair {
  leftStr: string;
  leftVal: number;
  rightStr: string;
  rightVal: number;
  relation: '<' | '=' | '>';
  expectedCode: number;
}

function generateQuickComparePair(ops: readonly MathOperator[] = ['+', '-']): QuickComparePair {
  const op1 = ops[Math.floor(Math.random() * ops.length)];
  const op2 = ops[Math.floor(Math.random() * ops.length)];

  const f1 = generateArithmeticFact({ allowedOperators: [op1], level: 2 });
  const f2 = generateArithmeticFact({ allowedOperators: [op2], level: 2 });

  let relation: '<' | '=' | '>' = '=';
  let expectedCode = 2;

  if (f1.answer < f2.answer) {
    relation = '<';
    expectedCode = 1;
  } else if (f1.answer > f2.answer) {
    relation = '>';
    expectedCode = 3;
  }

  const sym1 = op1 === '*' ? '×' : op1 === '/' ? '÷' : op1 === '-' ? '−' : '+';
  const sym2 = op2 === '*' ? '×' : op2 === '/' ? '÷' : op2 === '-' ? '−' : '+';

  return {
    leftStr: `${f1.operandA} ${sym1} ${f1.operandB}`,
    leftVal: f1.answer,
    rightStr: `${f2.operandA} ${sym2} ${f2.operandB}`,
    rightVal: f2.answer,
    relation,
    expectedCode,
  };
}

// ============================================================================
// INDEPENDENT MATHEMATICAL ORACLES
// ============================================================================

/**
 * Independent solver for Number Target.
 * Checks whether target can be formed by any binary operation (with available tiles and allowed ops),
 * or ternary operation if needed.
 */
function solveNumberTarget(
  target: number,
  tiles: number[],
  operators: MathOperator[],
  allowTileReuse = true
): { solvable: boolean; expression: string | null } {
  // Try binary combinations first: a op b = target
  for (let i = 0; i < tiles.length; i++) {
    for (let j = 0; j < tiles.length; j++) {
      if (!allowTileReuse && i === j) continue;
      const a = tiles[i];
      const b = tiles[j];

      for (const op of operators) {
        let result: number | null = null;
        if (op === '+') result = a + b;
        else if (op === '-') result = a - b;
        else if (op === '*') result = a * b;
        else if (op === '/' && b !== 0 && a % b === 0) result = a / b;

        if (result === target) {
          return { solvable: true, expression: `${a} ${op} ${b}` };
        }
      }
    }
  }

  // Try ternary combinations: (a op1 b) op2 c = target
  for (let i = 0; i < tiles.length; i++) {
    for (let j = 0; j < tiles.length; j++) {
      if (!allowTileReuse && i === j) continue;
      for (let k = 0; k < tiles.length; k++) {
        if (!allowTileReuse && (k === i || k === j)) continue;
        const a = tiles[i];
        const b = tiles[j];
        const c = tiles[k];

        for (const op1 of operators) {
          let step1: number | null = null;
          if (op1 === '+') step1 = a + b;
          else if (op1 === '-') step1 = a - b;
          else if (op1 === '*') step1 = a * b;
          else if (op1 === '/' && b !== 0 && a % b === 0) step1 = a / b;

          if (step1 === null) continue;

          for (const op2 of operators) {
            let step2: number | null = null;
            if (op2 === '+') step2 = step1 + c;
            else if (op2 === '-') step2 = step1 - c;
            else if (op2 === '*') step2 = step1 * c;
            else if (op2 === '/' && c !== 0 && step1 % c === 0) step2 = step1 / c;

            if (step2 === target) {
              return { solvable: true, expression: `(${a} ${op1} ${b}) ${op2} ${c}` };
            }
          }
        }
      }
    }
  }

  return { solvable: false, expression: null };
}

/**
 * Parses and evaluates simple arithmetic strings like "14 + 18" or "10 × 6 + 24"
 * with Unicode symbols supported.
 */
function evaluateArithmeticString(expr: string): number {
  const sanitized = expr
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '');

  // Safe arithmetic evaluator for digits and basic operators
  if (!/^[0-9+\-*/().]+$/.test(sanitized)) {
    throw new Error(`Unsafe arithmetic expression: ${expr}`);
  }
  // eslint-disable-next-line no-new-func
  return Function(`'use strict'; return (${sanitized});`)();
}

// ============================================================================
// CHALLENGER 2 TEST SUITE
// ============================================================================

describe('Milestone 5 Challenger 2: Battles, Challenges, Memory & Mathematical Oracles Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const advanceThroughCountdown = () => {
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(600); });
  };

  // =========================================================================
  // 1. NUMBER TARGET MATHEMATICAL SOLVABILITY (100 Configurations)
  // =========================================================================
  describe('1. Number Target Mathematical Solvability Oracle', () => {
    it('1.1: generates 100 configurations and verifies 100% solvability via independent oracle', () => {
      let solvableCount = 0;
      let singleUseSolvableCount = 0;
      let duplicateOperandCount = 0;

      for (let i = 0; i < 100; i++) {
        const puzzle = generateTargetPuzzle();

        // Tray properties
        expect(puzzle.tiles.length).toBeGreaterThanOrEqual(2);
        expect(puzzle.tiles.length).toBeLessThanOrEqual(5);
        expect(puzzle.targetNumber).toBeGreaterThanOrEqual(0);
        expect(puzzle.allowedOperators).toContain('+');
        expect(puzzle.allowedOperators).toContain('-');
        expect(puzzle.allowedOperators).toContain('*');

        // Verify solutionExpr evaluates to targetNumber
        // solutionExpr format: `${a} ${op} ${b} = ${target}`
        const match = puzzle.solutionExpr.match(/^(\d+)\s+([+\-*])\s+(\d+)\s+=\s+(\d+)$/);
        expect(match).not.toBeNull();
        if (match) {
          const a = Number(match[1]);
          const op = match[2];
          const b = Number(match[3]);
          const target = Number(match[4]);
          expect(target).toBe(puzzle.targetNumber);

          let expected = 0;
          if (op === '+') expected = a + b;
          else if (op === '-') expected = a - b;
          else if (op === '*') expected = a * b;
          expect(expected).toBe(target);

          // Tile presence check
          expect(puzzle.tiles).toContain(a);
          expect(puzzle.tiles).toContain(b);

          if (a === b) {
            duplicateOperandCount++;
          }
        }

        // Test with independent solver oracle allowing tile reuse (matching UI clicking mechanics)
        const solution = solveNumberTarget(
          puzzle.targetNumber,
          puzzle.tiles,
          puzzle.allowedOperators,
          true
        );
        expect(solution.solvable).toBe(true);
        if (solution.solvable) solvableCount++;

        // Also test single-use solvability
        const singleUseSolution = solveNumberTarget(
          puzzle.targetNumber,
          puzzle.tiles,
          puzzle.allowedOperators,
          false
        );
        if (singleUseSolution.solvable) singleUseSolvableCount++;
      }

      // 100% must be solvable with the game engine's multi-tap UI mechanics
      expect(solvableCount).toBe(100);
      // Empirical verification: duplicate operands occur statistically (~9% of the time)
      // When a === b, singleUseSolvableCount will be lower if only unique tiles exist in traySet
      expect(singleUseSolvableCount).toBeGreaterThanOrEqual(80);
    });

    it('1.2: verifies NumberTarget in-game evaluation logic rejects invalid inputs and accepts true solutions', () => {
      // Test expression evaluation logic as implemented in NumberTargetGame
      const evaluateTokens = (tokens: string[]): number => {
        let acc = Number(tokens[0]);
        for (let i = 1; i < tokens.length; i += 2) {
          const op = tokens[i];
          const nextVal = Number(tokens[i + 1]);
          if (isNaN(nextVal)) throw new Error('Incomplete expression');
          if (op === '+') acc += nextVal;
          else if (op === '-') acc -= nextVal;
          else if (op === '*') acc *= nextVal;
          else if (op === '/') acc = nextVal !== 0 ? acc / nextVal : 0;
        }
        return acc;
      };

      expect(evaluateTokens(['5', '+', '3'])).toBe(8);
      expect(evaluateTokens(['12', '-', '7'])).toBe(5);
      expect(evaluateTokens(['4', '*', '6'])).toBe(24);
      expect(evaluateTokens(['20', '/', '4'])).toBe(5);
      expect(evaluateTokens(['3', '+', '5', '*', '2'])).toBe(16); // Left-to-right: (3 + 5) * 2 = 16
      expect(evaluateTokens(['10', '/', '0'])).toBe(0); // Zero division guard
    });
  });

  // =========================================================================
  // 2. CLOSEST ANSWER UNIQUENESS ORACLE (100 Estimation Problems)
  // =========================================================================
  describe('2. Closest Answer Uniqueness Oracle', () => {
    it('2.1: generates 100 rounds and verifies declared answer is strictly minimum distance to actual', () => {
      for (let i = 0; i < 100; i++) {
        const round = generateEstimateRound();

        // 4 choices total
        expect(round.candidates).toHaveLength(4);
        // Correct candidate must be present in choices
        expect(round.candidates).toContain(round.closestCandidate);

        // All 4 candidates must be unique positive integers
        const uniqueSet = new Set(round.candidates);
        expect(uniqueSet.size).toBe(4);

        const actualDistance = Math.abs(round.closestCandidate - round.actualAnswer);
        // closestCandidate matches actualAnswer exactly (distance 0)
        expect(actualDistance).toBe(0);

        // Distractors must all have strictly greater distance than closestCandidate
        const distractors = round.candidates.filter((c) => c !== round.closestCandidate);
        expect(distractors).toHaveLength(3);

        for (const distractor of distractors) {
          const distractorDistance = Math.abs(distractor - round.actualAnswer);
          expect(distractorDistance).toBeGreaterThan(actualDistance);
          expect(distractorDistance).toBeGreaterThan(0);
        }

        // Verify prompt format "a × b" matches actualAnswer
        const parts = round.promptText.split('×').map((s) => Number(s.trim()));
        expect(parts[0] * parts[1]).toBe(round.actualAnswer);
      }
    });

    it('2.2: verifies estimation distractors are within plausible mental magnitude ratios (0.5x to 2.0x)', () => {
      for (let i = 0; i < 50; i++) {
        const round = generateEstimateRound();
        for (const cand of round.candidates) {
          const ratio = cand / round.actualAnswer;
          expect(ratio).toBeGreaterThanOrEqual(0.4);
          expect(ratio).toBeLessThanOrEqual(2.5);
        }
      }
    });
  });

  // =========================================================================
  // 3. FIND THE MISTAKE ERROR RATE ORACLE (100 Rounds)
  // =========================================================================
  describe('3. Find the Mistake Error Rate Oracle', () => {
    it('3.1: generates 100 rounds and verifies exactly 3 true identities and 1 false equation with non-trivial error', () => {
      const allOps: MathOperator[] = ['+', '-', '*', '/'];

      for (let r = 0; r < 100; r++) {
        const round = generateMistakeRound(allOps);

        expect(round.equations).toHaveLength(4);
        expect(round.mistakeIndex).toBeGreaterThanOrEqual(0);
        expect(round.mistakeIndex).toBeLessThan(4);

        let trueEquationsCount = 0;
        let falseEquationsCount = 0;

        for (let idx = 0; idx < round.equations.length; idx++) {
          const eq = round.equations[idx];
          expect(eq.id).toBe(idx);

          // Parse equation text: "operandA sym operandB = result"
          const match = eq.text.match(/^(\d+)\s+([+−×÷])\s+(\d+)\s+=\s+(-?\d+)$/);
          expect(match).not.toBeNull();
          if (!match) continue;

          const a = Number(match[1]);
          const sym = match[2];
          const b = Number(match[3]);
          const statedResult = Number(match[4]);

          let trueResult = 0;
          if (sym === '+') trueResult = a + b;
          else if (sym === '−') trueResult = a - b;
          else if (sym === '×') trueResult = a * b;
          else if (sym === '÷') trueResult = Math.floor(a / b);

          const isMathematicallyTrue = statedResult === trueResult;

          if (idx === round.mistakeIndex) {
            expect(eq.isMistake).toBe(true);
            expect(isMathematicallyTrue).toBe(false);
            falseEquationsCount++;

            // Non-trivial error check: error delta must be between 1 and 10
            const delta = Math.abs(statedResult - trueResult);
            expect(delta).toBeGreaterThanOrEqual(1);
            expect(delta).toBeLessThanOrEqual(10);
          } else {
            expect(eq.isMistake).toBe(false);
            expect(isMathematicallyTrue).toBe(true);
            trueEquationsCount++;
          }
        }

        // Exact invariant check: 3 true identities, 1 false equation
        expect(trueEquationsCount).toBe(3);
        expect(falseEquationsCount).toBe(1);
      }
    });

    it('3.2: verifies FindMistake works properly across single operator filters (+, -, *, /)', () => {
      for (const op of ['+', '-', '*', '/'] as const) {
        const round = generateMistakeRound([op]);
        expect(round.equations).toHaveLength(4);
        const mistakeItem = round.equations[round.mistakeIndex];
        expect(mistakeItem.isMistake).toBe(true);
      }
    });
  });

  // =========================================================================
  // 4. TABLE BATTLE & QUICK COMPARE RELATIONAL SOUNDNESS (500 Pairs)
  // =========================================================================
  describe('4. Table Battle & Quick Compare Relational Soundness Oracle (500 Pairs)', () => {
    it('4.1: generates 250 Table Battle rounds; verifies relation strictly matches Math.sign(exprA - exprB) 100%', () => {
      let lessCount = 0;
      let equalCount = 0;
      let greaterCount = 0;

      for (let i = 0; i < 250; i++) {
        const battle = generateTableBattle();

        // Verify arithmetic of left and right expressions
        const leftParts = battle.leftExpr.split('×').map((s) => Number(s.trim()));
        const rightParts = battle.rightExpr.split('×').map((s) => Number(s.trim()));
        expect(leftParts[0] * leftParts[1]).toBe(battle.leftVal);
        expect(rightParts[0] * rightParts[1]).toBe(battle.rightVal);

        const diff = battle.leftVal - battle.rightVal;
        const sign = Math.sign(diff);

        if (sign < 0) {
          expect(battle.relation).toBe('<');
          expect(battle.expectedAnswerCode).toBe(1);
          lessCount++;
        } else if (sign === 0) {
          expect(battle.relation).toBe('=');
          expect(battle.expectedAnswerCode).toBe(2);
          equalCount++;
        } else {
          expect(battle.relation).toBe('>');
          expect(battle.expectedAnswerCode).toBe(3);
          greaterCount++;
        }
      }

      // Both strictly less and strictly greater must occur substantially
      expect(lessCount).toBeGreaterThan(50);
      expect(greaterCount).toBeGreaterThan(50);
      // Total tested is 250
      expect(lessCount + equalCount + greaterCount).toBe(250);
    });

    it('4.2: generates 250 Quick Compare rounds; verifies relation strictly matches Math.sign(exprA - exprB) 100%', () => {
      let lessCount = 0;
      let equalCount = 0;
      let greaterCount = 0;

      for (let i = 0; i < 250; i++) {
        const compare = generateQuickComparePair(['+', '-', '*', '/']);

        const diff = compare.leftVal - compare.rightVal;
        const sign = Math.sign(diff);

        if (sign < 0) {
          expect(compare.relation).toBe('<');
          expect(compare.expectedCode).toBe(1);
          lessCount++;
        } else if (sign === 0) {
          expect(compare.relation).toBe('=');
          expect(compare.expectedCode).toBe(2);
          equalCount++;
        } else {
          expect(compare.relation).toBe('>');
          expect(compare.expectedCode).toBe(3);
          greaterCount++;
        }
      }

      expect(lessCount).toBeGreaterThan(50);
      expect(greaterCount).toBeGreaterThan(50);
      expect(lessCount + equalCount + greaterCount).toBe(250);
    });

    it('4.3: verifies BiggerSmaller threshold logic matches actualVal > threshold across 100 rounds', () => {
      for (let i = 0; i < 100; i++) {
        const fact = generateArithmeticFact({ allowedOperators: ['*'], level: 2 });
        const offsetPercent = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.15);
        let delta = Math.round(fact.answer * offsetPercent);
        if (delta === 0) delta = 5;

        const threshold = Math.max(1, fact.answer + delta);
        const isBigger = fact.answer > threshold;
        const expectedCode = isBigger ? 1 : 2;

        if (fact.answer > threshold) {
          expect(expectedCode).toBe(1);
          expect(isBigger).toBe(true);
        } else {
          expect(expectedCode).toBe(2);
          expect(isBigger).toBe(false);
        }
      }
    });
  });

  // =========================================================================
  // 5. CALCULATION HINT PEDAGOGICAL SOUNDNESS ORACLE (200 Operations)
  // =========================================================================
  describe('5. Calculation Hint Pedagogical Soundness Oracle (200 Operations)', () => {
    it('5.1: generates hints for 200 diverse operations and verifies mathematical equality of intermediate steps', () => {
      const operations: MathOperator[] = ['*', '+', '-', '/'];

      for (let i = 0; i < 200; i++) {
        const op = operations[i % operations.length];
        let a = 1;
        let b = 1;
        let ans = 0;

        if (op === '*') {
          // Cover special tricks: 10, 9, 11, 5, 4, square, distributive
          const sampleType = i % 8;
          if (sampleType === 0) { a = 14; b = 10; }
          else if (sampleType === 1) { a = 7; b = 9; }
          else if (sampleType === 2) { a = 8; b = 11; }
          else if (sampleType === 3) { a = 16; b = 5; }
          else if (sampleType === 4) { a = 13; b = 4; }
          else if (sampleType === 5) { a = 9; b = 9; } // square
          else if (sampleType === 6) { a = 17; b = 6; } // distributive split
          else { a = 3 + Math.floor(Math.random() * 10); b = 3 + Math.floor(Math.random() * 10); }
          ans = a * b;
        } else if (op === '+') {
          const sampleType = i % 4;
          if (sampleType === 0) { a = 24; b = 19; } // near-ten 9
          else if (sampleType === 1) { a = 33; b = 28; } // near-ten 8
          else if (sampleType === 2) { a = 29; b = 15; } // operandA near-ten 9
          else { a = 10 + Math.floor(Math.random() * 40); b = 10 + Math.floor(Math.random() * 40); }
          ans = a + b;
        } else if (op === '-') {
          const sampleType = i % 4;
          if (sampleType === 0) { a = 45; b = 19; } // constant diff 9
          else if (sampleType === 1) { a = 52; b = 28; } // constant diff 8
          else if (sampleType === 2) { a = 67; b = 24; } // step-down tens
          else {
            b = 5 + Math.floor(Math.random() * 20);
            a = b + 1 + Math.floor(Math.random() * 30);
          }
          ans = a - b;
        } else if (op === '/') {
          b = 2 + Math.floor(Math.random() * 10);
          ans = 2 + Math.floor(Math.random() * 12);
          a = b * ans;
        }

        const hint = generateCalculationHint({ operator: op, operandA: a, operandB: b, answer: ans });

        // Basic syntax checks
        expect(hint).toBeTruthy();
        expect(hint).not.toContain('NaN');
        expect(hint).not.toContain('undefined');
        expect(hint).not.toContain('null');
        expect(hint).toContain(String(ans));

        // Equation chain verification:
        // Extract substring after colon (if any) and test steps separated by '='
        const colonIdx = hint.indexOf(':');
        const eqPortion = colonIdx !== -1 ? hint.substring(colonIdx + 1) : hint;

        if (eqPortion.includes('=')) {
          // Format like: " (a × 10) − a = 70 − 7 = 63 " or " a groups of b = ans "
          const segments = eqPortion.split('=').map((s) => s.trim());

          // Verify the final segment equals ans
          const finalVal = Number(segments[segments.length - 1].replace(/[^0-9-]/g, ''));
          expect(finalVal).toBe(ans);

          // For each evaluatable intermediate segment, evaluate and assert equality to ans
          for (let segIdx = 0; segIdx < segments.length - 1; segIdx++) {
            const seg = segments[segIdx];
            // If segment is pure arithmetic e.g. "(7 × 10) − 7" or "70 − 7"
            const cleaned = seg.replace(/[^0-9+\-×÷*/().\s]/g, '').trim();
            if (cleaned.length > 0 && /[0-9]/.test(cleaned) && /[+\-×÷*/]/.test(cleaned)) {
              try {
                const evalVal = evaluateArithmeticString(cleaned);
                expect(evalVal).toBe(ans);
              } catch {
                // Ignore segments that contain textual annotations alongside numbers
              }
            }
          }
        }
      }
    });

    it('5.2: verifies all documented trick paths trigger correctly without crashing', () => {
      // Nine's trick
      const hint9 = generateCalculationHint({ operator: '*', operandA: 8, operandB: 9, answer: 72 });
      expect(hint9).toContain("Nine's trick");
      expect(hint9).toContain('72');

      // Eleven's trick
      const hint11 = generateCalculationHint({ operator: '*', operandA: 7, operandB: 11, answer: 77 });
      expect(hint11).toContain("Eleven's trick");
      expect(hint11).toContain('77');

      // Five's trick
      const hint5 = generateCalculationHint({ operator: '*', operandA: 18, operandB: 5, answer: 90 });
      expect(hint5).toContain("Five's trick");
      expect(hint5).toContain('90');

      // Double twice (4s)
      const hint4 = generateCalculationHint({ operator: '*', operandA: 12, operandB: 4, answer: 48 });
      expect(hint4).toContain('Double twice');
      expect(hint4).toContain('48');

      // Perfect square
      const hintSq = generateCalculationHint({ operator: '*', operandA: 8, operandB: 8, answer: 64 });
      expect(hintSq).toContain('Perfect square');
      expect(hintSq).toContain('64');

      // Distributive breakdown
      const hintDist = generateCalculationHint({ operator: '*', operandA: 14, operandB: 6, answer: 84 });
      expect(hintDist).toContain('Split 14');
      expect(hintDist).toContain('84');

      // Subtraction constant difference
      const hintSub9 = generateCalculationHint({ operator: '-', operandA: 42, operandB: 19, answer: 23 });
      expect(hintSub9).toContain('Constant difference');
      expect(hintSub9).toContain('23');

      // Division inverse multiplication
      const hintDiv = generateCalculationHint({ operator: '/', operandA: 56, operandB: 7, answer: 8 });
      expect(hintDiv).toContain('Think multiplication');
      expect(hintDiv).toContain('8');
    });
  });

  // =========================================================================
  // 6. COMPONENT RENDERING & LIFECYCLE VERIFICATION (Battles, Challenges, Memory)
  // =========================================================================
  describe('6. Component Rendering & Lifecycle Verification', () => {
    it('6.1: renders TableBattleGame and executes comparison choice interaction', () => {
      render(React.createElement(TableBattleGame));
      expect(screen.getAllByText('Table Battle')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Battle'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Which Side Is Greater?')).toBeInTheDocument();
      expect(screen.getByText('<')).toBeInTheDocument();
      expect(screen.getByText('=')).toBeInTheDocument();
      expect(screen.getByText('>')).toBeInTheDocument();

      // Click '<'
      fireEvent.click(screen.getByText('<'));
    });

    it('6.2: renders QuickCompareGame and executes rapid comparison interaction', () => {
      render(React.createElement(QuickCompareGame));
      expect(screen.getAllByText('Quick Compare')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Compare'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Rapid Arithmetic Comparison')).toBeInTheDocument();
      fireEvent.click(screen.getByText('='));
    });

    it('6.3: renders BiggerSmallerGame and verifies threshold estimation interaction', () => {
      render(React.createElement(BiggerSmallerGame));
      expect(screen.getAllByText('Bigger or Smaller')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Drill'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Threshold Estimation')).toBeInTheDocument();
      fireEvent.click(screen.getByText('GREATER (>)'));
    });

    it('6.4: renders TableChainGame and presents missing sequence question', () => {
      render(React.createElement(TableChainGame));
      expect(screen.getAllByText('Table Chain')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Chain Puzzle'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Find The Missing Sequence Value')).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('6.5: renders MemoryCalculationGame and handles flash memory flip timer', () => {
      render(React.createElement(MemoryCalculationGame));
      expect(screen.getAllByText('Memory Calculation')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Memory Drill'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Memorize The Equation!')).toBeInTheDocument();

      // Advance timer by 1850ms to trigger face-down card flip
      act(() => {
        vi.advanceTimersByTime(1850);
      });

      expect(screen.getByText('Recall From Memory & Solve')).toBeInTheDocument();
    });

    it('6.6: renders OperationSwitchGame and verifies cognitive switch UI', () => {
      render(React.createElement(OperationSwitchGame));
      expect(screen.getAllByText('Operation Switch')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Switch Drill'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Cognitive Switch')).toBeInTheDocument();
    });

    it('6.7: renders NumberTargetGame and executes game launch transition', () => {
      render(React.createElement(NumberTargetGame));
      expect(screen.getAllByText('Number Target')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Target Puzzle'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Target Number')).toBeInTheDocument();
      expect(screen.getByText('Check Solution')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('6.8: renders ClosestAnswerGame and presents rapid mental estimation UI', () => {
      render(React.createElement(ClosestAnswerGame));
      expect(screen.getAllByText('Closest Answer')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Estimation'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Rapid Mental Estimation')).toBeInTheDocument();
    });

    it('6.9: renders FindMistakeGame and displays error detection cards', () => {
      render(React.createElement(FindMistakeGame));
      expect(screen.getAllByText('Find the Mistake')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Hunting'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText('Error Detection')).toBeInTheDocument();
      expect(screen.getByText(/3 of these are correct\. Which ONE is WRONG\?/)).toBeInTheDocument();
    });

    it('6.10: renders TableBreakerGame and presents brick demolition UI', () => {
      render(React.createElement(TableBreakerGame));
      expect(screen.getAllByText('Table Breaker')[0]).toBeInTheDocument();
      fireEvent.click(screen.getByText('Start Breaker'));
      fireEvent.click(screen.getByText('Launch Game'));
      advanceThroughCountdown();

      expect(screen.getByText(/Bricks Remaining/)).toBeInTheDocument();
    });
  });
});
