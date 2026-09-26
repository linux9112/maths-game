import React from 'react';
import { Award, CheckCircle2, Lock } from 'lucide-react';
import { Achievement } from '../../progression/types';
import { ProgressBar } from '../../../components/common/ProgressBar';

interface AchievementShowcaseProps {
  achievements: Achievement[];
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({ achievements }) => {
  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">Achievements</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Milestones and performance badges</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 font-mono self-start sm:self-auto">
          {unlockedCount} / {achievements.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {achievements.map((badge) => {
          let tierBadge = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';

          if (badge.tier === 'bronze') {
            tierBadge = 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/40';
          } else if (badge.tier === 'silver') {
            tierBadge = 'bg-slate-200 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600/40';
          } else if (badge.tier === 'gold') {
            tierBadge = 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30';
          } else if (badge.tier === 'platinum') {
            tierBadge = 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30';
          }

          return (
            <div
              key={badge.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                badge.isUnlocked
                  ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-700/80 shadow-xs'
                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-850 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${tierBadge}`}>
                  {badge.tier}
                </span>

                {badge.isUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                )}
              </div>

              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-1">{badge.title}</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{badge.description}</p>

              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  <span>Progress</span>
                  <span>
                    {badge.currentProgress} / {badge.maxProgress}
                  </span>
                </div>
                <ProgressBar
                  value={badge.currentProgress}
                  max={badge.maxProgress}
                  size="sm"
                  variant={badge.isUnlocked ? 'emerald' : 'indigo'}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
