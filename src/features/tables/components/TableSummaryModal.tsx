import React from 'react';
import { TableSessionSummary } from '../types';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import {
  Trophy,
  Zap,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export interface TableSummaryModalProps {
  isOpen: boolean;
  summary: TableSessionSummary | null;
  onRestart: () => void;
  onClose: () => void;
}

export const TableSummaryModal: React.FC<TableSummaryModalProps> = ({
  isOpen,
  summary,
  onRestart,
  onClose,
}) => {
  if (!summary) return null;

  const isFlawless = summary.accuracyPercentage === 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Completed!"
      footer={
        <div className="flex justify-end gap-2.5 w-full">
          <Button variant="secondary" size="md" onClick={onClose}>
            Back to Selection
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={onRestart}
          >
            Practice Again
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Celebration Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">
                {isFlawless ? 'Flawless Mastery!' : 'Well Done!'}
              </h3>
              <p className="text-xs text-indigo-200">
                {summary.correctFirstTryCount} / {summary.totalQuestions} facts solved on first try
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-amber-300 flex items-center gap-1">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              +{summary.totalXpGained} XP
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Accuracy
            </span>
            <span className="text-xl font-black font-mono text-emerald-400">
              {summary.accuracyPercentage}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Avg Speed
            </span>
            <span className="text-xl font-black font-mono text-indigo-300">
              {(summary.averageResponseTimeMs / 1000).toFixed(2)}s
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Best Streak
            </span>
            <span className="text-xl font-black font-mono text-amber-400">
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

        {/* Weak facts encountered */}
        {summary.weakFactsEncountered.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              Facts to Review ({summary.weakFactsEncountered.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(summary.weakFactsEncountered)).map((factId) => {
                // Parse factId: "mul_7_8" -> "7 × 8"
                const parts = factId.split('_');
                const t = parts[1];
                const m = parts[2];
                return (
                  <span
                    key={factId}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300"
                  >
                    {t} × {m} = {parseInt(t, 10) * parseInt(m, 10)}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
