import React, { useRef, useEffect } from 'react';
import { VirtualKeypad } from '../../../components/common/VirtualKeypad';
import { Button } from '../../../components/common/Button';
import { useAudio } from '../../../core/audio/useAudio';

export interface TableModeBDirectProps {
  inputValue: string;
  feedback: 'idle' | 'correct' | 'incorrect';
  shakeKey: number;
  useVirtualKeypad?: boolean;
  isKeyboardOpen?: boolean;
  onChangeInput: (val: string) => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export const TableModeBDirect: React.FC<TableModeBDirectProps> = ({
  inputValue,
  feedback,
  shakeKey,
  useVirtualKeypad = false,
  isKeyboardOpen = false,
  onChangeInput,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}) => {
  const audio = useAudio();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when physical keyboard is active
  useEffect(() => {
    if (!useVirtualKeypad) {
      inputRef.current?.focus();
    }
  }, [useVirtualKeypad, shakeKey]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center space-y-4">
      {/* Input container with shake key */}
      <div
        key={`input_container_${shakeKey}`}
        className={`w-full flex items-center justify-center ${
          feedback === 'incorrect' ? 'animate-shake' : ''
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          inputMode={useVirtualKeypad ? 'none' : 'numeric'}
          pattern="[0-9]*"
          autoComplete="off"
          aria-label="Your Answer"
          placeholder="?"
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          className={`text-center font-mono font-black rounded-2xl bg-slate-900 border-2 text-white focus:outline-none transition-all placeholder:text-slate-600 ${
            isKeyboardOpen ? 'w-36 h-12 text-2xl' : 'w-44 sm:w-48 h-14 sm:h-16 text-3xl sm:text-4xl'
          } ${
            feedback === 'incorrect'
              ? 'border-rose-500 ring-4 ring-rose-500/30'
              : feedback === 'correct'
              ? 'border-emerald-500 ring-4 ring-emerald-500/30'
              : 'border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/30'
          }`}
        />
      </div>

      {/* Subtitle Hint */}
      <p className="text-xs text-slate-400 text-center select-none">
        {feedback === 'incorrect' ? (
          <span className="text-rose-400 font-bold">Incorrect — try again!</span>
        ) : feedback === 'correct' ? (
          <span className="text-emerald-400 font-bold">Correct! Advancing...</span>
        ) : useVirtualKeypad ? (
          'Use the keypad below to enter your answer'
        ) : (
          'Type your answer and press Enter'
        )}
      </p>

      {/* Virtual Keypad or Submit Button */}
      <div className="w-full pt-1">
        {useVirtualKeypad ? (
          <VirtualKeypad
            onDigit={onDigit}
            onBackspace={onBackspace}
            onSubmit={onSubmit}
            onClear={onClear}
            disabled={feedback !== 'idle'}
            onPlaySound={audio.playButtonTap}
          />
        ) : !isKeyboardOpen ? (
          <Button
            variant="primary"
            size="lg"
            onClick={onSubmit}
            className="w-full shadow-lg shadow-indigo-600/20"
          >
            Submit Answer (Enter)
          </Button>
        ) : null}
      </div>
    </div>
  );
};
