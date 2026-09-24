import React, { useState } from 'react';
import {
  TableConfig,
  TablePresetId,
  MultiplierPresetId,
  TablePracticeInputMode,
  TABLE_PRESET_CONFIGS,
  MULTIPLIER_PRESET_CONFIGS,
  TableMasteryReport,
} from '../types';
import {
  getPrimeTables,
  getEvenTables,
  getOddTables,
} from '../utils/tableSelectionUtils';
import { Button } from '../../../components/common/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import {
  BookOpen,
  Play,
  ArrowLeftRight,
  Sliders,
  Grid,
  Trophy,
  Check,
} from 'lucide-react';

export interface TableSelectorProps {
  config: TableConfig;
  masteryReports: Record<number, TableMasteryReport>;
  onSelectPreset: (presetId: TablePresetId) => void;
  onChangeCustomRange: (min: number, max: number) => void;
  onToggleTable: (table: number) => void;
  onSetSelectedTables: (tables: number[]) => void;
  onSelectMultiplierPreset: (presetId: MultiplierPresetId) => void;
  onChangeMultiplierRange: (min: number, max: number) => void;
  onSetInputMode: (mode: TablePracticeInputMode) => void;
  onSetQuestionTarget: (target: number) => void;
  onStartLearn: (tableNum?: number) => void;
  onStartPractice: () => void;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  config,
  masteryReports,
  onSelectPreset,
  onChangeCustomRange,
  onToggleTable,
  onSetSelectedTables,
  onSelectMultiplierPreset,
  onChangeMultiplierRange,
  onSetInputMode,
  onSetQuestionTarget,
  onStartLearn,
  onStartPractice,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'range' | 'grid'>('presets');
  const [tempMin, setTempMin] = useState<string>(config.customTableRange.min.toString());
  const [tempMax, setTempMax] = useState<string>(config.customTableRange.max.toString());

  // Calculate overall mastered tables count
  const allReports = Object.values(masteryReports);
  const masteredCount = allReports.filter((r) => r.masteryPercentage >= 90).length;
  const practicingCount = allReports.filter(
    (r) => r.masteryPercentage >= 50 && r.masteryPercentage < 90
  ).length;
  const overallMasteryPct =
    allReports.length > 0
      ? Math.round(allReports.reduce((acc, r) => acc + r.masteryPercentage, 0) / 100)
      : 0;

  const handleRangeCommit = () => {
    const minVal = parseInt(tempMin, 10) || 1;
    const maxVal = parseInt(tempMax, 10) || 10;
    onChangeCustomRange(Math.min(minVal, maxVal), Math.max(minVal, maxVal));
  };

  const handleSwapRange = () => {
    const minVal = parseInt(tempMin, 10) || 1;
    const maxVal = parseInt(tempMax, 10) || 10;
    setTempMin(maxVal.toString());
    setTempMax(minVal.toString());
    onChangeCustomRange(Math.min(minVal, maxVal), Math.max(minVal, maxVal));
  };

  const handleSelectAllGrid = () => {
    const all = Array.from({ length: 100 }, (_, i) => i + 1);
    onSetSelectedTables(all);
  };

  const handleSelectPrimes = () => {
    onSetSelectedTables(getPrimeTables(100));
  };

  const handleSelectEvens = () => {
    onSetSelectedTables(getEvenTables(1, 100));
  };

  const handleSelectOdds = () => {
    onSetSelectedTables(getOddTables(1, 100));
  };

  const handleInvertGrid = () => {
    const currentSet = new Set(config.selectedTables);
    const inverted: number[] = [];
    for (let i = 1; i <= 100; i++) {
      if (!currentSet.has(i)) inverted.push(i);
    }
    if (inverted.length > 0) {
      onSetSelectedTables(inverted);
    }
  };

