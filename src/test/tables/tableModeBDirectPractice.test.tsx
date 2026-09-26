import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTablePractice } from '../../features/tables/hooks/useTablePractice';
import { tableMasteryStore } from '../../features/tables/logic/tableMasteryStore';
import { ProgressionStore } from '../../features/progression/progressionStore';
import { buildWeaknessTableQuestionQueue } from '../../features/tables/logic/tableQuestionBuilder';

describe('Table Practice Mode B Direct Typing & Weakness Practice Requirements', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    ProgressionStore.getInstance().reset();
    tableMasteryStore.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // CASE 1:
  // 14 × 9 = 126
  // Type 125 -> wrong recorded -> same question
  // Type 126 -> correct -> next question
  it('CASE 1: 14 × 9 = 126, typing 125 records wrong attempt, stays on same question; typing 126 advances to next', () => {
    const { result } = renderHook(() => useTablePractice());

    act(() => {
      result.current.startPractice({
        selectedTables: [14],
        multiplierRange: { min: 9, max: 9 },
        questionTarget: 2,
        inputMode: 'direct',
      });
    });

    const q0 = result.current.currentQuestion!;
    expect(q0.table).toBe(14);
    expect(q0.multiplier).toBe(9);
    expect(q0.answer).toBe(126);
    expect(result.current.currentIndex).toBe(0);

    // Type 125 (Wrong Answer)
    act(() => {
      result.current.handleInputChange('125');
    });

    // Check wrong answer feedback
    expect(result.current.inputFeedback).toBe('incorrect');
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentQuestion?.id).toBe(q0.id);

    // Auto-clear runs at 400ms: input clears, remains on same question
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.inputValue).toBe('');
    expect(result.current.inputFeedback).toBe('idle');

    // Type 126 (Correct Answer)
    act(() => {
      result.current.handleInputChange('126');
    });

    expect(result.current.inputFeedback).toBe('correct');

    // After 350ms pedagogical advance, moves to next question
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  // CASE 2:
  // Type 125
  // Type 124
  // Type 129
  // Type 126
  // -> 3 wrong attempts recorded
  // -> one eventual correct answer
  // -> next question
  it('CASE 2: Multiple wrong attempts (125, 124, 129) records 3 wrong attempts, preserves same question, and advances on 126', () => {
    const { result } = renderHook(() => useTablePractice());

    act(() => {
      result.current.startPractice({
        selectedTables: [14],
        multiplierRange: { min: 9, max: 9 },
        questionTarget: 1,
        inputMode: 'direct',
      });
    });

    const q0 = result.current.currentQuestion!;
    expect(q0.answer).toBe(126);

    // Attempt 1: 125
    act(() => {
      result.current.handleInputChange('125');
    });
    expect(result.current.inputFeedback).toBe('incorrect');
    expect(result.current.currentIndex).toBe(0);
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Attempt 2: 124
    act(() => {
      result.current.handleInputChange('124');
    });
    expect(result.current.inputFeedback).toBe('incorrect');
    expect(result.current.currentIndex).toBe(0);
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Attempt 3: 129
    act(() => {
      result.current.handleInputChange('129');
    });
    expect(result.current.inputFeedback).toBe('incorrect');
    expect(result.current.currentIndex).toBe(0);
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Attempt 4: 126 (Correct)
    act(() => {
      result.current.handleInputChange('126');
    });
    expect(result.current.inputFeedback).toBe('correct');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Finished single-question session, check summary
    expect(result.current.status).toBe('SUMMARY');
    const summary = result.current.summary!;
    expect(summary.totalQuestions).toBe(1);
    expect(summary.totalWrongAttempts).toBe(3);
    expect(summary.eventuallyCorrectCount).toBe(1);
    expect(summary.correctFirstTryCount).toBe(0);
    expect(summary.accuracyPercentage).toBe(0); // 0 first try out of 1

    // Question 14x9 must be flagged as a weakness with 3 wrong attempts
    expect(summary.weakQuestions?.length).toBe(1);
    const weakQ = summary.weakQuestions![0];
    expect(weakQ.wrongAttempts).toBe(3);
    expect(weakQ.mistakeAnswers).toEqual([125, 124, 129]);
    expect(weakQ.eventuallyCorrect).toBe(true);
  });

  // CASE 3:
  // Answer everything correctly quickly
  // -> no unnecessary weakness questions
  it('CASE 3: Answering all questions correctly and quickly yields no weakness questions', () => {
    const { result } = renderHook(() => useTablePractice());

    act(() => {
      result.current.startPractice({
        selectedTables: [7],
        multiplierRange: { min: 1, max: 3 },
        questionTarget: 3,
        inputMode: 'direct',
      });
    });

    // Answer 3 questions quickly (e.g. 1.2s each)
    for (let i = 0; i < 3; i++) {
      const q = result.current.currentQuestion!;
      act(() => {
        vi.advanceTimersByTime(1200);
        result.current.handleInputChange(String(q.answer));
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });
    }

    expect(result.current.status).toBe('SUMMARY');
    const summary = result.current.summary!;
    expect(summary.accuracyPercentage).toBe(100);
    expect(summary.totalWrongAttempts).toBe(0);
    expect(summary.slowQuestionsCount).toBe(0);
    expect(summary.weakQuestions?.length).toBe(0);
  });

  // CASE 4:
  // Take significantly longer on several questions
  // -> those questions appear in Practice Weakness
  it('CASE 4: Questions with significantly longer response times are detected as slow weaknesses', () => {
    const { result } = renderHook(() => useTablePractice());

    act(() => {
      result.current.startPractice({
        selectedTables: [7],
        multiplierRange: { min: 1, max: 5 },
        questionTarget: 4,
        inputMode: 'direct',
      });
    });

    // Q0: normal speed (1500ms)
    act(() => {
      vi.advanceTimersByTime(1500);
      result.current.handleInputChange(String(result.current.currentQuestion!.answer));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Q1: normal speed (1800ms)
    act(() => {
      vi.advanceTimersByTime(1800);
      result.current.handleInputChange(String(result.current.currentQuestion!.answer));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Q2: normal speed (1600ms)
    act(() => {
      vi.advanceTimersByTime(1600);
      result.current.handleInputChange(String(result.current.currentQuestion!.answer));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Q3: SIGNIFICANTLY SLOW (9000ms / 9 seconds)
    const slowFactId = result.current.currentQuestion!.factId;
    act(() => {
      vi.advanceTimersByTime(9000);
      result.current.handleInputChange(String(result.current.currentQuestion!.answer));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.status).toBe('SUMMARY');
    const summary = result.current.summary!;
    expect(summary.slowQuestionsCount).toBeGreaterThanOrEqual(1);
    expect(summary.weakQuestions?.length).toBeGreaterThanOrEqual(1);
    expect(summary.weakQuestions?.some((w) => w.factId === slowFactId && w.isSlow)).toBe(true);
  });

  // CASE 5:
  // Make mistakes on several questions
  // -> those questions appear in Practice Weakness
  it('CASE 5: Making mistakes on several questions correctly flags them as weakness candidates', () => {
    const { result } = renderHook(() => useTablePractice());

    act(() => {
      result.current.startPractice({
        selectedTables: [8],
        multiplierRange: { min: 1, max: 4 },
        questionTarget: 2,
        inputMode: 'direct',
      });
    });

    // Q0: Make 2 mistakes before answering correctly
    const q0 = result.current.currentQuestion!;
    act(() => {
      result.current.handleSubmit(String(q0.answer + 2));
    });
    act(() => {
      vi.advanceTimersByTime(400);
      result.current.handleSubmit(String(q0.answer + 3));
    });
    act(() => {
      vi.advanceTimersByTime(400);
      result.current.handleSubmit(String(q0.answer));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Q1: Answer clean
    const q1 = result.current.currentQuestion!;
    act(() => {
      vi.advanceTimersByTime(1500);
      result.current.handleSubmit(String(q1.answer));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.status).toBe('SUMMARY');
    const summary = result.current.summary!;
    expect(summary.totalWrongAttempts).toBe(2);
    expect(summary.weakQuestions?.length).toBe(1);
    expect(summary.weakQuestions![0].factId).toBe(q0.factId);
    expect(summary.weakQuestions![0].wrongAttempts).toBe(2);
  });

  // CASE 6:
  // Finish Table Practice -> XP increases
  // Refresh/reopen result -> XP must NOT be awarded again for the same completed session.
  it('CASE 6: Table Practice awards XP to ProgressionStore; deduplication prevents double-awarding', () => {
    const progStore = ProgressionStore.getInstance();
    const initialXp = progStore.getProfile().xp;

    const { result } = renderHook(() => useTablePractice());

    act(() => {
      result.current.startPractice({
        selectedTables: [5],
        multiplierRange: { min: 1, max: 2 },
        questionTarget: 2,
        inputMode: 'direct',
      });
    });

    // Answer both questions
    for (let i = 0; i < 2; i++) {
      const q = result.current.currentQuestion!;
      act(() => {
        result.current.handleSubmit(String(q.answer));
      });
      act(() => {
        vi.advanceTimersByTime(350);
      });
    }

    expect(result.current.status).toBe('SUMMARY');
    const afterSessionXp = progStore.getProfile().xp;
    const gainedXp = afterSessionXp - initialXp;

    expect(gainedXp).toBeGreaterThan(0);
    expect(result.current.summary?.totalXpGained).toBe(gainedXp);

    // Simulate reopening or calling recordTableSessionCompletion again with the same sessionId
    const dupResult = progStore.recordTableSessionCompletion({
      sessionId: result.current.summary!.sessionId!,
      totalQuestions: 2,
      correctFirstTryCount: 2,
      accuracyPercentage: 100,
      maxCombo: 2,
      totalXp: gainedXp,
    });

    expect(dupResult.awarded).toBe(false);
    expect(dupResult.xpEarned).toBe(0);
    expect(progStore.getProfile().xp).toBe(afterSessionXp);
  });

  // CASE 7:
  // Choose Practice Weakness -> 15 -> exactly 15 questions
  // Choose 30 -> exactly 30 questions
  // Choose 50 -> exactly 50 questions
  it('CASE 7: buildWeaknessTableQuestionQueue produces exact question counts (15, 30, 50) focused only on weak facts', () => {
    const mockWeakAttempts = [
      {
        questionId: 'q_1',
        factId: 'mul_14_9',
        question: {
          id: 'tbl_14_9',
          factId: 'mul_14_9',
          table: 14,
          multiplier: 9,
          operator: '*' as const,
          operandA: 14,
          operandB: 9,
          answer: 126,
          answerStr: '126',
          promptText: '14 × 9 = ?',
          displayOperator: '×',
          options: [126, 125, 136, 116],
          correctIndex: 0,
          difficulty: 'normal' as const,
          category: 'table' as const,
        },
        firstUserAnswer: 125,
        finalUserAnswer: 126,
        isCorrectFirstTry: false,
        totalAttempts: 3,
        mistakeAnswers: [125, 124],
        responseTimeMs: 2000,
        solveTimeMs: 6000,
        timestamp: Date.now(),
        wrongAttempts: 2,
        eventuallyCorrect: true,
        weaknessScore: 260,
      },
      {
        questionId: 'q_2',
        factId: 'mul_17_8',
        question: {
          id: 'tbl_17_8',
          factId: 'mul_17_8',
          table: 17,
          multiplier: 8,
          operator: '*' as const,
          operandA: 17,
          operandB: 8,
          answer: 136,
          answerStr: '136',
          promptText: '17 × 8 = ?',
          displayOperator: '×',
          options: [136, 135, 146, 126],
          correctIndex: 0,
          difficulty: 'normal' as const,
          category: 'table' as const,
        },
        firstUserAnswer: 136,
        finalUserAnswer: 136,
        isCorrectFirstTry: true,
        totalAttempts: 1,
        mistakeAnswers: [],
        responseTimeMs: 8000,
        solveTimeMs: 8000,
        timestamp: Date.now(),
        wrongAttempts: 0,
        eventuallyCorrect: true,
        isSlow: true,
        weaknessScore: 90,
      },
    ];

    // Test exactly 15 questions
    const queue15 = buildWeaknessTableQuestionQueue({
      weakAttempts: mockWeakAttempts,
      targetCount: 15,
      difficulty: 'normal',
    });
    expect(queue15.length).toBe(15);
    // Every question must ONLY be either 14×9 or 17×8 (no unrelated questions)
    expect(queue15.every((q) => (q.table === 14 && q.multiplier === 9) || (q.table === 17 && q.multiplier === 8))).toBe(true);

    // Test exactly 30 questions
    const queue30 = buildWeaknessTableQuestionQueue({
      weakAttempts: mockWeakAttempts,
      targetCount: 30,
      difficulty: 'normal',
    });
    expect(queue30.length).toBe(30);
    expect(queue30.every((q) => (q.table === 14 && q.multiplier === 9) || (q.table === 17 && q.multiplier === 8))).toBe(true);

    // Test exactly 50 questions
    const queue50 = buildWeaknessTableQuestionQueue({
      weakAttempts: mockWeakAttempts,
      targetCount: 50,
      difficulty: 'normal',
    });
    expect(queue50.length).toBe(50);
    expect(queue50.every((q) => (q.table === 14 && q.multiplier === 9) || (q.table === 17 && q.multiplier === 8))).toBe(true);
  });
});
