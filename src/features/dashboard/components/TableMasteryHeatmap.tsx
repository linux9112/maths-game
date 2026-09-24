import React, { useState } from 'react';
import { Grid3X3, Play, X } from 'lucide-react';
import { FactStat } from '../../tables/types';
import { Button } from '../../../components/common/Button';

interface TableMasteryHeatmapProps {
  factStats: Record<string, FactStat>;
  onPracticeTable?: (tableNumber: number) => void;
  onDrillFact?: (factId: string) => void;
}

export const TableMasteryHeatmap: React.FC<TableMasteryHeatmapProps> = ({
  factStats,
  onPracticeTable,
  onDrillFact,
}) => {
  const [selectedFact, setSelectedFact] = useState<{
    table: number;
    multiplier: number;
    stat: FactStat | null;
  } | null>(null);

  // Compute counts for legend
  let masteredCount = 0;
  let practicingCount = 0;
  let weakCount = 0;
  let unattemptedCount = 0;

  for (let t = 1; t <= 10; t++) {
    for (let m = 1; m <= 10; m++) {
      const factId = `mul_${t}_${m}`;
      const stat = factStats[factId];
      if (!stat || stat.attempts === 0) {
        unattemptedCount++;
      } else if (stat.masteryScore >= 90) {
        masteredCount++;
      } else if (stat.masteryScore >= 50) {
        practicingCount++;
      } else {
        weakCount++;
      }
    }
  }

  const overallMasteryPct = Math.round(
    ((masteredCount * 1.0 + practicingCount * 0.5) / 100) * 100
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 sm:space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Table Mastery Heatmap</h2>
            <p className="text-xs text-slate-400">10 × 10 multiplication facts mastery grid</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Grid Mastery:</span>
          <span className="text-sm font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            {overallMasteryPct}%
          </span>
        </div>
      </div>

      {/* 10x10 Heatmap Grid with controlled horizontal scrolling on small screens, expanded on desktop */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[280px] max-w-2xl mx-auto w-full">
          {/* Column Multiplier Headers */}
          <div className="grid grid-cols-11 gap-0.5 sm:gap-1 mb-1 text-center font-mono text-[9px] sm:text-[10px] text-slate-500">
            <div className="text-slate-600 font-bold">×</div>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i + 1} className="font-semibold text-slate-400">
                {i + 1}
              </div>
            ))}
          </div>

          {/* 10 Rows */}
          {Array.from({ length: 10 }, (_, r) => {
            const table = r + 1;
            return (
              <div key={table} className="grid grid-cols-11 gap-0.5 sm:gap-1 mb-1 items-center">
                {/* Row Header */}
                <div className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-400 text-center">
                  {table}
                </div>

                {/* 10 Multiplier Cells */}
                {Array.from({ length: 10 }, (_, c) => {
                  const multiplier = c + 1;
                  const factId = `mul_${table}_${multiplier}`;
                  const stat = factStats[factId];
                  const product = table * multiplier;

                  let cellClass =
                    'bg-slate-800/70 hover:bg-slate-700 text-slate-400 border-slate-700/50';

                  if (stat && stat.attempts > 0) {
                    if (stat.masteryScore >= 90) {
                      cellClass =
                        'bg-emerald-500 hover:bg-emerald-400 text-white font-bold border-emerald-400/50 shadow-xs';
                    } else if (stat.masteryScore >= 50) {
                      cellClass =
                        'bg-amber-500 hover:bg-amber-400 text-white font-bold border-amber-400/50';
                    } else {
                      cellClass =
                        'bg-rose-500 hover:bg-rose-400 text-white font-bold border-rose-400/50';
                    }
                  }

                  const isSelected =
                    selectedFact?.table === table && selectedFact?.multiplier === multiplier;

                  return (
                    <button
                      key={multiplier}
                      onClick={() => setSelectedFact({ table, multiplier, stat: stat ?? null })}
                      className={`aspect-square rounded-md sm:rounded-lg flex items-center justify-center font-mono text-[9px] xs:text-[10px] sm:text-xs transition-all border ${cellClass} ${
                        isSelected ? 'ring-2 ring-indigo-400 scale-110 z-10' : ''
                      }`}
                      title={`${table} × ${multiplier} = ${product}`}
                    >
                      {product}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Fact Detail Popover Card */}
      {selectedFact && (
        <div className="bg-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-white">
                {selectedFact.table} × {selectedFact.multiplier} ={' '}
                {selectedFact.table * selectedFact.multiplier}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  !selectedFact.stat || selectedFact.stat.attempts === 0
                    ? 'bg-slate-800 text-slate-400'
                    : selectedFact.stat.masteryScore >= 90
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : selectedFact.stat.masteryScore >= 50
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {!selectedFact.stat || selectedFact.stat.attempts === 0
                  ? 'Unattempted'
                  : `${selectedFact.stat.masteryScore}% Mastery`}
              </span>
            </div>

            {selectedFact.stat && selectedFact.stat.attempts > 0 ? (
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Attempts: {selectedFact.stat.attempts}</span>
                <span>
                  Accuracy:{' '}
                  {Math.round(
                    (selectedFact.stat.correctCount / selectedFact.stat.attempts) * 100
                  )}
                  %
                </span>
                <span>Avg Speed: {(selectedFact.stat.avgResponseTimeMs / 1000).toFixed(1)}s</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Not practiced yet.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDrillFact && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDrillFact(`mul_${selectedFact.table}_${selectedFact.multiplier}`)}
              >
                Drill Fact
              </Button>
            )}
            {onPracticeTable && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onPracticeTable(selectedFact.table)}
              >
                <Play className="w-3.5 h-3.5 mr-1" /> Practice Table {selectedFact.table}
              </Button>
            )}
            <button
              onClick={() => setSelectedFact(null)}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-400/50 flex-shrink-0" />
            <span>Mastered ({masteredCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-400/50 flex-shrink-0" />
            <span>Practicing ({practicingCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 border border-rose-400/50 flex-shrink-0" />
            <span>Weak ({weakCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700 flex-shrink-0" />
            <span>Unattempted ({unattemptedCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
