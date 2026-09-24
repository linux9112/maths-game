import React, { useEffect } from 'react';
import { TableQuestion, TablePracticeInputMode } from '../types';
import { TableModeAChoice } from './TableModeAChoice';
import { TableModeBDirect } from './TableModeBDirect';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { useVisualViewport } from '../../../components/common/useVisualViewport';
import { X, Flame, Target } from 'lucide-react';

export interface TablePracticeCardProps {
  question: TableQuestion;
  currentIndex: number;
  totalQuestions: number;
  inputMode: TablePracticeInputMode;
  combo: number;
  useVirtualKeypad?: boolean;
  isKeyboardOpen?: boolean;
  onExit: () => void;

  // Mode A props
  selectedOptionIndex: number | null;
  choiceFeedback: 'idle' | 'correct' | 'incorrect';
  onSelectOption: (index: number) => void;

  // Mode B props
  inputValue: string;
  inputFeedback: 'idle' | 'correct' | 'incorrect';
  shakeKey: number;
  onChangeInput: (val: string) => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export const TablePracticeCard: React.FC<TablePracticeCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  inputMode,
  combo,
  useVirtualKeypad = false,
  isKeyboardOpen = false,
  onExit,
  selectedOptionIndex,
  choiceFeedback,
  onSelectOption,
  inputValue,
  inputFeedback,
  shakeKey,
  onChangeInput,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}) => {
  const viewport = useVisualViewport();
  const keyboardOpen = isKeyboardOpen || viewport.isKeyboardOpen;

  // Desktop ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl md:max-w-2xl mx-auto w-full h-full p-2 sm:p-4 space-y-2 sm:space-y-3">
      {/* Top HUD */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            Table {question.table}
          </span>
          <span className="font-mono text-xs font-bold text-slate-400">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {combo}x Streak!
            </span>
          )}
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit Practice"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        value={currentIndex + 1}
        max={totalQuestions}
        variant="indigo"
        size="sm"
      />

      {/* Active Calculation Question Card */}
      <div
        className={`flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-800/90 border border-slate-700/80 shadow-2xl text-center my-auto transition-all ${
          keyboardOpen ? 'p-3 sm:p-5 space-y-3' : 'p-5 sm:p-10 space-y-5 sm:space-y-6'
        }`}
      >
        <div
          className={`font-black font-mono tracking-tight text-white select-none transition-all ${
            keyboardOpen
              ? 'text-2xl sm:text-4xl'
              : 'text-3xl sm:text-5xl md:text-6xl py-1 sm:py-2'
          }`}
        >
          {question.operandA} × {question.operandB} = ?
        </div>

        {inputMode === 'choice' ? (
          <TableModeAChoice
            options={question.options}
            correctAnswer={question.answer}
            selectedIndex={selectedOptionIndex}
            feedback={choiceFeedback}
            onSelectOption={onSelectOption}
          />
        ) : (
          <TableModeBDirect
            inputValue={inputValue}
            feedback={inputFeedback}
            shakeKey={shakeKey}
            useVirtualKeypad={useVirtualKeypad}
            isKeyboardOpen={keyboardOpen}
            onChangeInput={onChangeInput}
            onDigit={onDigit}
            onBackspace={onBackspace}
            onClear={onClear}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
};
