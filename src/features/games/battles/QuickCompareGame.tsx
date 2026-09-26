import React, { useCallback } from 'react';
import { Scale } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { generateArithmeticFact } from '../../../core/math/arithmeticGenerator';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

interface ComparePair {
  leftStr: string;
  leftVal: number;
  rightStr: string;
  rightVal: number;
  relation: '<' | '=' | '>';
  expectedCode: number; // 1: <, 2: =, 3: >
}

function generateQuickComparePair(config: GameConfig): ComparePair {
  const ops: readonly MathOperator[] =
    config.selectedOperators && config.selectedOperators.length > 0 ? config.selectedOperators : ['+'];
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

export interface QuickCompareGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const QuickCompareGame: React.FC<QuickCompareGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const customGenerator = useCallback((cfg: GameConfig, index: number): Question => {
    const p = generateQuickComparePair(cfg);
    return {
      id: `quick_compare_${index}_${p.leftVal}_${p.rightVal}`,
      operator: '+',
      operandA: p.leftVal,
      operandB: p.rightVal,
      answer: p.expectedCode,
      promptText: `${p.leftStr}  vs  ${p.rightStr}`,
      displayOperator: 'vs',
      options: [1, 2, 3],
      answerStr: p.relation,
      difficulty: 'normal',
      category: 'game',
      metadata: p,
    };
  }, []);

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'quick_compare',
      title: 'Quick Compare',
      category: 'Battles',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 20,
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
  const pair = (state.currentQuestion?.metadata as ComparePair) || null;

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 select-none overflow-y-auto relative transition-colors duration-300 ${
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

      <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-lg mx-auto w-full my-auto relative min-h-0">
        {state.status === 'PLAYING' && pair && (
          <div className="w-full space-y-3 sm:space-y-5">
            <div
              className={`p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl space-y-2.5 sm:space-y-4 text-center border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-[10px] sm:text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Rapid Arithmetic Comparison
              </span>

              <div className="flex items-center justify-around gap-2 sm:gap-3 py-1.5 sm:py-3">
                <div
                  className={`flex-1 p-2 sm:p-4 rounded-xl sm:rounded-2xl border font-mono font-black text-base sm:text-2xl shadow-md ${
                    isDark
                      ? 'bg-slate-800/80 border-cyan-500/40 text-cyan-300'
                      : 'bg-cyan-50 border-cyan-300 text-cyan-900'
                  }`}
                >
                  {pair.leftStr}
                </div>

                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-400'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                >
                  VS
                </div>

                <div
                  className={`flex-1 p-2 sm:p-4 rounded-xl sm:rounded-2xl border font-mono font-black text-base sm:text-2xl shadow-md ${
                    isDark
                      ? 'bg-slate-800/80 border-blue-500/40 text-blue-300'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                >
                  {pair.rightStr}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => submitAnswer(1)}
                className={`py-2.5 sm:py-4 px-1 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-cyan-600 text-white border-slate-700 hover:border-cyan-400'
                    : 'bg-white hover:bg-cyan-50 text-slate-900 border-slate-200 hover:border-cyan-500 shadow-sm'
                }`}
              >
                <span>&lt;</span>
                <span
                  className={`text-[8px] sm:text-[10px] font-sans mt-0.5 text-center leading-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Left Smaller
                </span>
              </button>

              <button
                type="button"
                onClick={() => submitAnswer(2)}
                className={`py-2.5 sm:py-4 px-1 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-amber-600 text-white border-slate-700 hover:border-amber-400'
                    : 'bg-white hover:bg-amber-50 text-slate-900 border-slate-200 hover:border-amber-500 shadow-sm'
                }`}
              >
                <span>=</span>
                <span
                  className={`text-[8px] sm:text-[10px] font-sans mt-0.5 text-center leading-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Equal
                </span>
              </button>

              <button
                type="button"
                onClick={() => submitAnswer(3)}
                className={`py-2.5 sm:py-4 px-1 active:scale-95 font-mono font-black text-xl sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-blue-600 text-white border-slate-700 hover:border-blue-400'
                    : 'bg-white hover:bg-blue-50 text-slate-900 border-slate-200 hover:border-blue-500 shadow-sm'
                }`}
              >
                <span>&gt;</span>
                <span
                  className={`text-[8px] sm:text-[10px] font-sans mt-0.5 text-center leading-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Left Greater
                </span>
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
              <Scale className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Quick Compare
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Compare two multi-digit calculations side by side. Decide whether the left expression
              is less than, equal to, or greater than the right.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Compare
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
              {state.countdownValue === 0 ? 'COMPARE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="quick_compare"
        gameTitle="Quick Compare"
        category="Battles"
        icon={<Scale className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Compare expressions across arithmetic operations. Decide <, =, or >."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Quick Compare"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
