import React from 'react';
import { OperationLevel, LEVEL_CONFIGS, MathOperator, OPERATOR_METAS } from '../types';
import { ShieldCheck, Info } from 'lucide-react';

export interface LevelSelectorProps {
  selectedLevel: OperationLevel;
  selectedOperators: MathOperator[];
  onSelectLevel: (level: OperationLevel) => void;
  disabled?: boolean;
  className?: string;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  selectedLevel,
  selectedOperators,
  onSelectLevel,
  disabled = false,
  className = '',
}) => {
  const activeLevelConfig = LEVEL_CONFIGS[selectedLevel];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Difficulty Level
        </label>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{activeLevelConfig.name}</span>
        </span>
      </div>

      {/* Level Buttons 1-5 */}
      <div
        role="radiogroup"
        aria-label="Arithmetic Difficulty Levels"
        className="grid grid-cols-5 gap-1.5 sm:gap-2"
      >
        {([1, 2, 3, 4, 5] as OperationLevel[]).map((lvl) => {
          const isSelected = selectedLevel === lvl;
          const config = LEVEL_CONFIGS[lvl];

          return (
            <button
              key={lvl}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelectLevel(lvl)}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-2xl border transition-all duration-150 select-none ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30 scale-105 ring-2 ring-indigo-400/40 font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700/80 font-bold'
              } disabled:opacity-50 disabled:pointer-events-none active:scale-95`}
            >
              <span className="text-base sm:text-lg">Lv.{lvl}</span>
              <span className="text-[10px] sm:text-xs opacity-80 uppercase tracking-tight">
                {config.name.slice(0, 4)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Arithmetic Description Box */}
      <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Level {selectedLevel} Arithmetic Focus:</span>
        </div>

        <div className="space-y-1 text-slate-300">
          {selectedOperators.map((op) => (
            <div key={op} className="flex items-start gap-1.5">
              <span className="font-mono font-extrabold text-indigo-300">
                {OPERATOR_METAS[op].symbol}
              </span>
              <span className="text-slate-300">{activeLevelConfig.descriptions[op]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
