import React, { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';

interface Brick {
  id: number;
  equation: string;
  answer: number;
  isBroken: boolean;
  colorClass: string;
}

const BRICK_COLORS = [
  'bg-red-500/80 border-red-400 text-white',
  'bg-amber-500/80 border-amber-400 text-white',
  'bg-emerald-500/80 border-emerald-400 text-white',
  'bg-cyan-500/80 border-cyan-400 text-white',
  'bg-indigo-500/80 border-indigo-400 text-white',
  'bg-purple-500/80 border-purple-400 text-white',
];

function generateBricksWall(count = 12): Brick[] {
  const bricks: Brick[] = [];
  for (let i = 0; i < count; i++) {
    const a = 2 + Math.floor(Math.random() * 9);
    const b = 2 + Math.floor(Math.random() * 9);
    bricks.push({
      id: i,
      equation: `${a} × ${b}`,
      answer: a * b,
      isBroken: false,
      colorClass: BRICK_COLORS[i % BRICK_COLORS.length],
    });
  }
  return bricks;
}

export interface TableBreakerGameProps {
  onBackToHub?: () => void;
  initialConfig?: Partial<GameConfig>;
}

export const TableBreakerGame: React.FC<TableBreakerGameProps> = ({
  onBackToHub,
  initialConfig,
}) => {
  const [bricks, setBricks] = useState<Brick[]>(() => generateBricksWall(12));

  const engine = useGameEngine({
    initialConfig: {
      gameId: 'table_breaker',
      title: 'Table Breaker',
      category: 'Challenges',
      timeLimitSec: null,
      mistakeLimit: 3,
      targetLength: 12,
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

  // Sync active brick to current question
  const unbrokenBricks = bricks.filter((b) => !b.isBroken);
  const activeBrick = unbrokenBricks.length > 0 ? unbrokenBricks[0] : null;

  const handleChoice = (ans: number) => {
    if (!state.currentQuestion) return;
    const isCorrect = ans === state.currentQuestion.answer;
    submitAnswer(ans);

    if (isCorrect && activeBrick) {
      setBricks((prev) =>
        prev.map((b) => (b.id === activeBrick.id ? { ...b, isBroken: true } : b))
      );
    }
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

      <div className="flex-1 flex flex-col items-center justify-between p-4 max-w-lg mx-auto w-full relative">
        {/* Brick Wall Grid */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-2">
          <div className="flex justify-between items-center px-1 text-[10px] uppercase font-bold text-slate-400">
            <span>Bricks Remaining: {unbrokenBricks.length}</span>
            <span className="text-amber-400 font-mono">
              Wall Cleared: {Math.round(((bricks.length - unbrokenBricks.length) / bricks.length) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {bricks.map((brick) => {
              const isTarget = activeBrick?.id === brick.id;
              return (
                <div
                  key={brick.id}
                  className={`h-14 rounded-xl border flex flex-col items-center justify-center font-mono font-bold text-sm transition-all ${
                    brick.isBroken
                      ? 'opacity-10 scale-90 border-transparent bg-slate-800'
                      : isTarget
                      ? `${brick.colorClass} ring-4 ring-white/60 scale-105 shadow-xl`
                      : `${brick.colorClass} opacity-80`
                  }`}
                >
                  {!brick.isBroken && (
                    <>
                      <span>{brick.equation}</span>
                      <span className="text-[10px] opacity-70">?</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Question & Options */}
        {state.status === 'PLAYING' && state.currentQuestion && (
          <div className="w-full space-y-4 my-auto">
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center shadow-xl">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400">
                Break Target Brick
              </span>
              <div className="text-4xl font-black font-mono text-white mt-1">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-3">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    className="py-4 bg-slate-800/90 hover:bg-amber-600 active:scale-95 text-white font-mono font-black text-xl rounded-2xl border border-slate-700 hover:border-amber-400 transition-all shadow-lg"
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
          <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl my-auto">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Table Breaker</h2>
            <p className="text-xs text-slate-400">
              Break out of the math wall! Solve each times-table brick to shatter it until the entire wall is demolished.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition-all"
            >
              Start Breaker
            </button>
          </div>
        )}

        {/* Countdown */}
        {state.status === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-40">
            <span className="font-mono font-black text-8xl sm:text-9xl text-amber-400 animate-ping">
              {state.countdownValue === 0 ? 'BREAK!' : state.countdownValue}
            </span>
          </div>
        )}
      </div>

      <GamePreFlightModal
        isOpen={state.status === 'PRE_FLIGHT'}
        gameId="table_breaker"
        gameTitle="Table Breaker"
        category="Challenges"
        icon={<LayoutGrid className="w-5 h-5 text-amber-400" />}
        gameDescription="Shatter the arithmetic brick wall. Clear all calculation bricks."
        defaultConfig={config}
        onStartGame={startGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Table Breaker"
        summary={summaryData}
        onPlayAgain={restart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
