import React, { useState, useMemo, useEffect } from 'react';
import { Grid3X3, Play, X, Check, Search } from 'lucide-react';
import { FactStat, TableMasteryReport } from '../../tables/types';
import { tableMasteryStore } from '../../tables/logic/tableMasteryStore';
import { Button } from '../../../components/common/Button';

export type TableMasteryColor = 'unattempted' | 'practicing' | 'mastered' | 'weak';

export interface TableMasteryHeatmapProps {
  factStats?: Record<string, FactStat>;
  onPracticeTable?: (tableNumber: number) => void;
  onPracticeTables?: (tableNumbers: number[]) => void;
  onDrillFact?: (factId: string) => void;
  initialSelectedTables?: readonly number[] | number[];
}

export function getTableMasteryState(report: TableMasteryReport | null | undefined): TableMasteryColor {
  if (!report || report.totalAttempts === 0) {
    return 'unattempted';
  }

  // Weak table criteria:
  // Low accuracy (< 75%), or slow average time (> 4500ms), or has weak facts with broken streak, or low mastery (< 40%)
  const isLowAccuracy = report.accuracyPercentage < 75;
  const isSlow = report.avgResponseTimeMs > 4500;
  const hasWeakFacts = Object.values(report.factStats || {}).some(
    (f) => f.attempts > 0 && (f.consecutiveCorrect === 0 || f.correctCount / f.attempts < 0.75)
  );
  const isLowMastery = report.masteryPercentage < 40 && report.totalAttempts >= 2;

  if (isLowAccuracy || isSlow || hasWeakFacts || isLowMastery) {
    return 'weak';
  }

  if (report.masteryPercentage >= 90) {
    return 'mastered';
  }

  return 'practicing';
}

