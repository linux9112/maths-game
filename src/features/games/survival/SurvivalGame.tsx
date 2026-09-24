import React, { useState, useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';

export interface SurvivalGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const SurvivalGame: React.FC<SurvivalGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const engine = useGameEngine({
    initialConfig: {
      gameId: 'survival_endurance',
      title: 'Survival Endurance',
      category: 'Survival',
      timeLimitSec: null, // Untimed endurance
      mistakeLimit: 3,
      targetLength: 'endless',
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

  // Wave progression
  const currentWave = Math.floor(state.questionsAnswered / 5) + 1;
  const [shieldActive, setShieldActive] = useState<boolean>(false);

  // Heart recovery or shield every 20-combo
  useEffect(() => {
    if (state.combo > 0 && state.combo % 20 === 0) {
      setShieldActive(true);
      audio.playLevelUp();
    }
  }, [state.combo, audio]);

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

      {/* Main Survival Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {/* Wave Banner */}
        <div className="flex items-center justify-between w-full mb-4 px-2">
          <div className="px-3 py-1 bg-red-950/40 border border-red-500/40 rounded-full text-xs font-black uppercase tracking-wider text-red-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Wave {currentWave}
          </div>

          {shieldActive && (
            <div className="px-3 py-1 bg-cyan-950/60 border border-cyan-400 rounded-full text-xs font-bold text-cyan-300 flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Streak Shield Active
            </div>
          )}
        </div>

        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-6">
            {/* Equation Card */}
            <div
              className={`w-full p-8 rounded-3xl text-center border shadow-2xl transition-all ${
                state.feedback === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/40 scale-105'
                  : state.feedback === 'incorrect'
                  ? 'bg-red-950/40 border-red-500/60 shadow-red-900/40 animate-shake'
                  : 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
              }`}
            >
              <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white py-2">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {/* 4 Choices */}
            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-3 w-full">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    className="py-5 px-4 bg-slate-800/90 hover:bg-red-600 active:scale-95 text-white font-mono font-black text-2xl rounded-2xl border border-slate-700 hover:border-red-400 transition-all shadow-lg"
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
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Survival Mode</h2>
            <p className="text-xs text-slate-400">
              Survive escalating waves of arithmetic. You start with 3 lives; earn shields and heart recovery every 20-combo!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg transition-all"
            >
              Enter Survival Arena
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-red-400 animate-ping">
              {state.countdownValue === 0 ? 'SURVIVE!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="survival_endurance"
        gameTitle="Survival Endurance"
        category="Survival"
        icon={<Shield className="w-5 h-5 text-red-400" />}
        gameDescription="Endurance survival mode with progressive difficulty waves and heart recovery on streaks."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Survival Endurance"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
