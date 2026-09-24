import React from 'react';
import { Calendar, Target, Clock, Flame, Zap } from 'lucide-react';
import { LevelProgress } from '../../progression/types';
import { ProgressBar } from '../../../components/common/ProgressBar';

interface DashboardHeroCardsProps {
  todayQuestions: number;
  accuracyPercentage: number;
  averageResponseTimeMs: number;
  currentStreak: number;
  bestStreak: number;
  totalXp: number;
  levelProgress: LevelProgress;
}

export const DashboardHeroCards: React.FC<DashboardHeroCardsProps> = ({
  todayQuestions,
  accuracyPercentage,
  averageResponseTimeMs,
  currentStreak,
  bestStreak,
  totalXp,
  levelProgress,
}) => {
  const avgSpeedSec = (averageResponseTimeMs / 1000).toFixed(1);

  // Speed pace label
  let paceLabel = '🧠 Deliberate Pace';
  let paceColor = 'bg-slate-700/60 text-slate-300';
  if (averageResponseTimeMs > 0 && averageResponseTimeMs < 2000) {
    paceLabel = '⚡ Lightning Fast';
    paceColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  } else if (averageResponseTimeMs >= 2000 && averageResponseTimeMs <= 3500) {
    paceLabel = '👍 Swift & Steady';
    paceColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  }

  // Accuracy color
  let accuracyColor = 'text-amber-400 border-amber-500/30';
  if (accuracyPercentage >= 90) {
    accuracyColor = 'text-emerald-400 border-emerald-500/30';
  } else if (accuracyPercentage >= 75) {
    accuracyColor = 'text-indigo-400 border-indigo-500/30';
  }

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Today's Questions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Practice</span>
            <div className="p-1.5 sm:p-2 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono">
              {todayQuestions}
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block">Questions answered</span>
          </div>
        </div>

        {/* Card 2: Overall Accuracy */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Overall Accuracy</span>
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono ${accuracyColor.split(' ')[0]}`}>
              {accuracyPercentage}%
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block">Lifetime accuracy</span>
          </div>
        </div>

        {/* Card 3: Average Speed */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Speed</span>
            <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-xl text-purple-400 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono">
              {averageResponseTimeMs > 0 ? `${avgSpeedSec}s` : '—'}
            </div>
            <span className={`inline-block text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md mt-1 border ${paceColor}`}>
              {paceLabel}
            </span>
          </div>
        </div>

        {/* Card 4: Daily Streak */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Daily Streak</span>
            <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-xl text-amber-400 flex-shrink-0">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-400 font-mono">
              {currentStreak} <span className="text-sm sm:text-base font-medium text-slate-400">Days</span>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block">
              Best record: {bestStreak} Days
            </span>
          </div>
        </div>
      </div>

      {/* Full-Width Level Progress Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-300 font-bold text-sm">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Lv. {levelProgress.level}</span>
            </div>
            <div>
              <span className="font-bold text-white text-base sm:text-lg block">
                {levelProgress.title}
              </span>
              <span className="text-xs text-slate-400">
                Total XP: <span className="font-mono text-slate-200 font-semibold">{totalXp.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div className="text-right sm:text-right text-xs text-slate-400">
            {levelProgress.isMaxLevel ? (
              <span className="text-amber-400 font-semibold">Max Level Reached! ⭐</span>
            ) : (
              <span>
                <span className="font-mono font-semibold text-white">
                  {(levelProgress.xpNeededForNextLevel - levelProgress.xpInCurrentLevel).toLocaleString()} XP
                </span>{' '}
                to Level {levelProgress.level + 1}
              </span>
            )}
          </div>
        </div>

        <ProgressBar
          value={levelProgress.progressPercentage}
          max={100}
          size="md"
          variant="indigo"
        />
      </div>
    </div>
  );
};
