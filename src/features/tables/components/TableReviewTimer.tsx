import React from 'react';
import { ReviewTimerDuration } from '../types';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';

export interface TableReviewTimerProps {
  duration: ReviewTimerDuration;
  timeRemainingSec: number;
  isRunning: boolean;
  onSelectDuration: (dur: ReviewTimerDuration) => void;
  onToggleRunning: () => void;
  onReset: () => void;
}

export const TableReviewTimer: React.FC<TableReviewTimerProps> = ({
  duration,
  timeRemainingSec,
  isRunning,
  onSelectDuration,
  onToggleRunning,
  onReset,
}) => {
  const durations: ReviewTimerDuration[] = [0, 10, 20, 30, 60];

  const percentage = duration > 0 ? Math.max(0, Math.min(100, (timeRemainingSec / duration) * 100)) : 100;

  // Color dynamics
  let barColorClass = 'bg-emerald-500';
  if (percentage <= 20) barColorClass = 'bg-rose-500 animate-pulse';
  else if (percentage <= 50) barColorClass = 'bg-amber-500';

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-700/70 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Review Timer</span>
        </div>

        {duration > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black text-white">
              {timeRemainingSec.toFixed(1)}s
            </span>
            <button
              type="button"
              onClick={onToggleRunning}
              aria-label={isRunning ? 'Pause Timer' : 'Resume Timer'}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset Timer"
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Countdown Bar */}
      {duration > 0 && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barColorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Duration selector chips */}
      <div className="flex items-center gap-1.5">
        {durations.map((dur) => (
          <button
            key={dur}
            type="button"
            onClick={() => onSelectDuration(dur)}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
              duration === dur
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            {dur === 0 ? 'Manual' : `${dur}s`}
          </button>
        ))}
      </div>
    </div>
  );
};
