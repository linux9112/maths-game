import React from 'react';
import { NumberRange, ReviewTimerDuration } from '../types';
import { useTableLearn } from '../hooks/useTableLearn';
import { TableFactSheet } from './TableFactSheet';
import { TableFlashcardView } from './TableFlashcardView';
import { TableReviewTimer } from './TableReviewTimer';
import { Button } from '../../../components/common/Button';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Play,
} from 'lucide-react';

export interface TableLearnViewProps {
  selectedTables: readonly number[];
  multiplierRange: NumberRange;
  initialTable?: number;
  onBack: () => void;
  onStartPracticeWithTable: (tableNum: number) => void;
}

export const TableLearnView: React.FC<TableLearnViewProps> = ({
  selectedTables,
  multiplierRange,
  initialTable,
  onBack,
  onStartPracticeWithTable,
}) => {
  const activeTablesList = selectedTables.length > 0 ? selectedTables : [initialTable ?? 1];

  const {
    activeTable,
    setActiveTable,
    viewType,
    setViewType,
    orderedFacts,
    deck,
    currentCardIndex,
    currentFact,
    isFlipped,
    flipCard,
    nextCard,
    prevCard,
    isShuffled,
    setIsShuffled,
    timerDuration,
    setTimerDuration,
    timeRemainingSec,
    isTimerRunning,
    togglePauseTimer,
    markConfidence,
  } = useTableLearn({
    selectedTables: activeTablesList,
    multiplierRange,
    initialTimerDuration: 0,
  });

  return (
    <div className="space-y-5 max-w-3xl mx-auto w-full pb-10">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          Back to Selection
        </Button>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setViewType('sheet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewType === 'sheet'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Facts Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType('flashcard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewType === 'flashcard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Flashcards</span>
          </button>
        </div>
      </div>

      {/* Table Switcher Chips */}
      {activeTablesList.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 pr-1 flex-shrink-0">Table:</span>
          {activeTablesList.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTable(t)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex-shrink-0 transition-all ${
                activeTable === t
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Table {t}
            </button>
          ))}
        </div>
      )}

      {/* Timed Review Countdown Panel (visible in flashcard mode or expandable) */}
      {viewType === 'flashcard' && (
        <TableReviewTimer
          duration={timerDuration}
          timeRemainingSec={timeRemainingSec}
          isRunning={isTimerRunning}
          onSelectDuration={(dur) => setTimerDuration(dur as ReviewTimerDuration)}
          onToggleRunning={togglePauseTimer}
          onReset={() => setTimerDuration(timerDuration)}
        />
      )}

      {/* Main Content: Fact Sheet or Flashcards */}
      {viewType === 'sheet' ? (
        <TableFactSheet facts={orderedFacts} />
      ) : (
        <TableFlashcardView
          fact={currentFact}
          currentIndex={currentCardIndex}
          totalCards={deck.length}
          isFlipped={isFlipped}
          isShuffled={isShuffled}
          onFlip={flipCard}
          onNext={nextCard}
          onPrev={prevCard}
          onToggleShuffle={setIsShuffled}
          onMarkConfidence={markConfidence}
        />
      )}

      {/* Practice Launcher Bar */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-800">
        <div className="text-xs text-slate-400">
          Ready to test your recall on Table {activeTable}?
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Play className="w-4 h-4" />}
          onClick={() => onStartPracticeWithTable(activeTable)}
        >
          Practice Table {activeTable}
        </Button>
      </div>
    </div>
  );
};
