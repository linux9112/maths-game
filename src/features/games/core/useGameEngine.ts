import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Question } from '../../../core/math/types';
import { CalculationAttempt } from '../../../core/storage/types';
import { StorageManager } from '../../../core/storage/storageRepository';
import { ProgressionStore } from '../../progression/progressionStore';
import { useAudio } from '../../../core/audio/useAudio';
import {
  GameConfig,
  GameLifecycleStatus,
  GameState,
  GameSummaryData,
  GameMistakeItem,
  PerformanceGrade,
  UseGameEngineOptions,
  GameDifficulty,
} from './types';
import { generateCalculationHint } from './calculationHint';
import { generateGameQuestion, mapGameDiffToTier } from '../shared/gameQuestionGenerator';

const DEFAULT_CONFIG: GameConfig = {
  gameId: 'generic_game',
  title: 'Math Arcade',
  category: 'Speed',
  selectedOperators: ['+', '-', '*', '/'],
  difficulty: 'normal',
  targetLength: 25,
  timeLimitSec: 60,
  mistakeLimit: 3,
  isStressFree: false,
  inputMode: 'choice',
};

function getDifficultyMultiplier(difficulty: GameDifficulty): number {
  switch (difficulty) {
    case 'beginner': return 1.0;
    case 'normal': return 1.25;
    case 'hard': return 1.5;
    case 'expert': return 1.75;
    case 'extreme': return 2.0;
    default: return 1.0;
  }
}

