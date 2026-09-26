import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

export interface OperationSwitchGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const OperationSwitchGame: React.FC<OperationSwitchGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'operation_switch',
      title: 'Operation Switch',
      category: 'Memory',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 20,
      ...initialConfig,
    },
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

  // Track operator changes to display visual switch flash
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [switchAlert, setSwitchAlert] = useState<boolean>(false);

  useEffect(() => {
    if (state.currentQuestion) {
      if (lastOperator && lastOperator !== state.currentQuestion.operator) {
        setSwitchAlert(true);
        audio.playWarning();
        const timer = setTimeout(() => setSwitchAlert(false), 1200);
        return () => clearTimeout(timer);
      }
      setLastOperator(state.currentQuestion.operator);
    }
  }, [state.currentQuestion, lastOperator, audio]);

  const handleChoice = (ans: number) => {
    if (!state.currentQuestion) return;
    submitAnswer(ans);
  };

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
        {/* Switch Alert Banner */}
        {switchAlert && (
          <div className="absolute top-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-lg animate-bounce flex items-center gap-1.5 z-30">
            <AlertTriangle className="w-4 h-4" />
            OPERATOR SWITCH! WATCH THE SYMBOL
          </div>
        )}

        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-3 sm:space-y-5">
            <div
              className={`w-full p-4 sm:p-7 rounded-2xl sm:rounded-3xl text-center border shadow-xl transition-all backdrop-blur-md ${
                state.feedback === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/40 scale-105'
                  : state.feedback === 'incorrect'
                  ? 'bg-red-950/40 border-red-500/60 shadow-red-900/40 animate-shake'
                  : isDark
                  ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <span
                className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5 mb-1 sm:mb-2"
                style={{ color: theme.accent }}
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                Cognitive Switch
              </span>

              <div className="text-2xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight py-1 sm:py-2">
                {state.currentQuestion.operandA}{' '}
                <span
                  className="font-extrabold underline decoration-2 underline-offset-8"
                  style={{ color: theme.accent, textDecorationColor: `${theme.accent}99` }}
                >
                  {state.currentQuestion.displayOperator}
                </span>{' '}
                {state.currentQuestion.operandB}
              </div>
            </div>

            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    className={`py-2.5 sm:py-4 px-3 sm:px-4 active:scale-95 font-mono font-black text-lg sm:text-2xl rounded-xl sm:rounded-2xl border transition-all shadow-md sm:shadow-lg ${
                      isDark
                        ? 'bg-slate-800/90 hover:bg-teal-600 text-white border-slate-700 hover:border-teal-400'
                        : 'bg-white hover:bg-teal-50 text-slate-900 border-slate-200 hover:border-teal-500 shadow-sm'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Start Overlay */}
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
              <RefreshCw className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Operation Switch
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Test cognitive flexibility! The active operator dynamically flips between +, −, ×, and
              ÷. Stay focused and adapt instantly.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Switch Drill
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
              {state.countdownValue === 0 ? 'SWITCH!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="operation_switch"
        gameTitle="Operation Switch"
        category="Memory"
        icon={<RefreshCw className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Cognitive flexibility agility test. Dynamically adapt as operators switch unexpectedly."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Operation Switch"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
