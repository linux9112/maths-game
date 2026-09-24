import React, { useState, useCallback } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { generateArithmeticFact } from '../../../core/math/arithmeticGenerator';

interface ThresholdFact {
  promptExpr: string;
  actualVal: number;
  threshold: number;
  isBigger: boolean;
  expectedCode: number; // 1: Bigger (>), 2: Smaller (<)
}

function generateThresholdQuestion(config: GameConfig): ThresholdFact {
  const ops: readonly MathOperator[] = config.selectedOperators && config.selectedOperators.length > 0 ? config.selectedOperators : ['*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const fact = generateArithmeticFact({ allowedOperators: [op], level: 2 });

  // Generate threshold close to actual answer (offset by ±10% - ±25%, avoiding 0)
  const offsetPercent = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.15);
  let delta = Math.round(fact.answer * offsetPercent);
  if (delta === 0) delta = Math.random() < 0.5 ? 5 : -5;

  const threshold = Math.max(1, fact.answer + delta);
  const isBigger = fact.answer > threshold;
  const expectedCode = isBigger ? 1 : 2;

  const sym = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+';

  return {
    promptExpr: `${fact.operandA} ${sym} ${fact.operandB}`,
    actualVal: fact.answer,
    threshold,
    isBigger,
    expectedCode,
  };
}

export interface BiggerSmallerGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const BiggerSmallerGame: React.FC<BiggerSmallerGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const [fact, setFact] = useState<ThresholdFact>(() =>
    generateThresholdQuestion({ selectedOperators: ['*'] } as unknown as GameConfig)
  );

  const customGenerator = useCallback((cfg: GameConfig, index: number): Question => {
    const q = generateThresholdQuestion(cfg);
    setFact(q);
    return {
      id: `bigger_smaller_${index}_${q.actualVal}_${q.threshold}`,
      operator: '*',
      operandA: q.actualVal,
      operandB: q.threshold,
      answer: q.expectedCode,
      promptText: `Is ${q.promptExpr} greater than ${q.threshold}?`,
      displayOperator: '>',
      options: [1, 2], // 1: Greater (>), 2: Less (<)
      answerStr: q.isBigger ? 'Greater (>)' : 'Less (<)',
      difficulty: 'normal',
      category: 'game',
    };
  }, []);

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'bigger_smaller',
      title: 'Bigger or Smaller',
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
            <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl space-y-4 text-center">
              <span className="text-xs uppercase tracking-widest font-black text-amber-400 flex items-center justify-center gap-1.5">
                <ArrowUpDown className="w-4 h-4" />
                Threshold Estimation
              </span>

              <div className="text-3xl sm:text-5xl font-black font-mono text-white py-2">
                {fact.promptExpr}
              </div>

              <div className="text-lg font-bold text-slate-300">
                Is it <span className="text-amber-400">GREATER</span> or <span className="text-indigo-400">LESS</span> than{' '}
                <span className="font-mono text-white font-black text-2xl underline decoration-amber-500">
                  {fact.threshold}
                </span>
                ?
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => submitAnswer(1)}
                className="py-6 bg-slate-800 hover:bg-amber-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-amber-400 transition-all shadow-lg flex flex-col items-center justify-center gap-1"
              >
                <span>GREATER (&gt;)</span>
                <span className="text-xs font-sans text-slate-400">Above {fact.threshold}</span>
              </button>

              <button
                type="button"
                onClick={() => submitAnswer(2)}
                className="py-6 bg-slate-800 hover:bg-indigo-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-indigo-400 transition-all shadow-lg flex flex-col items-center justify-center gap-1"
              >
                <span>LESS (&lt;)</span>
                <span className="text-xs font-sans text-slate-400">Below {fact.threshold}</span>
              </button>
            </div>
          </div>
        )}

        {state.status === 'IDLE' && (
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ArrowUpDown className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Bigger or Smaller</h2>
            <p className="text-xs text-slate-400">
              Quick estimation check! Evaluate whether the mental calculation exceeds or falls below a target number threshold.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
            >
              Start Drill
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-amber-400 animate-ping">
              {state.countdownValue === 0 ? 'ESTIMATE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="bigger_smaller"
        gameTitle="Bigger or Smaller"
        category="Battles"
        icon={<ArrowUpDown className="w-5 h-5 text-amber-400" />}
        gameDescription="Estimate whether calculations exceed or fall below benchmark thresholds."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Bigger or Smaller"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
