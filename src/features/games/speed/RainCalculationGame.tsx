import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloudRain } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { generateGameQuestion } from '../shared/gameQuestionGenerator';
import { Question } from '../../../core/math/types';
import { useGameLoop } from '../shared/useGameLoop';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

interface RainDrop {
  id: string;
  question: Question;
  xPercent: number; // 10% to 90%
  yPercent: number; // 0% to 100%
  speed: number;    // % per second
}

export interface RainCalculationGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const RainCalculationGame: React.FC<RainCalculationGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const { isDark } = useTheme();

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'rain_calculation',
      title: 'Rain Calculation',
      category: 'Speed',
      timeLimitSec: null, // Survival / Endless drop mode
      mistakeLimit: 3,
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
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const dropsRef = useRef<RainDrop[]>([]);
  dropsRef.current = drops;

  // Active question is the lowest drop closest to bottom
  const activeDrop =
    drops.length > 0
      ? drops.reduce((lowest, d) => (d.yPercent > lowest.yPercent ? d : lowest), drops[0])
      : null;

  // Spawn new drop if needed
  const spawnDrop = useCallback(() => {
    if (state.status !== 'PLAYING') return;
    const q = generateGameQuestion(config, Date.now());
    const speedBase =
      config.difficulty === 'extreme'
        ? 14
        : config.difficulty === 'expert'
        ? 11
        : config.difficulty === 'hard'
        ? 9
        : 7;
    const newDrop: RainDrop = {
      id: q.id,
      question: q,
      xPercent: 15 + Math.random() * 70,
      yPercent: 5,
      speed: speedBase + Math.random() * 3,
    };
    setDrops((prev) => [...prev, newDrop]);
  }, [state.status, config]);

  // Initial spawn when game starts
  useEffect(() => {
    if (state.status === 'PLAYING' && drops.length === 0) {
      spawnDrop();
    }
    if (state.status !== 'PLAYING') {
      setDrops([]);
    }
  }, [state.status, spawnDrop, drops.length]);

  // Game physics loop
  useGameLoop({
    isPaused: state.status !== 'PLAYING',
    onUpdate: (deltaSec) => {
      setDrops((prevDrops) => {
        const nextDrops: RainDrop[] = [];
        let hitBottom = false;

        for (const drop of prevDrops) {
          const nextY = drop.yPercent + drop.speed * deltaSec;
          if (nextY >= 92) {
            hitBottom = true;
          } else {
            nextDrops.push({ ...drop, yPercent: nextY });
          }
        }

        if (hitBottom) {
          // Missed drop hits bottom: submit incorrect to engine to deduct life
          if (activeDrop) {
            submitAnswer(-999999, activeDrop.question.answer);
          }
        }

        return nextDrops;
      });

      // Maintain 1-3 active drops based on answered count
      if (dropsRef.current.length < 2 && Math.random() < 0.03) {
        spawnDrop();
      }
    },
  });

  const handlePop = (answer: number) => {
    if (!activeDrop) return;
    submitAnswer(answer, activeDrop.question.answer);
    if (answer === activeDrop.question.answer) {
      setDrops((prev) => prev.filter((d) => d.id !== activeDrop.id));
      setTypedAnswer('');
      setTimeout(spawnDrop, 400);
    } else {
      setTypedAnswer('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (typedAnswer.trim() !== '') {
        handlePop(Number(typedAnswer));
      }
    }
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
      {/* Game HUD */}
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

      {/* Main Playfield Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Cloud top bar */}
        <div
          className={`absolute top-0 inset-x-0 h-12 flex items-center justify-around px-4 z-10 border-b backdrop-blur-sm transition-colors ${
            isDark
              ? 'bg-slate-900/50 border-slate-700/40 text-cyan-400'
              : 'bg-white/60 border-cyan-200/60 text-cyan-600'
          }`}
        >
          <CloudRain className="w-7 h-7 animate-pulse" />
          <CloudRain className="w-6 h-6 opacity-75" />
          <CloudRain className="w-8 h-8" />
          <CloudRain className="w-6 h-6 opacity-75 animate-pulse" />
        </div>

        {/* Falling Raindrops */}
        {state.status === 'PLAYING' &&
          drops.map((drop) => {
            const isActive = activeDrop?.id === drop.id;
            return (
              <div
                key={drop.id}
                style={{
                  left: `${drop.xPercent}%`,
                  top: `${drop.yPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute transition-transform flex flex-col items-center cursor-pointer ${
                  isActive ? 'scale-110 z-10' : 'opacity-85 scale-95'
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-3xl font-black shadow-xl border flex flex-col items-center gap-1 transition-all ${
                    isActive
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white border-cyan-300 ring-4 ring-cyan-400/40 shadow-cyan-500/50'
                      : isDark
                      ? 'bg-slate-800 text-cyan-200 border-slate-600'
                      : 'bg-white text-cyan-900 border-cyan-300 shadow-md'
                  }`}
                >
                  <span className="text-sm sm:text-base tracking-wide font-mono">
                    {drop.question.promptText}
                  </span>
                </div>
                {/* Raindrop tail */}
                <div
                  className={`w-0 h-0 border-x-4 border-x-transparent border-t-8 ${
                    isActive
                      ? 'border-t-blue-600'
                      : isDark
                      ? 'border-t-slate-800'
                      : 'border-t-white'
                  }`}
                />
              </div>
            );
          })}

        {/* Danger Bottom Splash Line */}
        <div className="absolute bottom-24 inset-x-0 h-1 bg-gradient-to-r from-red-500/20 via-red-500/60 to-red-500/20" />

        {/* Input Dock at Bottom */}
        <div className="absolute bottom-3 inset-x-0 px-4 max-w-md mx-auto z-20">
          {config.inputMode === 'choice' && activeDrop?.question.options ? (
            <div
              className={`grid grid-cols-4 gap-2 p-2.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700/80'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              {activeDrop.question.options.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePop(option)}
                  className={`py-3 px-2 active:scale-95 font-mono font-bold text-base rounded-xl border transition-all shadow-md ${
                    isDark
                      ? 'bg-slate-800 hover:bg-cyan-600 text-white border-slate-700 hover:border-cyan-400'
                      : 'bg-slate-50 hover:bg-cyan-50 text-slate-900 border-slate-200 hover:border-cyan-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div
              className={`flex gap-2 p-2 rounded-2xl border shadow-2xl backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700'
                  : 'bg-white/95 border-slate-200 shadow-xl'
              }`}
            >
              <input
                type="number"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type answer & press Enter..."
                autoFocus
                className={`flex-1 font-mono font-bold text-center text-lg rounded-xl px-4 py-2.5 border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-slate-800 text-white border-slate-700 focus:border-cyan-500'
                    : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-cyan-500'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  if (typedAnswer.trim() !== '') handlePop(Number(typedAnswer));
                }}
                className="px-5 py-2.5 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all"
                style={{ backgroundColor: theme.accent }}
              >
                Pop!
              </button>
            </div>
          )}
        </div>

        {/* Idle Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm z-30">
            <div
              className={`p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border backdrop-blur-md ${
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
                <CloudRain className="w-8 h-8" />
              </div>
              <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Rain Calculation
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Pop falling arithmetic raindrops before they hit the splash zone at the bottom!
              </p>
              <button
                type="button"
                onClick={openPreFlight}
                className="w-full py-3.5 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Configure & Play
              </button>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-md z-40">
            <span
              className="font-mono font-black text-7xl sm:text-9xl animate-ping"
              style={{ color: theme.accent }}
            >
              {state.countdownValue === 0 ? 'GO!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      {/* Pre-Flight Modal */}
      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="rain_calculation"
        gameTitle="Rain Calculation"
        category="Speed"
        icon={<CloudRain className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Pop arithmetic drops before they splash down. Speed ramps up as you clear drops."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      {/* Summary Results Modal */}
      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Rain Calculation"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
