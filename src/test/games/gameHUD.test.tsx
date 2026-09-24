import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameHUD } from '../../features/games/core/GameHUD';
import { GameState, GameConfig } from '../../features/games/core/types';

describe('GameHUD', () => {
  const mockConfig: GameConfig = {
    gameId: 'test_game',
    title: 'Speed Blitz',
    category: 'Speed',
    selectedOperators: ['+'],
    difficulty: 'normal',
    targetLength: 25,
    timeLimitSec: 60,
    mistakeLimit: 3,
    isStressFree: false,
    inputMode: 'choice',
  };

  const mockState: GameState = {
    status: 'PLAYING',
    countdownValue: 0,
    currentQuestion: null,
    questionIndex: 5,
    questionsAnswered: 5,
    questionsCorrectFirstTry: 5,
    targetQuestions: 25,
    score: 1250,
    combo: 5,
    maxCombo: 5,
    scoreMultiplier: 1.25,
    livesRemaining: 3,
    maxLives: 3,
    elapsedTimeSec: 20,
    timeRemainingSec: 40,
    initialTimeLimitSec: 60,
    mistakeCount: 0,
    mistakeItems: [],
    attempts: [],
    totalXpEarned: 120,
    isStressFree: false,
    hintActive: false,
    currentHint: null,
    feedback: 'idle',
    shakeKey: 0,
  };

  it('renders title, score, combo badge, and progress accurately', () => {
    render(
      <GameHUD
        state={mockState}
        config={mockConfig}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onForfeit={vi.fn()}
      />
    );

    expect(screen.getByText('Speed Blitz')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('5 / 25')).toBeInTheDocument();
    expect(screen.getByText('(1.25x)')).toBeInTheDocument();
  });

  it('calls onPause when pause button is clicked', () => {
    const onPause = vi.fn();
    render(
      <GameHUD
        state={mockState}
        config={mockConfig}
        onPause={onPause}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onForfeit={vi.fn()}
      />
    );

    const pauseBtn = screen.getByLabelText('Pause Game');
    fireEvent.click(pauseBtn);
    expect(onPause).toHaveBeenCalled();
  });

  it('renders pause modal overlay with resume and restart buttons when PAUSED', () => {
    const pausedState: GameState = { ...mockState, status: 'PAUSED' };
    const onResume = vi.fn();
    const onRestart = vi.fn();

    render(
      <GameHUD
        state={pausedState}
        config={mockConfig}
        onPause={vi.fn()}
        onResume={onResume}
        onRestart={onRestart}
        onForfeit={vi.fn()}
      />
    );

    expect(screen.getByText('Game Paused')).toBeInTheDocument();
    const resumeBtn = screen.getByText('Resume Game');
    fireEvent.click(resumeBtn);
    expect(onResume).toHaveBeenCalled();

    const restartBtn = screen.getByText('Restart Round');
    fireEvent.click(restartBtn);
    expect(onRestart).toHaveBeenCalled();
  });
});
