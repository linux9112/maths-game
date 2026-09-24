import React, { useEffect, useRef } from 'react';
import { OperationQuestion, PracticeInputMode, OPERATOR_METAS } from '../types';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { VirtualKeypad } from '../../../components/common/VirtualKeypad';
import { Button } from '../../../components/common/Button';
import { useVisualViewport } from '../../../components/common/useVisualViewport';
import { Flame, XCircle, Target, CornerDownLeft } from 'lucide-react';

export interface ArithmeticPracticeProps {
  question: OperationQuestion;
  currentIndex: number;
  totalQuestions: number;
  inputMode: PracticeInputMode;
  combo: number;
  score: number;
  useVirtualKeypad: boolean;
  onExit: () => void;

  // Mode A Props
  selectedOptionIndex: number | null;
  choiceFeedback: 'idle' | 'correct' | 'incorrect';
  onSelectOption: (index: number) => void;

  // Mode B Props
  inputValue: string;
  shakeKey: number;
  inputFeedback: 'idle' | 'correct' | 'incorrect';
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onInputChange: (val: string) => void;
}

export const ArithmeticPractice: React.FC<ArithmeticPracticeProps> = ({
  question,
  currentIndex,
  totalQuestions,
  inputMode,
  combo,
  useVirtualKeypad,
  onExit,

  selectedOptionIndex,
  choiceFeedback,
  onSelectOption,

  inputValue,
  shakeKey,
  inputFeedback,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
  onInputChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewport = useVisualViewport();
  const isKeyboardOpen = viewport.isKeyboardOpen;

  // Auto-focus input on question load or reset
  useEffect(() => {
    if (inputMode === 'direct' && !useVirtualKeypad) {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIndex, inputMode, useVirtualKeypad]);

  // Desktop Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit session
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }

      // Mode A Keyboard Shortcuts: 1, 2, 3, 4
      if (inputMode === 'choice') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = parseInt(e.key, 10) - 1;
          onSelectOption(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMode, onSelectOption, onExit]);

  const opMeta = OPERATOR_METAS[question.operator];

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl md:max-w-2xl mx-auto w-full my-auto space-y-3 sm:space-y-5">
      {/* Top HUD: Progress Bar, Combos, and Controls */}
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
              Q {currentIndex + 1} / {totalQuestions}
            </span>
            <span className="text-indigo-400">Lv.{question.level} • {opMeta.name}</span>
          </div>

          <div className="flex items-center gap-3">
            {combo >= 2 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{combo} Streak!</span>
              </div>
            )}
            <button
              type="button"
              onClick={onExit}
              aria-label="Exit Practice Session"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <ProgressBar
          value={currentIndex + 1}
          max={totalQuestions}
          variant="gradient"
          size="sm"
        />
      </div>

      {/* Main Calculation Display Card */}
      <div
        key={`card_${question.id}_${shakeKey}`}
        className={`rounded-3xl bg-slate-800/90 border shadow-2xl text-center transition-all ${
          isKeyboardOpen ? 'p-3.5 sm:p-6 space-y-2 sm:space-y-4' : 'p-5 sm:p-10 space-y-4 sm:space-y-6'
        } ${
          inputFeedback === 'incorrect' || choiceFeedback === 'incorrect'
            ? 'border-rose-500/80 shadow-rose-500/20 animate-shake'
            : inputFeedback === 'correct' || choiceFeedback === 'correct'
            ? 'border-emerald-500/80 shadow-emerald-500/20'
            : 'border-slate-700/80'
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-widest text-indigo-400">
          <Target className="w-4 h-4" />
          <span>Mental Arithmetic Practice</span>
        </div>

        {/* Large Equation Prompt */}
        <div
          className={`font-black tracking-tight text-white font-mono select-none transition-all ${
            isKeyboardOpen ? 'text-2xl sm:text-4xl py-1' : 'text-3xl sm:text-5xl md:text-6xl py-1 sm:py-2'
          }`}
          aria-label={`${question.operandA} ${opMeta.name} ${question.operandB}`}
        >
          {question.operandA} {opMeta.symbol} {question.operandB} = ?
        </div>

        {/* MODE A: 4 Options Multiple-Choice Grid */}
        {inputMode === 'choice' && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-2">
            {question.options.map((opt, idx) => {
              const isSelected = selectedOptionIndex === idx;
              const isCorrectAnswer = opt === question.answer;

              let btnStyle =
                'bg-slate-800/90 text-white hover:bg-slate-700 hover:border-indigo-500/60 border-slate-700';

              if (choiceFeedback !== 'idle') {
                if (isSelected) {
                  btnStyle = isCorrectAnswer
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-102 ring-2 ring-emerald-400'
                    : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/30 ring-2 ring-rose-400';
                } else if (isCorrectAnswer && choiceFeedback === 'incorrect') {
                  // Reveal correct answer when user picked wrong
                  btnStyle =
                    'bg-emerald-950/60 text-emerald-300 border-2 border-emerald-500/80 ring-1 ring-emerald-400';
                } else {
                  btnStyle = 'opacity-40 bg-slate-800 border-slate-700 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={choiceFeedback !== 'idle'}
                  onClick={() => onSelectOption(idx)}
                  className={`relative py-3.5 sm:py-4 px-4 rounded-2xl font-mono text-2xl sm:text-3xl font-extrabold border transition-all duration-100 flex items-center justify-center select-none active:scale-95 ${btnStyle}`}
                >
                  <span className="absolute top-2 left-2 text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-black/30 text-slate-300">
                    {idx + 1}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* MODE B: Direct Numeric Typing Display */}
        {inputMode === 'direct' && (
          <div className={`pt-1 sm:pt-2 ${isKeyboardOpen ? 'space-y-1.5' : 'space-y-3'}`}>
            <div className="flex items-center justify-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                inputMode={useVirtualKeypad ? 'none' : 'numeric'}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit();
                }}
                placeholder="?"
                aria-label="Your Answer"
                autoComplete="off"
                className={`text-center font-mono font-black rounded-2xl bg-slate-900 border-2 text-white focus:outline-none transition-all placeholder:text-slate-600 ${
                  isKeyboardOpen
                    ? 'w-32 sm:w-40 h-11 sm:h-13 text-2xl sm:text-3xl'
                    : 'w-36 sm:w-44 h-14 sm:h-16 text-3xl sm:text-4xl'
                } ${
                  inputFeedback === 'incorrect'
                    ? 'border-rose-500 ring-4 ring-rose-500/30'
                    : inputFeedback === 'correct'
                    ? 'border-emerald-500 ring-4 ring-emerald-500/30'
                    : 'border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/30'
                }`}
              />
            </div>

            <p className="text-xs text-slate-400">
              Type answer and press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 font-mono text-slate-200">Enter</kbd>
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls / Virtual Keypad */}
      {inputMode === 'direct' && (
        useVirtualKeypad ? (
          <VirtualKeypad
            onDigit={onDigit}
            onBackspace={onBackspace}
            onSubmit={onSubmit}
            onClear={onClear}
          />
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={onSubmit}
            leftIcon={<CornerDownLeft className="w-5 h-5" />}
            className="w-full max-w-sm mx-auto"
          >
            Submit Answer (Enter)
          </Button>
        )
      )}

      {inputMode === 'choice' && (
        <p className="text-center text-xs text-slate-500">
          Tip: Use number keys <kbd className="px-1 bg-slate-800 rounded font-mono">1</kbd>–
          <kbd className="px-1 bg-slate-800 rounded font-mono">4</kbd> on your keyboard
        </p>
      )}
    </div>
  );
};
