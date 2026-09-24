import React, { useState, useEffect } from 'react';
import { useProgression } from '../progression/progressionStore';
import { tableMasteryStore } from '../tables/logic/tableMasteryStore';
import { StorageManager } from '../../core/storage/storageRepository';
import { DailyChallengeRecord } from '../../core/storage/types';
import { DashboardHeroCards } from './components/DashboardHeroCards';
import { DailyChallengeCard } from './components/DailyChallengeCard';
import { WeaknessWatchlist } from './components/WeaknessWatchlist';
import { TableMasteryHeatmap } from './components/TableMasteryHeatmap';
import { AchievementShowcase } from './components/AchievementShowcase';
import { getTodayDateString } from '../daily/DailyChallengeFeature';

interface ProgressDashboardProps {
  onPracticeWeakness?: () => void;
  onPlayDaily?: () => void;
  onPracticeTable?: (tableNumber: number) => void;
  onDrillFact?: (factId: string) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  onPracticeWeakness,
  onPlayDaily,
  onPracticeTable,
  onDrillFact,
}) => {
  const { profile, levelProgress, getAchievements } = useProgression();
  const [factStats, setFactStats] = useState(() => tableMasteryStore.getAllFactStats());
  const [weakFacts, setWeakFacts] = useState(() => tableMasteryStore.getWeakFacts(8));
  const [dailyRecord, setDailyRecord] = useState<DailyChallengeRecord | null>(null);

  const todayStr = getTodayDateString();

  useEffect(() => {
    // Subscribe to table mastery updates
    const unsub = tableMasteryStore.subscribe(() => {
      setFactStats(tableMasteryStore.getAllFactStats());
      setWeakFacts(tableMasteryStore.getWeakFacts(8));
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Load daily challenge record
    StorageManager.getRepository().then((repo) => {
      repo.getDailyChallenge(todayStr).then((rec) => {
        setDailyRecord(rec);
      });
    });
  }, [todayStr]);

  const accuracyPct =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.totalCorrectAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;

  const achievements = getAchievements();

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-6">
      {/* 1. Hero Summary Metrics & Level Progress Banner */}
      <DashboardHeroCards
        todayQuestions={profile.totalQuestionsAnswered}
        accuracyPercentage={accuracyPct}
        averageResponseTimeMs={profile.fastestResponseTimeMs || 2200}
        currentStreak={profile.currentStreak}
        bestStreak={profile.bestStreak}
        totalXp={profile.xp}
        levelProgress={levelProgress}
      />

      {/* 2 & 3. Seeded Daily Challenge Card & Weakness Watchlist (Responsive 2-col on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <DailyChallengeCard
          record={dailyRecord}
          currentStreak={profile.currentStreak}
          onPlayDaily={onPlayDaily}
        />

        <WeaknessWatchlist
          weakFacts={weakFacts}
          onPracticeWeakness={onPracticeWeakness}
          onDrillFact={onDrillFact}
        />
      </div>

      {/* 4. Interactive 10x10 Table Mastery Heatmap */}
      <TableMasteryHeatmap
        factStats={factStats}
        onPracticeTable={onPracticeTable}
        onDrillFact={onDrillFact}
      />

      {/* 5. Achievement Badges Showcase */}
      <AchievementShowcase achievements={achievements} />
    </div>
  );
};
