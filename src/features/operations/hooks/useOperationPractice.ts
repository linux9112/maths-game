import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MathOperator,
  SessionStatus,
  OperationSessionConfig,
  OperationQuestion,
  QuestionAttempt,
  OperationSessionSummary,
} from '../types';
import { generateSessionQuestions } from '../questionGeneratorBridge';
import { useAudio } from '../../../core/audio/useAudio';

export interface UseOperationPracticeOptions {
  initialConfig?: Partial<OperationSessionConfig>;
  onSessionComplete?: (summary: OperationSessionSummary) => void;
  onXpEarned?: (xp: number) => void;
}

export interface UseOperationPracticeReturn {
  // Session Status & Config
  status: SessionStatus;
  config: OperationSessionConfig;
  updateConfig: (patch: Partial<OperationSessionConfig>) => void;
  startSession: (customConfig?: Partial<OperationSessionConfig>) => void;
  resetSession: () => void;
  restartSession: () => void;

  // Active Practice State
  questions: OperationQuestion[];
  currentIndex: number;
  currentQuestion: OperationQuestion | null;
  totalQuestions: number;
  currentScore: number;
  currentCombo: number;
  maxCombo: number;
  totalXp: number;
  elapsedTimeMs: number;

  // Mode A (Multiple Choice)
  selectedOptionIndex: number | null;
  choiceFeedback: 'idle' | 'correct' | 'incorrect';
  handleSelectOption: (optionIndex: number) => void;

  // Mode B (Direct Typing)
  inputValue: string;
  shakeKey: number;
  inputFeedback: 'idle' | 'correct' | 'incorrect';
  handleDigit: (digit: string) => void;
  handleBackspace: () => void;
  handleClear: () => void;
  handleSubmit: (explicitValue?: string) => void;
  setInputValue: (val: string) => void;

  // Completion / Summary
  summary: OperationSessionSummary | null;
}

