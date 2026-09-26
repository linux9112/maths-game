import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Flame, CheckCircle2, ArrowRight } from 'lucide-react';
import { DailyChallengeRecord } from '../../../core/storage/types';
import { getTimeUntilNextMidnight } from '../../progression/progressionEngine';
import { Button } from '../../../components/common/Button';

interface DailyChallengeCardProps {
  record: DailyChallengeRecord | null;
  currentStreak: number;
  onPlayDaily?: () => void;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  record,
  currentStreak,
  onPlayDaily,
}) => {
  const [countdown, setCountdown] = useState(getTimeUntilNextMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isCompleted = record && record.completed;

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3 sm:gap-3.5">
          <div className="p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Daily Challenge</h2>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                  Ready to Play
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {isCompleted
                ? `Completed! Score: ${record.score}/10 • Accuracy: ${record.accuracyPercentage}% • Time: ${record.timeSec.toFixed(1)}s`
                : '10 standard questions (+, −, ×, ÷) consistent worldwide. Solve to maintain your streak!'}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-mono font-bold">
                <Clock className="w-3.5 h-3.5" /> Next in: {countdown.formatted}
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
                <Flame className="w-3.5 h-3.5 fill-amber-500" /> {currentStreak} Day Streak
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="sm:self-center flex-shrink-0">
          {onPlayDaily && (
            <Button
              variant={isCompleted ? 'outline' : 'primary'}
              size="md"
              onClick={onPlayDaily}
              className="w-full sm:w-auto"
            >
              {isCompleted ? 'Review Scorecard' : 'Start Daily Challenge'}
              {!isCompleted && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
