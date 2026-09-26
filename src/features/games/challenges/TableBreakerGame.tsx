import React, { useState, useRef, useCallback } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useGameEngine } from '../core/useGameEngine';
import { GameHUD } from '../core/GameHUD';
import { GamePreFlightModal } from '../core/GamePreFlightModal';
import { GameSummaryModal } from '../core/GameSummaryModal';
import { GameConfig } from '../core/types';
import { Question } from '../../../core/math/types';
import { useTheme } from '../../../components/common/useTheme';
import { getGameTheme } from '../hub/gameCatalog';

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
  const { isDark } = useTheme();
  const [bricks, setBricks] = useState<Brick[]>(() => generateBricksWall(12));
  const bricksRef = useRef<Brick[]>(bricks);
  bricksRef.current = bricks;

  const customGenerator = useCallback((_cfg: GameConfig, index: number): Question => {
    const currentBricks = bricksRef.current;
    const brick = currentBricks[index % currentBricks.length];

    // Generate 4 plausible distinct options
    const optsSet = new Set<number>([brick.answer]);
    optsSet.add(brick.answer + (Math.random() < 0.5 ? 2 : -2));
    optsSet.add(brick.answer + (Math.random() < 0.5 ? 4 : -4));
    optsSet.add(brick.answer + (Math.random() < 0.5 ? 6 : -6));
    while (optsSet.size < 4) {
      optsSet.add(Math.max(1, brick.answer + (Math.floor(Math.random() * 10) - 5)));
    }
    const options = Array.from(optsSet).sort(() => Math.random() - 0.5);

    return {
      id: `breaker_${index}_${brick.id}_${brick.answer}`,
      operator: '*',
      operandA: 1,
      operandB: 1,
      answer: brick.answer,
      promptText: `${brick.equation} = ?`,
      displayOperator: '=',
      options,
      answerStr: String(brick.answer),
      difficulty: 'normal',
      category: 'game',
      metadata: brick,
    };
  }, []);

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
  const unbrokenBricks = bricks.filter((b) => !b.isBroken);
  const activeBrickMeta = state.currentQuestion?.metadata as Brick | undefined;

  const handleStartGame = (cfg: GameConfig) => {
    const newWall = generateBricksWall(12);
    bricksRef.current = newWall;
    setBricks(newWall);
    startGame(cfg);
  };

  const handleRestart = () => {
    const newWall = generateBricksWall(12);
    bricksRef.current = newWall;
    setBricks(newWall);
    restart();
  };

  const handleChoice = (ans: number) => {
    if (!state.currentQuestion) return;
    const isCorrect = ans === state.currentQuestion.answer;
    submitAnswer(ans);

    if (isCorrect && activeBrickMeta) {
      setBricks((prev) =>
        prev.map((b) => (b.id === activeBrickMeta.id ? { ...b, isBroken: true } : b))
      );
    }
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
        onRestart={handleRestart}
        onForfeit={() => {
          forfeit();
          onBackToHub?.();
        }}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 max-w-lg mx-auto w-full my-auto relative min-h-0">
        {/* Brick Wall Grid */}
        <div
          className={`w-full rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl space-y-1.5 sm:space-y-2 border backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
              : 'bg-white/95 border-slate-200 shadow-lg'
          }`}
        >
          <div className="flex justify-between items-center px-1 text-[10px] uppercase font-bold">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Bricks Remaining: {unbrokenBricks.length}
            </span>
            <span className="font-mono" style={{ color: theme.accent }}>
              Wall Cleared: {Math.round(((bricks.length - unbrokenBricks.length) / bricks.length) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {bricks.map((brick) => {
              const isTarget = activeBrickMeta?.id === brick.id;
              return (
                <div
                  key={brick.id}
                  className={`h-9 sm:h-12 rounded-lg sm:rounded-xl border flex flex-col items-center justify-center font-mono font-bold text-xs sm:text-sm transition-all ${
                    brick.isBroken
                      ? isDark
                        ? 'opacity-10 scale-90 border-transparent bg-slate-800'
                        : 'opacity-10 scale-90 border-transparent bg-slate-200'
                      : isTarget
                      ? `${brick.colorClass} ring-4 ring-indigo-400/80 scale-105 shadow-xl`
                      : `${brick.colorClass} opacity-85`
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
          <div className="w-full space-y-2.5 sm:space-y-4 mt-2.5 sm:mt-4">
            <div
              className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border text-center shadow-lg backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80'
                  : 'bg-white/95 border-slate-200 shadow-md'
              }`}
            >
              <span
                className="text-[10px] uppercase font-mono tracking-widest font-black"
                style={{ color: theme.accent }}
              >
                Break Target Brick
              </span>
              <div className="text-2xl sm:text-4xl font-black font-mono mt-0.5">
                {state.currentQuestion.promptText}
              </div>
            </div>

            {state.currentQuestion.options && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {state.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    className={`py-2.5 sm:py-3.5 active:scale-95 font-mono font-black text-lg sm:text-xl rounded-xl sm:rounded-2xl border transition-all shadow-md ${
                      isDark
                        ? 'bg-slate-800/90 hover:bg-indigo-600 text-white border-slate-700 hover:border-indigo-400'
                        : 'bg-white hover:bg-indigo-50 text-slate-900 border-slate-200 hover:border-indigo-500 shadow-sm'
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
            className={`p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border my-auto backdrop-blur-md ${
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
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Table Breaker
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Break out of the math wall! Solve each times-table brick to shatter it until the
              entire wall is demolished.
            </p>
            <button
              type="button"
              onClick={openPreFlight}
              className="w-full py-3.5 font-black rounded-xl shadow-lg transition-all active:scale-95 text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Start Breaker
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
        icon={<LayoutGrid className="w-5 h-5" style={{ color: theme.accent }} />}
        gameDescription="Shatter the arithmetic brick wall. Clear all calculation bricks."
        defaultConfig={config}
        onStartGame={handleStartGame}
        onClose={closePreFlight}
      />

      <GameSummaryModal
        isOpen={state.status === 'GAME_OVER' || state.status === 'VICTORY'}
        gameTitle="Table Breaker"
        summary={summaryData}
        onPlayAgain={handleRestart}
        onBackToArcade={() => onBackToHub?.()}
      />
    </div>
  );
};
