import React, { useState, useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

export interface SurvivalGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const SurvivalGame: React.FC<SurvivalGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

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

  const theme = getGameTheme(config.gameId);

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

      {/* Main Survival Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {/* Wave Banner */}
        <div className="flex items-center justify-between w-full mb-4 px-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${
              isDark
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: theme.accent }} />
            Wave {currentWave}
          </div>

          {shieldActive && (
            <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-400 rounded-full text-xs font-bold text-cyan-400 flex items-center gap-1 animate-pulse shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Streak Shield Active
            </div>
          )}
        </div>

        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-6">
            {/* Equation Card */}
            <div
              className={`w-full p-8 rounded-3xl text-center border shadow-2xl transition-all backdrop-blur-md ${
                state.feedback === 'correct'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/40 scale-105'
                  : state.feedback === 'incorrect'
                  ? 'bg-red-950/40 border-red-500/60 shadow-red-900/40 animate-shake'
                  : isDark
                  ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight py-2">
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
                    className={`py-5 px-4 active:scale-95 font-mono font-black text-2xl rounded-2xl border transition-all shadow-lg ${
                      isDark
                        ? 'bg-slate-800/90 hover:bg-rose-600 text-white border-slate-700 hover:border-rose-400'
                        : 'bg-white hover:bg-rose-50 text-slate-900 border-slate-200 hover:border-rose-500 shadow-md'
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
              <Shield className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Survival Mode
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Survive escalating waves of arithmetic. You start with 3 lives; earn shields and heart
              recovery every 20-combo!
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Enter Survival Arena
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
        icon={<Shield className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Endure endless arithmetic waves. Heart recovery and shields award persistent players."
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
