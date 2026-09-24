import React from 'react';
import { TableMasteryReport } from '../types';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { Button } from '../../../components/common/Button';
import { Sparkles, TrendingUp, CheckCircle2, BookOpen, Play } from 'lucide-react';

export interface TableMasteryCardProps {
  report: TableMasteryReport;
  onPractice?: (tableNum: number) => void;
  onLearn?: (tableNum: number) => void;
  compact?: boolean;
}

export const TableMasteryCard: React.FC<TableMasteryCardProps> = ({
  report,
  onPractice,
  onLearn,
  compact = false,
}) => {
  const {
    tableNumber,
    masteryPercentage,
    statusBadge,
    accuracyPercentage,
    avgResponseTimeMs,
    factsMastered,
    totalFacts,
    factStats,
  } = report;

  const badgeConfig = {
    mastered: {
      label: 'Mastered',
      colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      progressVariant: 'emerald' as const,
    },
    practicing: {
      label: 'Practicing',
      colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />,
      progressVariant: 'indigo' as const,
    },
    novice: {
      label: 'Novice',
      colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      progressVariant: 'amber' as const,
    },
  }[statusBadge];

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-3 transition-all hover:border-slate-600">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-mono font-black text-lg text-indigo-300">
            {tableNumber}
          </div>
          <div>
            <h4 className="font-bold text-white text-base leading-tight">
              Table {tableNumber}
            </h4>
            <p className="text-xs text-slate-400">
              {factsMastered} / {totalFacts} facts mastered
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeConfig.colorClass}`}
        >
          {badgeConfig.icon}
          <span>{badgeConfig.label}</span>
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <ProgressBar
          value={masteryPercentage}
          max={100}
          variant={badgeConfig.progressVariant}
          size="sm"
          showLabel
          label="Mastery"
        />
      </div>

      {/* Fact Heatmap Matrix */}
      {!compact && (
        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Facts Heatmap (×1 to ×{totalFacts})</span>
            <span>Acc: {accuracyPercentage}% • {avgResponseTimeMs > 0 ? `${(avgResponseTimeMs / 1000).toFixed(1)}s` : '--'}</span>
          </div>
          <div className="grid grid-cols-10 sm:grid-cols-12 gap-1">
            {Array.from({ length: totalFacts }).map((_, i) => {
              const multiplier = i + 1;
              const factId = `mul_${tableNumber}_${multiplier}`;
              const stat = factStats[factId];
              const score = stat?.masteryScore ?? 0;

              let dotClass = 'bg-slate-700 text-slate-400';
              if (stat && stat.attempts > 0) {
                if (score >= 90) dotClass = 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/40';
                else if (score >= 50) dotClass = 'bg-indigo-500 text-white font-bold';
                else dotClass = 'bg-amber-500 text-white font-bold';
              }

              return (
                <div
                  key={factId}
                  title={`${tableNumber} × ${multiplier} = ${tableNumber * multiplier} (Mastery: ${score}%)`}
                  className={`h-5 sm:h-6 rounded text-[10px] flex items-center justify-center font-mono cursor-default transition-all ${dotClass}`}
                >
                  {multiplier}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {onLearn && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            leftIcon={<BookOpen className="w-3.5 h-3.5" />}
            onClick={() => onLearn(tableNumber)}
          >
            Learn
          </Button>
        )}
        {onPractice && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
            leftIcon={<Play className="w-3.5 h-3.5" />}
            onClick={() => onPractice(tableNumber)}
          >
            Practice
          </Button>
        )}
      </div>
    </div>
  );
};
