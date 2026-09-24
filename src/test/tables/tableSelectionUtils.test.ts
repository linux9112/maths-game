import { describe, it, expect } from 'vitest';
import {
  clampTable,
  clampMultiplier,
  sanitizeRange,
  createRangeArray,
  matchTablePreset,
  matchMultiplierPreset,
  toggleTableSelection,
  getPrimeTables,
  getEvenTables,
  getOddTables,
} from '../../features/tables/utils/tableSelectionUtils';

describe('Table Selection Utilities Suite', () => {
  it('TC-SEL-01: clamps table and multiplier bounds strictly between 1 and 100', () => {
    expect(clampTable(-5)).toBe(1);
    expect(clampTable(0)).toBe(1);
    expect(clampTable(NaN)).toBe(1);
    expect(clampTable(43.7)).toBe(43);
    expect(clampTable(100)).toBe(100);
    expect(clampTable(150)).toBe(100);

    expect(clampMultiplier(-1)).toBe(1);
    expect(clampMultiplier(120)).toBe(100);
  });

  it('TC-SEL-02: sanitizes ranges and corrects inverted bounds', () => {
    const normal = sanitizeRange(1, 43);
    expect(normal.min).toBe(1);
    expect(normal.max).toBe(43);

    const inverted = sanitizeRange(43, 1);
    expect(inverted.min).toBe(1);
    expect(inverted.max).toBe(43);

    const arr = createRangeArray(7, 10);
    expect(arr).toEqual([7, 8, 9, 10]);
  });

  it('TC-SEL-03: matches all 6 standard table presets accurately', () => {
    expect(matchTablePreset(createRangeArray(1, 10))).toBe('1-10');
    expect(matchTablePreset(createRangeArray(1, 20))).toBe('1-20');
    expect(matchTablePreset(createRangeArray(1, 30))).toBe('1-30');
    expect(matchTablePreset(createRangeArray(1, 43))).toBe('1-43');
    expect(matchTablePreset(createRangeArray(1, 50))).toBe('1-50');
    expect(matchTablePreset(createRangeArray(1, 100))).toBe('1-100');

    // Sparse or non-sequential selection returns 'custom'
    expect(matchTablePreset([7, 11, 43])).toBe('custom');
    expect(matchTablePreset([1, 2, 3, 4, 5])).toBe('custom');
  });

  it('TC-SEL-04: multi-select toggle strictly refuses to remove last remaining table', () => {
    const initial = [7];
    const afterAttemptToRemove = toggleTableSelection(initial, 7);
    expect(afterAttemptToRemove).toEqual([7]);

    // Adding table 11
    const added = toggleTableSelection(initial, 11);
    expect(added).toEqual([7, 11]);

    // Removing table 7 leaves table 11
    const removed = toggleTableSelection(added, 7);
    expect(removed).toEqual([11]);
  });

  it('TC-SEL-05: prime table generator produces exactly 25 primes <= 100', () => {
    const primes = getPrimeTables(100);
    expect(primes).toHaveLength(25);
    expect(primes[0]).toBe(2);
    expect(primes[primes.length - 1]).toBe(97);
    expect(primes).toContain(43);

    const evens = getEvenTables(1, 10);
    expect(evens).toEqual([2, 4, 6, 8, 10]);

    const odds = getOddTables(1, 10);
    expect(odds).toEqual([1, 3, 5, 7, 9]);
  });

  it('matches multiplier presets accurately', () => {
    expect(matchMultiplierPreset({ min: 1, max: 10 })).toBe('1-10');
    expect(matchMultiplierPreset({ min: 1, max: 12 })).toBe('1-12');
    expect(matchMultiplierPreset({ min: 1, max: 20 })).toBe('1-20');
    expect(matchMultiplierPreset({ min: 1, max: 15 })).toBe('custom');
  });
});
