import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tableMasteryStore } from '../../features/tables/logic/tableMasteryStore';

describe('TableMasteryStore Telemetry & Persistence Suite', () => {
  beforeEach(() => {
    tableMasteryStore.clearAll();
  });

  it('records successful first-try attempts, updates stats and consecutive streak', () => {
    const stat1 = tableMasteryStore.recordAttempt('mul_7_8', 7, 8, true, 1500);
    expect(stat1.attempts).toBe(1);
    expect(stat1.correctCount).toBe(1);
    expect(stat1.consecutiveCorrect).toBe(1);
    expect(stat1.avgResponseTimeMs).toBe(1500);
    expect(stat1.masteryScore).toBeGreaterThan(0);

    const stat2 = tableMasteryStore.recordAttempt('mul_7_8', 7, 8, true, 2500);
    expect(stat2.attempts).toBe(2);
    expect(stat2.correctCount).toBe(2);
    expect(stat2.consecutiveCorrect).toBe(2);
    expect(stat2.avgResponseTimeMs).toBe(2000);
  });

  it('resets consecutive streak to 0 on mistake', () => {
    tableMasteryStore.recordAttempt('mul_7_8', 7, 8, true, 1500);
    tableMasteryStore.recordAttempt('mul_7_8', 7, 8, true, 1500);
    const failStat = tableMasteryStore.recordAttempt('mul_7_8', 7, 8, false, 2000);

    expect(failStat.attempts).toBe(3);
    expect(failStat.correctCount).toBe(2);
    expect(failStat.consecutiveCorrect).toBe(0);
  });

  it('computes table mastery reports across multiplier ranges', () => {
    // Record facts for Table 7
    for (let m = 1; m <= 10; m++) {
      for (let attempt = 0; attempt < 3; attempt++) {
        tableMasteryStore.recordAttempt(`mul_7_${m}`, 7, m, true, 1200);
      }
    }

    const report = tableMasteryStore.getTableMastery(7, 1, 10);
    expect(report.tableNumber).toBe(7);
    expect(report.totalFacts).toBe(10);
    expect(report.factsMastered).toBe(10);
    expect(report.masteryPercentage).toBe(100);
    expect(report.statusBadge).toBe('mastered');
  });

  it('notifies subscribers upon attempt recording', () => {
    const listener = vi.fn();
    const unsub = tableMasteryStore.subscribe(listener);

    tableMasteryStore.recordAttempt('mul_9_9', 9, 9, true, 1000);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    tableMasteryStore.recordAttempt('mul_9_9', 9, 9, true, 1000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('extracts and ranks weak facts by priority deficit', () => {
    // Weak fact: failed attempt
    tableMasteryStore.recordAttempt('mul_13_7', 13, 7, false, 5000);
    tableMasteryStore.recordAttempt('mul_13_7', 13, 7, false, 4800);

    // Strong fact
    for (let i = 0; i < 4; i++) {
      tableMasteryStore.recordAttempt('mul_2_2', 2, 2, true, 800);
    }

    const weakFacts = tableMasteryStore.getWeakFacts();
    expect(weakFacts.length).toBeGreaterThanOrEqual(1);
    expect(weakFacts[0].factId).toBe('mul_13_7');
  });
});
