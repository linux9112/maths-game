import React, { useState, useCallback } from 'react';
import { Target, RotateCcw, Check } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';

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

export interface NumberTargetGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const NumberTargetGame: React.FC<NumberTargetGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const [puzzle, setPuzzle] = useState<TargetPuzzle>(() => generateTargetPuzzle());
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const customGenerator = useCallback((_cfg: GameConfig, index: number): Question => {
    const p = generateTargetPuzzle();
    setPuzzle(p);
    setSelectedTokens([]);
    return {
      id: `target_puzzle_${index}_${p.targetNumber}`,
      operator: '*',
      operandA: p.targetNumber,
      operandB: 1,
      answer: p.targetNumber,
      promptText: `Make Target: ${p.targetNumber}`,
      displayOperator: '=',
      options: [p.targetNumber],
      answerStr: String(p.targetNumber),
      difficulty: 'normal',
      category: 'game',
    };
  }, []);

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'number_target',
      title: 'Number Target',
      category: 'Challenges',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 15,
      ...initialConfig,
    },
    customQuestionGenerator: customGenerator,
  });

  const {
    state,
    config,
    summaryData,
    openPreFlight,
    closePreFlight,
    startGame,
    submitAnswer,
    pause,
    resume,
    restart,
    forfeit,
    audio,
  } = engine;

  const handleTileClick = (val: number) => {
    setEvaluationError(null);
    setSelectedTokens((prev) => [...prev, String(val)]);
    audio.playButtonTap();
  };

  const handleOpClick = (op: MathOperator) => {
    setEvaluationError(null);
    setSelectedTokens((prev) => [...prev, op]);
    audio.playButtonTap();
  };

  const handleClear = () => {
    setSelectedTokens([]);
    setEvaluationError(null);
  };

  const handleCheckSolution = () => {
    if (selectedTokens.length < 3) {
      setEvaluationError('Select at least 2 numbers and 1 operator');
      return;
    }

    try {
      const expr = selectedTokens.join(' ');
      // Safe arithmetic evaluation (digits and basic operators only)
      if (!/^[0-9+\-*/\s]+$/.test(expr)) {
        setEvaluationError('Invalid characters in expression');
        return;
      }

      // Compute using basic parser
      // Simple binary evaluation for e.g. "6 * 8" or "10 + 5"
      const parts = selectedTokens;
      let acc = Number(parts[0]);
      for (let i = 1; i < parts.length; i += 2) {
        const op = parts[i];
        const nextVal = Number(parts[i + 1]);
        if (isNaN(nextVal)) throw new Error('Incomplete expression');
        if (op === '+') acc += nextVal;
        else if (op === '-') acc -= nextVal;
        else if (op === '*') acc *= nextVal;
        else if (op === '/') acc = nextVal !== 0 ? acc / nextVal : 0;
      }

      if (acc === puzzle.targetNumber) {
        submitAnswer(puzzle.targetNumber);
        setSelectedTokens([]);
      } else {
        setEvaluationError(`Result is ${acc}, not ${puzzle.targetNumber}!`);
        submitAnswer(-999999);
      }
    } catch {
      setEvaluationError('Incomplete expression');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
      <GameHUD
        state={state}
        config={config}
        onPause={pause}
        onResume={resume}
        onRestart={restart}
        onForfeit={() => {
          forfeit();
          onBackToHub?.();
        }}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {state.status === 'PLAYING' && (
          <div className="w-full space-y-5">
            {/* Target Header Card */}
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-center space-y-2">
              <span className="text-xs uppercase tracking-widest font-black text-amber-400 flex items-center justify-center gap-1.5">
                <Target className="w-4 h-4" />
                Target Number
              </span>
              <div className="text-5xl sm:text-6xl font-black font-mono text-white">
                {puzzle.targetNumber}
              </div>
            </div>

            {/* Expression Construction Tray */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 min-h-[60px] flex items-center justify-center flex-wrap gap-2">
              {selectedTokens.length === 0 ? (
                <span className="text-xs text-slate-500 font-mono">
                  Select numbers & operators below to reach {puzzle.targetNumber}
                </span>
              ) : (
                selectedTokens.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-indigo-600/30 border border-indigo-400/50 rounded-xl font-mono font-black text-xl text-white"
                  >
                    {t}
                  </span>
                ))
              )}
            </div>

            {evaluationError && (
              <p className="text-xs text-red-400 text-center font-bold">{evaluationError}</p>
            )}

            {/* Number Tiles Tray */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Number Tiles
              </span>
              <div className="grid grid-cols-5 gap-2">
                {puzzle.tiles.map((tile, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    className="py-4 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white font-mono font-black text-xl rounded-xl border border-slate-700 hover:border-indigo-400 transition-all shadow-md"
                  >
                    {tile}
                  </button>
                ))}
              </div>
            </div>

            {/* Operators Row */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Operators
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['+', '-', '*', '/'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => handleOpClick(op)}
                    className="py-3 bg-slate-800 hover:bg-amber-600 active:scale-95 text-amber-300 font-mono font-black text-xl rounded-xl border border-slate-700 hover:border-amber-400 transition-all shadow-md"
                  >
                    {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Clear
              </button>
              <button
                type="button"
                onClick={handleCheckSolution}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm"
              >
                <Check className="w-4 h-4 stroke-[3]" /> Check Solution
              </button>
            </div>
          </div>
        )}

        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Target className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Number Target</h2>
            <p className="text-xs text-slate-400">
              Combine given number tiles and operators to reach the exact target number!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Start Target Puzzle
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-indigo-400 animate-ping">
              {state.countdownValue === 0 ? 'TARGET!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="number_target"
        gameTitle="Number Target"
        category="Challenges"
        icon={<Target className="w-5 h-5 text-indigo-400" />}
        gameDescription="Number tile puzzle. Combine numbers and arithmetic operators to hit the target."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Number Target"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
