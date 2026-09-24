import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flame,
  Zap,
  RotateCcw,
  TrendingUp,
  Brain,
  Sparkles,
} from 'lucide-react';
import { useAudio } from '../../core/audio/useAudio';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { StorageManager } from '../../core/storage/storageRepository';
import { ProgressionStore } from '../progression/progressionStore';
import { AdaptiveQuestionBuilder } from './adaptiveQuestionBuilder';
import { buildWeaknessPracticeQueue } from './weaknessSessionBuilder';
import { Question } from '../../core/math/types';
import { AdaptiveQuestion, WeaknessSessionSummary, ConqueredFactDelta } from './types';

interface AdaptiveFeatureProps {
  onBackToDashboard?: () => void;
  initialMode?: 'endless' | 'weakness';
}

export const AdaptiveFeature: React.FC<AdaptiveFeatureProps> = ({
  onBackToDashboard,
  initialMode = 'endless',
}) => {
  const audio = useAudio();
  const [activeTab, setActiveTab] = useState<'endless' | 'weakness'>(initialMode);
  const [inputMode, setInputMode] = useState<'choice' | 'direct'>('choice');

  // Endless state
  const [builder, setBuilder] = useState<AdaptiveQuestionBuilder | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [endlessScore, setEndlessScore] = useState(0);
  const [endlessCombo, setEndlessCombo] = useState(0);
  const [endlessMaxCombo, setEndlessMaxCombo] = useState(0);
  const [endlessQuestionsCount, setEndlessQuestionsCount] = useState(0);

  // Weakness state
  const [weaknessQueue, setWeaknessQueue] = useState<Question[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [weaknessSummary, setWeaknessSummary] = useState<WeaknessSessionSummary | null>(null);
  const [initialWeakScores, setInitialWeakScores] = useState<Record<string, number>>({});

  // Common interactive state
  const [directInput, setDirectInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const questionStartRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const attemptsHistoryRef = useRef<
    Array<{ factId: string; isCorrectFirstTry: boolean; responseTimeMs: number }>
  >([]);

  // Initialize Endless Builder
  const initEndless = useCallback(async () => {
    const repo = await StorageManager.getRepository();
    const weakRecords = await repo.getWeakCalculations({ limit: 15 });
    const candidates = weakRecords.map((r) => ({
      id: r.factId,
      weaknessScore: r.weaknessScore,
    }));

    const b = new AdaptiveQuestionBuilder({
      domain: 'all',
      inputMode,
      initialLevel: 2,
    });
    b.setCandidates(candidates);
    setBuilder(b);

    const firstQ = b.nextQuestion();
    setCurrentQuestion(firstQ);
    setEndlessScore(0);
    setEndlessCombo(0);
    setEndlessMaxCombo(0);
    setEndlessQuestionsCount(0);
    attemptsHistoryRef.current = [];
    questionStartRef.current = Date.now();
    sessionStartRef.current = Date.now();
    setIsSessionActive(true);
  }, [inputMode]);

  // Initialize Weakness Practice
  const initWeaknessPractice = useCallback(async () => {
    const repo = await StorageManager.getRepository();
    const weakRecords = await repo.getWeakCalculations({ limit: 10 });
    const scoreMap: Record<string, number> = {};
    weakRecords.forEach((r) => {
      scoreMap[r.factId] = r.weaknessScore;
    });
    setInitialWeakScores(scoreMap);

    const queue = buildWeaknessPracticeQueue(
      { targetCount: 15, topK: 5, inputMode },
      weakRecords
    );

    setWeaknessQueue(queue);
    setQueueIndex(0);
    setWeaknessSummary(null);
    attemptsHistoryRef.current = [];
    questionStartRef.current = Date.now();
    sessionStartRef.current = Date.now();
    setIsSessionActive(true);
  }, [inputMode]);

  useEffect(() => {
    if (activeTab === 'endless') {
      initEndless();
    } else {
      initWeaknessPractice();
    }
  }, [activeTab, initEndless, initWeaknessPractice]);

  const activeQuestionItem: Question | null =
    activeTab === 'endless' ? currentQuestion : weaknessQueue[queueIndex] ?? null;

  // Handle answering
  const handleAnswerSubmit = useCallback(
    async (userAnswer: number, choiceIndex?: number) => {
      if (!activeQuestionItem || feedback !== 'idle') return;

      const responseTimeMs = Math.max(50, Date.now() - questionStartRef.current);
      const isCorrect = userAnswer === activeQuestionItem.answer;

      if (choiceIndex !== undefined) {
        setSelectedOption(choiceIndex);
      }

      if (isCorrect) {
        setFeedback('correct');
        audio.playCorrect();

        const newCombo = endlessCombo + 1;
        setEndlessCombo(newCombo);
        setEndlessMaxCombo((m) => Math.max(m, newCombo));
        if (newCombo >= 2) audio.playCombo(newCombo);

        setEndlessScore((s) => s + 100 + (newCombo - 1) * 20);
        setEndlessQuestionsCount((c) => c + 1);

        // Record attempt telemetry
        attemptsHistoryRef.current.push({
          factId: activeQuestionItem.id.split('_').slice(0, 3).join('_'),
          isCorrectFirstTry: true,
          responseTimeMs,
        });

        // XP & Progression
        ProgressionStore.getInstance().recordQuestionAttempt({
          isCorrectFirstTry: true,
          responseTimeMs,
          combo: newCombo,
        });

        // Persist to storage repository
        StorageManager.getRepository().then((repo) => {
          repo.recordAttempt({
            factId: activeQuestionItem.id.split('_').slice(0, 3).join('_'),
            operator: activeQuestionItem.operator,
            operandA: activeQuestionItem.operandA,
            operandB: activeQuestionItem.operandB,
            expectedAnswer: activeQuestionItem.answer,
            userAnswer,
            isCorrect: true,
            responseTimeMs,
            solveTimeMs: responseTimeMs,
            timestamp: Date.now(),
            mode: 'weakness',
          });
        });

        if (builder && activeTab === 'endless') {
          builder.getDdaController().recordAttempt(true, responseTimeMs);
        }

        setTimeout(() => {
          setFeedback('idle');
          setSelectedOption(null);
          setDirectInput('');

          if (activeTab === 'endless' && builder) {
            setCurrentQuestion(builder.nextQuestion());
            questionStartRef.current = Date.now();
          } else if (activeTab === 'weakness') {
            if (queueIndex + 1 < weaknessQueue.length) {
              setQueueIndex((idx) => idx + 1);
              questionStartRef.current = Date.now();
            } else {
              finishWeaknessSession();
            }
          }
        }, 350);
      } else {
        // Incorrect
        setFeedback('incorrect');
        setShake(true);
        audio.playIncorrect();
        setEndlessCombo(0);

        attemptsHistoryRef.current.push({
          factId: activeQuestionItem.id.split('_').slice(0, 3).join('_'),
          isCorrectFirstTry: false,
          responseTimeMs,
        });

        // Persist incorrect attempt
        StorageManager.getRepository().then((repo) => {
          repo.recordAttempt({
            factId: activeQuestionItem.id.split('_').slice(0, 3).join('_'),
            operator: activeQuestionItem.operator,
            operandA: activeQuestionItem.operandA,
            operandB: activeQuestionItem.operandB,
            expectedAnswer: activeQuestionItem.answer,
            userAnswer,
            isCorrect: false,
            responseTimeMs,
            solveTimeMs: responseTimeMs,
            timestamp: Date.now(),
            mode: 'weakness',
          });
        });

        if (builder && activeTab === 'endless') {
          builder.getDdaController().recordAttempt(false, responseTimeMs);
        }

        setTimeout(() => {
          setShake(false);
          if (inputMode === 'direct') {
            // Mode B mistake lock: auto-clear input so user retries on same question
            setDirectInput('');
            setFeedback('idle');
          } else {
            // Mode A: advance after brief delay
            setFeedback('idle');
            setSelectedOption(null);
            if (activeTab === 'endless' && builder) {
              setCurrentQuestion(builder.nextQuestion());
              questionStartRef.current = Date.now();
            } else if (activeTab === 'weakness') {
              if (queueIndex + 1 < weaknessQueue.length) {
                setQueueIndex((idx) => idx + 1);
                questionStartRef.current = Date.now();
              } else {
                finishWeaknessSession();
              }
            }
          }
        }, 500);
      }
    },
    [
      activeQuestionItem,
      feedback,
      endlessCombo,
      builder,
      activeTab,
      queueIndex,
      weaknessQueue.length,
      audio,
      inputMode,
    ]
  );

  const finishWeaknessSession = async () => {
    setIsSessionActive(false);
    audio.playVictory();

    const repo = await StorageManager.getRepository();
    const attempts = attemptsHistoryRef.current;
    const totalQuestions = weaknessQueue.length;
    const correctFirstTry = attempts.filter((a) => a.isCorrectFirstTry).length;
    const accuracyPercentage =
      totalQuestions > 0 ? Math.round((correctFirstTry / totalQuestions) * 100) : 0;
    const totalTime = attempts.reduce((acc, a) => acc + a.responseTimeMs, 0);
    const averageResponseTimeMs = attempts.length > 0 ? Math.round(totalTime / attempts.length) : 0;
    const elapsedTimeMs = Date.now() - sessionStartRef.current;

    // Conquered deltas
    const conqueredDeltas: ConqueredFactDelta[] = [];
    const distinctFactIds = Array.from(new Set(attempts.map((a) => a.factId)));

    for (const factId of distinctFactIds) {
      const initial = initialWeakScores[factId] ?? 1.0;
      const latest = await repo.getStat(factId);
      const finalScore = latest?.weaknessScore ?? initial;
      const factAttempts = attempts.filter((a) => a.factId === factId);
      const factCorrect = factAttempts.filter((a) => a.isCorrectFirstTry).length;
      const acc = factAttempts.length > 0 ? Math.round((factCorrect / factAttempts.length) * 100) : 100;

      conqueredDeltas.push({
        factId,
        equation: factId.replace(/_/g, ' '),
        initialScore: initial,
        finalScore,
        attempts: factAttempts.length,
        accuracy: acc,
        improved: finalScore < initial || acc >= 80,
      });
    }

    const xpEarned = correctFirstTry * 15 + (accuracyPercentage >= 90 ? 100 : 50);

    setWeaknessSummary({
      totalQuestions,
      correctFirstTry,
      accuracyPercentage,
      averageResponseTimeMs,
      maxCombo: endlessMaxCombo,
      conqueredDeltas,
      totalXpGained: xpEarned,
      elapsedTimeMs,
    });
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-2.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl border border-slate-700/60 shadow-md">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('endless')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'endless'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-4 h-4" />
            Adaptive Endless
          </button>
          <button
            onClick={() => setActiveTab('weakness')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'weakness'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            Practice My Weakness
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <button
            onClick={() => setInputMode(inputMode === 'choice' ? 'direct' : 'choice')}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
          >
            Mode: {inputMode === 'choice' ? 'Multiple Choice (A)' : 'Direct Typing (B)'}
          </button>
          {onBackToDashboard && (
            <Button size="sm" variant="ghost" onClick={onBackToDashboard}>
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Weakness Summary Modal / Card */}
      {activeTab === 'weakness' && weaknessSummary && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Weakness Practice Complete!</h2>
            <p className="text-slate-400 text-sm mt-1">
              {weaknessSummary.accuracyPercentage}% Accuracy • {weaknessSummary.correctFirstTry}/
              {weaknessSummary.totalQuestions} first try • +{weaknessSummary.totalXpGained} XP
            </p>
          </div>

          <div className="space-y-2 text-left">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Conquered Facts:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weaknessSummary.conqueredDeltas.map((delta) => (
                <div
                  key={delta.factId}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                    delta.improved
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-bold">{delta.equation}</span>
                  <span className="flex items-center gap-1 font-semibold text-xs">
                    {delta.improved ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Weakness Mastered!
                      </>
                    ) : (
                      'Reviewed'
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Button variant="primary" onClick={initWeaknessPractice}>
              <RotateCcw className="w-4 h-4 mr-1" /> Practice Again
            </Button>
            {onBackToDashboard && (
              <Button variant="outline" onClick={onBackToDashboard}>
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Playing Interface */}
      {isSessionActive && activeQuestionItem && (
        <div
          className={`bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 transition-all ${
            shake ? 'animate-shake' : ''
          }`}
        >
          {/* Status HUD */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <Flame
                className={`w-4 h-4 ${
                  endlessCombo >= 2 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-500'
                }`}
              />
              <span>Combo: {endlessCombo}x</span>
            </div>

            {activeTab === 'weakness' && (
              <div className="flex items-center gap-2 w-36">
                <ProgressBar
                  value={queueIndex + 1}
                  max={weaknessQueue.length}
                  size="sm"
                  variant="indigo"
                />
                <span>
                  {queueIndex + 1}/{weaknessQueue.length}
                </span>
              </div>
            )}

            {activeTab === 'endless' && (
              <div className="flex items-center gap-3">
                <span>Score: {endlessScore}</span>
                <span>Solved: {endlessQuestionsCount}</span>
              </div>
            )}
          </div>

          {/* Equation Prompt */}
          <div className="py-8">
            <span className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-mono">
              {activeQuestionItem.operandA} {activeQuestionItem.displayOperator}{' '}
              {activeQuestionItem.operandB}
            </span>
            <span className="text-4xl sm:text-6xl font-extrabold text-indigo-400 font-mono"> = ?</span>
          </div>

          {/* Mode A: Multiple Choice Options */}
          {inputMode === 'choice' && activeQuestionItem.options && (
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {activeQuestionItem.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                let btnStyle = 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700';

                if (isSelected && feedback === 'correct') {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-400 scale-102';
                } else if (isSelected && feedback === 'incorrect') {
                  btnStyle = 'bg-rose-600 text-white border-rose-400';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSubmit(option, idx)}
                    disabled={feedback !== 'idle'}
                    className={`h-16 text-xl sm:text-2xl font-bold rounded-2xl border-2 transition-all shadow-md font-mono ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode B: Direct Typing */}
          {inputMode === 'direct' && (
            <div className="max-w-xs mx-auto space-y-3">
              <input
                type="text"
                autoFocus
                value={directInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                  setDirectInput(val);
                  if (activeQuestionItem && val === String(activeQuestionItem.answer)) {
                    handleAnswerSubmit(Number(val));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && directInput) {
                    handleAnswerSubmit(Number(directInput));
                  }
                }}
                disabled={feedback === 'correct'}
                placeholder="Type answer..."
                className={`w-full text-center text-3xl font-mono font-bold py-3 bg-slate-800 border-2 rounded-2xl text-white outline-none transition-all ${
                  feedback === 'incorrect'
                    ? 'border-rose-500 bg-rose-950/20'
                    : feedback === 'correct'
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-slate-600 focus:border-indigo-500'
                }`}
              />
              <Button
                variant="primary"
                className="w-full"
                disabled={!directInput || feedback !== 'idle'}
                onClick={() => handleAnswerSubmit(Number(directInput))}
              >
                Submit Answer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
