import React, { useState, useEffect, useCallback } from 'react';
import { Target, RotateCcw, Check } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

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
  const { isDark } = useTheme();
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const customGenerator = useCallback((_cfg: GameConfig, index: number): Question => {
    const p = generateTargetPuzzle();
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
      metadata: p,
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

  const theme = getGameTheme(config.gameId);
  const puzzle = (state.currentQuestion?.metadata as TargetPuzzle) || null;

  // Reset expression when question changes
  useEffect(() => {
    setSelectedTokens([]);
    setEvaluationError(null);
  }, [state.currentQuestion?.id]);

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
    if (!state.currentQuestion || !puzzle) return;
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

      if (acc === state.currentQuestion.answer) {
        submitAnswer(state.currentQuestion.answer);
        setSelectedTokens([]);
      } else {
        setEvaluationError(`Result is ${acc}, not ${state.currentQuestion.answer}!`);
        submitAnswer(-999999);
      }
    } catch {
      setEvaluationError('Incomplete expression');
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full select-none overflow-hidden relative transition-colors duration-300 ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}
      style={{
        background: isDark
          ? `linear-gradient(180deg, ${theme.nightTop} 0%, ${theme.nightBottom} 100%)`
          : `linear-gradient(180deg, ${theme.dayTop} 0%, ${theme.dayBottom} 100%)`,
      }}
    >
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
        {state.status === 'PLAYING' && puzzle && (
          <div className="w-full space-y-5">
            {/* Target Header Card */}
            <div
              className={`p-6 rounded-3xl shadow-2xl text-center space-y-2 border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Target className="w-4 h-4" />
                Target Number
              </span>
              <div className="text-5xl sm:text-6xl font-black font-mono">
                {puzzle.targetNumber}
              </div>
            </div>

            {/* Expression Construction Tray */}
            <div
              className={`p-4 rounded-2xl border min-h-[60px] flex items-center justify-center flex-wrap gap-2 transition-colors ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-white/90 border-slate-200 shadow-sm'
              }`}
            >
              {selectedTokens.length === 0 ? (
                <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Select numbers & operators below to reach {puzzle.targetNumber}
                </span>
              ) : (
                selectedTokens.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl font-mono font-black text-xl border shadow-sm"
                    style={{
                      backgroundColor: `${theme.accent}25`,
                      borderColor: `${theme.accent}60`,
                      color: isDark ? '#FFF' : '#111827',
                    }}
                  >
                    {t}
                  </span>
                ))
              )}
            </div>

            {evaluationError && (
              <p className="text-xs text-red-500 text-center font-bold">{evaluationError}</p>
            )}

            {/* Number Tiles Tray */}
            <div className="space-y-2">
              <span className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Number Tiles
              </span>
              <div className="grid grid-cols-5 gap-2">
                {puzzle.tiles.map((tile, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    className={`py-4 active:scale-95 font-mono font-black text-xl rounded-xl border transition-all shadow-md ${
                      isDark
                        ? 'bg-slate-800 hover:bg-rose-600 text-white border-slate-700 hover:border-rose-400'
                        : 'bg-white hover:bg-rose-50 text-slate-900 border-slate-200 hover:border-rose-400'
                    }`}
                  >
                    {tile}
                  </button>
                ))}
              </div>
            </div>

            {/* Operators Row */}
            <div className="space-y-2">
              <span className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Operators
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['+', '-', '*', '/'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => handleOpClick(op)}
                    className={`py-3 active:scale-95 font-mono font-black text-xl rounded-xl border transition-all shadow-md ${
                      isDark
                        ? 'bg-slate-800 hover:bg-amber-600 text-amber-300 border-slate-700 hover:border-amber-400'
                        : 'bg-white hover:bg-amber-50 text-amber-700 border-slate-200 hover:border-amber-400'
                    }`}
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
                className={`py-3.5 active:scale-95 font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 text-sm ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
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
          <div
            className={`p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border backdrop-blur-md ${
              isDark
                ? 'bg-slate-900/95 border-slate-700 text-white shadow-slate-950/80'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            <div
              className="w-16 h-16 mx-auto rounded-3xl border flex items-center justify-center"
              style={{
                backgroundColor: `${theme.accent}20`,
                borderColor: `${theme.accent}40`,
                color: theme.accent,
              }}
            >
              <Target className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Number Target
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Combine given number tiles and operators to reach the exact target number!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Target Puzzle
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
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
        icon={<Target className="w-5 h-5" style={{ color: theme.accent }} />}
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
