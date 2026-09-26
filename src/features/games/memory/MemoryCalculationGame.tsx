import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Brain } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

export interface MemoryCalculationGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const MemoryCalculationGame: React.FC<MemoryCalculationGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'memory_calculation',
      title: 'Memory Calculation',
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

  // Flash visibility state (card visible for 1.8s then flips face-down)
  const [isRevealed, setIsRevealed] = useState<boolean>(true);

  useEffect(() => {
    if (state.status === 'PLAYING' && state.currentQuestion) {
      setIsRevealed(true);
      const timer = setTimeout(() => {
        setIsRevealed(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.currentQuestion]);

  const handleChoice = (ans: number) => {
    if (!state.currentQuestion) return;
    submitAnswer(ans);
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
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-6">
            {/* Flash Memory Card with 3D Flip Effect */}
            <div
              className={`w-full min-h-[220px] rounded-3xl p-8 text-center border shadow-2xl flex flex-col items-center justify-center transition-all duration-500 transform backdrop-blur-md ${
                isRevealed
                  ? isDark
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/40 rotate-0'
                    : 'bg-white/95 border-emerald-300 shadow-xl rotate-0'
                  : isDark
                  ? 'bg-slate-900/90 border-slate-700 shadow-slate-950/80 scale-95'
                  : 'bg-white/90 border-slate-200 shadow-lg scale-95'
              }`}
            >
              <div
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest mb-3"
                style={{ color: theme.accent }}
              >
                {isRevealed ? (
                  <>
                    <Eye className="w-4 h-4 text-emerald-500" />
                    Memorize The Equation!
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-amber-500" />
                    Recall From Memory & Solve
                  </>
                )}
              </div>

              {isRevealed ? (
                <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight animate-fade-in">
                  {state.currentQuestion.promptText}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Brain className="w-16 h-16 animate-pulse" style={{ color: theme.accent }} />
                  <span className={`text-sm font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ? ? ?
                  </span>
                </div>
              )}
            </div>

            {/* Answer Choices */}
            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-3 w-full">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    className={`py-5 px-4 active:scale-95 font-mono font-black text-2xl rounded-2xl border transition-all shadow-lg ${
                      isDark
                        ? 'bg-slate-800/90 hover:bg-emerald-600 text-white border-slate-700 hover:border-emerald-400'
                        : 'bg-white hover:bg-emerald-50 text-slate-900 border-slate-200 hover:border-emerald-500 shadow-md'
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
              <Brain className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Memory Calculation
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              The arithmetic problem flashes for 1.8 seconds and then flips face down. Compute the
              answer strictly from memory!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Memory Drill
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
              {state.countdownValue === 0 ? 'FOCUS!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="memory_calculation"
        gameTitle="Memory Calculation"
        category="Memory"
        icon={<Brain className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Working memory trainer. Memorize the calculation before the card vanishes."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Memory Calculation"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
