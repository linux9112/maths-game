import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TableQuestion,
  TableQuestionAttempt,
  TableSessionSummary,
  TableSessionStatus,
  TableConfig,
  TableMasteryReport,
} from '../types';
import { useTableConfig } from './useTableConfig';
import { buildTableQuestionQueue } from '../logic/tableQuestionBuilder';
import { tableMasteryStore } from '../logic/tableMasteryStore';
import { useAudio } from '../../../core/audio/useAudio';

export interface UseTablePracticeOptions {
  readonly initialConfig?: Partial<TableConfig>;
  readonly onSessionComplete?: (summary: TableSessionSummary) => void;
  readonly onXpEarned?: (xp: number) => void;
}

export function useTablePractice(options: UseTablePracticeOptions = {}) {
  const { onSessionComplete, onXpEarned } = options;
  const audio = useAudio();
  const tableConfigHook = useTableConfig();

  const [status, setStatus] = useState<TableSessionStatus>('CONFIGURING');
  const [activeLearnTable, setActiveLearnTable] = useState<number>(1);
  const [questions, setQuestions] = useState<TableQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentCombo, setCurrentCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [totalXp, setTotalXp] = useState<number>(0);
  const [summary, setSummary] = useState<TableSessionSummary | null>(null);

  // Mode A state
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  // Mode B state
  const [inputValue, setInputValue] = useState<string>('');
  const [inputFeedback, setInputFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [shakeKey, setShakeKey] = useState<number>(0);

  // Timing and tracking refs
  const questionStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const attemptsRef = useRef<TableQuestionAttempt[]>([]);
  const currentMistakesRef = useRef<number[]>([]);
  const isTransitioningRef = useRef<boolean>(false);
  const autoClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxComboRef = useRef<number>(0);
  const totalXpRef = useRef<number>(0);

  // Real-time mastery reports map
  const [masteryReports, setMasteryReports] = useState<Record<number, TableMasteryReport>>(() =>
    tableMasteryStore.getAllTableMasteries(
      100,
      tableConfigHook.config.multiplierRange.min,
      tableConfigHook.config.multiplierRange.max
    )
  );

  useEffect(() => {
    const unsub = tableMasteryStore.subscribe(() => {
      setMasteryReports(
        tableMasteryStore.getAllTableMasteries(
          100,
          tableConfigHook.config.multiplierRange.min,
          tableConfigHook.config.multiplierRange.max
        )
      );
    });
    return unsub;
  }, [tableConfigHook.config.multiplierRange]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const currentQuestion = questions[currentIndex] || null;

  // Advance to next question or complete session
  const finishSession = useCallback(() => {
    const totalQuestions = questions.length;
    const attempts = attemptsRef.current;
    const firstTryCorrect = attempts.filter((a) => a.isCorrectFirstTry).length;
    const accuracyPercentage = totalQuestions > 0 ? Math.round((firstTryCorrect / totalQuestions) * 100) : 0;
    const totalTime = attempts.reduce((acc, a) => acc + a.responseTimeMs, 0);
    const averageResponseTimeMs = attempts.length > 0 ? Math.round(totalTime / attempts.length) : 0;
    const elapsedTimeMs = Date.now() - sessionStartTimeRef.current;

    // Detect newly mastered tables
    const newlyMasteredTables: number[] = [];
    tableConfigHook.config.selectedTables.forEach((t) => {
      const rep = tableMasteryStore.getTableMastery(
        t,
        tableConfigHook.config.multiplierRange.min,
        tableConfigHook.config.multiplierRange.max
      );
      if (rep.masteryPercentage >= 90) {
        newlyMasteredTables.push(t);
      }
    });

    // Detect weak facts encountered
    const weakFactsEncountered: string[] = [];
    attempts.forEach((a) => {
      if (!a.isCorrectFirstTry) {
        weakFactsEncountered.push(a.factId);
      }
    });

    const sessionSummary: TableSessionSummary = {
      tableNumbers: [...tableConfigHook.config.selectedTables],
      totalQuestions,
      correctFirstTryCount: firstTryCorrect,
      accuracyPercentage,
      averageResponseTimeMs,
      maxCombo: maxComboRef.current,
      totalXpGained: totalXpRef.current,
      elapsedTimeMs,
      newlyMasteredTables,
      weakFactsEncountered,
    };

    setSummary(sessionSummary);
    setStatus('SUMMARY');
    onSessionComplete?.(sessionSummary);
  }, [questions.length, tableConfigHook.config, onSessionComplete]);

  const advanceQuestion = useCallback(() => {
    isTransitioningRef.current = false;
    setInputValue('');
    setInputFeedback('idle');
    setSelectedOptionIndex(null);
    setChoiceFeedback('idle');
    currentMistakesRef.current = [];

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((idx) => idx + 1);
      questionStartTimeRef.current = Date.now();
    } else {
      finishSession();
    }
  }, [currentIndex, questions.length, finishSession]);

  const startPractice = useCallback(
    (customConfig?: Partial<TableConfig>) => {
      if (customConfig) {
        if (customConfig.inputMode) tableConfigHook.setInputMode(customConfig.inputMode);
        if (customConfig.difficulty) tableConfigHook.setDifficulty(customConfig.difficulty);
        if (customConfig.questionTarget) tableConfigHook.setQuestionTarget(customConfig.questionTarget);
      }

      const activeConfig = { ...tableConfigHook.config, ...customConfig };
      const qQueue = buildTableQuestionQueue({
        selectedTables: activeConfig.selectedTables,
        multiplierRange: activeConfig.multiplierRange,
        questionCount: activeConfig.questionTarget,
        difficulty: activeConfig.difficulty,
      });

      setQuestions(qQueue);
      setCurrentIndex(0);
      setCurrentScore(0);
      setCurrentCombo(0);
      setMaxCombo(0);
      setTotalXp(0);
      maxComboRef.current = 0;
      totalXpRef.current = 0;
      setSummary(null);
      setSelectedOptionIndex(null);
      setChoiceFeedback('idle');
      setInputValue('');
      setInputFeedback('idle');
      attemptsRef.current = [];
      currentMistakesRef.current = [];
      isTransitioningRef.current = false;
      sessionStartTimeRef.current = Date.now();
      questionStartTimeRef.current = Date.now();
      setStatus('PRACTICING');
    },
    [tableConfigHook]
  );

  const startLearn = useCallback(
    (tableNum?: number) => {
      const targetTable = tableNum ?? tableConfigHook.config.selectedTables[0] ?? 1;
      setActiveLearnTable(targetTable);
      setStatus('LEARN');
    },
    [tableConfigHook.config.selectedTables]
  );

  const exitToConfig = useCallback(() => {
    if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    isTransitioningRef.current = false;
    setStatus('CONFIGURING');
  }, []);

  const restartSession = useCallback(() => {
    startPractice();
  }, [startPractice]);

  // Mode A: Multiple Choice Handler
  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion || choiceFeedback !== 'idle' || isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      const chosenVal = currentQuestion.options[optionIndex];
      const isCorrect = chosenVal === currentQuestion.answer;
      const responseTimeMs = Math.max(50, Date.now() - questionStartTimeRef.current);

      setSelectedOptionIndex(optionIndex);

      if (isCorrect) {
        setChoiceFeedback('correct');
        audio.playCorrect();

        const nextCombo = currentCombo + 1;
        setCurrentCombo(nextCombo);
        setMaxCombo((m) => {
          const nextMax = Math.max(m, nextCombo);
          maxComboRef.current = nextMax;
          return nextMax;
        });
        if (nextCombo >= 2) {
          audio.playCombo(nextCombo);
        }

        const baseScore = 100;
        const comboBonus = (nextCombo - 1) * 20;
        const speedBonus = responseTimeMs < 2000 ? 50 : 0;
        setCurrentScore((s) => s + baseScore + comboBonus + speedBonus);

        const xpEarned = 10 + (responseTimeMs < 2000 ? 5 : 0);
        setTotalXp((xp) => {
          const nextXp = xp + xpEarned;
          totalXpRef.current = nextXp;
          return nextXp;
        });
        onXpEarned?.(xpEarned);

        // Record attempt
        tableMasteryStore.recordAttempt(
          currentQuestion.factId,
          currentQuestion.table,
          currentQuestion.multiplier,
          true,
          responseTimeMs
        );

        attemptsRef.current.push({
          questionId: currentQuestion.id,
          factId: currentQuestion.factId,
          question: currentQuestion,
          firstUserAnswer: chosenVal,
          finalUserAnswer: chosenVal,
          isCorrectFirstTry: true,
          totalAttempts: 1,
          mistakeAnswers: [],
          responseTimeMs,
          solveTimeMs: responseTimeMs,
          timestamp: Date.now(),
        });

        advanceTimerRef.current = setTimeout(advanceQuestion, 350);
      } else {
        setChoiceFeedback('incorrect');
        audio.playIncorrect();
        setCurrentCombo(0);

        tableMasteryStore.recordAttempt(
          currentQuestion.factId,
          currentQuestion.table,
          currentQuestion.multiplier,
          false,
          responseTimeMs
        );

        attemptsRef.current.push({
          questionId: currentQuestion.id,
          factId: currentQuestion.factId,
          question: currentQuestion,
          firstUserAnswer: chosenVal,
          finalUserAnswer: chosenVal,
          isCorrectFirstTry: false,
          totalAttempts: 1,
          mistakeAnswers: [chosenVal],
          responseTimeMs,
          solveTimeMs: responseTimeMs,
          timestamp: Date.now(),
        });

        // 750ms pedagogical delay to absorb the correct option revealed in emerald
        advanceTimerRef.current = setTimeout(advanceQuestion, 750);
      }
    },
    [currentQuestion, choiceFeedback, currentCombo, audio, onXpEarned, advanceQuestion]
  );

  // Mode B: Direct Typing Submit / Instant Match
  const submitDirectAnswer = useCallback(
    (val: string) => {
      if (!currentQuestion || inputFeedback === 'correct' || isTransitioningRef.current) return;

      const trimmed = val.trim();
      if (!trimmed) return;

      const userNum = parseInt(trimmed, 10);
      if (isNaN(userNum)) return;

      const isCorrect = userNum === currentQuestion.answer;
      const responseTimeMs = Math.max(50, Date.now() - questionStartTimeRef.current);

      if (isCorrect) {
        isTransitioningRef.current = true;
        setInputFeedback('correct');
        audio.playCorrect();

        const isFirstTry = currentMistakesRef.current.length === 0;
        const nextCombo = isFirstTry ? currentCombo + 1 : 1;
        setCurrentCombo(nextCombo);
        setMaxCombo((m) => {
          const nextMax = Math.max(m, nextCombo);
          maxComboRef.current = nextMax;
          return nextMax;
        });
        if (nextCombo >= 2) {
          audio.playCombo(nextCombo);
        }

        const xpEarned = isFirstTry ? (responseTimeMs < 2000 ? 15 : 10) : 5;
        setTotalXp((xp) => {
          const nextXp = xp + xpEarned;
          totalXpRef.current = nextXp;
          return nextXp;
        });
        onXpEarned?.(xpEarned);

        tableMasteryStore.recordAttempt(
          currentQuestion.factId,
          currentQuestion.table,
          currentQuestion.multiplier,
          isFirstTry,
          responseTimeMs
        );

        attemptsRef.current.push({
          questionId: currentQuestion.id,
          factId: currentQuestion.factId,
          question: currentQuestion,
          firstUserAnswer: currentMistakesRef.current[0] ?? userNum,
          finalUserAnswer: userNum,
          isCorrectFirstTry: isFirstTry,
          totalAttempts: currentMistakesRef.current.length + 1,
          mistakeAnswers: [...currentMistakesRef.current],
          responseTimeMs,
          solveTimeMs: responseTimeMs,
          timestamp: Date.now(),
        });

        advanceTimerRef.current = setTimeout(advanceQuestion, 350);
      } else {
        // NON-ADVANCING MISTAKE LOCK
        setInputFeedback('incorrect');
        setShakeKey((k) => k + 1);
        audio.playIncorrect();
        setCurrentCombo(0);

        if (!currentMistakesRef.current.includes(userNum)) {
          currentMistakesRef.current.push(userNum);
        }

        // 400ms auto-clear: clear input and reset feedback to idle so user retries on same question
        if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
        autoClearTimerRef.current = setTimeout(() => {
          setInputValue('');
          setInputFeedback('idle');
        }, 400);
      }
    },
    [currentQuestion, inputFeedback, currentCombo, audio, onXpEarned, advanceQuestion]
  );

  const handleInputChange = useCallback(
    (nextVal: string) => {
      // Limit to 5 digits
      const sanitized = nextVal.replace(/[^0-9]/g, '').slice(0, 5);
      setInputValue(sanitized);

      // Instant exact match arcade flow
      if (currentQuestion && sanitized === currentQuestion.answer.toString()) {
        submitDirectAnswer(sanitized);
      }
    },
    [currentQuestion, submitDirectAnswer]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (inputFeedback !== 'idle' || isTransitioningRef.current) return;
      handleInputChange(inputValue + digit);
    },
    [inputValue, inputFeedback, handleInputChange]
  );

  const handleBackspace = useCallback(() => {
    if (inputFeedback !== 'idle' || isTransitioningRef.current) return;
    setInputValue((v) => v.slice(0, -1));
  }, [inputFeedback]);

  const handleClear = useCallback(() => {
    if (inputFeedback !== 'idle' || isTransitioningRef.current) return;
    setInputValue('');
  }, [inputFeedback]);

  const handleSubmit = useCallback(
    (explicitValue?: string) => {
      const valToSubmit = explicitValue !== undefined ? explicitValue : inputValue;
      submitDirectAnswer(valToSubmit);
    },
    [inputValue, submitDirectAnswer]
  );

  return {
    status,
    config: tableConfigHook.config,
    tableConfigHook,
    startPractice,
    startLearn,
    exitToConfig,
    restartSession,
    activeLearnTable,
    setActiveLearnTable,
    questions,
    currentIndex,
    currentQuestion,
    totalQuestions: questions.length,
    currentScore,
    currentCombo,
    maxCombo,
    totalXp,
    summary,
    selectedOptionIndex,
    choiceFeedback,
    handleSelectOption,
    inputValue,
    shakeKey,
    inputFeedback,
    handleInputChange,
    handleDigit,
    handleBackspace,
    handleClear,
    handleSubmit,
    setInputValue,
    masteryReports,
  };
}
