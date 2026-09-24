import { describe, it, expect, beforeEach } from 'vitest';
import { MathAppDatabase } from '../../core/storage/db';
import {
  migrateLegacyStorageToDexie,
  LEGACY_STORAGE_KEY,
  MIGRATION_FLAG_KEY,
} from '../../core/storage/storageMigration';

describe('Storage Migration Suite (math_table_mastery_v1 -> Dexie)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('skips gracefully if no legacy data exists', async () => {
    const testDb = new MathAppDatabase('TestDb_Empty');
    const summary = await migrateLegacyStorageToDexie(testDb);

    expect(summary.success).toBe(true);
    expect(summary.skipped).toBe(true);
    expect(summary.migratedStatsCount).toBe(0);
    expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBe('true');
  });

  it('is idempotent: subsequent runs skip immediately after flag is set', async () => {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    const testDb = new MathAppDatabase('TestDb_Idempotent');
    const summary = await migrateLegacyStorageToDexie(testDb);

    expect(summary.success).toBe(true);
    expect(summary.skipped).toBe(true);
    expect(summary.migratedStatsCount).toBe(0);
  });

  it('processes legacy records when present', async () => {
    const legacyData = {
      mul_7_8: {
        factId: 'mul_7_8',
        table: 7,
        multiplier: 8,
        attempts: 10,
        correctCount: 6,
        consecutiveCorrect: 2,
        totalResponseTimeMs: 30000,
        avgResponseTimeMs: 3000,
        lastResponseTimeMs: 2800,
        lastAttemptTimestamp: 1700000000000,
        masteryScore: 55,
      },
      mul_6_7: {
        factId: 'mul_6_7',
        table: 6,
        multiplier: 7,
        attempts: 5,
        correctCount: 5,
        consecutiveCorrect: 5,
        totalResponseTimeMs: 8000,
        avgResponseTimeMs: 1600,
        lastResponseTimeMs: 1500,
        lastAttemptTimestamp: 1700000010000,
        masteryScore: 85,
      },
    };

    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyData));

    const testDb = new MathAppDatabase('TestDb_Migration');
    const summary = await migrateLegacyStorageToDexie(testDb);

    expect(summary.success).toBe(true);
    expect(summary.skipped).toBe(false);
    expect(summary.migratedStatsCount).toBe(2);
    expect(summary.synthesizedAttemptsCount).toBe(2);
    expect(localStorage.getItem(MIGRATION_FLAG_KEY)).toBe('true');
  });
});