export const TableMasteryHeatmap: React.FC<TableMasteryHeatmapProps> = ({
  onPracticeTable,
  onPracticeTables,
  initialSelectedTables,
}) => {
  const [selectedTables, setSelectedTables] = useState<number[]>(() =>
    initialSelectedTables ? [...initialSelectedTables] : [21]
  );
  const [activeInspectTable, setActiveInspectTable] = useState<number | null>(21);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reports, setReports] = useState<Record<number, TableMasteryReport>>(() =>
    tableMasteryStore.getAllTableMasteries(100, 1, 10)
  );

  useEffect(() => {
    const unsub = tableMasteryStore.subscribe(() => {
      setReports(tableMasteryStore.getAllTableMasteries(100, 1, 10));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (initialSelectedTables && initialSelectedTables.length > 0) {
      setSelectedTables([...initialSelectedTables]);
      setActiveInspectTable(initialSelectedTables[0]);
    }
  }, [initialSelectedTables]);

  // Compute overall counts across all 100 tables
  const { unattemptedCount, practicingCount, masteredCount, weakCount } = useMemo(() => {
    let unattempted = 0;
    let practicing = 0;
    let mastered = 0;
    let weak = 0;

    for (let t = 1; t <= 100; t++) {
      const rep = reports[t];
      const state = getTableMasteryState(rep);
      if (state === 'unattempted') unattempted++;
      else if (state === 'practicing') practicing++;
      else if (state === 'mastered') mastered++;
      else if (state === 'weak') weak++;
    }

    return {
      unattemptedCount: unattempted,
      practicingCount: practicing,
      masteredCount: mastered,
      weakCount: weak,
    };
  }, [reports]);

  // Click & Double-click / Double-tap handling
  // Click handling: Single-click to select, single-click to deselect (toggle)
  const handleTableClick = (tableNum: number) => {
    setActiveInspectTable(tableNum);
    setSelectedTables((prev) =>
      prev.includes(tableNum) ? prev.filter((t) => t !== tableNum) : [...prev, tableNum]
    );
  };

  const handleRemoveSelectedTable = (tableNum: number) => {
    setSelectedTables((prev) => prev.filter((t) => t !== tableNum));
  };

  const handleSelectAll = () => {
    setSelectedTables(Array.from({ length: 100 }, (_, i) => i + 1));
  };

  const handleClearSelection = () => {
    setSelectedTables([]);
  };

  const handleStartPractice = (overrideTables?: number[]) => {
    const tablesToRun = overrideTables ?? (selectedTables.length > 0 ? selectedTables : activeInspectTable ? [activeInspectTable] : [1]);
    if (onPracticeTables) {
      onPracticeTables(tablesToRun);
    } else if (onPracticeTable) {
      onPracticeTable(tablesToRun[0]);
    }
  };

  const inspectReport = activeInspectTable ? reports[activeInspectTable] : null;
  const inspectState = activeInspectTable ? getTableMasteryState(inspectReport) : null;

  // Filtered tables by search
  const filteredTables = useMemo(() => {
    const all = Array.from({ length: 100 }, (_, i) => i + 1);
    const trimmed = searchQuery.trim();
    if (!trimmed) return all;
    return all.filter((t) => t.toString().includes(trimmed));
  }, [searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 w-full transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
            <Grid3X3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Table Selection & Mastery Grid (1–100)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Single-click to select or deselect · Multiple selection supported
            </p>
          </div>
        </div>

        {/* Action Controls & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial min-w-[120px] max-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="Search (e.g. 43)"
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={handleClearSelection}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-1 px-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 inline-block shadow-xs" />
            Unattempted ({unattemptedCount})
          </span>
          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400 inline-block shadow-xs" />
            Practicing ({practicingCount})
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block shadow-xs" />
            Mastered ({masteredCount})
          </span>
          <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-rose-400 inline-block shadow-xs" />
            Weak ({weakCount})
          </span>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Showing 100 complete tables
        </span>
      </div>

      {/* 10x10 Table Numbers Grid */}
      <div className="w-full">
        <div className="grid grid-cols-5 xs:grid-cols-8 sm:grid-cols-10 gap-1.5 sm:gap-2 max-h-[380px] overflow-y-auto p-2 bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 scrollbar-thin">
          {filteredTables.map((t) => {
            const isSelected = selectedTables.includes(t);
            const rep = reports[t];
            const masteryState = getTableMasteryState(rep);

            // Mastery background & border color
            let masteryClasses = 'bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs';
            let dotColor = 'bg-slate-400 dark:bg-slate-600';

            if (masteryState === 'mastered') {
              masteryClasses = 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-400 dark:border-emerald-500/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 shadow-2xs';
              dotColor = 'bg-emerald-600 dark:bg-emerald-400';
            } else if (masteryState === 'practicing') {
              masteryClasses = 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-500/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 shadow-2xs';
              dotColor = 'bg-amber-600 dark:bg-amber-400';
            } else if (masteryState === 'weak') {
              masteryClasses = 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 border-rose-400 dark:border-rose-500/50 hover:bg-rose-200 dark:hover:bg-rose-900/50 shadow-2xs';
              dotColor = 'bg-rose-600 dark:bg-rose-400';
            }

            // Selection state: distinct high-visibility border & ring in both themes
            const selectedClasses = isSelected
              ? '!bg-indigo-600 !text-white ring-3 ring-indigo-500 border-indigo-600 font-black shadow-md scale-105 z-10'
              : '';

            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTableClick(t)}
                aria-pressed={isSelected}
                aria-label={`Table ${t}, ${masteryState}, ${isSelected ? 'selected' : 'not selected'}`}
                title={`Table ${t} (${masteryState}) — Click to ${isSelected ? 'deselect' : 'select'}`}
                className={`h-11 sm:h-12 rounded-xl font-mono text-xs sm:text-sm font-bold relative flex items-center justify-center transition-all border select-none ${masteryClasses} ${selectedClasses}`}
              >
                <span className={isSelected ? 'text-white font-black' : 'font-extrabold text-slate-900 dark:text-slate-100'}>
                  {t}
                </span>

                {/* Top-right selection checkmark indicator */}
                {isSelected && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-700 dark:bg-indigo-500 flex items-center justify-center shadow-xs">
                    <Check className="w-2 h-2 text-white stroke-[3]" />
                  </span>
                )}

                {/* Bottom-right mastery status dot */}
                <span
                  className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${dotColor}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Tables Bar & START PRACTICE Action */}
      <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Selected Tables ({selectedTables.length}):
            </span>
            {selectedTables.length === 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 italic">No tables selected (click numbers to select)</span>
            )}
          </div>

          {selectedTables.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
              {[...selectedTables].sort((a, b) => a - b).map((t) => (
                <span
                  key={t}
                  onClick={() => handleRemoveSelectedTable(t)}
                  title="Click to remove from selection"
                  className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 hover:bg-rose-100 dark:bg-indigo-900/60 dark:hover:bg-rose-900/60 border border-indigo-300 dark:border-indigo-500/40 hover:border-rose-400 dark:hover:border-rose-500/40 text-xs font-mono font-bold text-indigo-900 dark:text-white hover:text-rose-800 dark:hover:text-rose-200 transition-all group"
                >
                  {t}
                  <X className="w-3 h-3 text-indigo-500 dark:text-indigo-300 group-hover:text-rose-600 dark:group-hover:text-rose-300" />
                </span>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={selectedTables.length === 0}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          onClick={() => handleStartPractice()}
          className="shadow-md shadow-indigo-600/30 flex-shrink-0 font-black text-sm"
        >
          START PRACTICE {selectedTables.length > 0 ? `(${selectedTables.length} Tables)` : ''}
        </Button>
      </div>

      {/* Table Information Inspector Card */}
      {inspectReport && activeInspectTable !== null && (
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-mono font-black text-base text-slate-900 dark:text-white shadow-xs">
              {activeInspectTable}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Table {activeInspectTable}
                </span>
                <span className="capitalize font-bold px-2 py-0.5 rounded-md text-[10px] bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                  {inspectState === 'mastered' ? '🟢 Mastered' : inspectState === 'practicing' ? '🟠 Practicing' : inspectState === 'weak' ? '🔴 Weak' : '⚫ Unattempted'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                <span>Mastery: <strong className="text-slate-900 dark:text-white font-mono">{inspectReport.masteryPercentage}%</strong></span>
                <span>Accuracy: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{inspectReport.accuracyPercentage}%</strong></span>
                <span>Avg Speed: <strong className="text-indigo-600 dark:text-indigo-300 font-mono">{(inspectReport.avgResponseTimeMs / 1000).toFixed(2)}s</strong></span>
                <span>Attempts: <strong className="text-slate-900 dark:text-white font-mono">{inspectReport.totalAttempts}</strong></span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            onClick={() => handleStartPractice([activeInspectTable])}
            className="flex-shrink-0"
          >
            Practice Table {activeInspectTable}
          </Button>
        </div>
      )}
    </div>
  );
};

// Export alias for backward-compatibility
export const TableMasteryGrid = TableMasteryHeatmap;
