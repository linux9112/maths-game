import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Flame,
  Clock,
  CheckCircle2,
  Share2,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAudio } from '../../core/audio/useAudio';
import { Button } from '../../components/common/Button';
import { StorageManager } from '../../core/storage/storageRepository';
import { ProgressionStore } from '../progression/progressionStore';
import {
  generateDailyChallenge,
  calculateDailyStreak,
  generateDailyScorecard,
} from './dailyChallengeBuilder';
import { DailyChallengeQuestion } from './types';
import { DailyChallengeRecord } from '../../core/storage/types';

interface DailyChallengeFeatureProps {
  onBackToDashboard?: () => void;
}

export function getTodayDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DailyChallengeFeature: React.FC<DailyChallengeFeatureProps> = ({
  onBackToDashboard,
}) => {
  const audio = useAudio();
  const todayStr = getTodayDateString();

  const [record, setRecord] = useState<DailyChallengeRecord | null>(null);
  const [questions, setQuestions] = useState<DailyChallengeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [status, setStatus] = useState<'loading' | 'unplayed' | 'playing' | 'completed'>('loading');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [directInput, setDirectInput] = useState('');
  const [inputMode, setInputMode] = useState<'choice' | 'direct'>('choice');
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());

  // Load daily record or initialize
  useEffect(() => {
    async function loadData() {
      const challenge = generateDailyChallenge(todayStr);
      setQuestions([...challenge.questions]);

      const repo = await StorageManager.getRepository();
      const existing = await repo.getDailyChallenge(todayStr);
      const profile = await repo.getUserProfile();
      setStreak(profile.currentStreak || 1);

      if (existing && existing.completed) {
        setRecord(existing);
        setStatus('completed');
      } else {
        setStatus('unplayed');
      }
    }
    loadData();
  }, [todayStr]);

  const startChallenge = useCallback(() => {
    setStatus('playing');
    setCurrentIndex(0);
    setResults([]);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((Date.now() - startTimeRef.current) / 1000);
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const finishChallenge = useCallback(
    async (finalResults: boolean[]) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const totalTimeSec = (Date.now() - startTimeRef.current) / 1000;
      const score = finalResults.filter(Boolean).length;
      const accuracyPercentage = Math.round((score / 10) * 100);

      // Audio & Confetti
      audio.playVictory();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
        });
      } catch {
        // Safe if canvas-confetti fails in jsdom
      }

      // Record in ProgressionStore & Dexie
      const repo = await StorageManager.getRepository();
      const profile = await repo.getUserProfile();

      const streakResult = calculateDailyStreak(
        profile.lastActiveDate,
        todayStr,
        profile.currentStreak,
        profile.bestStreak
      );

      const challengeRecord: DailyChallengeRecord = {
        dateKey: todayStr,
        completed: true,
        score,
        totalQuestions: 10,
        accuracyPercentage,
        timeSec: Math.round(totalTimeSec * 10) / 10,
        seed: generateDailyChallenge(todayStr).seed,
        xpAwarded: score * 10 + (score === 10 ? 150 : 100),
        completedAt: Date.now(),
        questionResults: finalResults,
      };

      await repo.saveDailyChallenge(challengeRecord);
      await repo.saveUserProfile({
        currentStreak: streakResult.nextStreak,
        bestStreak: streakResult.nextBestStreak,
        lastActiveDate: todayStr,
      });

      ProgressionStore.getInstance().recordDailyChallengeCompletion({
        score,
        totalQuestions: 10,
        timeSec: totalTimeSec,
        accuracyPercentage,
      });

      setStreak(streakResult.nextStreak);
      setRecord(challengeRecord);
      setStatus('completed');
    },
    [todayStr, audio]
  );

  const handleAnswer = useCallback(
    (userAnswer: number, choiceIndex?: number) => {
      if (feedback !== 'idle' || !questions[currentIndex]) return;

      const currentQ = questions[currentIndex];
      const isCorrect = userAnswer === currentQ.answer;

      if (choiceIndex !== undefined) {
        setSelectedOption(choiceIndex);
      }

      if (isCorrect) {
        setFeedback('correct');
        audio.playCorrect();
      } else {
        setFeedback('incorrect');
        audio.playIncorrect();
      }

      const nextResults = [...results, isCorrect];
      setResults(nextResults);

      setTimeout(() => {
        setFeedback('idle');
        setSelectedOption(null);
        setDirectInput('');

        if (currentIndex + 1 < questions.length) {
          setCurrentIndex((idx) => idx + 1);
          questionStartTimeRef.current = Date.now();
        } else {
          finishChallenge(nextResults);
        }
      }, 400);
    },
    [feedback, questions, currentIndex, results, audio, finishChallenge]
  );

  const handleShare = () => {
    if (!record) return;
    const card = generateDailyScorecard({
      dateKey: record.dateKey,
      score: record.score,
      totalQuestions: record.totalQuestions,
      timeSec: record.timeSec,
      streak,
      questionResults: record.questionResults,
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(card).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto w-full px-2.5 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl border border-slate-700/60 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Daily Challenge</h1>
            <p className="text-xs text-slate-400">{todayStr}</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 font-semibold text-sm">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>{streak} Day Streak</span>
          </div>

          {onBackToDashboard && (
            <Button size="sm" variant="ghost" onClick={onBackToDashboard}>
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Unplayed Landing State */}
      {status === 'unplayed' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
          <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <Sparkles className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Today's Daily Challenge</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
              10 standardized arithmetic questions (+, −, ×, ÷) generated for all players worldwide today.
              Complete to build your daily streak!
            </p>
          </div>

          <div className="flex justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 10 Questions
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> Timed Run
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Streak Protection
            </span>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="lg" onClick={startChallenge}>
              Start Daily Challenge <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Playing Active View */}
      {status === 'playing' && currentQ && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-center">
          {/* Progress Strip & Timer */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-1.5">
              {questions.map((_, i) => {
                const isPast = i < results.length;
                const isCurrent = i === currentIndex;
                const isCorrect = results[i] === true;

                let dotClass = 'bg-slate-800 border-slate-700';
                if (isPast) {
                  dotClass = isCorrect
                    ? 'bg-emerald-500 border-emerald-400'
                    : 'bg-rose-500 border-rose-400';
                } else if (isCurrent) {
                  dotClass = 'bg-indigo-500 border-indigo-400 animate-pulse';
                }

                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${dotClass}`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-purple-400 font-mono font-bold">
              <Clock className="w-4 h-4" />
              <span>{elapsedSeconds.toFixed(1)}s</span>
            </div>
          </div>

          {/* Equation Prompt */}
          <div className="py-8">
            <span className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-mono">
              {currentQ.operandA} {currentQ.displayOperator} {currentQ.operandB}
            </span>
            <span className="text-4xl sm:text-6xl font-extrabold text-indigo-400 font-mono"> = ?</span>
          </div>

          {/* Mode A: Multiple Choice Options */}
          {inputMode === 'choice' && currentQ.options && (
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                let btnStyle = 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700';

                if (isSelected && feedback === 'correct') {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-400';
                } else if (isSelected && feedback === 'incorrect') {
                  btnStyle = 'bg-rose-600 text-white border-rose-400';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option, idx)}
                    disabled={feedback !== 'idle'}
                    className={`h-16 text-2xl font-bold rounded-2xl border-2 transition-all shadow-md font-mono ${btnStyle}`}
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
                  if (currentQ && val === String(currentQ.answer)) {
                    handleAnswer(Number(val));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && directInput) {
                    handleAnswer(Number(directInput));
                  }
                }}
                disabled={feedback !== 'idle'}
                placeholder="Type answer..."
                className="w-full text-center text-3xl font-mono font-bold py-3 bg-slate-800 border-2 border-slate-600 focus:border-indigo-500 rounded-2xl text-white outline-none transition-all"
              />
              <Button
                variant="primary"
                className="w-full"
                disabled={!directInput || feedback !== 'idle'}
                onClick={() => handleAnswer(Number(directInput))}
              >
                Submit Answer
              </Button>
            </div>
          )}

          {/* Input Mode Switcher */}
          <div className="pt-2">
            <button
              onClick={() => setInputMode(inputMode === 'choice' ? 'direct' : 'choice')}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Switch to {inputMode === 'choice' ? 'Direct Typing' : 'Multiple Choice'}
            </button>
          </div>
        </div>
      )}

      {/* Completed State & Scorecard */}
      {status === 'completed' && record && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="inline-flex p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <Sparkles className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Daily Challenge Completed!</h2>
            <p className="text-slate-400 text-sm mt-1">
              {record.dateKey} • {record.score}/{record.totalQuestions} Correct ({record.accuracyPercentage}%)
            </p>
          </div>

          {/* Stat Badges */}
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 block">Score</span>
              <span className="text-xl font-bold text-white font-mono">{record.score}/10</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 block">Time</span>
              <span className="text-xl font-bold text-purple-400 font-mono">{record.timeSec.toFixed(1)}s</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-400 block">Streak</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{streak}d 🔥</span>
            </div>
          </div>

          {/* Emoji Grid Preview */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 max-w-xs mx-auto text-sm font-mono space-y-1 text-left">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Scorecard:</div>
            <div>
              {(record.questionResults ?? results).slice(0, 2).map((r) => (r ? '🟩' : '🟥'))}{' '}
              <span className="text-slate-300">➕ Addition</span>
            </div>
            <div>
              {(record.questionResults ?? results).slice(2, 4).map((r) => (r ? '🟩' : '🟥'))}{' '}
              <span className="text-slate-300">➖ Subtraction</span>
            </div>
            <div>
              {(record.questionResults ?? results).slice(4, 7).map((r) => (r ? '🟩' : '🟥'))}{' '}
              <span className="text-slate-300">✖️ Multiplication</span>
            </div>
            <div>
              {(record.questionResults ?? results).slice(7, 10).map((r) => (r ? '🟩' : '🟥'))}{' '}
              <span className="text-slate-300">➗ Division</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button variant="primary" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1.5" />
              {copied ? 'Copied to Clipboard!' : 'Share Scorecard'}
            </Button>
            <Button variant="outline" onClick={startChallenge}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Practice Again (Unranked)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
