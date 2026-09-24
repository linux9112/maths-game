import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Brain } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';

export interface MemoryCalculationGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const MemoryCalculationGame: React.FC<MemoryCalculationGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
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
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-6">
            {/* Flash Memory Card with 3D Flip Effect */}
            <div
              className={`w-full min-h-[220px] rounded-3xl p-8 text-center border shadow-2xl flex flex-col items-center justify-center transition-all duration-500 transform ${
                isRevealed
                  ? 'bg-indigo-900/60 border-indigo-500/60 shadow-indigo-900/40 rotate-0'
                  : 'bg-slate-900/90 border-slate-700 shadow-slate-950/80 scale-95'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-300 mb-3">
                {isRevealed ? (
                  <>
                    <Eye className="w-4 h-4 text-cyan-400" />
                    Memorize The Equation!
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    Recall From Memory & Solve
                  </>
                )}
              </div>

              {isRevealed ? (
                <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white animate-fade-in">
                  {state.currentQuestion.promptText}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Brain className="w-16 h-16 text-indigo-400 animate-pulse" />
                  <span className="text-sm font-mono text-slate-400">? ? ?</span>
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
                    className="py-5 px-4 bg-slate-800/90 hover:bg-indigo-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-indigo-400 transition-all shadow-lg"
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
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Memory Calculation</h2>
            <p className="text-xs text-slate-400">
              The arithmetic problem flashes for 1.8 seconds and then flips face down. Compute the answer strictly from memory!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Start Memory Drill
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-indigo-400 animate-ping">
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
        icon={<Brain className="w-5 h-5 text-indigo-400" />}
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
