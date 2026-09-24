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

  const { state, config, summaryData, openPreFlight, closePreFlight, startGame, submitAnswer, pause, resume, restart, forfeit, audio } = engine;
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const dropsRef = useRef<RainDrop[]>([]);
  dropsRef.current = drops;

  // Active question is the lowest drop closest to bottom
  const activeDrop = drops.length > 0
    ? drops.reduce((lowest, d) => (d.yPercent > lowest.yPercent ? d : lowest), drops[0])
    : null;

  // Spawn new drop if needed
  const spawnDrop = useCallback(() => {
    if (state.status !== 'PLAYING') return;
    const q = generateGameQuestion(config, Date.now());
    const speedBase = config.difficulty === 'extreme' ? 14 : config.difficulty === 'expert' ? 11 : config.difficulty === 'hard' ? 9 : 7;
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
            submitAnswer(-999999);
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
    submitAnswer(answer);
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
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
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950">
        {/* Cloud top bar */}
        <div className="absolute top-0 inset-x-0 h-12 bg-slate-800/40 border-b border-slate-700/40 flex items-center justify-around px-4 opacity-70">
          <CloudRain className="w-7 h-7 text-indigo-400 animate-pulse" />
          <CloudRain className="w-6 h-6 text-indigo-300" />
          <CloudRain className="w-8 h-8 text-indigo-400" />
          <CloudRain className="w-6 h-6 text-indigo-300 animate-pulse" />
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
                  isActive ? 'scale-110 z-10' : 'opacity-80 scale-95'
                }`}
                onClick={() => {
                  if (config.inputMode === 'choice') {
                    // Clicking drop in choice mode highlights it
                  }
                }}
              >
                <div
                  className={`px-4 py-2.5 rounded-3xl font-black shadow-xl border flex flex-col items-center gap-1 ${
                    isActive
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white border-cyan-300 ring-4 ring-cyan-400/40 shadow-cyan-500/50'
                      : 'bg-slate-800 text-cyan-200 border-slate-600'
                  }`}
                >
                  <span className="text-sm sm:text-base tracking-wide font-mono">
                    {drop.question.promptText}
                  </span>
                </div>
                {/* Raindrop tail */}
                <div
                  className={`w-0 h-0 border-x-4 border-x-transparent border-t-8 ${
                    isActive ? 'border-t-blue-600' : 'border-t-slate-800'
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
            <div className="grid grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md">
              {activeDrop.question.options.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePop(option)}
                  className="py-3 px-2 bg-slate-800 hover:bg-cyan-600 active:scale-95 text-white font-mono font-bold text-base rounded-xl border border-slate-700 hover:border-cyan-400 transition-all shadow-md"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md">
              <input
                type="number"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type answer & press Enter..."
                autoFocus
                className="flex-1 bg-slate-800 text-white font-mono font-bold text-center text-lg rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (typedAnswer.trim() !== '') handlePop(Number(typedAnswer));
                }}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Pop!
              </button>
            </div>
          )}
        </div>

        {/* Idle Start Overlay */}
        {state.status === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm z-30">
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <CloudRain className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">Rain Calculation</h2>
              <p className="text-xs text-slate-400">
                Pop falling arithmetic raindrops before they hit the splash zone at the bottom!
              </p>
              <button
                type="button"
                onClick={openPreFlight}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Configure & Play
              </button>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-md z-40">
            <span className="font-mono font-black text-7xl sm:text-9xl text-cyan-400 animate-ping">
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
        icon={<CloudRain className="w-5 h-5 text-cyan-400" />}
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
