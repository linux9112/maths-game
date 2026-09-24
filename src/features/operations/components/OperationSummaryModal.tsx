import React from 'react';
import { OperationSessionSummary, OPERATOR_METAS, MathOperator } from '../types';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Trophy, Target, Clock, Zap, RotateCcw, Sliders } from 'lucide-react';

export interface OperationSummaryModalProps {
  isOpen: boolean;
  summary: OperationSessionSummary | null;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

export const OperationSummaryModal: React.FC<OperationSummaryModalProps> = ({
  isOpen,
  summary,
  onPlayAgain,
  onChangeSettings,
}) => {
  if (!summary) return null;

  const isFlawless = summary.accuracyPercentage === 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onChangeSettings}
      title="Session Summary"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Sliders className="w-4 h-4" />}
            onClick={onChangeSettings}
          >
            Change Settings
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
      }
    >
      <div className="space-y-5 text-center sm:text-left">
        {/* Celebration Header */}
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-b from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 text-center space-y-2">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">
              {isFlawless ? 'Flawless Practice!' : 'Practice Complete!'}
            </h3>
            <p className="text-xs text-slate-400">
              {isFlawless
                ? '100% accuracy — amazing mental agility!'
                : 'Keep practicing daily to build automated calculation speed!'}
            </p>
          </div>

          {/* XP Banner */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30 text-sm font-black">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>+{summary.totalXpGained} XP Earned</span>
          </div>
        </div>

        {/* 4-Stat Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>Accuracy</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {summary.accuracyPercentage}%
            </div>
            <div className="text-[10px] text-slate-400">
              {summary.correctFirstTryCount} / {summary.totalQuestions} first try
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Avg Speed</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {(summary.averageResponseTimeMs / 1000).toFixed(1)}s
            </div>
            <div className="text-[10px] text-slate-400">per question</div>
          </div>
        </div>

        {/* Operator Breakdown List */}
        <div className="space-y-2 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Performance Breakdown
          </h4>
          <div className="space-y-1.5">
            {(Object.keys(summary.operatorBreakdown) as MathOperator[]).map((op) => {
              const data = summary.operatorBreakdown[op];
              if (data.total === 0) return null;
              const meta = OPERATOR_METAS[op];
              const pct = Math.round((data.correct / data.total) * 100);

              return (
                <div
                  key={op}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <span className="font-mono text-indigo-400 text-sm">{meta.symbol}</span>
                    <span>{meta.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-mono">
                      {data.correct}/{data.total}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
