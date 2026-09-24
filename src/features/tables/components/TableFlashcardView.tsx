import React, { useEffect } from 'react';
import { TableFact } from '../types';
import { Button } from '../../../components/common/Button';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export interface TableFlashcardViewProps {
  fact: TableFact;
  currentIndex: number;
  totalCards: number;
  isFlipped: boolean;
  isShuffled: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: (shuffled: boolean) => void;
  onMarkConfidence: (status: 'learning' | 'mastered') => void;
}

export const TableFlashcardView: React.FC<TableFlashcardViewProps> = ({
  fact,
  currentIndex,
  totalCards,
  isFlipped,
  isShuffled,
  onFlip,
  onNext,
  onPrev,
  onToggleShuffle,
  onMarkConfidence,
}) => {
  // Desktop keyboard shortcuts: Space/Enter to flip, Arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        onFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip, onNext, onPrev]);

  return (
    <div className="flex flex-col items-center space-y-4 max-w-lg mx-auto w-full">
      {/* Card Header Info */}
      <div className="flex items-center justify-between w-full px-2 text-xs font-semibold text-slate-400">
        <span className="font-mono">
          Card {currentIndex + 1} of {totalCards} • Table {fact.table}
        </span>
        <button
          type="button"
          onClick={() => onToggleShuffle(!isShuffled)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
            isShuffled
              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{isShuffled ? 'Shuffled' : 'Sequential'}</span>
        </button>
      </div>

      {/* 3D Flipping Flashcard Container */}
      <div
        className="w-full h-72 sm:h-80 cursor-pointer select-none [perspective:1000px]"
        onClick={onFlip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? `Card Answer: ${fact.answer}` : `Card Question: ${fact.promptText}`}
      >
        <div
          className={`relative w-full h-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] shadow-2xl ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* FRONT FACE (Prompt) */}
          <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-indigo-500/40 p-6 flex flex-col justify-between items-center [backface-visibility:hidden]">
            <div className="w-full flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Table {fact.table}
              </span>
              {fact.isSquare && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                  Square Fact
                </span>
              )}
            </div>

            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white py-4">
              {fact.promptText} = ?
            </div>

            <div className="text-xs text-indigo-300 flex items-center gap-1.5 opacity-80 animate-pulse">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tap card or press Space to reveal</span>
            </div>
          </div>

          {/* BACK FACE (Answer) */}
          <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-slate-850 to-slate-900 border-2 border-emerald-500/60 p-6 flex flex-col justify-between items-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="font-mono text-indigo-300">{fact.fullEquation}</span>
              <span className="text-emerald-400 font-bold">Answer Revealed</span>
            </div>

            <div className="text-center space-y-1">
              <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400 tracking-tight drop-shadow-md">
                {fact.answer}
              </div>
              <div className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 font-mono">
                💡 {fact.breakdownHint}
              </div>
            </div>

            {/* Self-evaluation Buttons */}
            <div
              className="flex items-center gap-2 w-full pt-1"
              onClick={(e) => e.stopPropagation()} // Prevent card flipping back
            >
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
                onClick={() => onMarkConfidence('learning')}
              >
                Still Learning
              </Button>
              <Button
                variant="success"
                size="sm"
                className="flex-1 text-xs"
                leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                onClick={() => onMarkConfidence('mastered')}
              >
                Mastered!
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls Bar */}
      <div className="flex items-center justify-between w-full pt-1">
        <Button
          variant="secondary"
          size="md"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="md"
          leftIcon={<RotateCw className="w-4 h-4" />}
          onClick={onFlip}
        >
          Flip
        </Button>
        <Button
          variant="secondary"
          size="md"
          rightIcon={<ChevronRight className="w-4 h-4" />}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