export function useGameEngine(options: UseGameEngineOptions = {}) {
  const audio = useAudio();

  // 1. Game Configuration
  const [config, setConfig] = useState<GameConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...options.initialConfig,
  }));

  // 2. Lifecycle Status
  const [status, setStatus] = useState<GameLifecycleStatus>('IDLE');
  const [countdownValue, setCountdownValue] = useState<number>(3);

  // 3. Question & Progression
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [questionsCorrectFirstTry, setQuestionsCorrectFirstTry] = useState<number>(0);

  // 4. Score, Combo, XP
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [totalXpEarned, setTotalXpEarned] = useState<number>(0);
  const [xpBreakdown, setXpBreakdown] = useState({
    baseXp: 0,
    comboBonusXp: 0,
    difficultyBonusXp: 0,
    speedBonusXp: 0,
    completionBonusXp: 0,
  });

  // 5. Health & Time
  const [livesRemaining, setLivesRemaining] = useState<number | null>(() =>
    config.isStressFree ? null : config.mistakeLimit
  );
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number | null>(() =>
    config.isStressFree ? null : config.timeLimitSec
  );

  // 6. Mistakes & Telemetry
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [mistakeItems, setMistakeItems] = useState<GameMistakeItem[]>([]);
  const attemptsRef = useRef<CalculationAttempt[]>([]);
  const [summaryData, setSummaryData] = useState<GameSummaryData | null>(null);

  // 7. Feedback & Hint
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);

  // 8. Timing & Transition References
  const questionStartTimeRef = useRef<number>(0);
  const isQuestionFirstTryRef = useRef<boolean>(true);
  const pauseStartTimeRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  // Score multiplier: 1 + floor(combo / 5) * 0.25 (capped at 2.5)
  const scoreMultiplier = useMemo(() => {
    const raw = 1 + Math.floor(combo / 5) * 0.25;
    return Math.min(2.5, Math.round(raw * 100) / 100);
  }, [combo]);

  const targetQuestions = config.targetLength === 'endless' ? null : config.targetLength;

  // Next Question Generator
  const generateNextQuestion = useCallback(
    (cfg: GameConfig, index: number): Question => {
      if (options.customQuestionGenerator) {
        return options.customQuestionGenerator(cfg, index);
      }
      return generateGameQuestion(cfg, index);
    },
    [options]
  );

  // Compile Summary Data
  const compileSummary = useCallback(
    (finalStatus: 'GAME_OVER' | 'VICTORY'): GameSummaryData => {
      const answered = questionsAnswered;
      const correct = questionsCorrectFirstTry;
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
      const avgRt =
        attemptsRef.current.length > 0
          ? Math.round(
              attemptsRef.current.reduce((sum, a) => sum + a.responseTimeMs, 0) /
                attemptsRef.current.length
            )
          : 0;

      let grade: PerformanceGrade = 'C';
      if (accuracy === 100 && maxCombo >= 10) {
        grade = 'S';
      } else if (accuracy >= 90) {
        grade = 'A';
      } else if (accuracy >= 80) {
        grade = 'B';
      } else {
        grade = 'C';
      }

      // Final completion XP bonuses
      let completionBonus = 0;
      if (finalStatus === 'VICTORY') {
        completionBonus += 25;
      }
      if (accuracy === 100 && answered >= 10) {
        completionBonus += 50;
      }
      if (completionBonus > 0) {
        ProgressionStore.getInstance().addXp(completionBonus);
      }

      const totalXp = totalXpEarned + completionBonus;

      const summary: GameSummaryData = {
        gameId: config.gameId,
        gameTitle: config.title,
        status: finalStatus,
        score,
        performanceGrade: grade,
        questionsAnswered: answered,
        questionsCorrectFirstTry: correct,
        accuracyPercentage: accuracy,
        elapsedTimeSec,
        averageResponseTimeMs: avgRt,
        maxCombo,
        peakMultiplier: Math.min(2.5, 1 + Math.floor(maxCombo / 5) * 0.25),
        totalXpEarned: totalXp,
        xpBreakdown: {
          ...xpBreakdown,
          completionBonusXp: xpBreakdown.completionBonusXp + completionBonus,
        },
        mistakeItems,
        completedAt: Date.now(),
      };

      return summary;
    },
    [
      questionsAnswered,
      questionsCorrectFirstTry,
      maxCombo,
      score,
      elapsedTimeSec,
      totalXpEarned,
      xpBreakdown,
      mistakeItems,
      config.gameId,
      config.title,
    ]
  );

  // Terminate Game (Game Over or Victory)
  const terminateGame = useCallback(
    (finalStatus: 'GAME_OVER' | 'VICTORY') => {
      setStatus(finalStatus);
      const summary = compileSummary(finalStatus);
      setSummaryData(summary);

      if (finalStatus === 'VICTORY') {
        if (summary.accuracyPercentage >= 80) {
          audio.playVictory();
        } else {
          audio.playLevelUp();
        }
        options.onVictory?.(summary);
      } else {
        audio.playGameOver();
        options.onGameOver?.(summary);
      }
    },
    [compileSummary, audio, options]
  );

  // Countdown Loop
  useEffect(() => {
    if (status !== 'COUNTDOWN') return;

    if (countdownValue > 0) {
      audio.playTick(false);
      const timer = setTimeout(() => {
        setCountdownValue((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      audio.playTick(true);
      const startTimer = setTimeout(() => {
        setStatus('PLAYING');
        questionStartTimeRef.current = Date.now();
      }, 600);
      return () => clearTimeout(startTimer);
    }
  }, [status, countdownValue, audio]);

  // Playing Elapsed & Remaining Timers Loop (100ms precision)
  useEffect(() => {
    if (status !== 'PLAYING') return;

    const interval = setInterval(() => {
      setElapsedTimeSec((prev) => prev + 1);

      if (!config.isStressFree && config.timeLimitSec !== null) {
        setTimeRemainingSec((prev) => {
          if (prev === null) return null;
          const next = prev - 1;
          if (next <= 5 && next > 0) {
            audio.playTick(false);
          }
          if (next <= 0) {
            clearInterval(interval);
            setTimeout(() => terminateGame('GAME_OVER'), 0);
            return 0;
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, config.isStressFree, config.timeLimitSec, terminateGame, audio]);

  // Start Game with given config
  const startGame = useCallback(
    (newConfig?: GameConfig) => {
      const activeConfig = newConfig ?? config;
      setConfig(activeConfig);
      setStatus('COUNTDOWN');
      setCountdownValue(3);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setTotalXpEarned(0);
      setXpBreakdown({
        baseXp: 0,
        comboBonusXp: 0,
        difficultyBonusXp: 0,
        speedBonusXp: 0,
        completionBonusXp: 0,
      });
      setMistakeCount(0);
      setMistakeItems([]);
      attemptsRef.current = [];
      setSummaryData(null);
      setElapsedTimeSec(0);
      setTimeRemainingSec(activeConfig.isStressFree ? null : activeConfig.timeLimitSec);
      setLivesRemaining(activeConfig.isStressFree ? null : activeConfig.mistakeLimit);
      setQuestionsAnswered(0);
      setQuestionsCorrectFirstTry(0);
      setQuestionIndex(0);
      setFeedback('idle');
      setHintActive(false);
      setCurrentHint(null);
      isQuestionFirstTryRef.current = true;

      const firstQ = generateNextQuestion(activeConfig, 0);
      setCurrentQuestion(firstQ);
      questionStartTimeRef.current = Date.now();
      isTransitioningRef.current = false;
    },
    [config, generateNextQuestion]
  );

  // Submit Answer
  const submitAnswer = useCallback(
    (userAnswer: number | string) => {
      if (status !== 'PLAYING' || !currentQuestion || isTransitioningRef.current) return;

      const now = Date.now();
      const responseTimeMs = Math.max(50, now - questionStartTimeRef.current);
      const isCorrect = Number(userAnswer) === Number(currentQuestion.answer);

      // Record Telemetry Attempt
      const attempt: CalculationAttempt = {
        factId: currentQuestion.id.split('_').slice(0, 3).join('_'),
        operator: currentQuestion.operator,
        operandA: currentQuestion.operandA,
        operandB: currentQuestion.operandB,
        expectedAnswer: currentQuestion.answer,
        userAnswer: Number(userAnswer),
        isCorrect,
        responseTimeMs,
        solveTimeMs: responseTimeMs,
        timestamp: now,
        mode: 'game',
        difficulty: mapGameDiffToTier(config.difficulty),
        inputMode: config.inputMode,
      };

      attemptsRef.current.push(attempt);
      StorageManager.getRepository().then((repo) => {
        repo.recordAttempt(attempt).catch(() => {});
      }).catch(() => {});

      if (isCorrect) {
        audio.playCorrect();
        const isFirstTry = isQuestionFirstTryRef.current;
        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxCombo((prev) => Math.max(prev, newCombo));

        if (newCombo >= 2) {
          audio.playCombo(newCombo);
        }

        // Points
        const diffMultiplier = getDifficultyMultiplier(config.difficulty);
        const speedScoreBonus = responseTimeMs < 1000 ? 25 : 0;
        const earnedPoints = Math.round(100 * diffMultiplier * scoreMultiplier) + speedScoreBonus;
        setScore((prev) => prev + earnedPoints);

        // XP Calculation
        const baseXp = isFirstTry ? 10 : 5;
        const comboBonus = Math.round(baseXp * (scoreMultiplier - 1));
        const diffBonus = Math.round(baseXp * (diffMultiplier - 1));
        const speedBonus = responseTimeMs < 1500 ? 5 : responseTimeMs < 2500 ? 2 : 0;
        const questionXp = baseXp + comboBonus + diffBonus + speedBonus;

        ProgressionStore.getInstance().addXp(questionXp);
        setTotalXpEarned((prev) => prev + questionXp);
        setXpBreakdown((prev) => ({
          baseXp: prev.baseXp + baseXp,
          comboBonusXp: prev.comboBonusXp + comboBonus,
          difficultyBonusXp: prev.difficultyBonusXp + diffBonus,
          speedBonusXp: prev.speedBonusXp + speedBonus,
          completionBonusXp: prev.completionBonusXp,
        }));

        setQuestionsAnswered((prev) => prev + 1);
        if (isFirstTry) {
          setQuestionsCorrectFirstTry((prev) => prev + 1);
        }

        setFeedback('correct');

        // Check Victory Condition
        const nextAnswered = questionsAnswered + 1;
        if (targetQuestions !== null && nextAnswered >= targetQuestions) {
          isTransitioningRef.current = true;
          setTimeout(() => {
            terminateGame('VICTORY');
          }, 400);
          return;
        }

        // Advance to Next Question
        isTransitioningRef.current = true;
        setTimeout(() => {
          setFeedback('idle');
          setHintActive(false);
          setCurrentHint(null);
          isQuestionFirstTryRef.current = true;
          const nextIndex = questionIndex + 1;
          setQuestionIndex(nextIndex);
          const nextQ = generateNextQuestion(config, nextIndex);
          setCurrentQuestion(nextQ);
          questionStartTimeRef.current = Date.now();
          isTransitioningRef.current = false;
        }, 350);
      } else {
        // Incorrect Answer
        audio.playIncorrect();
        setCombo(0);
        setFeedback('incorrect');
        setShakeKey((prev) => prev + 1);

        const hint = generateCalculationHint({
          operator: currentQuestion.operator,
          operandA: currentQuestion.operandA,
          operandB: currentQuestion.operandB,
          answer: currentQuestion.answer,
        });

        const mistakeItem: GameMistakeItem = {
          question: currentQuestion,
          userAnswer,
          expectedAnswer: currentQuestion.answer,
          responseTimeMs,
          solveTimeMs: responseTimeMs,
          timestamp: now,
          pedagogicalHint: hint,
        };

        setMistakeItems((prev) => [...prev, mistakeItem]);
        setMistakeCount((prev) => prev + 1);
        isQuestionFirstTryRef.current = false;

        if (config.isStressFree) {
          // Stress-free: hint pops up, can retry
          setCurrentHint(hint);
          setHintActive(true);
        } else {
          // Standard / Survival: deduct life
          audio.playWarning();
          if (livesRemaining !== null) {
            const nextLives = livesRemaining - 1;
            setLivesRemaining(nextLives);
            if (nextLives <= 0) {
              isTransitioningRef.current = true;
              setTimeout(() => {
                terminateGame('GAME_OVER');
              }, 400);
              return;
            }
          }

          // Advance to next question in standard mode
          setQuestionsAnswered((prev) => prev + 1);
          const nextAnswered = questionsAnswered + 1;
          if (targetQuestions !== null && nextAnswered >= targetQuestions) {
            isTransitioningRef.current = true;
            setTimeout(() => {
              terminateGame('VICTORY');
            }, 400);
            return;
          }

          isTransitioningRef.current = true;
          setTimeout(() => {
            setFeedback('idle');
            setHintActive(false);
            setCurrentHint(null);
            isQuestionFirstTryRef.current = true;
            const nextIndex = questionIndex + 1;
            setQuestionIndex(nextIndex);
            const nextQ = generateNextQuestion(config, nextIndex);
            setCurrentQuestion(nextQ);
            questionStartTimeRef.current = Date.now();
            isTransitioningRef.current = false;
          }, 450);
        }
      }
    },
    [
      status,
      currentQuestion,
      config,
      combo,
      scoreMultiplier,
      targetQuestions,
      questionsAnswered,
      questionIndex,
      livesRemaining,
      generateNextQuestion,
      terminateGame,
      audio,
    ]
  );

  // Request Pedagogical Hint (Stress-Free Mode)
  const requestHint = useCallback(() => {
    if (!currentQuestion) return;
    const hint = generateCalculationHint({
      operator: currentQuestion.operator,
      operandA: currentQuestion.operandA,
      operandB: currentQuestion.operandB,
      answer: currentQuestion.answer,
    });
    setCurrentHint(hint);
    setHintActive(true);
  }, [currentQuestion]);

  // Lifecycle Controls
  const openPreFlight = useCallback(() => {
    setStatus('PRE_FLIGHT');
  }, []);

  const closePreFlight = useCallback(() => {
    if (status === 'PRE_FLIGHT') {
      setStatus('IDLE');
    }
  }, [status]);

  const pause = useCallback(() => {
    if (status === 'PLAYING') {
      setStatus('PAUSED');
      pauseStartTimeRef.current = Date.now();
    }
  }, [status]);

  const resume = useCallback(() => {
    if (status === 'PAUSED') {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      questionStartTimeRef.current += pauseDuration;
      setStatus('PLAYING');
    }
  }, [status]);

  const restart = useCallback(() => {
    startGame(config);
  }, [startGame, config]);

  const forfeit = useCallback(() => {
    terminateGame('GAME_OVER');
  }, [terminateGame]);

  const updateConfig = useCallback((newConfig: Partial<GameConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
  }, []);

  const addTimeSec = useCallback((seconds: number) => {
    setTimeRemainingSec((prev) => (prev !== null ? Math.min(prev + seconds, 180) : null));
  }, []);

  // Keyboard shortcut listener: ESC to pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (status === 'PLAYING') {
          pause();
        } else if (status === 'PAUSED') {
          resume();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, pause, resume]);

  const state: GameState = {
    status,
    countdownValue,
    currentQuestion,
    questionIndex,
    questionsAnswered,
    questionsCorrectFirstTry,
    targetQuestions,
    score,
    combo,
    maxCombo,
    scoreMultiplier,
    livesRemaining,
    maxLives: config.isStressFree ? null : config.mistakeLimit,
    elapsedTimeSec,
    timeRemainingSec,
    initialTimeLimitSec: config.isStressFree ? null : config.timeLimitSec,
    mistakeCount,
    mistakeItems,
    attempts: attemptsRef.current,
    totalXpEarned,
    isStressFree: config.isStressFree,
    hintActive,
    currentHint,
    feedback,
    shakeKey,
  };

  return {
    state,
    config,
    summaryData,
    openPreFlight,
    closePreFlight,
    startGame,
    submitAnswer,
    addTimeSec,
    requestHint,
    pause,
    resume,
    restart,
    forfeit,
    updateConfig,
    audio,
  };
}

export type UseGameEngineReturn = ReturnType<typeof useGameEngine>;

