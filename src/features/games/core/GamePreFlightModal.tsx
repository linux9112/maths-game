import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Play,
  X,
  Clock,
  Heart,
  Target,
  BarChart2,
} from 'lucide-react';
import { MathOperator } from '../../../core/math/types';
import {
  GameConfig,
  GameDifficulty,
  GameTargetLength,
  GameTimeLimitSec,
  GameMistakeLimit,
} from './types';
import { Button } from '../../../components/common/Button';

export interface GamePreFlightModalProps {
  isOpen: boolean;
  gameId: string;
  gameTitle: string;
  gameDescription?: string;
  category: 'Speed' | 'Survival' | 'Memory' | 'Battles' | 'Challenges';
  icon?: React.ReactNode;
  allowedOperators?: readonly MathOperator[];
  defaultConfig?: Partial<GameConfig>;
  onStartGame: (config: GameConfig) => void;
  onClose: () => void;
}

const ALL_OPERATORS: readonly MathOperator[] = ['+', '-', '*', '/'];

export const GamePreFlightModal: React.FC<GamePreFlightModalProps> = ({
  isOpen,
  gameId,
  gameTitle,
  gameDescription = 'Configure your practice settings before launching the game.',
  category,
  icon,
  allowedOperators = ALL_OPERATORS,
  defaultConfig,
  onStartGame,
  onClose,
}) => {
  const [selectedOperators, setSelectedOperators] = useState<readonly MathOperator[]>(
    defaultConfig?.selectedOperators && defaultConfig.selectedOperators.length > 0
      ? defaultConfig.selectedOperators
      : allowedOperators
  );
  const [difficulty, setDifficulty] = useState<GameDifficulty>(
    defaultConfig?.difficulty ?? 'normal'
  );
  const [targetLength, setTargetLength] = useState<GameTargetLength>(
    defaultConfig?.targetLength ?? 25
  );
  const [timeLimitSec, setTimeLimitSec] = useState<GameTimeLimitSec>(
    defaultConfig?.timeLimitSec !== undefined ? defaultConfig.timeLimitSec : 60
  );
  const [mistakeLimit, setMistakeLimit] = useState<GameMistakeLimit>(
    defaultConfig?.mistakeLimit !== undefined ? defaultConfig.mistakeLimit : 3
  );
  const [isStressFree, setIsStressFree] = useState<boolean>(
    defaultConfig?.isStressFree ?? false
  );
  const [inputMode, setInputMode] = useState<'choice' | 'direct'>(
    defaultConfig?.inputMode ?? 'choice'
  );

  if (!isOpen) return null;

  const toggleOperator = (op: MathOperator) => {
    if (selectedOperators.includes(op)) {
      if (selectedOperators.length > 1) {
        setSelectedOperators(selectedOperators.filter((o) => o !== op));
      }
    } else {
      setSelectedOperators([...selectedOperators, op]);
    }
  };

  const handleSelectAllOperators = () => {
    setSelectedOperators(allowedOperators);
  };

  const handleLaunch = () => {
    const config: GameConfig = {
      gameId,
      title: gameTitle,
      category,
      selectedOperators,
      difficulty,
      targetLength,
      timeLimitSec: isStressFree ? null : timeLimitSec,
      mistakeLimit: isStressFree ? null : mistakeLimit,
      isStressFree,
      inputMode,
    };
    onStartGame(config);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preflight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              {icon || <Zap className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="preflight-title" className="text-lg font-black text-white">
                  {gameTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {category}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">{gameDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Stress-Free Mode Toggle Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isStressFree
                ? 'bg-gradient-to-r from-emerald-950/60 to-teal-950/50 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isStressFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-1.5">
                    Stress-Free Practice Mode
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Disables timers and lives, enables on-demand hints.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStressFree}
                  onChange={(e) => setIsStressFree(e.target.checked)}
                  aria-label="Toggle Stress-Free Practice Mode"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* Operation Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Operations
              </label>
              <button
                type="button"
                onClick={handleSelectAllOperators}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['+', '-', '*', '/'] as const).map((op) => {
                const isSelected = selectedOperators.includes(op);
                const symbols: Record<MathOperator, string> = {
                  '+': '+ Add',
                  '-': '− Subtract',
                  '*': '× Multiply',
                  '/': '÷ Divide',
                };
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => toggleOperator(op)}
                    aria-pressed={isSelected}
                    className={`py-2 px-1 text-center font-bold text-xs rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {symbols[op]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Tier */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Difficulty Tier
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['beginner', 'normal', 'hard', 'expert', 'extreme'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setDifficulty(tier)}
                  aria-pressed={difficulty === tier}
                  className={`py-2 px-1 text-center capitalize text-xs font-bold rounded-xl border transition-all ${
                    difficulty === tier
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Target Question Count */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Target Questions
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {([10, 25, 50, 100, 'endless'] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setTargetLength(len)}
                  aria-pressed={targetLength === len}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all ${
                    targetLength === len
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {len === 'endless' ? 'Endless' : `${len} Qs`}
                </button>
              ))}
            </div>
          </div>

          {/* Time Limits & Mistakes (Dimmed when stress-free) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Time Limit */}
            <div className={`space-y-2 ${isStressFree ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Time Limit
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([null, 30, 60, 90, 120, 180] as const).map((time) => (
                  <button
                    key={time ?? 'none'}
                    type="button"
                    onClick={() => setTimeLimitSec(time)}
                    aria-pressed={timeLimitSec === time}
                    className={`py-1.5 px-1 text-center text-xs font-bold rounded-xl border transition-all ${
                      timeLimitSec === time
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {time === null ? 'None' : `${time}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Mistake Limit */}
            <div className={`space-y-2 ${isStressFree ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                Mistake Limit
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {([1, 3, 5, null] as const).map((limit) => (
                  <button
                    key={limit ?? 'none'}
                    type="button"
                    onClick={() => setMistakeLimit(limit)}
                    aria-pressed={mistakeLimit === limit}
                    className={`py-1.5 px-1 text-center text-xs font-bold rounded-xl border transition-all ${
                      mistakeLimit === limit
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {limit === null ? '∞' : `${limit} ❤`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Input Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInputMode('choice')}
                aria-pressed={inputMode === 'choice'}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  inputMode === 'choice'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                Multiple Choice (4 Options)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('direct')}
                aria-pressed={inputMode === 'direct'}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  inputMode === 'direct'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                Direct Typing (Keypad)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Play className="w-4 h-4 fill-white" />}
            onClick={handleLaunch}
          >
            Launch Game
          </Button>
        </div>
      </div>
    </div>
  );
};
