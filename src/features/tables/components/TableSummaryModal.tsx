import React, { useState } from 'react';
import { TableSessionSummary } from '../types';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import {
  Trophy,
  Zap,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Play,
  Clock,
  XCircle,
} from 'lucide-react';

export interface TableSummaryModalProps {
  isOpen: boolean;
  summary: TableSessionSummary | null;
  onRestart: () => void;
  onClose: () => void;
  onStartWeaknessPractice?: (count: number) => void;
}

export const TableSummaryModal: React.FC<TableSummaryModalProps> = ({
  isOpen,
  summary,
  onRestart,
  onClose,
  onStartWeaknessPractice,
}) => {
  const [selectedWeaknessCount, setSelectedWeaknessCount] = useState<15 | 30 | 50>(15);

  if (!summary) return null;

  const isFlawless = summary.accuracyPercentage === 100;
  const weakList = summary.weakQuestions ?? [];
  const hasWeakness = weakList.length > 0;
  const eventuallyCorrect = summary.eventuallyCorrectCount ?? summary.totalQuestions;
  const wrongAttempts = summary.totalWrongAttempts ?? (summary.totalQuestions - summary.correctFirstTryCount);
  const slowCount = summary.slowQuestionsCount ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SESSION COMPLETE"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
          <Button variant="secondary" size="md" onClick={onClose}>
            Back to Selection
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={onRestart}
            >
              Practice Again
            </Button>
            {hasWeakness && onStartWeaknessPractice && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={() => onStartWeaknessPractice(selectedWeaknessCount)}
                className="bg-amber-600 hover:bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-900/30"
              >
                Practice Weakness ({selectedWeaknessCount})
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Celebration Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-900/80 border border-indigo-500/40 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">
                {isFlawless ? 'Flawless Mastery!' : 'Session Complete!'}
              </h3>
              <p className="text-xs text-indigo-200">
                {summary.correctFirstTryCount} / {summary.totalQuestions} solved first-try ({eventuallyCorrect} eventually)
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-amber-300 flex items-center gap-1 justify-end">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              +{summary.totalXpGained} XP
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Added to Profile
            </span>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Questions
            </span>
            <span className="text-lg font-black font-mono text-white">
              {summary.totalQuestions}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Correct
            </span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {eventuallyCorrect}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Wrong Attempts
            </span>
            <span className={`text-lg font-black font-mono ${wrongAttempts > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {wrongAttempts}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Slow Questions
            </span>
            <span className={`text-lg font-black font-mono ${slowCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {slowCount}
            </span>
          </div>
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Accuracy
            </span>
            <span className="text-sm font-bold font-mono text-emerald-300">
              {summary.accuracyPercentage}%
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Speed
            </span>
            <span className="text-sm font-bold font-mono text-indigo-300">
              {(summary.averageResponseTimeMs / 1000).toFixed(2)}s
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Best Streak
            </span>
            <span className="text-sm font-bold font-mono text-amber-300">
              {summary.maxCombo}x
            </span>
          </div>
        </div>

        {/* Newly Mastered Tables Badge */}
        {summary.newlyMasteredTables.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Congratulations! Table {summary.newlyMasteredTables.join(', ')} achieved{' '}
              <strong>Mastered (≥90%)</strong> status!
            </span>
          </div>
        )}

        {/* WEAKNESS FOUND SECTION or NO WEAKNESSES MESSAGE */}
        {hasWeakness ? (
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                WEAKNESS FOUND ({weakList.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Calculations with mistakes or slow response
              </span>
            </div>

            {/* Weak facts list */}
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {weakList.map((w, idx) => {
                const wrongCount = w.wrongAttempts ?? (w.isCorrectFirstTry ? 0 : 1);
                const isSlow = w.isSlow;
                return (
                  <div
                    key={`${w.factId}_${idx}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white shadow-sm"
                  >
                    <span className="text-indigo-300">
                      {w.question.table} × {w.question.multiplier} = {w.question.answer}
                    </span>
                    {wrongCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-rose-400 font-sans font-semibold bg-rose-950/60 px-1.5 py-0.5 rounded-md border border-rose-800/40">
                        <XCircle className="w-3 h-3 text-rose-400 inline" />
                        {wrongCount}
                      </span>
                    )}
                    {isSlow && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-sans font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-800/40">
                        <Clock className="w-3 h-3 text-amber-400 inline" />
                        {(w.solveTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Weakness Practice Question Count Selector */}
            {onStartWeaknessPractice && (
              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Practice Weakness — How many questions?
                  </span>
                  <div className="flex items-center gap-1.5">
                    {([15, 30, 50] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSelectedWeaknessCount(count)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                          selectedWeaknessCount === count
                            ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-200">
                Great! No significant weaknesses found.
              </p>
              <p className="text-[11px] text-emerald-400/80">
                All questions were answered promptly and accurately.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
