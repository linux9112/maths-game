import React from 'react';
import { AlertCircle, Zap, Sparkles, Play } from 'lucide-react';
import { FactStat } from '../../tables/types';
import { Button } from '../../../components/common/Button';

interface WeaknessWatchlistProps {
  weakFacts: FactStat[];
  onPracticeWeakness?: () => void;
  onDrillFact?: (factId: string) => void;
}

export const WeaknessWatchlist: React.FC<WeaknessWatchlistProps> = ({
  weakFacts,
  onPracticeWeakness,
  onDrillFact,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              Weakness Watchlist {weakFacts.length > 0 && `(Top ${weakFacts.length})`}
            </h2>
            <p className="text-xs text-slate-400">
              Calculations exhibiting hesitation or recurring mistakes
            </p>
          </div>
        </div>

        {weakFacts.length > 0 && onPracticeWeakness && (
          <Button variant="primary" size="sm" onClick={onPracticeWeakness} className="self-start sm:self-auto flex-shrink-0">
            <Zap className="w-4 h-4 mr-1 text-amber-300 fill-amber-300" />
            Practice My Weakness
          </Button>
        )}
      </div>

      {/* List or Empty State */}
      {weakFacts.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">No Active Weaknesses!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              You've mastered your practiced calculations with high accuracy. Challenge yourself with
              Endless Mode or higher tables!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-2.5 flex-1">
          {weakFacts.map((fact) => {
            const mistakes = Math.max(0, fact.attempts - fact.correctCount);
            const errorRatePct = fact.attempts > 0 ? Math.round((mistakes / fact.attempts) * 100) : 0;
            const avgSpeedSec = (fact.avgResponseTimeMs / 1000).toFixed(1);

            return (
              <div
                key={fact.factId}
                className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm sm:text-base font-bold text-white whitespace-nowrap">
                    {fact.table} × {fact.multiplier} = {fact.table * fact.multiplier}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                    {errorRatePct}% errors
                  </span>
                  <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                    {avgSpeedSec}s
                  </span>
                  {onDrillFact && (
                    <button
                      onClick={() => onDrillFact(fact.factId)}
                      className="p-1 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Drill this fact"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
