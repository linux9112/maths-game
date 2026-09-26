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
import {
  buildTableQuestionQueue,
  buildWeaknessTableQuestionQueue,
} from '../logic/tableQuestionBuilder';
import { tableMasteryStore } from '../logic/tableMasteryStore';
import {
  isAttemptSlow,
  calculateSessionWeaknessScore,
} from '../logic/tableMasteryCalculator';
import { ProgressionStore } from '../../progression/progressionStore';
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
  const firstAnswerTimeRef = useRef<number | null>(null);
  const currentWrongAttemptsRef = useRef<number>(0);
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

    // 1. Calculate baseline time for user in this session
    const firstTryTimes = attempts
      .filter((a) => a.isCorrectFirstTry)
      .map((a) => a.solveTimeMs)
      .sort((a, b) => a - b);

    const medianFirstTryTime =
      firstTryTimes.length >= 3
        ? firstTryTimes[Math.floor(firstTryTimes.length / 2)]
        : tableConfigHook.config.selectedTables.some((t) => t > 12)
        ? 3500
        : 2500;

    // 2. Identify slow and weak questions with priority scores
    const processedAttempts: TableQuestionAttempt[] = attempts.map((a) => {
      const isSlow = isAttemptSlow(
        a.solveTimeMs,
        medianFirstTryTime,
        a.question.table,
        a.question.multiplier
      );
      const hist = tableMasteryStore.getFactStat(a.factId);
      const weaknessScore = calculateSessionWeaknessScore(
        { ...a, isSlow },
        medianFirstTryTime,
        hist
      );
      return {
        ...a,
        isSlow,
        weaknessScore,
      };
    });
    attemptsRef.current = processedAttempts;

    // 3. Filter weak questions (wrong attempts OR slow OR both) sorted by weaknessScore descending
    const weakQuestions = processedAttempts
      .filter((a) => (a.wrongAttempts !== undefined && a.wrongAttempts > 0) || !a.isCorrectFirstTry || a.isSlow)
      .sort((a, b) => (b.weaknessScore ?? 0) - (a.weaknessScore ?? 0));

    const firstTryCorrect = processedAttempts.filter((a) => a.isCorrectFirstTry).length;
    const eventuallyCorrectCount = processedAttempts.filter((a) => a.eventuallyCorrect).length;
    const totalWrongAttempts = processedAttempts.reduce(
      (acc, a) => acc + (a.wrongAttempts ?? (a.isCorrectFirstTry ? 0 : 1)),
      0
    );
    const slowQuestionsCount = processedAttempts.filter((a) => a.isSlow).length;
    const accuracyPercentage = totalQuestions > 0 ? Math.round((firstTryCorrect / totalQuestions) * 100) : 0;
    const totalTime = processedAttempts.reduce((acc, a) => acc + a.solveTimeMs, 0);
    const averageResponseTimeMs = processedAttempts.length > 0 ? Math.round(totalTime / processedAttempts.length) : 0;
    const elapsedTimeMs = Date.now() - sessionStartTimeRef.current;

    // 4. Session XP earned
    const sessionTotalXp = totalXpRef.current;

    // 5. Award XP to ProgressionStore with deduplicated session ID
    const sessionId = `tbl_session_${sessionStartTimeRef.current}_${totalQuestions}`;
    const fastestRt = Math.min(...processedAttempts.map((a) => a.solveTimeMs));

    ProgressionStore.getInstance().recordTableSessionCompletion({
      sessionId,
      totalQuestions,
      correctFirstTryCount: firstTryCorrect,
      accuracyPercentage,
      maxCombo: maxComboRef.current,
      totalXp: sessionTotalXp,
      fastestResponseTimeMs: isFinite(fastestRt) && fastestRt > 0 ? fastestRt : undefined,
    });
    onXpEarned?.(sessionTotalXp);

    // 6. Persist full session record for longitudinal tracking
    try {
      const SESSIONS_STORAGE_KEY = 'math_table_sessions_v1';
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.push({
        sessionId,
        mode: tableConfigHook.config.inputMode,
        selectedTables: [...tableConfigHook.config.selectedTables],
        totalQuestions,
        correctFirstTryCount: firstTryCorrect,
        eventuallyCorrectCount,
        totalWrongAttempts,
        slowQuestionsCount,
        accuracyPercentage,
        averageResponseTimeMs,
        elapsedTimeMs,
        maxCombo: maxComboRef.current,
        totalXpGained: sessionTotalXp,
        completedAt: Date.now(),
        weakQuestionsCount: weakQuestions.length,
      });
      if (list.length > 30) list.shift();
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(list));
    } catch {}

    // 7. Detect newly mastered tables
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

    const sessionSummary: TableSessionSummary = {
      sessionId,
      tableNumbers: [...tableConfigHook.config.selectedTables],
      totalQuestions,
      correctFirstTryCount: firstTryCorrect,
      eventuallyCorrectCount,
      totalWrongAttempts,
      slowQuestionsCount,
      accuracyPercentage,
      averageResponseTimeMs,
      maxCombo: maxComboRef.current,
      totalXpGained: sessionTotalXp,
      elapsedTimeMs,
      newlyMasteredTables,
      weakFactsEncountered: weakQuestions.map((w) => w.factId),
      weakQuestions,
    };

    setSummary(sessionSummary);
    setStatus('SUMMARY');
    onSessionComplete?.(sessionSummary);
  }, [questions.length, tableConfigHook.config, onSessionComplete, onXpEarned]);

  const advanceQuestion = useCallback(() => {
    isTransitioningRef.current = false;
    setInputValue('');
    setInputFeedback('idle');
    setSelectedOptionIndex(null);
    setChoiceFeedback('idle');
    currentMistakesRef.current = [];
    currentWrongAttemptsRef.current = 0;
    firstAnswerTimeRef.current = null;

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
        if (customConfig.selectedTables && customConfig.selectedTables.length > 0) {
          tableConfigHook.setSelectedTables([...customConfig.selectedTables]);
        }
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
      currentWrongAttemptsRef.current = 0;
      firstAnswerTimeRef.current = null;
      isTransitioningRef.current = false;
      sessionStartTimeRef.current = Date.now();
      questionStartTimeRef.current = Date.now();
      setStatus('PRACTICING');
    },
    [tableConfigHook]
  );

  /**
   * Starts a focused Weakness Practice session containing ONLY the weak calculations identified
   * with the exact question count selected (15, 30, or 50).
   */
  const startWeaknessPractice = useCallback(
    (targetCount: number = 15) => {
      if (!summary || !summary.weakQuestions || summary.weakQuestions.length === 0) return;

      const qQueue = buildWeaknessTableQuestionQueue({
        weakAttempts: summary.weakQuestions,
        targetCount,
        difficulty: tableConfigHook.config.difficulty,
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
      currentWrongAttemptsRef.current = 0;
      firstAnswerTimeRef.current = null;
      isTransitioningRef.current = false;
      sessionStartTimeRef.current = Date.now();
      questionStartTimeRef.current = Date.now();
      setStatus('PRACTICING');
    },
    [summary, tableConfigHook.config.difficulty]
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
          eventuallyCorrect: true,
          wrongAttempts: 0,
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
          eventuallyCorrect: false,
          wrongAttempts: 1,
          totalAttempts: 1,
          mistakeAnswers: [chosenVal],
          responseTimeMs,
          solveTimeMs: responseTimeMs,
          timestamp: Date.now(),
        });

        advanceTimerRef.current = setTimeout(advanceQuestion, 750);
      }
    },
    [currentQuestion, choiceFeedback, currentCombo, audio, advanceQuestion]
  );

  // Mode B: Direct Typing Submit Handler
  const submitDirectAnswer = useCallback(
    (val: string) => {
      if (!currentQuestion || inputFeedback === 'correct' || isTransitioningRef.current) return;

      const trimmed = val.trim();
      if (!trimmed) return;

      const userNum = parseInt(trimmed, 10);
      if (isNaN(userNum)) return;

      const now = Date.now();
      const responseTimeMs = Math.max(50, now - questionStartTimeRef.current);
      if (firstAnswerTimeRef.current === null) {
        firstAnswerTimeRef.current = responseTimeMs;
      }

      const isCorrect = userNum === currentQuestion.answer;

      if (isCorrect) {
        isTransitioningRef.current = true;
        setInputFeedback('correct');
        audio.playCorrect();

        const wrongCount = currentWrongAttemptsRef.current;
        const isFirstTry = wrongCount === 0;

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
          eventuallyCorrect: true,
          wrongAttempts: wrongCount,
          totalAttempts: wrongCount + 1,
          mistakeAnswers: [...currentMistakesRef.current],
          responseTimeMs: firstAnswerTimeRef.current ?? responseTimeMs,
          solveTimeMs: responseTimeMs,
          timestamp: now,
        });

        advanceTimerRef.current = setTimeout(advanceQuestion, 350);
      } else {
        // NON-ADVANCING MISTAKE LOCK: Wrong answer counts as wrong and user stays on the same question
        currentWrongAttemptsRef.current += 1;
        currentMistakesRef.current.push(userNum);

        setInputFeedback('incorrect');
        setShakeKey((k) => k + 1);
        audio.playIncorrect();
        setCurrentCombo(0);

        // Auto-clear after 400ms so user can easily re-type without getting stuck
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
      // If previous attempt showed incorrect, clear the timer and reset feedback so typing is immediate
      if (inputFeedback === 'incorrect') {
        if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
        setInputFeedback('idle');
      }

      // Limit to 5 digits
      const sanitized = nextVal.replace(/[^0-9]/g, '').slice(0, 5);
      setInputValue(sanitized);

      if (!currentQuestion) return;

      const targetLen = currentQuestion.answer.toString().length;

      // Auto-evaluate when full length of answer is typed (similar for 2 digit ans or more)
      if (sanitized.length >= targetLen) {
        submitDirectAnswer(sanitized);
      }
    },
    [currentQuestion, inputFeedback, submitDirectAnswer]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isTransitioningRef.current || inputFeedback === 'correct') return;
      if (inputFeedback === 'incorrect') {
        if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
        setInputFeedback('idle');
        handleInputChange(digit);
        return;
      }
      handleInputChange(inputValue + digit);
    },
    [inputValue, inputFeedback, handleInputChange]
  );

  const handleBackspace = useCallback(() => {
    if (isTransitioningRef.current || inputFeedback === 'correct') return;
    if (inputFeedback === 'incorrect') {
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
      setInputFeedback('idle');
      setInputValue('');
      return;
    }
    setInputValue((v) => v.slice(0, -1));
  }, [inputFeedback]);

  const handleClear = useCallback(() => {
    if (isTransitioningRef.current || inputFeedback === 'correct') return;
    if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    setInputFeedback('idle');
    setInputValue('');
  }, []);

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
    startWeaknessPractice,
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
