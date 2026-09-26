import { useState, useEffect } from 'react';
import { DifficultyTier } from '../../core/math/types';
import {
  UserProfile,
  LevelProgress,
  Achievement,
} from './types';
import {
  getLevelFromXp,
  getTitleForLevel,
  getLevelProgress,
  calculateQuestionXp,
  getLocalDateKey,
  getDayDifference,
  evaluateAchievements,
} from './progressionEngine';
import { StorageManager } from '../../core/storage/storageRepository';

const LOCAL_STORAGE_KEY = 'math_user_profile_v1';

export function createInitialProfile(id = 'player_1'): UserProfile {
  return {
    id,
    xp: 0,
    level: 1,
    levelTitle: 'Beginner',
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDateKey: null,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    fastestResponseTimeMs: 0,
    unlockedAchievements: [],
    dailyChallengesCompleted: 0,
    dailyChallengesFlawless: 0,
  };
}

export class ProgressionStore {
  private static instance: ProgressionStore;
  private state: UserProfile;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.state = this.loadFromLocalStorage();
    this.syncFromRepository();
  }

  public static getInstance(): ProgressionStore {
    if (!ProgressionStore.instance) {
      ProgressionStore.instance = new ProgressionStore();
    }
    return ProgressionStore.instance;
  }

  private loadFromLocalStorage(): UserProfile {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...createInitialProfile(),
            ...parsed,
          };
        }
      }
    } catch {
      // Safe fallback
    }
    return createInitialProfile();
  }

  private saveState(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Safe storage
    }

    // Background sync to Dexie
    StorageManager.getRepository().then((repo) => {
      repo.saveUserProfile({
        id: this.state.id,
        xp: this.state.xp,
        level: this.state.level,
        title: this.state.levelTitle,
        currentStreak: this.state.currentStreak,
        bestStreak: this.state.bestStreak,
        lastActiveDate: this.state.lastActiveDateKey || '',
        totalQuestionsAnswered: this.state.totalQuestionsAnswered,
        totalCorrect: this.state.totalCorrectAnswers,
        unlockedAchievements: [...this.state.unlockedAchievements],
      }).catch(() => {});
    }).catch(() => {});

    this.notifyListeners();
  }

  private async syncFromRepository(): Promise<void> {
    try {
      const repo = await StorageManager.getRepository();
      const dbProfile = await repo.getUserProfile();
      if (dbProfile && dbProfile.xp > this.state.xp) {
        this.state = {
          ...this.state,
          xp: dbProfile.xp,
          level: dbProfile.level,
          levelTitle: getTitleForLevel(dbProfile.level),
          currentStreak: Math.max(this.state.currentStreak, dbProfile.currentStreak),
          bestStreak: Math.max(this.state.bestStreak, dbProfile.bestStreak),
          totalQuestionsAnswered: Math.max(this.state.totalQuestionsAnswered, dbProfile.totalQuestionsAnswered),
          totalCorrectAnswers: Math.max(this.state.totalCorrectAnswers, dbProfile.totalCorrect),
          unlockedAchievements: Array.from(new Set([...this.state.unlockedAchievements, ...dbProfile.unlockedAchievements])),
        };
        this.saveState();
      }
    } catch {
      // Fallback
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in ProgressionStore listener:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getProfile(): UserProfile {
    return { ...this.state };
  }

  public getLevelProgress(): LevelProgress {
    return getLevelProgress(this.state.xp);
  }

  public getAchievements(extras?: { sessionMaxCombo?: number; latestResponseTimeMs?: number; hasTableMastered?: boolean }): Achievement[] {
    return evaluateAchievements(this.state, extras);
  }

  public addXp(amount: number): { newTotalXp: number; leveledUp: boolean; newLevel: number } {
    const oldLevel = this.state.level;
    const safeAmount = Math.max(0, isFinite(amount) ? amount : 0);
    const newTotalXp = this.state.xp + safeAmount;
    const newLevel = getLevelFromXp(newTotalXp);
    const leveledUp = newLevel > oldLevel;

    this.state = {
      ...this.state,
      xp: newTotalXp,
      level: newLevel,
      levelTitle: getTitleForLevel(newLevel),
    };

    // Check achievement unlock
    const currentAchievements = evaluateAchievements(this.state);
    const unlockedIds = currentAchievements.filter((a) => a.isUnlocked).map((a) => a.id);
    this.state = {
      ...this.state,
      unlockedAchievements: unlockedIds,
    };

    this.saveState();

    return {
      newTotalXp,
      leveledUp,
      newLevel,
    };
  }

  public recordQuestionAttempt(params: {
    isCorrectFirstTry: boolean;
    responseTimeMs: number;
    combo: number;
    difficulty?: DifficultyTier;
  }): { xpEarned: number; unlockedAchievements: Achievement[] } {
    const { isCorrectFirstTry, responseTimeMs, combo, difficulty } = params;
    const xpBreakdown = calculateQuestionXp({
      isCorrectFirstTry,
      responseTimeMs,
      combo,
      difficulty,
    });

    const todayKey = getLocalDateKey();
    let currentStreak = this.state.currentStreak;
    let bestStreak = this.state.bestStreak;

    if (this.state.lastActiveDateKey !== todayKey) {
      if (!this.state.lastActiveDateKey) {
        currentStreak = 1;
      } else {
        const dayDiff = getDayDifference(this.state.lastActiveDateKey, todayKey);
        if (dayDiff === 1) {
          currentStreak += 1;
        } else if (dayDiff > 1) {
          currentStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, currentStreak);
    }

    const fastestRt =
      isCorrectFirstTry && responseTimeMs > 0
        ? this.state.fastestResponseTimeMs === 0
          ? responseTimeMs
          : Math.min(this.state.fastestResponseTimeMs, responseTimeMs)
        : this.state.fastestResponseTimeMs;

    this.state = {
      ...this.state,
      totalQuestionsAnswered: this.state.totalQuestionsAnswered + 1,
      totalCorrectAnswers: this.state.totalCorrectAnswers + (isCorrectFirstTry ? 1 : 0),
      currentStreak,
      bestStreak,
      lastActiveDateKey: todayKey,
      fastestResponseTimeMs: fastestRt,
    };

    this.addXp(xpBreakdown.totalXp);

    const achievements = evaluateAchievements(this.state, {
      sessionMaxCombo: combo,
      latestResponseTimeMs: responseTimeMs,
    });

    return {
      xpEarned: xpBreakdown.totalXp,
      unlockedAchievements: achievements.filter((a) => a.isUnlocked),
    };
  }

  public recordDailyChallengeCompletion(params: {
    score: number;
    totalQuestions: number;
    timeSec: number;
    accuracyPercentage: number;
  }): { xpEarned: number; newStreak: number } {
    const isFlawless = params.score === params.totalQuestions;
    const baseBonus = 100;
    const flawlessBonus = isFlawless ? 150 : 0;
    const streakBonus = Math.min(10, this.state.currentStreak) * 10;
    const totalXp = baseBonus + flawlessBonus + streakBonus;

    const todayKey = getLocalDateKey();
    let currentStreak = this.state.currentStreak;
    let bestStreak = this.state.bestStreak;

    if (this.state.lastActiveDateKey !== todayKey) {
      if (!this.state.lastActiveDateKey) {
        currentStreak = 1;
      } else {
        const dayDiff = getDayDifference(this.state.lastActiveDateKey, todayKey);
        if (dayDiff === 1) {
          currentStreak += 1;
        } else if (dayDiff > 1) {
          currentStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, currentStreak);
    }

    this.state = {
      ...this.state,
      dailyChallengesCompleted: this.state.dailyChallengesCompleted + 1,
      dailyChallengesFlawless: this.state.dailyChallengesFlawless + (isFlawless ? 1 : 0),
      currentStreak,
      bestStreak,
      lastActiveDateKey: todayKey,
    };

    this.addXp(totalXp);

    return {
      xpEarned: totalXp,
      newStreak: this.state.currentStreak,
    };
  }

  public recordTableSessionCompletion(params: {
    sessionId: string;
    totalQuestions: number;
    correctFirstTryCount: number;
    accuracyPercentage: number;
    maxCombo: number;
    totalXp: number;
    fastestResponseTimeMs?: number;
  }): { xpEarned: number; awarded: boolean; newTotalXp: number } {
    const AWARDED_SESSIONS_KEY = 'math_awarded_session_ids_v1';
    let awardedIds: string[] = [];
    try {
      const raw = localStorage.getItem(AWARDED_SESSIONS_KEY);
      if (raw) awardedIds = JSON.parse(raw);
    } catch {}

    if (awardedIds.includes(params.sessionId)) {
      return {
        xpEarned: 0,
        awarded: false,
        newTotalXp: this.state.xp,
      };
    }

    awardedIds.push(params.sessionId);
    if (awardedIds.length > 100) awardedIds = awardedIds.slice(-100);
    try {
      localStorage.setItem(AWARDED_SESSIONS_KEY, JSON.stringify(awardedIds));
    } catch {}

    const todayKey = getLocalDateKey();
    let currentStreak = this.state.currentStreak;
    let bestStreak = this.state.bestStreak;

    if (this.state.lastActiveDateKey !== todayKey) {
      if (!this.state.lastActiveDateKey) {
        currentStreak = 1;
      } else {
        const dayDiff = getDayDifference(this.state.lastActiveDateKey, todayKey);
        if (dayDiff === 1) {
          currentStreak += 1;
        } else if (dayDiff > 1) {
          currentStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, currentStreak);
    }

    const fastestRt =
      params.fastestResponseTimeMs && params.fastestResponseTimeMs > 0
        ? this.state.fastestResponseTimeMs === 0
          ? params.fastestResponseTimeMs
          : Math.min(this.state.fastestResponseTimeMs, params.fastestResponseTimeMs)
        : this.state.fastestResponseTimeMs;

    this.state = {
      ...this.state,
      totalQuestionsAnswered: this.state.totalQuestionsAnswered + params.totalQuestions,
      totalCorrectAnswers: this.state.totalCorrectAnswers + params.correctFirstTryCount,
      currentStreak,
      bestStreak,
      lastActiveDateKey: todayKey,
      fastestResponseTimeMs: fastestRt,
    };

    const xpResult = this.addXp(params.totalXp);

    return {
      xpEarned: params.totalXp,
      awarded: true,
      newTotalXp: xpResult.newTotalXp,
    };
  }

  public reset(): void {
    this.state = createInitialProfile();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    this.notifyListeners();
  }
}

export function useProgression() {
  const store = ProgressionStore.getInstance();
  const [profile, setProfile] = useState<UserProfile>(store.getProfile());
  const [levelProgress, setLevelProgress] = useState<LevelProgress>(store.getLevelProgress());

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setProfile(store.getProfile());
      setLevelProgress(store.getLevelProgress());
    });
    return unsub;
  }, [store]);

  return {
    profile,
    levelProgress,
    store,
    addXp: store.addXp.bind(store),
    recordQuestionAttempt: store.recordQuestionAttempt.bind(store),
    recordDailyChallengeCompletion: store.recordDailyChallengeCompletion.bind(store),
    recordTableSessionCompletion: store.recordTableSessionCompletion.bind(store),
    getAchievements: store.getAchievements.bind(store),
  };
}
