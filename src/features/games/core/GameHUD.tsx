import React from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  LogOut,
  Flame,
  Heart,
  Clock,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameState, GameConfig } from './types';
import { Button } from '../../../components/common/Button';
import { getGameTheme } from '../hub/gameCatalog';
import { useTheme } from '../../../components/common/useTheme';

export interface GameHUDProps {
  state: GameState;
  config: GameConfig;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onForfeit: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  config,
  onPause,
  onResume,
  onRestart,
  onForfeit,
  isMuted = false,
  onToggleMute,
}) => {
  const { isDark } = useTheme();
  const theme = getGameTheme(config.gameId);

  const {
    score,
    combo,
    scoreMultiplier,
    livesRemaining,
    maxLives,
    timeRemainingSec,
    questionsAnswered,
    targetQuestions,
    status,
    isStressFree,
  } = state;

  // Format mm:ss
  const formatTime = (totalSec: number | null): string => {
    if (totalSec === null) return '∞';
    const m = Math.floor(Math.max(0, totalSec) / 60);
    const s = Math.max(0, totalSec) % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Timer color
  const timerColor =
    timeRemainingSec === null
      ? (isDark ? 'text-slate-300' : 'text-slate-600')
      : timeRemainingSec <= 10
      ? 'text-red-500 animate-pulse'
      : timeRemainingSec <= 30
      ? 'text-amber-500'
      : (isDark ? 'text-emerald-400' : 'text-emerald-600');

  // Progress percentage
  const progressPercent =
    targetQuestions && targetQuestions > 0
      ? Math.min(100, Math.round((questionsAnswered / targetQuestions) * 100))
      : 100;

  return (
    <>
      <header
        role="region"
        aria-label="Game HUD"
        className="w-full backdrop-blur-md px-2.5 sm:px-5 py-2 sm:py-2.5 select-none z-20 flex-shrink-0 transition-colors"
        style={{
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          borderBottom: isDark ? `1px solid ${theme.accent}33` : `1px solid ${theme.accent}25`,
          color: isDark ? '#F8FAFC' : '#172033',
        }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-1.5 sm:gap-2">
        {/* Top Control & Title Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Pause + Title */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={status === 'PLAYING' ? onPause : onResume}
              aria-label={status === 'PLAYING' ? 'Pause Game' : 'Resume Game'}
              className="p-1.5 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                color: isDark ? '#CBD5E1' : '#334155',
              }}
              title="Pause Game (Esc)"
            >
              <Pause className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px] opacity-75 px-1.5 py-0.5 rounded">
                ESC
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              <span
                className="font-extrabold text-sm sm:text-base tracking-tight line-clamp-1"
                style={{ color: isDark ? '#F8FAFC' : '#172033' }}
              >
                {config.title}
              </span>
              <span
                className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  backgroundColor: isDark ? `${theme.accent}25` : `${theme.accent}18`,
                  borderColor: isDark ? `${theme.accent}40` : `${theme.accent}35`,
                  color: theme.accent,
                }}
              >
                {config.category}
              </span>
              {isStressFree && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Zen
                </span>
              )}
            </div>
          </div>

          {/* Right: Audio Toggle */}
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Dynamic Metric Bar */}
        <div className="grid grid-cols-3 items-center justify-between text-xs sm:text-sm">
          {/* Score & Multiplier */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Score
              </span>
              <span className="font-mono font-black text-white text-base sm:text-lg leading-tight">
                {score.toLocaleString()}
              </span>
            </div>

            {combo > 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-xs ${
                  combo >= 5
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{combo}</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {scoreMultiplier > 1 ? `(${scoreMultiplier}x)` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Center: Health or Timer */}
          <div className="flex justify-center items-center">
            {timeRemainingSec !== null ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700/60 font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className={timerColor}>{formatTime(timeRemainingSec)}</span>
              </div>
            ) : livesRemaining !== null && maxLives !== null ? (
              <div className="flex items-center gap-1" aria-label={`${livesRemaining} lives remaining`}>
                {Array.from({ length: maxLives }).map((_, i) => {
                  const isAlive = i < livesRemaining;
                  return (
                    <Heart
                      key={i}
                      className={`w-4 h-4 transition-all ${
                        isAlive
                          ? 'text-red-500 fill-red-500 scale-100'
                          : 'text-slate-600 fill-none opacity-40 scale-90'
                      }`}
                    />
                  );
                })}
              </div>
            ) : (
              <span className="text-[11px] font-bold text-emerald-400/80 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Practice Mode
              </span>
            )}
          </div>

          {/* Right: Progress Count */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {targetQuestions ? 'Progress' : 'Answered'}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {targetQuestions ? `${questionsAnswered} / ${targetQuestions}` : `${questionsAnswered} Qs`}
            </span>
          </div>
        </div>

        {/* Bottom Progress Line */}
        {targetQuestions && targetQuestions > 0 && (
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        </div>
      </header>

      {/* Full-Screen Pause Overlay */}
      {status === 'PAUSED' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm text-center space-y-5 shadow-2xl">
            <div className="p-3 w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Pause className="w-6 h-6" />
            </div>

            <div>
              <h2 id="pause-title" className="text-xl font-black text-white">
                Game Paused
              </h2>
              <p className="text-xs text-slate-400 mt-1">Take a breather or adjust your pace.</p>
            </div>

            {/* Current Game Stats Summary */}
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Score</div>
                <div className="text-white font-mono font-bold text-sm">{score.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Streak</div>
                <div className="text-white font-mono font-bold text-sm">{combo}</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-white" />}
                onClick={onResume}
              >
                Resume Game
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={onRestart}
              >
                Restart Round
              </Button>
              <Button
                variant="danger"
                size="md"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={onForfeit}
              >
                Forfeit & Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
