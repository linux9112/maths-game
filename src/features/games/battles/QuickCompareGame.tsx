import React, { useState, useCallback } from 'react';
import { Scale } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { generateArithmeticFact } from '../../../core/math/arithmeticGenerator';

interface ComparePair {
  leftStr: string;
  leftVal: number;
  rightStr: string;
  rightVal: number;
  relation: '<' | '=' | '>';
  expectedCode: number; // 1: <, 2: =, 3: >
}

function generateQuickComparePair(config: GameConfig): ComparePair {
  const ops: readonly MathOperator[] = config.selectedOperators && config.selectedOperators.length > 0 ? config.selectedOperators : ['+'];
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
  const [pair, setPair] = useState<ComparePair>(() =>
    generateQuickComparePair({ selectedOperators: ['+', '-'] } as unknown as GameConfig)
  );

  const customGenerator = useCallback((cfg: GameConfig, index: number): Question => {
    const p = generateQuickComparePair(cfg);
    setPair(p);
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
          <div className="w-full space-y-6">
            <div className="p-4 sm:p-8 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl space-y-4 sm:space-y-6 text-center">
              <span className="text-xs uppercase tracking-widest font-black text-cyan-400 flex items-center justify-center gap-1.5">
                <Scale className="w-4 h-4" />
                Rapid Arithmetic Comparison
              </span>

              <div className="flex items-center justify-around gap-2 sm:gap-3 py-2 sm:py-4">
                <div className="flex-1 p-2.5 sm:p-5 bg-slate-800/80 rounded-2xl border border-cyan-500/40 font-mono font-black text-lg sm:text-3xl text-cyan-300 shadow-md">
                  {pair.leftStr}
                </div>

                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs sm:text-sm flex-shrink-0">
                  VS
                </div>

                <div className="flex-1 p-2.5 sm:p-5 bg-slate-800/80 rounded-2xl border border-blue-500/40 font-mono font-black text-lg sm:text-3xl text-blue-300 shadow-md">
                  {pair.rightStr}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => submitAnswer(1)}
                className="py-3.5 sm:py-6 bg-slate-800 hover:bg-cyan-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl rounded-2xl border border-slate-700 hover:border-cyan-400 transition-all shadow-lg flex flex-col items-center justify-center"
              >
                <span>&lt;</span>
                <span className="text-[9px] sm:text-[10px] font-sans text-slate-400 mt-0.5 sm:mt-1 text-center">Left is Smaller</span>
              </button>

              <button
                type="button"
                onClick={() => submitAnswer(2)}
                className="py-3.5 sm:py-6 bg-slate-800 hover:bg-amber-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl rounded-2xl border border-slate-700 hover:border-amber-400 transition-all shadow-lg flex flex-col items-center justify-center"
              >
                <span>=</span>
                <span className="text-[9px] sm:text-[10px] font-sans text-slate-400 mt-0.5 sm:mt-1 text-center">Equal</span>
              </button>

              <button
                type="button"
                onClick={() => submitAnswer(3)}
                className="py-3.5 sm:py-6 bg-slate-800 hover:bg-blue-600 active:scale-95 text-white font-mono font-black text-2xl sm:text-3xl rounded-2xl border border-slate-700 hover:border-blue-400 transition-all shadow-lg flex flex-col items-center justify-center"
              >
                <span>&gt;</span>
                <span className="text-[9px] sm:text-[10px] font-sans text-slate-400 mt-0.5 sm:mt-1 text-center">Left is Greater</span>
              </button>
            </div>
          </div>
        )}

        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Scale className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Quick Compare</h2>
            <p className="text-xs text-slate-400">
              Compare two multi-digit calculations side by side. Decide whether the left expression is less than, equal to, or greater than the right.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
            >
              Start Compare
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-cyan-400 animate-ping">
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
        icon={<Scale className="w-5 h-5 text-cyan-400" />}
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