  const handleResetTen = () => {
    onSelectPreset('1-10');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full pb-10">
      {/* Overview Mastery Header */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-800/90 border border-slate-700/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Table Mastery Progress
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {masteredCount} / 100 Tables Mastered
            </h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-indigo-300">
              {overallMasteryPct}%
            </span>
            <p className="text-[11px] text-slate-400">
              {practicingCount} practicing
            </p>
          </div>
        </div>

        <ProgressBar
          value={masteredCount}
          max={100}
          variant="gradient"
          size="md"
        />

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>{config.selectedTables.length} tables selected currently</span>
          <span className="font-mono">
            {config.selectedTables.length * (config.multiplierRange.max - config.multiplierRange.min + 1)} facts pool
          </span>
        </div>
      </div>

      {/* Table Selection Mode Switcher */}
      <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Select Tables
          </h3>

          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('range')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'range'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Range
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Multi-Select
            </button>
          </div>
        </div>

        {/* Tab 1: Presets */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {TABLE_PRESET_CONFIGS.map((preset) => {
              const isActive =
                config.activePreset === preset.id &&
                config.selectedTables.length === preset.tableCount;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  aria-pressed={isActive}
                  className={`p-3 sm:p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-indigo-600/90 border-indigo-400 text-white ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-black">{preset.label}</span>
                    {isActive && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-semibold opacity-90">{preset.title}</p>
                    <p className="text-[11px] opacity-70">{preset.tableCount} tables</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Range */}
        {activeTab === 'range' && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-700/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-400">Min Table (1-100)</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.max(1, (parseInt(tempMin, 10) || 1) - 1);
                      setTempMin(v.toString());
                      onChangeCustomRange(v, Math.max(v, parseInt(tempMax, 10) || 10));
                    }}
                    className="w-8 h-10 bg-slate-800 rounded-l-xl border border-slate-700 text-white font-bold hover:bg-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={tempMin}
                    onChange={(e) => setTempMin(e.target.value)}
                    onBlur={handleRangeCommit}
                    aria-label="Min Table"
                    className="w-full h-10 text-center font-mono font-bold bg-slate-800 border-y border-slate-700 text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.min(100, (parseInt(tempMin, 10) || 1) + 1);
                      setTempMin(v.toString());
                      onChangeCustomRange(v, Math.max(v, parseInt(tempMax, 10) || 10));
                    }}
                    className="w-8 h-10 bg-slate-800 rounded-r-xl border border-slate-700 text-white font-bold hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwapRange}
                title="Swap Min and Max"
                aria-label="Swap Min and Max"
                className="mt-5 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-400">Max Table (1-100)</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.max(1, (parseInt(tempMax, 10) || 10) - 1);
                      setTempMax(v.toString());
                      onChangeCustomRange(Math.min(v, parseInt(tempMin, 10) || 1), v);
                    }}
                    className="w-8 h-10 bg-slate-800 rounded-l-xl border border-slate-700 text-white font-bold hover:bg-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={tempMax}
                    onChange={(e) => setTempMax(e.target.value)}
                    onBlur={handleRangeCommit}
                    aria-label="Max Table"
                    className="w-full h-10 text-center font-mono font-bold bg-slate-800 border-y border-slate-700 text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.min(100, (parseInt(tempMax, 10) || 10) + 1);
                      setTempMax(v.toString());
                      onChangeCustomRange(Math.min(v, parseInt(tempMin, 10) || 1), v);
                    }}
                    className="w-8 h-10 bg-slate-800 rounded-r-xl border border-slate-700 text-white font-bold hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Range: Tables {config.customTableRange.min} to {config.customTableRange.max} (
                {config.customTableRange.max - config.customTableRange.min + 1} tables)
              </span>
              <Button size="sm" variant="outline" onClick={handleRangeCommit}>
                Apply Range
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Multi-Select 100 Grid */}
        {activeTab === 'grid' && (
          <div className="space-y-3">
            {/* Quick Action Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button
                type="button"
                onClick={handleSelectAllGrid}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                All 1–100
              </button>
              <button
                type="button"
                onClick={handleSelectPrimes}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
              >
                Primes Only
              </button>
              <button
                type="button"
                onClick={handleSelectEvens}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
              >
                Evens Only
              </button>
              <button
                type="button"
                onClick={handleSelectOdds}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
              >
                Odds Only
              </button>
              <button
                type="button"
                onClick={handleInvertGrid}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                Invert
              </button>
              <button
                type="button"
                onClick={handleResetTen}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                Reset 1–10
              </button>
            </div>

            {/* 10x10 Number Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-60 overflow-y-auto p-1.5 bg-slate-900/80 rounded-2xl border border-slate-700/60">
              {Array.from({ length: 100 }, (_, i) => i + 1).map((t) => {
                const isSelected = config.selectedTables.includes(t);
                const rep = masteryReports[t];
                const mastery = rep?.masteryPercentage ?? 0;

                let dotColor = 'bg-slate-600';
                if (mastery >= 90) dotColor = 'bg-emerald-400';
                else if (mastery >= 50) dotColor = 'bg-indigo-400';
                else if (rep && rep.totalAttempts > 0) dotColor = 'bg-amber-400';

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onToggleTable(t)}
                    aria-pressed={isSelected}
                    className={`h-9 rounded-xl font-mono text-xs font-bold relative flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-black shadow-sm ring-1 ring-indigo-400'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{t}</span>
                    <span
                      className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${dotColor}`}
                      title={`Mastery: ${mastery}%`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Multiplier Range Selector */}
      <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Grid className="w-4 h-4 text-indigo-400" />
          Multiplier Range
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MULTIPLIER_PRESET_CONFIGS.map((mPreset) => {
            const isActive =
              config.multiplierPreset === mPreset.id &&
              config.multiplierRange.min === mPreset.min &&
              config.multiplierRange.max === mPreset.max;
            return (
              <button
                key={mPreset.id}
                type="button"
                onClick={() => onSelectMultiplierPreset(mPreset.id)}
                aria-pressed={isActive}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-400 text-white font-bold ring-2 ring-indigo-400/50'
                    : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <div className="font-mono text-base font-black">{mPreset.label}</div>
                <div className="text-[11px] opacity-75">{mPreset.subtitle}</div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onChangeMultiplierRange(1, 20)}
            aria-pressed={config.multiplierPreset === 'custom'}
            className={`p-3 rounded-2xl border text-center transition-all ${
              config.multiplierPreset === 'custom'
                ? 'bg-indigo-600 border-indigo-400 text-white font-bold ring-2 ring-indigo-400/50'
                : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <div className="font-mono text-base font-black">Custom</div>
            <div className="text-[11px] opacity-75">
              ×{config.multiplierRange.min}–×{config.multiplierRange.max}
            </div>
          </button>
        </div>
      </div>

      {/* Practice Input Mode & Target Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Practice Mode */}
        <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-4 space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Practice Mode
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSetInputMode('choice')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                config.inputMode === 'choice'
                  ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/50'
                  : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              Mode A: Options (1–4)
            </button>
            <button
              type="button"
              onClick={() => onSetInputMode('direct')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                config.inputMode === 'direct'
                  ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/50'
                  : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              Mode B: Direct Typing
            </button>
          </div>
        </div>

        {/* Question Count Target */}
        <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-4 space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Session Length
          </h4>
          <div className="flex items-center gap-1.5">
            {[10, 20, 25, 50].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onSetQuestionTarget(count)}
                className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                  config.questionTarget === count
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {count} Qs
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Launch Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          leftIcon={<BookOpen className="w-5 h-5 text-indigo-400" />}
          onClick={() => onStartLearn(config.selectedTables[0])}
        >
          Learn Tables
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1 shadow-lg shadow-indigo-600/30"
          leftIcon={<Play className="w-5 h-5" />}
          onClick={onStartPractice}
        >
          Start Practice ({config.inputMode === 'choice' ? 'Mode A' : 'Mode B'})
        </Button>
      </div>
    </div>
  );
};
