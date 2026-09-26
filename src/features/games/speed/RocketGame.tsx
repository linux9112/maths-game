import React, { useState } from 'react';
import { Rocket, Flame } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { useGameLoop } from '../shared/useGameLoop';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

export interface RocketGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const RocketGame: React.FC<RocketGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'rocket_launch',
      title: 'Rocket Math',
      category: 'Speed',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 25,
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

  // Rocket physical state
  const [altitude, setAltitude] = useState<number>(100); // in meters
  const [isThrusting, setIsThrusting] = useState<boolean>(false);
  const [stageName, setStageName] = useState<string>('Troposphere');

  // Physics simulation
  useGameLoop({
    isPaused: state.status !== 'PLAYING',
    onUpdate: (deltaSec) => {
      setAltitude((prevAlt) => {
        // Gravity pulls down
        const gravity = 25; // meters / s^2
        const nextAlt = Math.max(0, prevAlt - gravity * deltaSec);

        // Update atmospheric stage
        if (nextAlt > 8000) setStageName('Outer Space 🌌');
        else if (nextAlt > 5000) setStageName('Mesosphere 🌠');
        else if (nextAlt > 2500) setStageName('Stratosphere ☁️');
        else setStageName('Troposphere 🌤️');

        return Math.round(nextAlt);
      });
    },
  });

  const handleAnswer = (ans: number) => {
    if (!state.currentQuestion) return;
    const isCorrect = ans === state.currentQuestion.answer;
    submitAnswer(ans);

    if (isCorrect) {
      setIsThrusting(true);
      // Thrust rocket up
      setAltitude((prev) => prev + 450);
      setTimeout(() => setIsThrusting(false), 800);
    } else {
      // Mistake stalls engine, drops 200m
      setAltitude((prev) => Math.max(0, prev - 200));
    }
  };

  // Rocket display height percentage (clamped between 15% and 85%)
  const displayYPercent = Math.min(85, Math.max(15, (altitude / 10000) * 70 + 15));

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

      {/* Main Sky / Space Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-4">
        {/* Altitude & Atmosphere HUD Badge */}
        <div className="flex items-center justify-between z-10">
          <div
            className={`px-4 py-2 rounded-2xl border backdrop-blur-sm flex items-center gap-2 shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'
            }`}
          >
            <Rocket className="w-5 h-5" style={{ color: theme.accent }} />
            <div>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Altitude
              </div>
              <div className="font-mono font-black text-lg">
                {altitude.toLocaleString()} m
              </div>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-2xl border backdrop-blur-sm text-right shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Stage
            </div>
            <div className="font-bold text-sm" style={{ color: theme.accent }}>
              {stageName}
            </div>
          </div>
        </div>

        {/* Parallax Rocket Visual */}
        <div className="flex-1 relative flex items-center justify-center">
          <div
            style={{
              bottom: `${displayYPercent}%`,
              transition: 'bottom 0.4s ease-out',
            }}
            className="absolute flex flex-col items-center"
          >
            {/* Rocket Sprite */}
            <div
              className="p-3 border rounded-full shadow-2xl backdrop-blur-sm"
              style={{
                backgroundColor: `${theme.accent}33`,
                borderColor: `${theme.accent}66`,
              }}
            >
              <Rocket
                className="w-12 h-12 -rotate-45"
                style={{ color: theme.accent }}
              />
            </div>

            {/* Thruster Exhaust Flames */}
            {isThrusting && (
              <div className="flex flex-col items-center -mt-1 animate-pulse">
                <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400 -mt-3" />
              </div>
            )}
          </div>
        </div>

        {/* Active Question & Thrust Controls */}
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="max-w-md mx-auto w-full z-20 space-y-3">
            {/* Question card */}
            <div
              className={`p-4 rounded-2xl border text-center shadow-xl backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-lg'
              }`}
            >
              <div className="text-3xl font-black font-mono">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {/* Options grid */}
            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {state.currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswer(opt)}
                    className={`py-3 px-2 active:scale-95 font-mono font-bold text-lg sm:text-xl rounded-xl border transition-all shadow-md ${
                      isDark
                        ? 'bg-slate-800 hover:bg-purple-600 text-white border-slate-700 hover:border-purple-400'
                        : 'bg-white hover:bg-purple-50 text-slate-900 border-slate-200 hover:border-purple-500'
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
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm z-30">
            <div
              className={`p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border backdrop-blur-md ${
                isDark
                  ? 'bg-slate-900/95 border-slate-700 text-white shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
              }`}
            >
              <div
                className="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center"
                style={{
                  backgroundColor: `${theme.accent}20`,
                  borderColor: `${theme.accent}40`,
                  color: theme.accent,
                }}
              >
                <Rocket className="w-8 h-8 -rotate-45" />
              </div>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Rocket Math
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Propel your rocket into orbit by answering equations quickly. Gravity is always pulling
                you down!
              </p>
              <button
                type="button"
                onClick={openPreFlight}
                className="w-full py-3 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Launch Configuration
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-8xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
              {state.countdownValue === 0 ? 'LIFTOFF!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="rocket_launch"
        gameTitle="Rocket Math"
        category="Speed"
        icon={<Rocket className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Ignite your rocket thrusters with mental math. Climb through the atmosphere to outer space."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Rocket Math"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
