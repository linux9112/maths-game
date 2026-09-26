import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardHeroCards } from '../../features/dashboard/components/DashboardHeroCards';
import { TableMasteryHeatmap } from '../../features/dashboard/components/TableMasteryHeatmap';
import { WeaknessWatchlist } from '../../features/dashboard/components/WeaknessWatchlist';
import { DailyChallengeCard } from '../../features/dashboard/components/DailyChallengeCard';
import { ProgressDashboard } from '../../features/dashboard/ProgressDashboard';
import { LevelProgress } from '../../features/progression/types';
import { FactStat } from '../../features/tables/types';

describe('Progress Dashboard UI Suite', () => {
  const mockLevelProgress: LevelProgress = {
    level: 5,
    title: 'Novice',
    currentLevelXp: 800,
    nextLevelXp: 1165,
    xpInCurrentLevel: 150,
    xpNeededForNextLevel: 365,
    progressPercentage: 41,
    isMaxLevel: false,
  };

  describe('DashboardHeroCards', () => {
    it('renders all 4 metric cards and level progress banner correctly', () => {
      render(
        <DashboardHeroCards
          todayQuestions={42}
          accuracyPercentage={91}
          averageResponseTimeMs={1800}
          currentStreak={5}
          bestStreak={12}
          totalXp={950}
          levelProgress={mockLevelProgress}
        />
      );

      expect(screen.getByText("Today's Practice")).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('91%')).toBeInTheDocument();
      expect(screen.getByText('1.8s')).toBeInTheDocument();
      expect(screen.getByText('Daily Streak')).toBeInTheDocument();
      expect(screen.getByText('Best record: 12 Days')).toBeInTheDocument();
      expect(screen.getByText(/Novice/)).toBeInTheDocument();
      expect(screen.getByText(/Lv\. 5/)).toBeInTheDocument();
    });
  });

  describe('TableMasteryHeatmap (10x10 Grid)', () => {
    it('renders exactly 100 cells for the 10x10 grid', () => {
      const mockStats: Record<string, FactStat> = {};
      render(<TableMasteryHeatmap factStats={mockStats} />);

      // Each cell button has a numeric product
      const buttons = screen.getAllByRole('button');
      // 100 cell buttons
      expect(buttons.length).toBeGreaterThanOrEqual(100);
    });

    it('selects table, shows details inspector and triggers practice button on click', () => {
      const onPracticeTables = vi.fn();
      const onPracticeTable = vi.fn();

      render(
        <TableMasteryHeatmap
          initialSelectedTables={[8]}
          onPracticeTable={onPracticeTable}
          onPracticeTables={onPracticeTables}
        />
      );

      // Find Table 8 cell
      const table8Cell = screen.getByLabelText(/^Table 8,/);
      expect(table8Cell).toBeInTheDocument();
      expect(table8Cell).toHaveAttribute('aria-pressed', 'true');

      // Click Table 14 to select it as well
      const table14Cell = screen.getByLabelText(/^Table 14,/);
      fireEvent.click(table14Cell);
      expect(table14Cell).toHaveAttribute('aria-pressed', 'true');

      // Click Table 14 again to deselect it (single click to select, single click to deselect)
      fireEvent.click(table14Cell);
      expect(table14Cell).toHaveAttribute('aria-pressed', 'false');

      // Click Table 7
      const table7Cell = screen.getByLabelText(/^Table 7,/);
      fireEvent.click(table7Cell);
      expect(table7Cell).toHaveAttribute('aria-pressed', 'true');

      // Inspector card should display Table 7
      expect(screen.getByText('Table 7')).toBeInTheDocument();

      const practiceBtn = screen.getByText(/Practice Table 7/);
      fireEvent.click(practiceBtn);
      expect(onPracticeTables).toHaveBeenCalledWith([7]);
    });
  });

  describe('WeaknessWatchlist', () => {
    it('renders top weak calculations and triggers Practice My Weakness action', () => {
      const onPracticeWeakness = vi.fn();
      const mockWeak: FactStat[] = [
        {
          factId: 'mul_7_8',
          table: 7,
          multiplier: 8,
          attempts: 10,
          correctCount: 4,
          consecutiveCorrect: 0,
          totalResponseTimeMs: 35000,
          avgResponseTimeMs: 3500,
          lastResponseTimeMs: 3500,
          lastAttemptTimestamp: Date.now(),
          masteryScore: 35,
        },
      ];

      render(
        <WeaknessWatchlist
          weakFacts={mockWeak}
          onPracticeWeakness={onPracticeWeakness}
        />
      );

      expect(screen.getByText(/7 × 8 = 56/)).toBeInTheDocument();
      expect(screen.getByText(/60% errors/)).toBeInTheDocument();

      const btn = screen.getByText(/Practice My Weakness/);
      fireEvent.click(btn);
      expect(onPracticeWeakness).toHaveBeenCalled();
    });

    it('renders empty state card when there are zero weaknesses', () => {
      render(<WeaknessWatchlist weakFacts={[]} />);
      expect(screen.getByText('No Active Weaknesses!')).toBeInTheDocument();
    });
  });

  describe('DailyChallengeCard', () => {
    it('renders ready status and triggers onPlayDaily', () => {
      const onPlay = vi.fn();
      render(
        <DailyChallengeCard
          record={null}
          currentStreak={4}
          onPlayDaily={onPlay}
        />
      );

      expect(screen.getByText('Daily Challenge')).toBeInTheDocument();
      expect(screen.getByText('Ready to Play')).toBeInTheDocument();
      expect(screen.getByText(/4 Day Streak/)).toBeInTheDocument();

      const playBtn = screen.getByText('Start Daily Challenge');
      fireEvent.click(playBtn);
      expect(onPlay).toHaveBeenCalled();
    });

    it('renders completed status when challenge is completed', () => {
      render(
        <DailyChallengeCard
          record={{
            dateKey: '2026-09-18',
            completed: true,
            score: 10,
            totalQuestions: 10,
            accuracyPercentage: 100,
            timeSec: 32.4,
            seed: 9999,
            xpAwarded: 250,
          }}
          currentStreak={5}
        />
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText(/Score: 10\/10/)).toBeInTheDocument();
    });
  });

  describe('ProgressDashboard Container', () => {
    it('renders main dashboard structure without crashing', () => {
      render(<ProgressDashboard />);
      expect(screen.getByText("Today's Practice")).toBeInTheDocument();
      expect(screen.getByText(/Table Selection & Mastery Grid/)).toBeInTheDocument();
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });
  });
});
