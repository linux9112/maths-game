import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameSummaryModal } from '../../features/games/core/GameSummaryModal';
import { GameSummaryData } from '../../features/games/core/types';

describe('GameSummaryModal', () => {
  const mockSummary: GameSummaryData = {
    gameId: 'test_game',
    gameTitle: 'Speed Blitz',
    status: 'VICTORY',
    score: 3450,
    performanceGrade: 'S',
    questionsAnswered: 25,
    questionsCorrectFirstTry: 25,
    accuracyPercentage: 100,
    elapsedTimeSec: 45,
    averageResponseTimeMs: 1800,
    maxCombo: 25,
    peakMultiplier: 2.25,
    totalXpEarned: 385,
    xpBreakdown: {
      baseXp: 250,
      comboBonusXp: 60,
      difficultyBonusXp: 0,
      speedBonusXp: 25,
      completionBonusXp: 50,
    },
    mistakeItems: [],
    completedAt: Date.now(),
  };

  it('renders victory outcome, performance grade S, score, accuracy, and XP', () => {
    render(
      <GameSummaryModal
        isOpen={true}
        gameTitle="Speed Blitz"
        summary={mockSummary}
        onPlayAgain={vi.fn()}
        onBackToArcade={vi.fn()}
      />
    );

    expect(screen.getByText('Round Victorious!')).toBeInTheDocument();
    expect(screen.getByText('Grade S')).toBeInTheDocument();
    expect(screen.getByText('3,450')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('+385 XP')).toBeInTheDocument();
    expect(screen.getByText(/Flawless precision/)).toBeInTheDocument();
  });

  it('renders mistake items and 1-click drill launcher when mistakes exist', () => {
    const summaryWithMistakes: GameSummaryData = {
      ...mockSummary,
      status: 'GAME_OVER',
      performanceGrade: 'C',
      accuracyPercentage: 80,
      mistakeItems: [
        {
          question: {
            id: 'mul_7_8',
            operator: '*',
            operandA: 7,
            operandB: 8,
            answer: 56,
            promptText: '7 × 8',
            displayOperator: '×',
            answerStr: '56',
            difficulty: 'normal',
            category: 'game',
          },
          userAnswer: 54,
          expectedAnswer: 56,
          responseTimeMs: 3200,
          solveTimeMs: 3200,
          timestamp: Date.now(),
          pedagogicalHint: 'Double twice: 7 × 2 = 14 → 28 → 56',
        },
      ],
    };

    const onPracticeMistakes = vi.fn();
    render(
      <GameSummaryModal
        isOpen={true}
        gameTitle="Speed Blitz"
        summary={summaryWithMistakes}
        onPlayAgain={vi.fn()}
        onBackToArcade={vi.fn()}
        onPracticeMistakes={onPracticeMistakes}
      />
    );

    expect(screen.getByText('Session Complete')).toBeInTheDocument();
    expect(screen.getByText('Grade C')).toBeInTheDocument();
    expect(screen.getByText('Missed Questions (1)')).toBeInTheDocument();
    expect(screen.getByText('7 × 8')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getByText(/Double twice/)).toBeInTheDocument();

    const drillBtn = screen.getByText('Practice Missed Facts');
    fireEvent.click(drillBtn);
    expect(onPracticeMistakes).toHaveBeenCalledWith(summaryWithMistakes.mistakeItems);
  });
});
