import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  LayoutGrid,
  Zap,
  Target,
  Flame,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { GameSummaryData, GameMistakeItem, PerformanceGrade } from './types';
import { Button } from '../../../components/common/Button';

export interface GameSummaryModalProps {
  isOpen: boolean;
  gameTitle: string;
  summary: GameSummaryData | null;
  onPlayAgain: () => void;
  onBackToArcade: () => void;
  onPracticeMistakes?: (mistakes: readonly GameMistakeItem[]) => void;
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  isOpen,
  gameTitle,
  summary,
  onPlayAgain,
  onBackToArcade,
  onPracticeMistakes,
}) => {
  useEffect(() => {
    if (isOpen && summary?.status === 'VICTORY') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback in headless / non-canvas environments
      }
    }
  }, [isOpen, summary?.status]);

  if (!isOpen || !summary) return null;

  const getGradeBadge = (grade: PerformanceGrade) => {
    switch (grade) {
      case 'S':
        return {
          bg: 'bg-amber-500/20 border-amber-400 text-amber-300',
          title: 'S - Flawless Mastery',
        };
      case 'A':
        return {
          bg: 'bg-emerald-500/20 border-emerald-400 text-emerald-300',
          title: 'A - Excellent Speed & Accuracy',
        };
      case 'B':
        return {
          bg: 'bg-indigo-500/20 border-indigo-400 text-indigo-300',
          title: 'B - Solid Competence',
        };
      case 'C':
      default:
        return {
          bg: 'bg-slate-700/40 border-slate-600 text-slate-300',
          title: 'C - Keep Practicing',
        };
    }
  };

  const gradeBadge = getGradeBadge(summary.performanceGrade);

  const formatSec = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Banner */}
        <div
          className={`p-6 text-center border-b ${
            summary.status === 'VICTORY'
              ? 'bg-gradient-to-b from-indigo-900/50 to-slate-900 border-indigo-500/30'
              : 'bg-gradient-to-b from-slate-800/80 to-slate-900 border-slate-800'
          }`}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
            {summary.status === 'VICTORY' ? (
              <Trophy className="w-8 h-8 text-amber-400" />
            ) : (
              <Target className="w-8 h-8 text-indigo-400" />
            )}
          </div>

          <h2 id="summary-title" className="text-2xl font-black text-white">
            {summary.status === 'VICTORY' ? 'Round Victorious!' : 'Session Complete'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{gameTitle}</p>

          {/* Grade Badge */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm border-current">
            <span className={`px-2 py-0.5 rounded-full border text-xs font-black ${gradeBadge.bg}`}>
              Grade {summary.performanceGrade}
            </span>
            <span className="text-slate-300 font-semibold">{gradeBadge.title}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Final Score
              </span>
              <span className="font-mono font-black text-lg text-white mt-0.5">
                {summary.score.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Accuracy
              </span>
              <span className="font-mono font-black text-lg text-emerald-400 mt-0.5">
                {summary.accuracyPercentage}%
              </span>
              <span className="text-[10px] text-slate-500">
                {summary.questionsCorrectFirstTry}/{summary.questionsAnswered}
              </span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Max Streak
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-mono font-black text-lg text-amber-300">
                  {summary.maxCombo}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Peak: {summary.peakMultiplier}x
              </span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Time
              </span>
              <span className="font-mono font-black text-lg text-slate-200 mt-0.5">
                {formatSec(summary.elapsedTimeSec)}
              </span>
              <span className="text-[10px] text-slate-500">
                Avg {(summary.averageResponseTimeMs / 1000).toFixed(1)}s/q
              </span>
            </div>
          </div>

          {/* XP Breakdown Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-950/40 to-slate-800/60 rounded-2xl border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                XP Awarded
              </span>
              <span className="font-mono font-black text-amber-300 text-base">
                +{summary.totalXpEarned} XP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <div>Base: +{summary.xpBreakdown.baseXp}</div>
              <div>Combo: +{summary.xpBreakdown.comboBonusXp}</div>
              <div>Diff: +{summary.xpBreakdown.difficultyBonusXp}</div>
              <div>
                Speed: +{summary.xpBreakdown.speedBonusXp}
                {summary.xpBreakdown.completionBonusXp > 0 &&
                  ` | Bonus: +${summary.xpBreakdown.completionBonusXp}`}
              </div>
            </div>
          </div>

          {/* Mistakes Review Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {summary.mistakeItems.length === 0
                  ? 'Mistake Review'
                  : `Missed Questions (${summary.mistakeItems.length})`}
              </h3>

              {summary.mistakeItems.length > 0 && onPracticeMistakes && (
                <button
                  type="button"
                  onClick={() => onPracticeMistakes(summary.mistakeItems)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Target className="w-3.5 h-3.5" />
                  Practice Missed Facts
                </button>
              )}
            </div>

            {summary.mistakeItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Flawless precision! Zero calculation mistakes recorded this round.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {summary.mistakeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {item.question.promptText}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-red-400 line-through">
                          {item.userAnswer}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          = {item.expectedAnswer}
                        </span>
                      </div>
                    </div>
                    {item.pedagogicalHint && (
                      <p className="text-[11px] text-indigo-300/90 bg-indigo-950/40 p-2 rounded-xl border border-indigo-900/50 flex items-start gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-indigo-400 flex-shrink-0" />
                        <span>{item.pedagogicalHint}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="md"
            leftIcon={<LayoutGrid className="w-4 h-4" />}
            onClick={onBackToArcade}
          >
            Arcade Hub
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={onPlayAgain}
          >
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
};
