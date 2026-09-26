import React, { useCallback } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question, MathOperator } from '../../../core/math/types';
import { generateArithmeticFact } from '../../../core/math/arithmeticGenerator';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

interface ThresholdFact {
  promptExpr: string;
  actualVal: number;
  threshold: number;
  isBigger: boolean;
  expectedCode: number; // 1: Bigger (>), 2: Smaller (<)
}

function generateThresholdQuestion(config: GameConfig): ThresholdFact {
  const ops: readonly MathOperator[] =
    config.selectedOperators && config.selectedOperators.length > 0 ? config.selectedOperators : ['*'];
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
  const { isDark } = useTheme();

  const customGenerator = useCallback((cfg: GameConfig, index: number): Question => {
    const q = generateThresholdQuestion(cfg);
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
      metadata: q,
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

  const theme = getGameTheme(config.gameId);
  const fact = (state.currentQuestion?.metadata as ThresholdFact) || null;

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
        {state.status === 'PLAYING' && fact && (
          <div className="w-full space-y-3 sm:space-y-5">
            <div
              className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl space-y-2.5 sm:space-y-3 text-center border backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-[10px] sm:text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5"
                style={{ color: theme.accent }}
              >
                <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Threshold Estimation
              </span>

              <div className="text-2xl sm:text-4xl font-black font-mono py-1 sm:py-2">
                {fact.promptExpr}
              </div>

              <div className={`text-sm sm:text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Is it{' '}
                <span className="font-extrabold" style={{ color: theme.accent }}>
                  GREATER
                </span>{' '}
                or{' '}
                <span className="font-extrabold text-indigo-500">
                  LESS
                </span>{' '}
                than{' '}
                <span
                  className="font-mono font-black text-xl sm:text-2xl underline decoration-2 underline-offset-4"
                  style={{ textDecorationColor: theme.accent }}
                >
                  {fact.threshold}
                </span>
                ?
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => submitAnswer(1)}
                className={`py-3 sm:py-4 px-2.5 sm:px-3 active:scale-95 font-mono font-black text-base sm:text-xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-purple-600 text-white border-slate-700 hover:border-purple-400'
                    : 'bg-white hover:bg-purple-50 text-slate-900 border-slate-200 hover:border-purple-500 shadow-sm'
                }`}
              >
                <span>GREATER (&gt;)</span>
                <span className={`text-[10px] sm:text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Above {fact.threshold}
                </span>
              </button>

              <button
                type="button"
                onClick={() => submitAnswer(2)}
                className={`py-3 sm:py-4 px-2.5 sm:px-3 active:scale-95 font-mono font-black text-base sm:text-xl rounded-xl sm:rounded-2xl border transition-all shadow-md flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-indigo-600 text-white border-slate-700 hover:border-indigo-400'
                    : 'bg-white hover:bg-indigo-50 text-slate-900 border-slate-200 hover:border-indigo-500 shadow-sm'
                }`}
              >
                <span>LESS (&lt;)</span>
                <span className={`text-[10px] sm:text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Below {fact.threshold}
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
              <ArrowUpDown className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Bigger or Smaller
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Quick estimation check! Evaluate whether the mental calculation exceeds or falls below
              a target number threshold.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Drill
            </button>
          </div>
        )}

        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
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
        icon={<ArrowUpDown className="w-5 h-5" style={{ color: theme.accent }} />}
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
