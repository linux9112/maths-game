import { MathAppDatabase, db as defaultDb } from './db';
import {
  CalculationAttempt,
  CalculationStatRecord,
  UserProfileRecord,
  DailyChallengeRecord,
  WeakCalculationQueryOptions,
  IWeaknessRepository,
} from './types';
import {
  calculateLaplaceErrorRate,
  calculateLatencyMultiplier,
  calculateCompositeWeaknessScore,
  calculatePedagogicalMastery,
} from './weaknessMath';

export function createDefaultUserProfile(id = 'player_1'): UserProfileRecord {
  return {
    id,
    xp: 0,
    level: 1,
    title: 'Beginner',
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: '',
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    totalPlayTimeSec: 0,
    unlockedAchievements: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function isIndexedDBAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      'indexedDB' in window &&
      window.indexedDB !== null &&
      typeof window.indexedDB.open === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Pure volatile in-memory repository for test runners, SSR, and zero-storage environments
 */
export class InMemoryWeaknessRepository implements IWeaknessRepository {
  private attempts: CalculationAttempt[] = [];
  private stats: Map<string, CalculationStatRecord> = new Map();
  private profile: UserProfileRecord = createDefaultUserProfile();
  private dailyChallenges: Map<string, DailyChallengeRecord> = new Map();

  public async recordAttempt(attempt: CalculationAttempt): Promise<CalculationStatRecord> {
    const attemptWithId = {
      ...attempt,
      id: this.attempts.length + 1,
    };
    this.attempts.push(attemptWithId);

    const existing = this.stats.get(attempt.factId);
    const attempts = (existing?.attempts ?? 0) + 1;
    const mistakes = (existing?.mistakes ?? 0) + (attempt.isCorrect ? 0 : 1);
    const correctCount = attempts - mistakes;
    const consecutiveCorrect = attempt.isCorrect ? (existing?.consecutiveCorrect ?? 0) + 1 : 0;
    const totalResponseTimeMs = (existing?.totalResponseTimeMs ?? 0) + Math.max(0, attempt.responseTimeMs);
    const avgResponseTimeMs = Math.round(totalResponseTimeMs / attempts);

    const errorRate = calculateLaplaceErrorRate(mistakes, attempts);
    const latencyMultiplier = calculateLatencyMultiplier(avgResponseTimeMs);
    const weaknessScore = calculateCompositeWeaknessScore(mistakes, attempts, avgResponseTimeMs);
    const masteryScore = calculatePedagogicalMastery(attempts, mistakes, avgResponseTimeMs);

    const updatedStat: CalculationStatRecord = {
      factId: attempt.factId,
      operator: attempt.operator,
      operandA: attempt.operandA,
      operandB: attempt.operandB,
      attempts,
      mistakes,
      correctCount,
      consecutiveCorrect,
      totalResponseTimeMs,
      avgResponseTimeMs,
      lastResponseTimeMs: attempt.responseTimeMs,
      errorRate,
      latencyMultiplier,
      weaknessScore,
      masteryScore,
      firstPracticed: existing?.firstPracticed ?? attempt.timestamp,
      lastPracticed: attempt.timestamp,
    };

    this.stats.set(attempt.factId, updatedStat);
    return updatedStat;
  }

  public async getStat(factId: string): Promise<CalculationStatRecord | null> {
    return this.stats.get(factId) ?? null;
  }

  public async getAllStats(): Promise<CalculationStatRecord[]> {
    return Array.from(this.stats.values());
  }

  public async getWeakCalculations(options: WeakCalculationQueryOptions = {}): Promise<CalculationStatRecord[]> {
    const { limit = 10, operator, minAttempts = 1, threshold = 0.50 } = options;

    let items = Array.from(this.stats.values()).filter(
      (s) => s.attempts >= minAttempts && s.weaknessScore >= threshold
    );

    if (operator) {
      items = items.filter((s) => s.operator === operator);
    }

    items.sort((a, b) => b.weaknessScore - a.weaknessScore);
    return items.slice(0, limit);
  }

  public async getUserProfile(): Promise<UserProfileRecord> {
    return { ...this.profile };
  }

  public async saveUserProfile(patch: Partial<UserProfileRecord>): Promise<UserProfileRecord> {
    this.profile = {
      ...this.profile,
      ...patch,
      updatedAt: Date.now(),
    };
    return { ...this.profile };
  }

  public async getDailyChallenge(dateKey: string): Promise<DailyChallengeRecord | null> {
    return this.dailyChallenges.get(dateKey) ? { ...this.dailyChallenges.get(dateKey)! } : null;
  }

  public async saveDailyChallenge(record: DailyChallengeRecord): Promise<void> {
    this.dailyChallenges.set(record.dateKey, { ...record });
  }

  public async getAllAttempts(limit = 100): Promise<CalculationAttempt[]> {
    return this.attempts.slice(-limit);
  }

  public async clearAll(): Promise<void> {
    this.attempts = [];
    this.stats.clear();
    this.profile = createDefaultUserProfile();
    this.dailyChallenges.clear();
  }
}

/**
 * LocalStorage-backed repository for environments where IndexedDB is blocked (e.g. Safari private mode)
 */
export class LocalStorageWeaknessRepository implements IWeaknessRepository {
  private static readonly STATS_KEY = 'math_calculation_stats_v1';
  private static readonly ATTEMPTS_KEY = 'math_calculation_attempts_v1';
  private static readonly PROFILE_KEY = 'math_user_profile_v1';
  private static readonly DAILY_KEY = 'math_daily_challenges_v1';

  private loadMap<T>(key: string): Record<string, T> {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveMap<T>(key: string, data: Record<string, T>): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  }

  public async recordAttempt(attempt: CalculationAttempt): Promise<CalculationStatRecord> {
    // 1. Record attempt in rolling buffer
    try {
      const rawAttempts = localStorage.getItem(LocalStorageWeaknessRepository.ATTEMPTS_KEY);
      const attemptsList: CalculationAttempt[] = rawAttempts ? JSON.parse(rawAttempts) : [];
      attemptsList.push(attempt);
      // Keep last 300 attempts to avoid quota issues
      if (attemptsList.length > 300) {
        attemptsList.splice(0, attemptsList.length - 300);
      }
      localStorage.setItem(LocalStorageWeaknessRepository.ATTEMPTS_KEY, JSON.stringify(attemptsList));
    } catch {
      // Storage safety
    }

    // 2. Update stat
    const statsMap = this.loadMap<CalculationStatRecord>(LocalStorageWeaknessRepository.STATS_KEY);
    const existing = statsMap[attempt.factId];

    const attempts = (existing?.attempts ?? 0) + 1;
    const mistakes = (existing?.mistakes ?? 0) + (attempt.isCorrect ? 0 : 1);
    const correctCount = attempts - mistakes;
    const consecutiveCorrect = attempt.isCorrect ? (existing?.consecutiveCorrect ?? 0) + 1 : 0;
    const totalResponseTimeMs = (existing?.totalResponseTimeMs ?? 0) + Math.max(0, attempt.responseTimeMs);
    const avgResponseTimeMs = Math.round(totalResponseTimeMs / attempts);

    const errorRate = calculateLaplaceErrorRate(mistakes, attempts);
    const latencyMultiplier = calculateLatencyMultiplier(avgResponseTimeMs);
    const weaknessScore = calculateCompositeWeaknessScore(mistakes, attempts, avgResponseTimeMs);
    const masteryScore = calculatePedagogicalMastery(attempts, mistakes, avgResponseTimeMs);

    const updatedStat: CalculationStatRecord = {
      factId: attempt.factId,
      operator: attempt.operator,
      operandA: attempt.operandA,
      operandB: attempt.operandB,
      attempts,
      mistakes,
      correctCount,
      consecutiveCorrect,
      totalResponseTimeMs,
      avgResponseTimeMs,
      lastResponseTimeMs: attempt.responseTimeMs,
      errorRate,
      latencyMultiplier,
      weaknessScore,
      masteryScore,
      firstPracticed: existing?.firstPracticed ?? attempt.timestamp,
      lastPracticed: attempt.timestamp,
    };

    statsMap[attempt.factId] = updatedStat;
    this.saveMap(LocalStorageWeaknessRepository.STATS_KEY, statsMap);

    return updatedStat;
  }

  public async getStat(factId: string): Promise<CalculationStatRecord | null> {
    const statsMap = this.loadMap<CalculationStatRecord>(LocalStorageWeaknessRepository.STATS_KEY);
    return statsMap[factId] ?? null;
  }

  public async getAllStats(): Promise<CalculationStatRecord[]> {
    const statsMap = this.loadMap<CalculationStatRecord>(LocalStorageWeaknessRepository.STATS_KEY);
    return Object.values(statsMap);
  }

  public async getWeakCalculations(options: WeakCalculationQueryOptions = {}): Promise<CalculationStatRecord[]> {
    const { limit = 10, operator, minAttempts = 1, threshold = 0.50 } = options;
    const all = await this.getAllStats();

    let items = all.filter((s) => s.attempts >= minAttempts && s.weaknessScore >= threshold);
    if (operator) {
      items = items.filter((s) => s.operator === operator);
    }
    items.sort((a, b) => b.weaknessScore - a.weaknessScore);
    return items.slice(0, limit);
  }

  public async getUserProfile(): Promise<UserProfileRecord> {
    try {
      const raw = localStorage.getItem(LocalStorageWeaknessRepository.PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback to default
    }
    const def = createDefaultUserProfile();
    this.saveUserProfile(def);
    return def;
  }

  public async saveUserProfile(patch: Partial<UserProfileRecord>): Promise<UserProfileRecord> {
    let current: UserProfileRecord;
    try {
      const raw = localStorage.getItem(LocalStorageWeaknessRepository.PROFILE_KEY);
      current = raw ? JSON.parse(raw) : createDefaultUserProfile();
    } catch {
      current = createDefaultUserProfile();
    }

    const updated = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(LocalStorageWeaknessRepository.PROFILE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    return updated;
  }

  public async getDailyChallenge(dateKey: string): Promise<DailyChallengeRecord | null> {
    const dailyMap = this.loadMap<DailyChallengeRecord>(LocalStorageWeaknessRepository.DAILY_KEY);
    return dailyMap[dateKey] ?? null;
  }

  public async saveDailyChallenge(record: DailyChallengeRecord): Promise<void> {
    const dailyMap = this.loadMap<DailyChallengeRecord>(LocalStorageWeaknessRepository.DAILY_KEY);
    dailyMap[record.dateKey] = record;
    this.saveMap(LocalStorageWeaknessRepository.DAILY_KEY, dailyMap);
  }

  public async getAllAttempts(limit = 100): Promise<CalculationAttempt[]> {
    try {
      const raw = localStorage.getItem(LocalStorageWeaknessRepository.ATTEMPTS_KEY);
      const list: CalculationAttempt[] = raw ? JSON.parse(raw) : [];
      return list.slice(-limit);
    } catch {
      return [];
    }
  }

  public async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(LocalStorageWeaknessRepository.STATS_KEY);
      localStorage.removeItem(LocalStorageWeaknessRepository.ATTEMPTS_KEY);
      localStorage.removeItem(LocalStorageWeaknessRepository.PROFILE_KEY);
      localStorage.removeItem(LocalStorageWeaknessRepository.DAILY_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Primary high-performance IndexedDB repository powered by Dexie 4
 */
export class DexieWeaknessRepository implements IWeaknessRepository {
  private db: MathAppDatabase;

  constructor(dbInstance?: MathAppDatabase) {
    this.db = dbInstance || defaultDb;
  }

  public getDatabase(): MathAppDatabase {
    return this.db;
  }

  public async init(): Promise<void> {
    if (!this.db.isOpen()) {
      await this.db.open();
    }
  }

  public async recordAttempt(attempt: CalculationAttempt): Promise<CalculationStatRecord> {
    await this.init();

    return await this.db.transaction('rw', [this.db.calculation_stats, this.db.calculation_attempts], async () => {
      const existing = await this.db.calculation_stats.get(attempt.factId);

      const attempts = (existing?.attempts ?? 0) + 1;
      const mistakes = (existing?.mistakes ?? 0) + (attempt.isCorrect ? 0 : 1);
      const correctCount = attempts - mistakes;
      const consecutiveCorrect = attempt.isCorrect ? (existing?.consecutiveCorrect ?? 0) + 1 : 0;
      const totalResponseTimeMs = (existing?.totalResponseTimeMs ?? 0) + Math.max(0, attempt.responseTimeMs);
      const avgResponseTimeMs = Math.round(totalResponseTimeMs / attempts);

      const errorRate = calculateLaplaceErrorRate(mistakes, attempts);
      const latencyMultiplier = calculateLatencyMultiplier(avgResponseTimeMs);
      const weaknessScore = calculateCompositeWeaknessScore(mistakes, attempts, avgResponseTimeMs);
      const masteryScore = calculatePedagogicalMastery(attempts, mistakes, avgResponseTimeMs);

      const updatedStat: CalculationStatRecord = {
        factId: attempt.factId,
        operator: attempt.operator,
        operandA: attempt.operandA,
        operandB: attempt.operandB,
        attempts,
        mistakes,
        correctCount,
        consecutiveCorrect,
        totalResponseTimeMs,
        avgResponseTimeMs,
        lastResponseTimeMs: attempt.responseTimeMs,
        errorRate,
        latencyMultiplier,
        weaknessScore,
        masteryScore,
        firstPracticed: existing?.firstPracticed ?? attempt.timestamp,
        lastPracticed: attempt.timestamp,
      };

      await this.db.calculation_stats.put(updatedStat);
      await this.db.calculation_attempts.add(attempt);

      return updatedStat;
    });
  }

  public async getStat(factId: string): Promise<CalculationStatRecord | null> {
    await this.init();
    return (await this.db.calculation_stats.get(factId)) ?? null;
  }

  public async getAllStats(): Promise<CalculationStatRecord[]> {
    await this.init();
    return await this.db.calculation_stats.toArray();
  }

  public async getWeakCalculations(options: WeakCalculationQueryOptions = {}): Promise<CalculationStatRecord[]> {
    await this.init();
    const { limit = 10, operator, minAttempts = 1, threshold = 0.50 } = options;

    if (operator) {
      const items = await this.db.calculation_stats
        .where('operator')
        .equals(operator)
        .filter((r) => r.attempts >= minAttempts && r.weaknessScore >= threshold)
        .toArray();

      items.sort((a, b) => b.weaknessScore - a.weaknessScore);
      return items.slice(0, limit);
    }

    return await this.db.calculation_stats
      .orderBy('weaknessScore')
      .reverse()
      .filter((r) => r.attempts >= minAttempts && r.weaknessScore >= threshold)
      .limit(limit)
      .toArray();
  }

  public async getUserProfile(): Promise<UserProfileRecord> {
    await this.init();
    const profile = await this.db.user_profile.get('player_1');
    if (profile) return profile;

    const def = createDefaultUserProfile('player_1');
    await this.db.user_profile.put(def);
    return def;
  }

  public async saveUserProfile(patch: Partial<UserProfileRecord>): Promise<UserProfileRecord> {
    await this.init();
    const current = await this.getUserProfile();
    const updated: UserProfileRecord = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };
    await this.db.user_profile.put(updated);
    return updated;
  }

  public async getDailyChallenge(dateKey: string): Promise<DailyChallengeRecord | null> {
    await this.init();
    return (await this.db.daily_challenges.get(dateKey)) ?? null;
  }

  public async saveDailyChallenge(record: DailyChallengeRecord): Promise<void> {
    await this.init();
    await this.db.daily_challenges.put(record);
  }

  public async getAllAttempts(limit = 100): Promise<CalculationAttempt[]> {
    await this.init();
    return await this.db.calculation_attempts.orderBy('id').reverse().limit(limit).toArray();
  }

  public async clearAll(): Promise<void> {
    await this.init();
    await this.db.transaction('rw', [
      this.db.calculation_attempts,
      this.db.calculation_stats,
      this.db.user_profile,
      this.db.daily_challenges,
    ], async () => {
      await this.db.calculation_attempts.clear();
      await this.db.calculation_stats.clear();
      await this.db.user_profile.clear();
      await this.db.daily_challenges.clear();
    });
  }
}

/**
 * Singleton repository manager with tiered fallback:
 * Dexie (IndexedDB) -> LocalStorage -> InMemory
 */
export class StorageManager {
  private static repositoryInstance: IWeaknessRepository | null = null;

  public static setRepository(repo: IWeaknessRepository | null): void {
    this.repositoryInstance = repo;
  }

  public static async getRepository(): Promise<IWeaknessRepository> {
    if (this.repositoryInstance) return this.repositoryInstance;

    if (isIndexedDBAvailable()) {
      try {
        const dexieRepo = new DexieWeaknessRepository();
        await dexieRepo.init();
        this.repositoryInstance = dexieRepo;
        return dexieRepo;
      } catch (err) {
        console.warn('Dexie IndexedDB initialization failed, falling back to LocalStorage:', err);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      this.repositoryInstance = new LocalStorageWeaknessRepository();
    } else {
      this.repositoryInstance = new InMemoryWeaknessRepository();
    }

    return this.repositoryInstance;
  }
}
