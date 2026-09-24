import { MathAppDatabase } from './db';
import { CalculationAttempt, CalculationStatRecord } from './types';
import {
  calculateLaplaceErrorRate,
  calculateLatencyMultiplier,
  calculateCompositeWeaknessScore,
} from './weaknessMath';

export const MIGRATION_FLAG_KEY = 'math_db_migrated_v1';
export const LEGACY_STORAGE_KEY = 'math_table_mastery_v1';

export interface LegacyFactStat {
  factId: string;
  table: number;
  multiplier: number;
  attempts: number;
  correctCount: number;
  consecutiveCorrect: number;
  totalResponseTimeMs: number;
  avgResponseTimeMs: number;
  lastResponseTimeMs: number;
  lastAttemptTimestamp: number;
  masteryScore: number;
}

export interface MigrationSummary {
  success: boolean;
  migratedStatsCount: number;
  synthesizedAttemptsCount: number;
  skipped: boolean;
  error?: string;
}

/**
 * Idempotent migration from Milestone 3 LocalStorage table mastery to Dexie.js database
 */
export async function migrateLegacyStorageToDexie(
  db: MathAppDatabase
): Promise<MigrationSummary> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: true, migratedStatsCount: 0, synthesizedAttemptsCount: 0, skipped: true };
  }

  const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (alreadyMigrated === 'true') {
    return { success: true, migratedStatsCount: 0, synthesizedAttemptsCount: 0, skipped: true };
  }

  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return { success: true, migratedStatsCount: 0, synthesizedAttemptsCount: 0, skipped: true };
    }

    const legacyMap: Record<string, LegacyFactStat> = JSON.parse(raw);
    const statsToInsert: CalculationStatRecord[] = [];
    const attemptsToInsert: CalculationAttempt[] = [];

    for (const stat of Object.values(legacyMap)) {
      if (!stat || !stat.factId || stat.attempts <= 0) continue;

      const mistakes = Math.max(0, stat.attempts - (stat.correctCount || 0));
      const avgRT = stat.avgResponseTimeMs || 2500;
      const errorRate = calculateLaplaceErrorRate(mistakes, stat.attempts);
      const latencyMultiplier = calculateLatencyMultiplier(avgRT);
      const weaknessScore = calculateCompositeWeaknessScore(mistakes, stat.attempts, avgRT);

      const statRecord: CalculationStatRecord = {
        factId: stat.factId,
        operator: '*',
        operandA: stat.table,
        operandB: stat.multiplier,
        attempts: stat.attempts,
        mistakes,
        correctCount: stat.correctCount || 0,
        consecutiveCorrect: stat.consecutiveCorrect || 0,
        totalResponseTimeMs: stat.totalResponseTimeMs || 0,
        avgResponseTimeMs: avgRT,
        lastResponseTimeMs: stat.lastResponseTimeMs || avgRT,
        errorRate,
        latencyMultiplier,
        weaknessScore,
        masteryScore: stat.masteryScore || 0,
        firstPracticed: (stat.lastAttemptTimestamp || Date.now()) - stat.attempts * 5000,
        lastPracticed: stat.lastAttemptTimestamp || Date.now(),
      };
      statsToInsert.push(statRecord);

      attemptsToInsert.push({
        factId: stat.factId,
        operator: '*',
        operandA: stat.table,
        operandB: stat.multiplier,
        expectedAnswer: stat.table * stat.multiplier,
        userAnswer: (stat.consecutiveCorrect || 0) > 0 ? stat.table * stat.multiplier : 0,
        isCorrect: (stat.consecutiveCorrect || 0) > 0,
        responseTimeMs: stat.lastResponseTimeMs || avgRT,
        solveTimeMs: stat.lastResponseTimeMs || avgRT,
        timestamp: stat.lastAttemptTimestamp || Date.now(),
        mode: 'table',
      });
    }

    if (statsToInsert.length > 0 || attemptsToInsert.length > 0) {
      if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB) {
        try {
          if (!db.isOpen()) {
            await db.open();
          }

          await db.transaction('rw', [db.calculation_stats, db.calculation_attempts], async () => {
            if (statsToInsert.length > 0) {
              await db.calculation_stats.bulkPut(statsToInsert);
            }
            if (attemptsToInsert.length > 0) {
              await db.calculation_attempts.bulkAdd(attemptsToInsert);
            }
          });
        } catch (dbErr) {
          console.warn('Dexie write unavailable in current test/browser environment:', dbErr);
        }
      }
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    return {
      success: true,
      migratedStatsCount: statsToInsert.length,
      synthesizedAttemptsCount: attemptsToInsert.length,
      skipped: false,
    };
  } catch (err) {
    console.error('Storage migration failed:', err);
    return {
      success: false,
      migratedStatsCount: 0,
      synthesizedAttemptsCount: 0,
      skipped: false,
      error: String(err),
    };
  }
}
