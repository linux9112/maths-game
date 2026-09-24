import {
  FactStat,
  TableMasteryReport,
} from '../types';
import {
  calculateFactMastery,
  calculateTableMasteryReport,
  isFactWeak,
  calculateWeaknessPriorityScore,
} from './tableMasteryCalculator';
import { StorageManager } from '../../../core/storage/storageRepository';

const STORAGE_KEY = 'math_table_mastery_v1';

export class TableMasteryStore {
  private static instance: TableMasteryStore;
  private cache: Record<string, FactStat> = {};
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TableMasteryStore {
    if (!TableMasteryStore.instance) {
      TableMasteryStore.instance = new TableMasteryStore();
    }
    return TableMasteryStore.instance;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.cache = parsed;
        }
      }
    } catch {
      this.cache = {};
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch {
      // Storage quota or safety
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in TableMasteryStore listener:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public recordAttempt(
    factId: string,
    table: number,
    multiplier: number,
    isCorrectFirstTry: boolean,
    responseTimeMs: number
  ): FactStat {
    const existing = this.cache[factId];
    const attempts = (existing?.attempts ?? 0) + 1;
    const correctCount = (existing?.correctCount ?? 0) + (isCorrectFirstTry ? 1 : 0);
    const consecutiveCorrect = isCorrectFirstTry ? (existing?.consecutiveCorrect ?? 0) + 1 : 0;
    const totalResponseTimeMs = (existing?.totalResponseTimeMs ?? 0) + Math.max(0, responseTimeMs);
    const avgResponseTimeMs = Math.round(totalResponseTimeMs / attempts);

    const partialStat: FactStat = {
      factId,
      table,
      multiplier,
      attempts,
      correctCount,
      consecutiveCorrect,
      totalResponseTimeMs,
      avgResponseTimeMs,
      lastResponseTimeMs: responseTimeMs,
      lastAttemptTimestamp: Date.now(),
      masteryScore: 0,
    };

    const masteryScore = calculateFactMastery(partialStat);
    const updatedStat: FactStat = {
      ...partialStat,
      masteryScore,
    };

    this.cache[factId] = updatedStat;
    this.saveToStorage();
    this.notifyListeners();

    // Dual-write asynchronously to unified StorageManager repository
    StorageManager.getRepository().then((repo) => {
      repo.recordAttempt({
        factId,
        operator: '*',
        operandA: table,
        operandB: multiplier,
        expectedAnswer: table * multiplier,
        userAnswer: isCorrectFirstTry ? table * multiplier : 0,
        isCorrect: isCorrectFirstTry,
        responseTimeMs,
        solveTimeMs: responseTimeMs,
        timestamp: Date.now(),
        mode: 'table',
      }).catch(() => {
        // Safe background catch
      });
    }).catch(() => {
      // Safe background catch
    });

    return updatedStat;
  }

  public getFactStat(factId: string): FactStat | null {
    return this.cache[factId] || null;
  }

  public getAllFactStats(): Record<string, FactStat> {
    return { ...this.cache };
  }

  public getTableMastery(tableNum: number, multiplierMin = 1, multiplierMax = 10): TableMasteryReport {
    return calculateTableMasteryReport({
      tableNumber: tableNum,
      multiplierMin,
      multiplierMax,
      factStats: this.cache,
    });
  }

  public getAllTableMasteries(maxTable = 100, multiplierMin = 1, multiplierMax = 10): Record<number, TableMasteryReport> {
    const reports: Record<number, TableMasteryReport> = {};
    for (let t = 1; t <= maxTable; t++) {
      reports[t] = this.getTableMastery(t, multiplierMin, multiplierMax);
    }
    return reports;
  }

  public getWeakFacts(limit = 10): FactStat[] {
    const all = Object.values(this.cache);
    const weak = all.filter(isFactWeak);
    weak.sort((a, b) => calculateWeaknessPriorityScore(b) - calculateWeaknessPriorityScore(a));
    return weak.slice(0, limit);
  }

  public clearAll(): void {
    this.cache = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.notifyListeners();
  }
}

export const tableMasteryStore = TableMasteryStore.getInstance();
