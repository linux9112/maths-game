import React from 'react';
import { MathOperator, ALL_OPERATORS, OPERATOR_METAS } from '../types';
import { Sparkles, Plus, Minus, X, Divide } from 'lucide-react';

export interface OperationSelectorProps {
  selectedOperators: MathOperator[];
  onChange: (operators: MathOperator[]) => void;
  disabled?: boolean;
  className?: string;
}

export const OperationSelector: React.FC<OperationSelectorProps> = ({
  selectedOperators,
  onChange,
  disabled = false,
  className = '',
}) => {
  const isAllMixed = selectedOperators.length === ALL_OPERATORS.length;

  const handleToggleOperator = (op: MathOperator) => {
    if (disabled) return;
    if (selectedOperators.includes(op)) {
      // Prevent deselecting if it is the only active operator
      if (selectedOperators.length > 1) {
        onChange(selectedOperators.filter((o) => o !== op));
      }
    } else {
      onChange([...selectedOperators, op]);
    }
  };

  const handleToggleAllMixed = () => {
    if (disabled) return;
    if (isAllMixed) {
      // Deselect back to just Addition
      onChange(['+']);
    } else {
      // Select all 4
      onChange([...ALL_OPERATORS]);
    }
  };

  const getIcon = (op: MathOperator) => {
    switch (op) {
      case '+':
        return <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />;
      case '-':
        return <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />;
      case '*':
        return <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />;
      case '/':
        return <Divide className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />;
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Target Operations
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleAllMixed}
          aria-pressed={isAllMixed}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            isAllMixed
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm scale-102'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Mixed</span>
        </button>
      </div>

      <div
        role="group"
        aria-label="Select Operations"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5"
      >
        {ALL_OPERATORS.map((op) => {
          const meta = OPERATOR_METAS[op];
          const isSelected = selectedOperators.includes(op);

          return (
            <button
              key={op}
              type="button"
              disabled={disabled}
              onClick={() => handleToggleOperator(op)}
              aria-pressed={isSelected}
              aria-label={`Toggle ${meta.name}`}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl font-bold transition-all duration-150 select-none border text-sm sm:text-base ${
                isSelected
                  ? 'bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700/80'
              } disabled:opacity-50 disabled:pointer-events-none active:scale-95`}
            >
              <span className="p-1 rounded-lg bg-black/20 text-current">{getIcon(op)}</span>
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
