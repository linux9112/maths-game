import React, { useEffect } from 'react';

export interface TableModeAChoiceProps {
  options: readonly number[];
  correctAnswer: number;
  selectedIndex: number | null;
  feedback: 'idle' | 'correct' | 'incorrect';
  disabled?: boolean;
  onSelectOption: (index: number) => void;
}

export const TableModeAChoice: React.FC<TableModeAChoiceProps> = ({
  options,
  correctAnswer,
  selectedIndex,
  feedback,
  disabled = false,
  onSelectOption,
}) => {
  // Desktop keyboard shortcuts 1..4 and Numpad 1..4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || feedback !== 'idle') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const keyMap: Record<string, number> = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
        Numpad1: 0,
        Numpad2: 1,
        Numpad3: 2,
        Numpad4: 3,
      };

      if (e.key in keyMap) {
        e.preventDefault();
        const targetIdx = keyMap[e.key];
        if (targetIdx < options.length) {
          onSelectOption(targetIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options.length, disabled, feedback, onSelectOption]);

  return (
    <div
      role="group"
      aria-label="Multiple Choice Options"
      className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-md mx-auto"
    >
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isTrueCorrect = option === correctAnswer;

        let styleClass =
          'bg-slate-800/90 border-slate-700/80 text-white hover:bg-slate-700/80 active:scale-95';

        if (feedback !== 'idle') {
          if (isSelected) {
            if (feedback === 'correct') {
              styleClass =
                'bg-emerald-600 border-emerald-500 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30 text-white scale-102';
            } else {
              styleClass =
                'bg-rose-600 border-rose-500 ring-2 ring-rose-400 shadow-lg shadow-rose-500/30 text-white animate-shake';
            }
          } else if (feedback === 'incorrect' && isTrueCorrect) {
            // Pedagogical Reveal: highlight the correct answer in emerald
            styleClass =
              'bg-emerald-950/70 text-emerald-300 border-2 border-emerald-500/80 ring-2 ring-emerald-400/50 shadow-md scale-102';
          } else {
            styleClass = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-40 pointer-events-none';
          }
        }

        return (
          <button
            key={`${option}_${index}`}
            type="button"
            disabled={disabled || feedback !== 'idle'}
            onClick={() => onSelectOption(index)}
            className={`relative p-4 sm:p-5 rounded-2xl border-2 font-mono font-black text-2xl sm:text-3xl text-center transition-all duration-150 flex items-center justify-center min-h-[72px] sm:min-h-[84px] shadow-md select-none ${styleClass}`}
          >
            {/* Shortcut Badge */}
            <span className="absolute top-2 left-2.5 w-5 h-5 rounded-md bg-slate-900/80 border border-slate-700/80 text-[11px] font-bold text-slate-300 flex items-center justify-center">
              {index + 1}
            </span>

            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
};