export function useOperationPractice(
  options: UseOperationPracticeOptions = {}
): UseOperationPracticeReturn {
  const audio = useAudio();

  // 1. Session Configuration
  const [config, setConfig] = useState<OperationSessionConfig>({
    selectedOperators: options.initialConfig?.selectedOperators ?? ['+'],
    level: options.initialConfig?.level ?? 1,
    inputMode: options.initialConfig?.inputMode ?? 'choice',
    questionCount: options.initialConfig?.questionCount ?? 10,
  });

  // 2. Status & Questions
  const [status, setStatus] = useState<SessionStatus>('CONFIGURING');
  const [questions, setQuestions] = useState<OperationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);

  // 3. Score, Combo, XP
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentCombo, setCurrentCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [totalXp, setTotalXp] = useState<number>(0);

  // 4. Timing
  const sessionStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  // 5. Mode A State
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  // 6. Mode B State
  const [inputValue, setInputValue] = useState<string>('');
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [inputFeedback, setInputFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const currentMistakesRef = useRef<number[]>([]);
  const isTransitioningRef = useRef<boolean>(false);

  // 7. Summary
  const [summary, setSummary] = useState<OperationSessionSummary | null>(null);

  // Helper to update config safely (guaranteeing at least 1 operator)
  const updateConfig = useCallback((patch: Partial<OperationSessionConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (next.selectedOperators.length === 0) {
        next.selectedOperators = ['+'];
      }
      return next;
    });
  }, []);

  // Timer interval for elapsed time during practice
  useEffect(() => {
    if (status !== 'PRACTICING') return;

    const timer = setInterval(() => {
      setElapsedTimeMs(Date.now() - sessionStartTimeRef.current);
    }, 250);

    return () => clearInterval(timer);
  }, [status]);

  // Start Session
  const startSession = useCallback(
    (customConfig?: Partial<OperationSessionConfig>) => {
      const activeConfig: OperationSessionConfig = {
        ...config,
        ...customConfig,
      };
      if (activeConfig.selectedOperators.length === 0) {
        activeConfig.selectedOperators = ['+'];
      }
      setConfig(activeConfig);

      const generated = generateSessionQuestions(activeConfig);
      setQuestions(generated);
      setCurrentIndex(0);
      setAttempts([]);
      setCurrentScore(0);
      setCurrentCombo(0);
      setMaxCombo(0);
      setTotalXp(0);
      setSummary(null);

      // Reset Inputs
      setSelectedOptionIndex(null);
      setChoiceFeedback('idle');
      setInputValue('');
      setInputFeedback('idle');
      currentMistakesRef.current = [];
      isTransitioningRef.current = false;

      // Timestamps
      const now = Date.now();
      sessionStartTimeRef.current = now;
      questionStartTimeRef.current = now;
      setElapsedTimeMs(0);

      setStatus('PRACTICING');
    },
    [config]
  );

  // Calculate session summary
  const finishSession = useCallback(
    (finalAttempts: QuestionAttempt[], finalXp: number, finalMaxCombo: number) => {
      const total = finalAttempts.length;
      const correctFirst = finalAttempts.filter((a) => a.isCorrectFirstTry).length;
      const accuracy = total > 0 ? Math.round((correctFirst / total) * 100) : 0;
      const avgResponse =
        total > 0
          ? Math.round(
              finalAttempts.reduce((acc, a) => acc + a.responseTimeMs, 0) / total
            )
          : 0;

      // Accuracy bonus
      let bonusXp = 0;
      if (accuracy === 100) bonusXp = 50;
      else if (accuracy >= 90) bonusXp = 25;
      else if (accuracy >= 80) bonusXp = 10;

      const grandTotalXp = finalXp + bonusXp;

      // Operator breakdown
      const breakdown: Record<MathOperator, { total: number; correct: number }> = {
        '+': { total: 0, correct: 0 },
        '-': { total: 0, correct: 0 },
        '*': { total: 0, correct: 0 },
        '/': { total: 0, correct: 0 },
      };
      for (const a of finalAttempts) {
        const op = a.question.operator;
        breakdown[op].total += 1;
        if (a.isCorrectFirstTry) breakdown[op].correct += 1;
      }

      const sessionSummary: OperationSessionSummary = {
        totalQuestions: total,
        correctFirstTryCount: correctFirst,
        accuracyPercentage: accuracy,
        averageResponseTimeMs: avgResponse,
        maxCombo: finalMaxCombo,
        totalXpGained: grandTotalXp,
        operatorBreakdown: breakdown,
        elapsedTimeMs: Date.now() - sessionStartTimeRef.current,
      };

      setSummary(sessionSummary);
      setStatus('SUMMARY');

      // Play completion fanfare
      if (accuracy >= 80) {
        audio.playVictory();
      } else {
        audio.playLevelUp();
      }

      options.onSessionComplete?.(sessionSummary);
      options.onXpEarned?.(grandTotalXp);
    },
    [audio, options]
  );

  // Advance to next question or complete
  const advanceQuestion = useCallback(
    (newAttempt: QuestionAttempt, updatedXp: number, _updatedCombo: number, updatedMaxCombo: number) => {
      const nextAttempts = [...attempts, newAttempt];
      setAttempts(nextAttempts);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        questionStartTimeRef.current = Date.now();
        setSelectedOptionIndex(null);
        setChoiceFeedback('idle');
        setInputValue('');
        setInputFeedback('idle');
        currentMistakesRef.current = [];
        isTransitioningRef.current = false;
      } else {
        finishSession(nextAttempts, updatedXp, updatedMaxCombo);
      }
    },
    [attempts, currentIndex, questions.length, finishSession]
  );

  // MODE A: Multiple Choice Selection Handler
  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (status !== 'PRACTICING' || isTransitioningRef.current) return;
      const q = questions[currentIndex];
      if (!q || optionIndex < 0 || optionIndex >= q.options.length) return;

      isTransitioningRef.current = true;
      setSelectedOptionIndex(optionIndex);

      const chosenVal = q.options[optionIndex];
      const isCorrect = chosenVal === q.answer;
      const responseTime = Date.now() - questionStartTimeRef.current;

      let nextCombo = currentCombo;
      let nextMaxCombo = maxCombo;
      let earnedXp = 0;

      if (isCorrect) {
        audio.playCorrect();
        setChoiceFeedback('correct');
        nextCombo = currentCombo + 1;
        nextMaxCombo = Math.max(maxCombo, nextCombo);
        setCurrentScore((s) => s + 1);

        if (nextCombo >= 2) {
          audio.playCombo(nextCombo);
        }

        // XP Calculation
        earnedXp = 10 + (q.level - 1) * 2;
        if (responseTime < 2000) earnedXp += 5; // Speed bonus
        if (nextCombo >= 5) earnedXp += 5;      // Streak bonus
        if (nextCombo >= 10) earnedXp += 10;
      } else {
        audio.playIncorrect();
        setChoiceFeedback('incorrect');
        nextCombo = 0;
      }

      setCurrentCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      const updatedXp = totalXp + earnedXp;
      setTotalXp(updatedXp);

      const attempt: QuestionAttempt = {
        questionId: q.id,
        question: q,
        firstUserAnswer: chosenVal,
        finalUserAnswer: chosenVal,
        isCorrectFirstTry: isCorrect,
        totalAttempts: 1,
        mistakeAnswers: isCorrect ? [] : [chosenVal],
        responseTimeMs: responseTime,
        solveTimeMs: responseTime,
        timestamp: Date.now(),
      };

      // Delay for pedagogical reinforcement
      const delayMs = isCorrect ? 350 : 750;
      setTimeout(() => {
        advanceQuestion(attempt, updatedXp, nextCombo, nextMaxCombo);
      }, delayMs);
    },
    [status, questions, currentIndex, currentCombo, maxCombo, totalXp, audio, advanceQuestion]
  );

  // MODE B: Direct Numeric Input Handlers
  const handleDigit = useCallback(
    (digit: string) => {
      if (status !== 'PRACTICING' || isTransitioningRef.current) return;
      if (inputValue.length < 7) {
        setInputValue((prev) => prev + digit);
      }
    },
    [status, inputValue.length]
  );

  const handleBackspace = useCallback(() => {
    if (status !== 'PRACTICING' || isTransitioningRef.current) return;
    setInputValue((prev) => prev.slice(0, -1));
  }, [status]);

  const handleClear = useCallback(() => {
    if (status !== 'PRACTICING' || isTransitioningRef.current) return;
    setInputValue('');
  }, [status]);

  const handleSubmit = useCallback(
    (explicitValue?: string) => {
      if (status !== 'PRACTICING' || isTransitioningRef.current) return;
      const targetStr = explicitValue !== undefined ? explicitValue : inputValue;
      if (targetStr.trim() === '') return;

      const q = questions[currentIndex];
      if (!q) return;

      const userNum = parseInt(targetStr.trim(), 10);
      if (isNaN(userNum)) return;

    const isFirstAttempt = currentMistakesRef.current.length === 0;
    const responseTime = Date.now() - questionStartTimeRef.current;

    if (userNum === q.answer) {
      // Correct!
      isTransitioningRef.current = true;
      audio.playCorrect();
      setInputFeedback('correct');

      let nextCombo = currentCombo;
      let nextMaxCombo = maxCombo;
      let earnedXp = 0;

      if (isFirstAttempt) {
        nextCombo = currentCombo + 1;
        nextMaxCombo = Math.max(maxCombo, nextCombo);
        setCurrentScore((s) => s + 1);

        if (nextCombo >= 2) {
          audio.playCombo(nextCombo);
        }

        earnedXp = 10 + (q.level - 1) * 2;
        if (responseTime < 2000) earnedXp += 5;
        if (nextCombo >= 5) earnedXp += 5;
      } else {
        // Solved after mistake
        earnedXp = 5; // Partial credit
      }

      setCurrentCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      const updatedXp = totalXp + earnedXp;
      setTotalXp(updatedXp);

      const attempt: QuestionAttempt = {
        questionId: q.id,
        question: q,
        firstUserAnswer: isFirstAttempt ? userNum : currentMistakesRef.current[0],
        finalUserAnswer: userNum,
        isCorrectFirstTry: isFirstAttempt,
        totalAttempts: currentMistakesRef.current.length + 1,
        mistakeAnswers: [...currentMistakesRef.current],
        responseTimeMs: responseTime,
        solveTimeMs: Date.now() - questionStartTimeRef.current,
        timestamp: Date.now(),
      };

      setTimeout(() => {
        advanceQuestion(attempt, updatedXp, nextCombo, nextMaxCombo);
      }, 350);
    } else {
      // Incorrect! Non-advancing mistake lock
      audio.playIncorrect();
      currentMistakesRef.current.push(userNum);
      setCurrentCombo(0); // reset streak
      setShakeKey((k) => k + 1);
      setInputFeedback('incorrect');

      // Auto-clear input after subtle feedback so user immediately retries on the SAME question
      setTimeout(() => {
        setInputValue('');
        setInputFeedback('idle');
      }, 400);
    }
  }, [
    status,
    inputValue,
    questions,
    currentIndex,
    currentCombo,
    maxCombo,
    totalXp,
    audio,
    advanceQuestion,
  ]);

  const resetSession = useCallback(() => {
    setStatus('CONFIGURING');
    setQuestions([]);
    setCurrentIndex(0);
    setAttempts([]);
    setSummary(null);
    setSelectedOptionIndex(null);
    setChoiceFeedback('idle');
    setInputValue('');
    setInputFeedback('idle');
    currentMistakesRef.current = [];
    isTransitioningRef.current = false;
  }, []);

  const restartSession = useCallback(() => {
    startSession(config);
  }, [startSession, config]);

  return {
    status,
    config,
    updateConfig,
    startSession,
    resetSession,
    restartSession,

    questions,
    currentIndex,
    currentQuestion: questions[currentIndex] || null,
    totalQuestions: questions.length,
    currentScore,
    currentCombo,
    maxCombo,
    totalXp,
    elapsedTimeMs,

    selectedOptionIndex,
    choiceFeedback,
    handleSelectOption,

    inputValue,
    shakeKey,
    inputFeedback,
    handleDigit,
    handleBackspace,
    handleClear,
    handleSubmit,
    setInputValue,

    summary,
  };
}
